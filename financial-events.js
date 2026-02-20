/**
 * Protocol Finance — Financial Events Engine
 *
 * Event-sourced архитектура финансовых операций.
 * Все изменения баланса фиксируются как события.
 * Текущее состояние (баланс, срок, резерв) — вычисляется из цепочки событий.
 *
 * Загружается ПОСЛЕ state-manager.js и ДО app.js.
 */

const FinancialEvents = (() => {

  const EVENT_TYPES = {
    UNEXPECTED_EXPENSE: "unexpected_expense"
    // Будущие: DEPOSIT, ADJUSTMENT, GOAL_CHANGE, INCOME_CHANGE …
  };

  const EXPENSE_SOURCES = {
    GOAL: "goal",
    RESERVE: "reserve",
    SKIP: "skip"
  };

  let events = [];

  function generateId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  // ─── CRUD ──────────────────────────────────────────────────

  function createEvent({ type, amount, source, date, meta }) {
    const event = {
      id: generateId(),
      type,
      amount: Number(amount) || 0,
      source: source || null,
      date: date instanceof Date ? date : new Date(),
      createdAt: new Date(),
      meta: meta || {}
    };
    events.push(event);
    return event;
  }

  function removeEvent(id) {
    events = events.filter(e => e.id !== id);
  }

  function getEvents() {
    return events;
  }

  function setEvents(arr) {
    events = Array.isArray(arr) ? arr : [];
  }

  function getEventsByType(type) {
    return events.filter(e => e.type === type);
  }

  function clearEvents() {
    events = [];
  }

  // ─── Serialization ────────────────────────────────────────

  function serialize() {
    return events.map(e => ({
      ...e,
      date: e.date instanceof Date ? e.date.toISOString() : e.date,
      createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt
    }));
  }

  function deserialize(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(e => ({
      ...e,
      date: new Date(e.date),
      createdAt: e.createdAt ? new Date(e.createdAt) : new Date()
    }));
  }

  // ─── Core: пересчёт плана из событий ──────────────────────

  /**
   * Вычисляет текущее финансовое состояние из:
   *   - начального баланса
   *   - factHistory (существующие пополнения)
   *   - financialEvents (непредвиденные расходы и будущие типы)
   *
   * Возвращает вычисленное состояние, НЕ мутирует внешние данные.
   */
  function recalculatePlanFromEvents({
    initialBalance,
    factHistory,
    goal,
    plannedMonthly
  }) {
    // 1. Начальный баланс
    let goalBalance = Number(initialBalance) || 0;
    let reserveBalance = 0;

    // 2. Пополнения из factHistory (существующая система)
    (factHistory || []).forEach(f => {
      if (f.to === "main") goalBalance += f.value;
      else if (f.to === "reserve") reserveBalance += f.value;
    });

    // 3. Применяем финансовые события
    events.forEach(e => {
      if (e.type === EVENT_TYPES.UNEXPECTED_EXPENSE) {
        if (e.source === EXPENSE_SOURCES.GOAL) {
          goalBalance -= e.amount;
        } else if (e.source === EXPENSE_SOURCES.RESERVE) {
          reserveBalance -= e.amount;
        }
        // SKIP не меняет баланс, но влияет на срок
      }
    });

    goalBalance = Math.max(0, goalBalance);
    reserveBalance = Math.max(0, reserveBalance);

    // 4. Пересчёт срока
    const remaining = Math.max(0, goal - goalBalance);
    const baseMonths = plannedMonthly > 0
      ? Math.ceil(remaining / plannedMonthly)
      : Infinity;

    const skippedMonths = events.filter(e =>
      e.type === EVENT_TYPES.UNEXPECTED_EXPENSE &&
      e.source === EXPENSE_SOURCES.SKIP
    ).length;

    // 5. Аналитика
    const expenseEvents = events.filter(e => e.type === EVENT_TYPES.UNEXPECTED_EXPENSE);
    const totalExpenseAmount = expenseEvents
      .filter(e => e.source !== EXPENSE_SOURCES.SKIP)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      goalBalance,
      reserveBalance,
      remaining,
      months: baseMonths + skippedMonths,
      skippedMonths,
      totalExpenseEvents: expenseEvents.length,
      totalExpenseAmount
    };
  }

  // ─── Аналитика для brain ──────────────────────────────────

  function buildExpenseAnalysis() {
    const expenseEvents = events.filter(e => e.type === EVENT_TYPES.UNEXPECTED_EXPENSE);
    if (expenseEvents.length === 0) return null;

    const fromGoal = expenseEvents.filter(e => e.source === EXPENSE_SOURCES.GOAL);
    const fromReserve = expenseEvents.filter(e => e.source === EXPENSE_SOURCES.RESERVE);
    const skips = expenseEvents.filter(e => e.source === EXPENSE_SOURCES.SKIP);

    const totalFromGoal = fromGoal.reduce((s, e) => s + e.amount, 0);
    const totalFromReserve = fromReserve.reduce((s, e) => s + e.amount, 0);

    let message = "";

    if (skips.length >= 3) {
      message = "Уже " + skips.length + " пропущенных месяцев. Стоит пересмотреть план или режим.";
    } else if (totalFromGoal > 0 && fromGoal.length >= 2) {
      message = "Частые расходы из накоплений замедляют цель. Подумайте о резервном фонде.";
    } else if (expenseEvents.length === 1) {
      message = "Зафиксирован непредвиденный расход. Plan скорректирован.";
    } else {
      message = "Непредвиденных расходов: " + expenseEvents.length + ". План пересчитан.";
    }

    return {
      message,
      count: expenseEvents.length,
      totalFromGoal,
      totalFromReserve,
      skips: skips.length
    };
  }

  // ─── Public API ───────────────────────────────────────────

  return {
    EVENT_TYPES,
    EXPENSE_SOURCES,
    createEvent,
    removeEvent,
    getEvents,
    setEvents,
    getEventsByType,
    clearEvents,
    serialize,
    deserialize,
    recalculatePlanFromEvents,
    buildExpenseAnalysis
  };

})();
