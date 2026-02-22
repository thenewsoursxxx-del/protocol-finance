/**
 * Protocol Finance — Time-Based Cashflow Engine (Domain Layer)
 *
 * Единое ядро расчёта: events → balances, months, projection, derivedState.
 * Режимы: "simple" (фиксированный ежемесячный взнос) и "cashflow" (полный event-based).
 *
 * Загружается ПОСЛЕ financial-events.js и ДО app.js.
 */
(function (global) {
  "use strict";

  var EVENT_TYPE = {
    INCOME: "income",
    EXPENSE: "expense",
    CONTRIBUTION: "contribution",
    UNEXPECTED_EXPENSE: "unexpected_expense"
  };

  var FREQUENCY = { ONCE: "once", MONTHLY: "monthly" };

  var PACE_MAP = { calm: 0.4, normal: 0.6, aggressive: 0.8 };

  function generateId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function startOfMonth(d) {
    var r = new Date(d || Date.now());
    r.setDate(1);
    r.setHours(0, 0, 0, 0);
    return r;
  }

  // ─── Event Normalization ──────────────────────────────────

  function normalizeEvent(raw) {
    if (!raw || typeof raw !== "object") return null;
    var sd = raw.startDate || raw.date;
    if (!(sd instanceof Date)) sd = sd ? new Date(sd) : new Date();
    if (isNaN(sd.getTime())) sd = new Date();
    return {
      id: raw.id || generateId(),
      type: raw.type || EVENT_TYPE.CONTRIBUTION,
      amount: Math.abs(Number(raw.amount)) || 0,
      frequency: raw.frequency || FREQUENCY.ONCE,
      startDate: startOfMonth(sd),
      endDate: raw.endDate ? new Date(raw.endDate) : undefined,
      meta: raw.meta && typeof raw.meta === "object" ? raw.meta : {}
    };
  }

  // ─── Legacy Adapters ──────────────────────────────────────

  /**
   * factHistory[] → FinancialEvent[]
   * Positive value → contribution; negative → unexpected_expense.
   */
  function factHistoryToEvents(factHistory) {
    if (!Array.isArray(factHistory)) return [];
    return factHistory
      .map(function (f) {
        var d =
          f.date instanceof Date ? new Date(f.date) : new Date(f.date || Date.now());
        var isExpense = f.value < 0;
        return normalizeEvent({
          type: isExpense ? EVENT_TYPE.UNEXPECTED_EXPENSE : EVENT_TYPE.CONTRIBUTION,
          amount: Math.abs(f.value),
          startDate: d,
          meta: {
            to: f.to || "main",
            source: isExpense
              ? f.to === "reserve"
                ? "reserve"
                : "goal"
              : undefined
          }
        });
      })
      .filter(Boolean);
  }

  /**
   * FinancialEvents.getEvents() (old module) → FinancialEvent[]
   * Используется только для skip-событий (остальные уже в factHistory).
   */
  function legacySkipEventsOnly(legacyEvents) {
    if (!Array.isArray(legacyEvents)) return [];
    return legacyEvents
      .filter(function (e) {
        return e.type === "unexpected_expense" && e.source === "skip";
      })
      .map(function (e) {
        return normalizeEvent({
          id: e.id,
          type: EVENT_TYPE.UNEXPECTED_EXPENSE,
          amount: 0,
          startDate: e.date,
          meta: { source: "skip" }
        });
      })
      .filter(Boolean);
  }

  // ─── CashflowEngine ──────────────────────────────────────

  function CashflowEngine(opts) {
    opts = opts || {};
    this.modelType = opts.modelType === "cashflow" ? "cashflow" : "simple";

    var bc = opts.baseConfig || {};
    this.baseConfig = {
      goal: Number(bc.goal) || 0,
      income: Number(bc.income) || 0,
      expenses: Number(bc.expenses) || 0,
      saved: Number(bc.saved) || 0,
      mode: bc.mode || "calm",
      hasReserve: !!bc.hasReserve
    };

    this.events = Array.isArray(opts.events)
      ? opts.events.map(normalizeEvent).filter(Boolean)
      : [];

    this._derived = null;
  }

  /**
   * Planned monthly contribution (simple mode formula).
   * Идентична ProtocolCore.calculateBase по логике.
   */
  CashflowEngine.prototype._getPlannedMonthly = function () {
    var bc = this.baseConfig;
    var free = bc.income - bc.expenses;
    if (free <= 0)
      return { toGoal: 0, toReserve: 0, total: 0, free: free, pace: 0 };

    var pace = PACE_MAP[bc.mode] || 0.6;
    var total = Math.round(free * pace);

    if (!bc.hasReserve)
      return { toGoal: total, toReserve: 0, total: total, free: free, pace: pace };

    var toReserve = Math.round(total * 0.1);
    return {
      toGoal: total - toReserve,
      toReserve: toReserve,
      total: total,
      free: free,
      pace: pace
    };
  };

  /**
   * Вычисляет текущие балансы из saved + events.
   * Не мутирует ничего.
   */
  CashflowEngine.prototype._computeBalances = function () {
    var goalBal = Number(this.baseConfig.saved) || 0;
    var reserveBal = 0;
    var totalSkips = 0;

    for (var i = 0; i < this.events.length; i++) {
      var e = this.events[i];
      if (e.type === EVENT_TYPE.CONTRIBUTION) {
        var to = (e.meta && e.meta.to) || "main";
        if (to === "reserve") reserveBal += e.amount;
        else goalBal += e.amount;
      } else if (e.type === EVENT_TYPE.UNEXPECTED_EXPENSE) {
        var src = (e.meta && e.meta.source) || "goal";
        if (src === "skip") totalSkips++;
        else if (src === "reserve") reserveBal -= e.amount;
        else goalBal -= e.amount;
      }
    }

    return {
      goalBalance: Math.max(0, goalBal),
      reserveBalance: Math.max(0, reserveBal),
      totalSkips: totalSkips
    };
  };

  /**
   * Полный пересчёт → derivedState.
   */
  CashflowEngine.prototype.recalculate = function () {
    var bc = this.baseConfig;
    var planned = this._getPlannedMonthly();
    var balances = this._computeBalances();

    var remaining = Math.max(0, bc.goal - balances.goalBalance);

    var monthsLeft = 0;
    if (remaining > 0 && planned.toGoal > 0) {
      monthsLeft = Math.ceil(remaining / planned.toGoal) + balances.totalSkips;
    }

    var ok = planned.free > 0 && bc.goal > 0;

    this._derived = {
      ok: ok,
      currentGoalBalance: balances.goalBalance,
      reserveBalance: balances.reserveBalance,
      remainingGoal: remaining,
      monthsLeft: monthsLeft,
      monthlySave: planned.total,
      free: planned.free,
      pace: planned.pace,
      riskScore:
        planned.free > 0 ? Math.min(1, planned.total / planned.free) : 1,
      totalSkips: balances.totalSkips,
      projectedCompletionDate: ok && monthsLeft > 0
        ? (function () { var d = new Date(); d.setMonth(d.getMonth() + monthsLeft); return d; })()
        : null
    };

    return this._derived;
  };

  /**
   * Проекция будущего: массив точек { date, goalBalance, reserveBalance }.
   * Текущий график пока использует legacy buildPlanTimeline, но timeline
   * доступен для будущих улучшений.
   */
  CashflowEngine.prototype.generateTimeline = function () {
    if (!this._derived) this.recalculate();
    var d = this._derived;
    var planned = this._getPlannedMonthly();
    var points = [];
    var bal = d.currentGoalBalance;
    var resBal = d.reserveBalance;
    var now = startOfMonth();

    points.push({ date: new Date(now), goalBalance: bal, reserveBalance: resBal });

    for (var i = 1; i <= d.monthsLeft; i++) {
      var date = new Date(now);
      date.setMonth(date.getMonth() + i);
      bal += planned.toGoal;
      resBal += planned.toReserve;
      points.push({ date: date, goalBalance: bal, reserveBalance: resBal });
    }

    return points;
  };

  CashflowEngine.prototype.getDerivedState = function () {
    return this._derived;
  };

  // ─── Export ───────────────────────────────────────────────

  global.CashflowEngine = CashflowEngine;
  global.CashflowEngineHelpers = {
    EVENT_TYPE: EVENT_TYPE,
    FREQUENCY: FREQUENCY,
    PACE_MAP: PACE_MAP,
    normalizeEvent: normalizeEvent,
    factHistoryToEvents: factHistoryToEvents,
    legacySkipEventsOnly: legacySkipEventsOnly,
    startOfMonth: startOfMonth,
    generateId: generateId
  };
})(typeof window !== "undefined" ? window : this);
