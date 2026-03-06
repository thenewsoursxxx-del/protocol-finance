const tg = window.Telegram?.WebApp;
tg?.expand();

const buttons = document.querySelectorAll(".nav-btn");
const screens = document.querySelectorAll(".screen");
const indicator = document.querySelector(".nav-indicator");

if (window.Telegram?.WebApp) {
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
  Telegram.WebApp.onEvent("viewportChanged", function () {
    Telegram.WebApp.expand();
    runFlipFixOnReturn();
  });
}

/* Защита от вертикального смещения во время горизонтального flip-свайпа */
var _startX = 0;
var _startY = 0;
var _isHorizontalSwipe = false;

document.addEventListener("touchstart", function (e) {
  if (!e.touches || !e.touches.length) return;
  _startX = e.touches[0].clientX;
  _startY = e.touches[0].clientY;
  _isHorizontalSwipe = false;
}, { passive: true });

document.addEventListener("touchmove", function (e) {
  if (!e.touches || !e.touches.length) return;
  var deltaX = e.touches[0].clientX - _startX;
  var deltaY = e.touches[0].clientY - _startY;
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    _isHorizontalSwipe = true;
  }
  if (_isHorizontalSwipe) {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener("touchend", function () { _isHorizontalSwipe = false; }, { passive: true });
document.addEventListener("touchcancel", function () { _isHorizontalSwipe = false; }, { passive: true });

function fixFlipRendering(done) {
  var focused = document.activeElement;
  var isInputFocused = focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA");
  if (isInputFocused) {
    if (typeof done === "function") done();
    return;
  }

  var cards = document.querySelectorAll(".flip-inner");
  var states = [];
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    states.push({ el: card, transform: card.style.transform });
    card.style.transform = "none";
    void card.offsetHeight;
  }
  requestAnimationFrame(function () {
    for (var j = 0; j < states.length; j++) {
      states[j].el.style.transform = states[j].transform;
    }
    if (typeof done === "function") done();
  });
}

function runFlipFixOnReturn() {
  var body = document.body;
  if (!body) return;
  var focused = document.activeElement;
  if (focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA")) {
    return;
  }
  body.classList.add("flip-fix-pending");
  requestAnimationFrame(function () {
    fixFlipRendering(function () {
      requestAnimationFrame(function () {
        body.classList.remove("flip-fix-pending");
      });
    });
  });
}

document.addEventListener("pointerdown", e => {
  if (
    e.target.closest("input") ||
    e.target.closest("textarea") ||
    e.target.closest(".mode-btn") ||
    e.target.closest(".nav-btn") ||
    e.target.closest("#profileBtn") ||
    e.target.closest(".protocol-back") ||
    e.target.closest("button")
  ) {
    return;
  }

  document.activeElement?.blur();
});

/* ===== FORMAT ===== */
function formatNumber(v) {
const d = v.replace(/\D/g, "");
return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function parseNumber(v) {
return Number(v.replace(/\./g, ""));
}

/* ===== ELEMENTS ===== */
const incomeInput = document.getElementById("income");
const expensesInput = document.getElementById("expenses");
const goalInput = document.getElementById("goal");
const editGoalBtn = document.getElementById("editGoalBtn");
const goalEditorSheet = document.getElementById("goalEditorSheet");
const goalEditorOverlay = document.getElementById("goalEditorOverlay");
const goalEditHint = document.getElementById("goalEditHint");
const accountsAddBtn = document.getElementById("accountsAddBtn");
const addAccountBack = document.getElementById("addAccountBack");

const goalEditTitle = document.getElementById("goalEditTitle");
const goalEditAmount = document.getElementById("goalEditAmount");
const goalEditSave = document.getElementById("goalEditSave");
const savedInput = document.getElementById("saved");
const calculateBtn = document.getElementById("calculate");
const protocolBack = document.getElementById("protocolBack");

if (protocolBack) {
protocolBack.addEventListener("click", () => {
haptic("light");

openScreen("calc", buttons[0]);

document.querySelectorAll(
"#screen-calc label, #screen-calc .input-wrap, .mode-buttons, #calculate"
).forEach(el => el.style.display = "");

planSummary.style.display = "none";

hideBottomNav();
});
}

// ===== PLAN SUMMARY ELEMENTS =====
const planSummary = document.getElementById("planSummary");

const summaryMonthly = document.getElementById("summaryMonthly");
const summaryMonths = document.getElementById("summaryMonths");
const summaryMode = document.getElementById("summaryMode");

let selectedMode = "calm"; // calm | medium | aggressive

const modeButtons = document.querySelectorAll(".mode-buttons .mode-btn");

modeButtons.forEach(btn => {
btn.onclick = () => {
haptic("light");
modeButtons.forEach(b => b.classList.remove("active"));
btn.classList.add("active");
selectedMode = btn.dataset.mode;
saveMode = btn.dataset.mode;
saveFullState();
};
});

const adviceCard = document.getElementById("adviceCard");
const loader = document.getElementById("loader");

const sheet = document.getElementById("sheet");
const sheetOverlay = document.getElementById("sheetOverlay");
const noBuffer = document.getElementById("noBuffer");
const withBuffer = document.getElementById("withBuffer");

const lockText = document.getElementById("lockText");
const resetBtn = document.getElementById("resetPlan");
const calcLock = document.getElementById("calcLock");

const confirmReset = document.getElementById("confirmReset");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");

/* ===== NAV ===== */
const bottomNav = document.querySelector(".bottom-nav");
const advancedBtn = document.getElementById("advancedBtn");
const advancedBack = document.getElementById("advancedBack");
// ❌ скрываем bottom-nav при старте (экран расчёта)
bottomNav.style.opacity = "0";
bottomNav.style.pointerEvents = "none";
bottomNav.style.transform = "translateY(140%)";

/* ===== NAV INDICATOR ===== */
function moveIndicator(btn) {
indicator.style.opacity = "1";
if (!btn) return;

const navRect = bottomNav.getBoundingClientRect();
const btnRect = btn.getBoundingClientRect();

const x =
btnRect.left -
navRect.left +
(btnRect.width - indicator.offsetWidth) / 2;

indicator.style.transform = `translateX(${x}px) translateY(-50%)`;
}

/* ===== NAV NEVER MOVES ===== */
bottomNav.style.position = "fixed";
const NAV_BASE_BOTTOM_PX = 26;
bottomNav.style.bottom = `${NAV_BASE_BOTTOM_PX}px`;
bottomNav.style.left = "20px";
bottomNav.style.right = "20px";

// Не даём bottom-nav "подпрыгивать" над клавиатурой (mobile webview)
let layoutViewportHeight = window.innerHeight;
function updateBottomNavForKeyboard() {
  if (!bottomNav) return;
  const vv = window.visualViewport;
  if (!vv) return;

  const keyboardOffset = Math.max(
    0,
    layoutViewportHeight - vv.height - (vv.offsetTop || 0)
  );

  // Компенсируем уменьшение visual viewport отрицательным bottom,
  // чтобы панель оставалась на месте и могла быть перекрыта клавиатурой.
  bottomNav.style.bottom = `${NAV_BASE_BOTTOM_PX - keyboardOffset}px`;
}

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", updateBottomNavForKeyboard);
  window.visualViewport.addEventListener("scroll", updateBottomNavForKeyboard);
  window.addEventListener("orientationchange", () => {
    layoutViewportHeight = window.innerHeight;
    setTimeout(updateBottomNavForKeyboard, 50);
  });
  updateBottomNavForKeyboard();
}

const PROTOCOL_COLORS = [
"#3a7bfd", // основной синий
"#60a5fa", // светлый
"#1e3a8a", // тёмный
"#ffffff" // акцент
];

/* ===== STATE ===== */
let lastCalc = {};
let chosenPlan = null;
let plannedMonthly = 0;
let factRatio = null;
let factHistory = [];
let planStartValue = 0;
let isInitialized = false;
let goalCompleted = false;
let saveMode = "calm";
let selectedScenario = null;
let lastScreenBeforeProfile = "calc";
let lastNavBtnBeforeProfile = buttons[0];
let accounts = {
main: 0,
reserve: 0
};
let initialBalance = 0;
let goalMeta = {
title: "Основная цель"
};

/* ===== MULTI-GOAL SYSTEM ===== */
var activeGoalIndex = 0;

/** Returns live reference to goals in state-manager. Never cache — always call. */
function getGoals() {
  var s = getState();
  if (!Array.isArray(s.goals)) { s.goals = []; }
  return s.goals;
}

/** Writes goals array back into state-manager and persists. */
function persistGoals(goals) {
  updateState({ goals: goals.map(function (g) { return { ...g }; }) });
  saveState();
}

function syncGoalsFromPrimary() {
  var goals = getGoals();
  if (!goals.length) return;
  var g = goals[0];
  g.title = goalMeta.title;
  g.amount = parseNumber(goalInput?.value || "0");
  g.saved = accounts.main;
}

function ensureDefaultGoal() {
  var goals = getGoals();
  if (goals.length === 0) {
    var goalAmount = parseNumber(goalInput?.value || "0");
    var goalSaved = accounts.main || 0;
    goals.push({
      id: "goal_1",
      title: goalMeta.title || "Основная цель",
      amount: goalAmount,
      saved: goalSaved,
      priority: 1,
      monthlyShare: 0,
      monthsLeft: 0
    });
    persistGoals(goals);
  }
}

function reorderGoalsByPriority() {
  var goals = getGoals();
  goals.sort(function (a, b) { return a.priority - b.priority; });
}

function getGoalById(id) {
  var goals = getGoals();
  for (var i = 0; i < goals.length; i++) {
    if (goals[i].id === id) return goals[i];
  }
  return null;
}

function generateGoalId() {
  return "goal_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
}

/**
 * Distributes monthlyContribution across goals by weighted priority.
 * Weight = 1 / priority. Completed goals (saved >= amount) get 0,
 * their share redistributes to remaining goals.
 */
function computeGoalsAllocation(goals, monthlyContribution) {
  if (!goals || !goals.length || !monthlyContribution || monthlyContribution <= 0) {
    goals.forEach(function (g) { g.monthlyShare = 0; g.monthsLeft = 0; });
    return goals;
  }

  var active = [];
  goals.forEach(function (g) {
    var remaining = Math.max(0, (g.amount || 0) - (g.saved || 0));
    if (remaining <= 0) {
      g.monthlyShare = 0;
      g.monthsLeft = 0;
    } else {
      active.push(g);
    }
  });

  if (active.length === 0) return goals;

  var totalWeight = 0;
  active.forEach(function (g) {
    totalWeight += 1 / (g.priority || 1);
  });

  active.forEach(function (g) {
    var weight = (1 / (g.priority || 1)) / totalWeight;
    g.monthlyShare = Math.round(monthlyContribution * weight);
    var remaining = Math.max(0, g.amount - (g.saved || 0));
    g.monthsLeft = g.monthlyShare > 0 ? Math.ceil(remaining / g.monthlyShare) : 0;
  });

  return goals;
}

/* ===== CENTRALIZED STATE MANAGEMENT ===== */

/**
 * Единый объект состояния приложения
 * Все изменения состояния должны проходить через recalcPlan()
 */
const state = {
  goalTotal: 0,
  goalSaved: 0,
  reserveAmount: 0,
  monthlyContribution: 0,
  monthsLeft: 0,
  mode: null, // "buffer" | null
  hasReserve: false
};

/**
 * Собирает FinancialEvent[] из legacy-источников (factHistory + skip из FinancialEvents).
 * Используется движком для расчёта балансов и проекций.
 */
function assembleCashflowEvents() {
  var H = CashflowEngineHelpers;
  var events = H.factHistoryToEvents(factHistory);

  var fromState = getState().cashflowEvents || [];
  for (var i = 0; i < fromState.length; i++) {
    events.push(H.normalizeEvent(fromState[i]));
  }

  if (typeof FinancialEvents !== "undefined") {
    var legacy = FinancialEvents.getEvents();
    for (var j = 0; j < legacy.length; j++) {
      var e = legacy[j];
      if (e.type === "unexpected_expense" && e.source === "skip") {
        events.push(H.normalizeEvent({
          id: e.id,
          type: H.EVENT_TYPE.UNEXPECTED_EXPENSE,
          amount: 0,
          startDate: e.date,
          meta: { source: "skip" }
        }));
      }
    }
  }

  return events;
}

function computeGraphState() {
  var factEvents = assembleCashflowEvents();
  var factBalance = Number(initialBalance) || 0;

  factEvents.forEach(function (e) {
    if (e.frequency && e.frequency !== "once") return;
    if (e.type === "contribution") {
      factBalance += e.amount;
    }
    if (e.type === "unexpected_expense" && (!e.meta || e.meta.source !== "skip")) {
      factBalance -= e.amount;
    }
  });

  factBalance = Math.max(0, factBalance);

  var goals = getGoals();
  var activeGoal = goals[activeGoalIndex] || goals[0] || null;
  var goalMonths = lastCalc.months || 0;
  var activeMonthly = plannedMonthly || 0;
  var goalValue = parseNumber(goalInput ? goalInput.value || "0" : "0");

  if (activeGoal && goals.length > 1) {
    goalMonths = activeGoal.monthsLeft || goalMonths;
    activeMonthly = activeGoal.monthlyShare || activeMonthly;
    goalValue = activeGoal.amount || goalValue;
  }

  var hasFact = factHistory && factHistory.length > 0;

  var actualMonths = 0;
  if (hasFact) {
    var mainFacts = factHistory.filter(function (f) { return f.to === "main"; });
    var uniqueM = {};
    mainFacts.forEach(function (f) {
      var d = new Date(f.date);
      uniqueM[d.getFullYear() + "-" + d.getMonth()] = true;
    });
    actualMonths = Object.keys(uniqueM).length;
  }

  var visibleMonths = Math.max(3, actualMonths + 2, Math.min(goalMonths, actualMonths + 6));
  if (goalMonths > 0) visibleMonths = Math.min(visibleMonths, goalMonths);
  visibleMonths = Math.max(3, visibleMonths);

  return {
    factBalance: factBalance,
    goalMonths: goalMonths,
    hasFact: hasFact,
    actualMonths: actualMonths,
    visibleMonths: visibleMonths,
    plannedMonthly: activeMonthly,
    goal: goalValue
  };
}

/**
 * Централизованная функция перерасчёта плана.
 * При активном плане использует CashflowEngine для пересчёта балансов,
 * месяцев и derivedState. Маппит результат в legacy-глобалы для UI.
 */
function recalcPlan() {
  // ── Engine recalculation (когда план активен) ──
  if (isInitialized && chosenPlan && typeof CashflowEngine !== "undefined") {
    var goalVal = parseNumber(goalInput?.value || "0");
    var s = getState();
    var modelType = s.financialModel || "simple";
    var incomeVal = parseNumber(incomeInput?.value || "0");
    var expensesVal = parseNumber(expensesInput?.value || "0");
    var canRecalc = goalVal > 0 && (incomeVal > expensesVal || modelType === "cashflow");
    if (canRecalc) {
      var events = assembleCashflowEvents();
      var engine = new CashflowEngine({
        modelType: modelType,
        baseConfig: {
          goal: goalVal,
          income: incomeVal,
          expenses: expensesVal,
          saved: initialBalance,
          mode: saveMode,
          hasReserve: chosenPlan === "buffer"
        },
        events: events
      });
      var derived = engine.recalculate();

      updateState({ derivedState: derived });

      if (derived.ok) {
        lastCalc.ok = true;
        lastCalc.free = derived.free;
        lastCalc.pace = derived.pace;
        lastCalc.monthlySave = derived.monthlySave;
        lastCalc.months = derived.monthsLeft;
        lastCalc.effectiveGoal = Math.max(0, derived.remainingGoal);
        lastCalc.forecastIncome = derived.forecastIncome || 0;
        lastCalc.forecastExpense = derived.forecastExpense || 0;

        accounts.main = derived.currentGoalBalance;
        accounts.reserve = derived.reserveBalance;
        plannedMonthly = derived.plannedToGoal;
      }
    }
  }

  // ── Sync UI state ──
  state.goalTotal = parseNumber(document.getElementById("goal")?.value || "0");
  state.goalSaved = accounts.main;
  state.reserveAmount = accounts.reserve;
  state.monthlyContribution = plannedMonthly;
  state.monthsLeft = lastCalc.months || 0;
  state.mode = chosenPlan;
  state.hasReserve = chosenPlan === "buffer";

  // ── Multi-goal allocation ──
  var goalsArr = getGoals();
  if (goalsArr.length > 0 && plannedMonthly > 0) {
    syncGoalsFromPrimary();
    computeGoalsAllocation(goalsArr, plannedMonthly);
    persistGoals(goalsArr);
  }

  renderGoals();
  renderAccountsUI();

  const summaryMonthsEl = document.getElementById("summaryMonths");
  if (summaryMonthsEl && lastCalc.months) {
    summaryMonthsEl.innerText = state.monthsLeft;
  }

  if (lastCalc.ok) {
    checkMonthTransition();
    drawStaticLayer();
    animateFactLine();
  }

  updatePlanHeader();
  syncFlexibleUI();
  saveFullState();
}

/**
 * Сохраняет все данные приложения через storage layer.
 * Синхронизирует глобальные переменные → appState → storage.
 */
function saveFullState() {
  var fixedIncomeEl = document.getElementById("fixedIncomeInput");
  var fixedExpenseEl = document.getElementById("fixedExpenseInput");
  syncGoalsFromPrimary();
  updateState({
    income: incomeInput?.value?.trim() || "",
    expenses: expensesInput?.value?.trim() || "",
    goal: goalInput?.value?.trim() || "",
    saved: savedInput?.value?.trim() || "",
    saveMode: saveMode || "calm",
    factHistory: factHistory,
    lastCalc: lastCalc?.ok ? lastCalc : {},
    accounts: { ...accounts },
    chosenPlan,
    plannedMonthly,
    planStartValue,
    initialBalance,
    factRatio,
    goalCompleted,
    selectedScenario,
    isInitialized: !!isInitialized,
    goalMeta: { ...goalMeta },
    activeGoalIndex: activeGoalIndex,
    uiState: { ...state },
    fixedIncomeAmount: fixedIncomeEl ? fixedIncomeEl.value.trim() : (getState().fixedIncomeAmount || ""),
    fixedExpenseAmount: fixedExpenseEl ? fixedExpenseEl.value.trim() : (getState().fixedExpenseAmount || "")
  });
  saveState();
}

/**
 * Загружает все данные из storage layer при запуске приложения.
 * Читает appState (заполнен через initState()) → синхронизирует глобальные переменные → восстанавливает UI.
 */
function loadFullState() {
  try {
    const s = initState();

    // Синхронизируем глобальные переменные ← appState
    if (s.income && incomeInput) incomeInput.value = s.income;
    if (s.expenses && expensesInput) expensesInput.value = s.expenses;
    if (s.goal && goalInput) goalInput.value = s.goal;
    if (s.saved && savedInput) savedInput.value = s.saved;
    var fixedIncomeInputEl = document.getElementById("fixedIncomeInput");
    var fixedExpenseInputEl = document.getElementById("fixedExpenseInput");
    if (fixedIncomeInputEl && (s.fixedIncomeAmount != null && s.fixedIncomeAmount !== "")) fixedIncomeInputEl.value = s.fixedIncomeAmount;
    if (fixedExpenseInputEl && (s.fixedExpenseAmount != null && s.fixedExpenseAmount !== "")) fixedExpenseInputEl.value = s.fixedExpenseAmount;

    if (s.saveMode) {
      saveMode = s.saveMode;
      selectedMode = s.saveMode;
      modeButtons.forEach(b => {
        b.classList.toggle("active", b.dataset.mode === s.saveMode);
      });
    }

    factHistory = s.factHistory || [];

    if (s.lastCalc && s.lastCalc.ok) lastCalc = s.lastCalc;
    if (s.accounts) {
      accounts.main = Number(s.accounts.main) || 0;
      accounts.reserve = Number(s.accounts.reserve) || 0;
    }
    if (s.chosenPlan != null) chosenPlan = s.chosenPlan;
    if (s.plannedMonthly != null) plannedMonthly = s.plannedMonthly;
    if (s.planStartValue != null) planStartValue = s.planStartValue;
    if (s.initialBalance != null) initialBalance = Number(s.initialBalance) || 0;
    if (s.factRatio != null) factRatio = Number(s.factRatio) || null;
    if (typeof s.goalCompleted === "boolean") goalCompleted = s.goalCompleted;
    if (s.selectedScenario != null) selectedScenario = s.selectedScenario;
    if (typeof s.isInitialized === "boolean") isInitialized = s.isInitialized;
    if (s.goalMeta && typeof s.goalMeta === "object") Object.assign(goalMeta, s.goalMeta);
    if (s.uiState && typeof s.uiState === "object") Object.assign(state, s.uiState);

    if (typeof s.activeGoalIndex === "number") activeGoalIndex = s.activeGoalIndex;
    ensureDefaultGoal();

    if (isInitialized) {
      lockTabs(false);
      planSummary.style.display = "block";
      if (summaryMonthly && lastCalc.monthlySave) summaryMonthly.innerText = lastCalc.monthlySave.toLocaleString();
      if (summaryMonths && lastCalc.months) summaryMonths.innerText = lastCalc.months;
      if (summaryMode) summaryMode.innerText = saveMode === "calm" ? "Спокойный" : saveMode === "normal" ? "Умеренный" : "Агрессивный";
      document.querySelectorAll("#screen-calc label, #screen-calc .input-wrap, .mode-buttons, #calculate").forEach(el => el.style.display = "none");
      renderAccountsUI();
      renderGoals();

      if (chosenPlan && lastCalc?.ok) {
        if (!plannedMonthly || plannedMonthly === 0) {
          plannedMonthly = lastCalc.monthlySave;
          if (chosenPlan === "buffer") plannedMonthly = Math.round(plannedMonthly * 0.9);
        }

        // Восстанавливаем последнюю активную вкладку
        const targetScreen = s.lastActiveScreen || "advice";
        const screenToNavIndex = { calc: 0, advice: 1, accounts: 2, goals: 3, ai: 4 };
        const navIdx = screenToNavIndex[targetScreen] != null
          ? screenToNavIndex[targetScreen]
          : 1;

        openScreen(targetScreen, buttons[navIdx]);
        if (loader) loader.classList.add("hidden");

        // Навбар и стили кнопок — сразу, без rAF, чтобы не пропадал при восстановлении на любой вкладке
        lockTabs(false);
        showBottomNav();
        if (buttons[navIdx]) {
          buttons.forEach(b => b.classList.remove("active"));
          buttons[navIdx].classList.add("active");
          moveIndicator(buttons[navIdx]);
        }

        // Сразу подменяем «загрузку» на график, если восстановились на вкладку графика
        if (targetScreen === "advice") {
          try {
            renderProtocolAdviceGraph();
            if (factHistory.length) runBrain();
          } catch (err) {
            console.warn("Restore graph error:", err);
            if (adviceCard) adviceCard.innerHTML = "<p style='padding:20px'>Не удалось загрузить график.</p>";
            if (loader) loader.classList.add("hidden");
          }
        }

        requestAnimationFrame(() => {
          lockTabs(false);
          showBottomNav();
          ensureNavVisibleAfterRestore();
        });
      } else if (lastCalc?.ok) {
        const advice = CashflowEngine.buildAdvice(lastCalc);
        const baseMonthly = lastCalc.monthlySave;
        const bufferRate = 0.1;
        const scenarios = [
          {
            id: "direct",
            title: "Всё в цель",
            toGoal: baseMonthly,
            toBuffer: 0,
            months: lastCalc.months,
            risk: "Выше"
          },
          {
            id: "buffer",
            title: "С резервом",
            toGoal: Math.round(baseMonthly * (1 - bufferRate)),
            toBuffer: Math.round(baseMonthly * bufferRate),
            months: Math.ceil(
              lastCalc.effectiveGoal /
              Math.round(baseMonthly * (1 - bufferRate))
            ),
            risk: "Ниже"
          }
        ];
        const scenariosHTML = scenarios.map(s => `
<div class="card scenario-card" data-id="${s.id}">
<div style="color:#fff;font-weight:600;font-size:19px;margin-bottom:12px">
${s.title}
</div>

В цель: ${s.toGoal.toLocaleString()} ₽ / мес<br>
${s.toBuffer ? `В резерв: ${s.toBuffer.toLocaleString()} ₽<br>` : ""}
Срок: ~${s.months} мес<br>

<span style="opacity:.6">Риск: ${s.risk}</span>

${
s.id === "buffer"
? `
<div class="reserve-info reserve-ui">
<b>Резерв</b><br>
Это ваша подушка безопасности.
Эти средства можно откладывать на отдельный накопительный
или инвестиционный счёт.<br><br>
Резерв защищает от непредвиденных расходов
и снижает риск срыва цели.
</div>
`
: ""
}
</div>
`).join("");
        openScreen("advice", null);
        hideBottomNav();
        if (protocolBack) protocolBack.style.display = "block";
        renderProtocolResult({ scenariosHTML, advice });
      } else {
        openScreen("calc", buttons[0]);
        hideBottomNav();
      }
    } else {
      lockTabs(true);
      planSummary.style.display = "none";
    }
  } catch (e) {
    console.warn("Failed to load state:", e);
  }
}

// Загружаем сохранённые данные при запуске
loadFullState();

// Убираем зависший экран «Protocol анализирует данные…» (при повторном входе и при возврате без перезагрузки)
function repairAdviceScreenIfStuck() {
  const adviceScreen = document.getElementById("screen-advice");
  if (!adviceScreen || !adviceScreen.classList.contains("active")) return;
  if (!isInitialized || !chosenPlan || !lastCalc?.ok) return;
  const card = document.getElementById("adviceCard");
  if (!card || !card.innerHTML.includes("Protocol анализирует")) return;
  if (loader) loader.classList.add("hidden");
  try {
    renderProtocolAdviceGraph();
    if (factHistory.length) runBrain();
    showBottomNav();
  } catch (e) {
    console.warn("repairAdviceScreenIfStuck:", e);
    card.innerHTML = "<p style='padding:20px'>Ошибка загрузки графика.</p><button type='button' id='repairGoToCalc'>К расчёту</button>";
    document.getElementById("repairGoToCalc")?.addEventListener("click", function () {
      openScreen("calc", buttons[0]);
      hideBottomNav();
    });
  }
}

// Соответствие id экрана и индекса кнопки в навбаре
const SCREEN_TO_NAV_INDEX = { "screen-calc": 0, "screen-advice": 1, "screen-accounts": 2, "screen-goals": 3, "screen-ai": 4 };

// После повторного входа — показываем навбар, синхронизируем белый круг с открытой вкладкой, показываем зелёную кнопку на «Цели»
function ensureNavVisibleAfterRestore() {
  if (!isInitialized || !bottomNav) return;
  const activeScreen = document.querySelector(".screen.active");
  const id = activeScreen?.id;
  const isMainTab = id && ["screen-calc", "screen-advice", "screen-accounts", "screen-goals", "screen-ai"].includes(id);
  if (!isMainTab) return;
  showBottomNav();
  lockTabs(false);
  // Синхронизируем активную кнопку и индикатор с реально открытым экраном (исправляет «белый круг на Расчёте при открытых Целях»)
  const navIdx = SCREEN_TO_NAV_INDEX[id];
  if (navIdx != null && buttons[navIdx]) {
    buttons.forEach(b => b.classList.remove("active"));
    buttons[navIdx].classList.add("active");
    moveIndicator(buttons[navIdx]);
  }
  // Зелёная кнопка расширенных настроек — показывать только на вкладке «Цели»
  if (advancedBtn) {
    advancedBtn.style.display = id === "screen-goals" ? "flex" : "none";
  }
}

// После загрузки страницы — отложенная проверка (Telegram WebView может отрисовать DOM с задержкой)
setTimeout(function () {
  repairAdviceScreenIfStuck();
  ensureNavVisibleAfterRestore();
}, 350);
setTimeout(function () {
  repairAdviceScreenIfStuck();
  ensureNavVisibleAfterRestore();
}, 1000);

document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") {
    document.body.classList.add("flip-fix-pending");
  } else if (document.visibilityState === "visible") {
    runFlipFixOnReturn();
    checkMonthTransition();
    setTimeout(repairAdviceScreenIfStuck, 100);
    setTimeout(ensureNavVisibleAfterRestore, 100);
  }
});
window.addEventListener("pageshow", function (e) {
  runFlipFixOnReturn();
  if (e.persisted) {
    setTimeout(repairAdviceScreenIfStuck, 100);
    setTimeout(ensureNavVisibleAfterRestore, 100);
  } else {
    setTimeout(repairAdviceScreenIfStuck, 350);
    setTimeout(ensureNavVisibleAfterRestore, 350);
  }
});

let goalEditBaseValue = null;
let goalEditHintTimeout = null;


/* ===== INPUT FORMAT ===== */
[incomeInput, expensesInput, goalInput, savedInput].forEach(input => {
input.addEventListener("input", e => {
const p = e.target.selectionStart;
const b = e.target.value.length;
e.target.value = formatNumber(e.target.value);
const a = e.target.value.length;
e.target.selectionEnd = p + (a - b);
});
});

function hideBottomNav() {
bottomNav.style.transform = "translateY(140%)";
bottomNav.style.opacity = "0";
bottomNav.style.pointerEvents = "none";
}

function showBottomNav() {
  bottomNav.style.transform = "translateY(0)";
  bottomNav.style.opacity = "1";
  bottomNav.style.pointerEvents = "auto";
  bottomNav.style.visibility = "visible";
  // Чтобы иконки не выглядели «заблокированными» после повторного входа
  buttons.forEach((b, i) => {
    b.style.pointerEvents = i === 0 && !isInitialized ? "none" : "auto";
    b.style.opacity = isInitialized ? "1" : (i === 0 ? "1" : "0.35");
  });
}

/* ===== TAB LOCK ===== */
function lockTabs(lock) {
buttons.forEach((btn, i) => {
if (i === 0) return;
btn.style.opacity = lock ? "0.35" : "1";
btn.style.pointerEvents = lock ? "none" : "auto";
});
}
lockTabs(true);
calcLock.style.display = "none";
moveIndicator(buttons[0]);

/* ===== OPEN SCREEN ===== */
function openScreen(name, btn) {
  window.scrollTo(0, 0);

  var toast = document.getElementById("protocol-toast");
  if (toast) { clearTimeout(toast._toastTimeout); toast.remove(); }

  if (confirmReset) confirmReset.style.display = "none";

document.querySelectorAll(".screen")
  .forEach(s => s.classList.remove("active"));
document.getElementById("screen-" + name).classList.add("active");

moveProfileToActiveHeader();

buttons.forEach(b => b.classList.remove("active"));
if (btn) btn.classList.add("active");

if (btn) {
moveIndicator(btn);
} else {
indicator.style.opacity = "0";
}
clearFactInputError();

// туман только на экране «Расширенные настройки» — при любом другом экране снимаем
if (name !== "advanced") {
  document.body.classList.remove("advanced-active");
}

// показываем advanced кнопку только в goals
if (advancedBtn) {
  if (name === "goals" && isInitialized) {
    advancedBtn.style.display = "flex";
  } else {
    advancedBtn.style.display = "none";
  }
}

// Если перешли на вкладку графика, а там ещё «загрузка» (например после восстановления на Счета/Цели) — сразу рендерим график
if (name === "advice" && isInitialized && chosenPlan && lastCalc?.ok && adviceCard && adviceCard.innerHTML.includes("Protocol анализирует")) {
  try {
    if (loader) loader.classList.add("hidden");
    renderProtocolAdviceGraph();
    if (factHistory.length) runBrain();
  } catch (e) {
    console.warn("openScreen advice render:", e);
  }
}

// Сохраняем последнюю активную вкладку в appState
const navScreens = ["calc", "advice", "accounts", "goals", "ai"];
if (navScreens.includes(name) && isInitialized) {
  const navIndex = navScreens.indexOf(name);
  updateState({ lastActiveScreen: name, lastActiveNavIndex: navIndex });
  saveState();
}

if (name === "advice") syncFlexibleUI();
}
// ===== TOP PROFILE FIX =====

buttons.forEach(btn => {
btn.onclick = () => {
haptic("light");

lastScreenBeforeProfile = btn.dataset.screen;
lastNavBtnBeforeProfile = btn;

openScreen(btn.dataset.screen, btn);

if (btn.dataset.screen === "goals") {
renderGoals();
}

if (btn.dataset.screen === "accounts") {
renderAccountsUI();
}
};
});

const profileBack = document.getElementById("profileBack");
const historyBack = document.getElementById("historyBack");

if (historyBack) {
historyBack.onclick = () => {
haptic("light");
openScreen("accounts", buttons[2]); // вкладка "Счета"
};
}

if (profileBack) {
profileBack.onclick = () => {
haptic("light");

openScreen(lastScreenBeforeProfile, lastNavBtnBeforeProfile);

// показываем nav если план уже создан
if (isInitialized) {
showBottomNav();
} else {
hideBottomNav();
}
};
}

document.querySelectorAll(".account-block").forEach(block => {
  block.onclick = () => {

    const accountsScreen = document.getElementById("screen-accounts");
    if (!accountsScreen.classList.contains("active")) return;
    if (block._flipJustSwiped) return;

    const type = block.dataset.account;
    openAccountHistory(type);
  };
});

function openAccountHistory(type) {

const title = document.getElementById("historyTitle");
const list = document.getElementById("historyList");

title.innerText =
type === "reserve"
? "История резерва"
: "История основного счёта";

list.innerHTML = "";

// 1️⃣ собираем операции
let entries = factHistory
.filter(f =>
type === "reserve"
? f.to === "reserve"
: f.to === "main"
)
.map(f => ({
value: f.value,
date: new Date(f.date),
isInitial: false,
isSpent: f.value < 0
}));

// 2️⃣ добавляем стартовый баланс как самую старую запись
if (type === "main" && initialBalance > 0) {
entries.push({
value: initialBalance,
date: new Date(0), // 1970 год — гарантированно самый старый
isInitial: true
});
}

// 3️⃣ если вообще пусто
if (entries.length === 0) {
list.innerHTML = `
<div class="card" style="opacity:.6;font-size:14px">
Операций пока нет
</div>
`;
openScreen("progress", null);
return;
}

// 4️⃣ сортируем: новые сверху
entries.sort((a, b) => b.date - a.date);

// 5️⃣ рисуем
entries.forEach(e => {

if (e.isInitial) {
list.innerHTML += `
<div class="card" style="opacity:.85">
<div style="font-size:15px;font-weight:600">
Начальный баланс: ${e.value.toLocaleString()} ₽
</div>
<div style="font-size:13px;opacity:.6;margin-top:4px">
Указано при создании плана
</div>
</div>
`;
} else if (e.isSpent) {
list.innerHTML += `
<div class="card">
<div style="font-size:15px;font-weight:600;color:#f59e0b">
−${Math.abs(e.value).toLocaleString()} ₽
</div>
<div style="font-size:13px;opacity:.6;margin-top:4px">
${e.date.toLocaleDateString("ru-RU")}
</div>
<div style="font-size:12px;opacity:.7;margin-top:2px">
Незапланированный расход
</div>
</div>
`;
} else {
list.innerHTML += `
<div class="card">
<div style="font-size:15px;font-weight:600">
+${e.value.toLocaleString()} ₽
</div>
<div style="font-size:13px;opacity:.6;margin-top:4px">
${e.date.toLocaleDateString("ru-RU")}
</div>
</div>
`;
}

});

openScreen("progress", null);
}

/* ===== BOTTOM SHEET ===== */
function openSheet() {
sheetOverlay.style.display = "block";
sheet.style.bottom = "0";
}
function closeSheet() {
sheet.style.bottom = "-100%";
sheetOverlay.style.display = "none";
}

function renderProtocolResult({ scenariosHTML, advice }) {
adviceCard.innerHTML = `
<div style="margin-bottom:12px">
<div style="font-size:14px;opacity:.7;margin-bottom:6px">
Выберите возможные варианты:
</div>
${scenariosHTML}
</div>

<div style="
margin-top:10px;
padding:14px;
border-radius:14px;
background:#111;
border:1px solid #333;
font-size:15px;
line-height:1.4
">
${advice.text}
</div>
`;

document.querySelectorAll(".scenario-card").forEach(card => {
card.onclick = () => {
document
.querySelectorAll(".scenario-card")
.forEach(c => c.classList.remove("active"));

card.classList.add("active");

selectedScenario = card.dataset.id;

haptic("light");

protocolFlow(selectedScenario);
};
});
}

/* ===== CALCULATE ===== */
calculateBtn.onclick = () => {
haptic("medium");
hideBottomNav();

bottomNav.style.opacity = "0";
bottomNav.style.pointerEvents = "none";
bottomNav.style.transform = "translateY(140%)";

const validIncome = validateRequired(incomeInput);
const validExpenses = validateRequired(expensesInput);
const validGoal = validateRequired(goalInput);

if (!validIncome || !validExpenses || !validGoal) return;

// ── CashflowEngine: initial calculation ──
const engine = new CashflowEngine({
  modelType: "simple",
  baseConfig: {
    goal: parseNumber(goalInput.value),
    income: parseNumber(incomeInput.value),
    expenses: parseNumber(expensesInput.value),
    saved: parseNumber(savedInput?.value || "0"),
    mode: saveMode,
    hasReserve: false
  },
  events: []
});
const derived = engine.recalculate();

if (!derived.ok) {
  alert("Расходы превышают доходы");
  return;
}

lastCalc = {
  ok: true,
  free: derived.free,
  pace: derived.pace,
  monthlySave: derived.monthlySave,
  months: derived.monthsLeft,
  effectiveGoal: derived.remainingGoal
};

const advice = CashflowEngine.buildAdvice(lastCalc);

// ===== BUILD 2 SCENARIOS (DIRECT vs BUFFER) =====
const baseMonthly = lastCalc.monthlySave;
const bufferRate = 0.1; // 10% в подушку

const scenarios = [
{
id: "direct",
title: "Всё в цель",
toGoal: baseMonthly,
toBuffer: 0,
months: lastCalc.months,
risk: "Выше"
},
{
id: "buffer",
title: "С резервом",
toGoal: Math.round(baseMonthly * (1 - bufferRate)),
toBuffer: Math.round(baseMonthly * bufferRate),
months: Math.ceil(
lastCalc.effectiveGoal /
Math.round(baseMonthly * (1 - bufferRate))
),
risk: "Ниже"
}
];

const scenariosHTML = scenarios.map(s => `
<div class="card scenario-card" data-id="${s.id}">
<div style="color:#fff;font-weight:600;font-size:19px;margin-bottom:12px">
${s.title}
</div>

В цель: ${s.toGoal.toLocaleString()} ₽ / мес<br>
${s.toBuffer ? `В резерв: ${s.toBuffer.toLocaleString()} ₽<br>` : ""}
Срок: ~${s.months} мес<br>

<span style="opacity:.6">Риск: ${s.risk}</span>

${
s.id === "buffer"
? `
<div class="reserve-info reserve-ui">
<b>Резерв</b><br>
Это ваша подушка безопасности.
Эти средства можно откладывать на отдельный накопительный
или инвестиционный счёт.<br><br>
Резерв защищает от непредвиденных расходов
и снижает риск срыва цели.
</div>
`
: ""
}
</div>
`).join("");

renderProtocolResult({
scenariosHTML,
advice
});

isInitialized = true; // разрешаем переходы
ensureDefaultGoal();
syncGoalsFromPrimary();
openScreen("advice", null); // показываем экран с карточками
if (protocolBack) protocolBack.style.display = "block";

// показать summary
planSummary.style.display = "block";

// заполнить данные
summaryMonthly.innerText = lastCalc.monthlySave.toLocaleString();
summaryMonths.innerText = lastCalc.months;
summaryMode.innerText =
saveMode === "calm" ? "Спокойный"
: saveMode === "normal" ? "Умеренный"
: "Агрессивный";

// спрятать форму
document.querySelectorAll(
"#screen-calc label, #screen-calc .input-wrap, .mode-buttons, #calculate"
).forEach(el => el.style.display = "none");

saveFullState();
};

/* ===== TIME HELPERS ===== */

function addMonths(date, n) {
const d = new Date(date);
d.setMonth(d.getMonth() + n);
return d;
}

function renderProtocolAdviceGraph() {
  const advice = CashflowEngine.buildAdvice(lastCalc);
  const unconfigured = isFlexibleUnconfigured();
  const adviceBlockHtml = unconfigured ? "" : `<div style="
margin-top:10px;
padding:10px 12px;
border-radius:14px;
background:#111;
border:1px solid #222;
font-size:14px;
">${advice.text}</div>`;

  adviceCard.innerHTML = `
<div id="planHeader">
<div
id="planMonthly"
style="font-size:16px;font-weight:600"
></div>

<div
id="planExplanation"
style="
margin-top:8px;
font-size:14px;
line-height:1.4;
opacity:0.75;
"
></div>
<div id="inflationHint" class="inflation-hint"></div>
</div>

${adviceBlockHtml}

<div class="graph-block">
<div class="timeline-controls">
<button id="timelineBackBtn" class="timeline-back-btn" type="button" style="display:none">← Обзор</button>
</div>
<div class="chart-card">
<div class="chart-wrap" style="width:100%; height:300px; margin:0; position:relative;">
<canvas id="chartBg"></canvas>
<canvas id="chartFact"></canvas>
</div>
</div>
<div class="fact-input-row">
<input id="factInput" inputmode="numeric"
placeholder="Сколько вы отложили"
style="flex:1"/>
<button id="applyFact"
style="width:52px;height:52px;border-radius:50%">
➜
</button>
</div>
<div id="brainMessageContainer"></div>
<div id="factTooltipContainer" class="fact-tooltip-container"></div>
</div>

<button id="unexpectedExpenseBtn" class="unexpected-expense-trigger" type="button">
Непредвиденный расход
</button>
`;

  initChart();
  animatePlanGrowth();
  animateFactLine();
  if (protocolBack) protocolBack.style.display = "none";
  showBottomNav();
  buttons.forEach(b => b.classList.remove("active"));
  buttons[1].classList.add("active");
  moveIndicator(buttons[1]);
  updatePlanHeader();

  const factInput = document.getElementById("factInput");
  const applyBtn = document.getElementById("applyFact");

  if (factInput) {
    factInput.addEventListener("input", e => {
      e.target.value = formatNumber(e.target.value);
      factInput.classList.remove("error", "shake");
    });

    factInput.addEventListener("focus", () => {
      factInput.classList.remove("error", "shake");
    });
  }

  if (applyBtn && factInput) {
    applyBtn.onclick = () => {
      const fact = parseNumber(factInput.value || "0");
      factInput.classList.remove("error", "shake");

      if (!fact) {
        factInput.classList.add("error");
        void factInput.offsetWidth;
        factInput.classList.add("shake");
        haptic("error");
        return;
      }

      let toMain = fact;
      let toReserve = 0;

      if (chosenPlan === "buffer") {
        toReserve = Math.round(fact * 0.1);
        toMain = fact - toReserve;
      }

      const now = new Date();
      now.setDate(1);
      now.setHours(0, 0, 0, 0);

      factHistory.push({ value: toMain, date: now, to: "main" });
      if (toReserve > 0) {
        factHistory.push({ value: toReserve, date: now, to: "reserve" });
      }

      factRatio = fact / plannedMonthly;

      recalcPlan();
      runBrain();

      const goalTotal = parseNumber(goalInput.value || "0");
      if (!goalCompleted && goalTotal > 0 && accounts.main >= goalTotal) {
        goalCompleted = true;
        setTimeout(fireCelebration, 120);
      }

      factInput.value = "";
      factInput.blur();
    };
  }

  // Кнопка «Непредвиденный расход» — при ненастроенной гибкой модели только трясём подсказку, визуально кнопка не меняется
  const unexpBtn = document.getElementById("unexpectedExpenseBtn");
  if (unexpBtn) {
    unexpBtn.onclick = () => {
      if (isFlexibleUnconfigured()) {
        shakeFlexHint();
        haptic("error");
        return;
      }
      haptic("light");
      openUnexpectedExpenseScreen();
    };
  }

  syncFlexibleUI();
}

/* ===== STAGED FLOW ===== */
function protocolFlow(mode) {
chosenPlan = mode;
if (protocolBack) protocolBack.style.display = "none";
// initialBalance устанавливается ТОЛЬКО при создании плана из поля "Уже накоплено"
const initialSaved = parseNumber(savedInput?.value || "0");
if (accounts.main === 0 && accounts.reserve === 0) {
  if (initialSaved > 0) {
    initialBalance = initialSaved;
    planStartValue = initialSaved;
    accounts.main = initialSaved;
  } else {
    initialBalance = 0;
    planStartValue = 0;
  }
  accounts.reserve = 0;
} else {
  planStartValue = planStartValue || accounts.main;
}

isInitialized = true;
ensureDefaultGoal();
syncGoalsFromPrimary();
renderAccountsUI();
lockTabs(false);

openScreen("advice", null);
const backBtn = document.getElementById("protocolBack");
if (backBtn) backBtn.style.display = "none";
hideBottomNav();
adviceCard.innerHTML = "";
loader.classList.remove("hidden");

plannedMonthly = lastCalc.monthlySave;

if (mode === "buffer") plannedMonthly = Math.round(plannedMonthly * 0.9);

adviceCard.innerText = "Protocol анализирует данные…";

setTimeout(() => {
adviceCard.innerText =
mode === "buffer"
? "Часть средств будет направляться в резерв."
: "Все средства идут напрямую в цель.";
}, 2000);

setTimeout(() => {
adviceCard.innerText = "Готово.";
}, 4000);

setTimeout(() => {
loader.classList.add("hidden");
renderProtocolAdviceGraph();
saveFullState();
}, 6000);
}

/* ===== RESET ===== */
resetBtn.onclick = () => confirmReset.style.display = "block";
confirmNo.onclick = () => confirmReset.style.display = "none";
function performFullReset() {
  chosenPlan = null;
  isInitialized = false;
  lastCalc = {};
  plannedMonthly = 0;
  factHistory = [];
  factRatio = null;
  goalCompleted = false;
  selectedScenario = null;
  accounts.main = 0;
  accounts.reserve = 0;
  planStartValue = 0;
  initialBalance = 0;

  state.goalTotal = 0;
  state.goalSaved = 0;
  state.reserveAmount = 0;
  state.monthlyContribution = 0;
  state.monthsLeft = 0;
  state.mode = null;
  state.hasReserve = false;

  activeGoalIndex = 0;
  goalMeta.title = "Основная цель";

  clearState();

  var flexContent = document.getElementById("flexibleContent");
  var flexToggle = document.getElementById("flexibleToggle");
  if (flexContent) flexContent.classList.remove("open");
  if (flexToggle) flexToggle.classList.remove("open");

  calcLock.style.display = "none";
  confirmReset.style.display = "none";
  lockTabs(true);

  incomeInput.value = "";
  expensesInput.value = "";
  goalInput.value = "";
  if (savedInput) savedInput.value = "";

  document.querySelectorAll("#screen-calc label, #screen-calc .input-wrap, .mode-buttons, #calculate").forEach(el => el.style.display = "");
  planSummary.style.display = "none";
  modeButtons.forEach(b => b.classList.toggle("active", b.dataset.mode === "calm"));
  saveMode = "calm";
  selectedMode = "calm";

  openScreen("calc", buttons[0]);
  hideBottomNav();
}

confirmYes.onclick = () => {
  performFullReset();
};

/* ===== PROFILE ===== */
const profileBtn = document.getElementById("profileBtn");
const topProfileFixed = document.querySelector(".top-profile-fixed");

function moveProfileToActiveHeader() {
  if (!profileBtn) return;
  const activeScreen = document.querySelector(".screen.active");
  const headerRight = activeScreen?.querySelector(".header-right");
  const isProfileScreen = activeScreen?.id === "screen-profile";
  if (headerRight) {
    headerRight.appendChild(profileBtn);
    if (topProfileFixed) topProfileFixed.style.display = "";
  } else if (topProfileFixed) {
    topProfileFixed.appendChild(profileBtn);
    // На экране профиля скрываем полосу с иконкой, чтобы не перекрывать кнопку «Назад»
    topProfileFixed.style.display = isProfileScreen ? "none" : "";
  }
}

if (profileBtn) {
  moveProfileToActiveHeader();
  profileBtn.onclick = () => {
    haptic("light");
    document.activeElement?.blur();
    if (confirmReset) confirmReset.style.display = "none";
    document.body.classList.remove("advanced-active");
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById("screen-profile").classList.add("active");
    buttons.forEach(b => b.classList.remove("active"));
    bottomNav.style.transform = "translateY(140%)";
    bottomNav.style.opacity = "0";
    bottomNav.style.pointerEvents = "none";
    if (advancedBtn) advancedBtn.style.display = "none";
    moveProfileToActiveHeader();
  };
}

const profileResetPlanBtn = document.getElementById("profileResetPlan");
if (profileResetPlanBtn) {
profileResetPlanBtn.onclick = () => {
haptic("light");
confirmReset.style.display = "block";
};
}

/* ===== INPUT HINT LOGIC ===== */
document.querySelectorAll(".input-wrap input").forEach(input => {
const wrap = input.closest(".input-wrap");

input.addEventListener("focus", () => {
wrap.classList.remove("error", "shake");
wrap.classList.add("show-hint");

if (input.dataset.placeholder) {
input.placeholder = input.dataset.placeholder;
}
});

input.addEventListener("input", () => {
wrap.classList.remove("error", "shake");
wrap.classList.remove("show-hint");
});

input.addEventListener("blur", () => {
wrap.classList.remove("show-hint");
saveFullState();
});
});

/* ===== MICRO UX: HAPTIC ===== */
function haptic(type = "light") {
  if (!window.Telegram?.WebApp?.HapticFeedback) return;

  try {
    const allowed = ["light", "medium", "heavy"];

    if (!allowed.includes(type)) {
      type = "light";
    }

    Telegram.WebApp.HapticFeedback.impactOccurred(type);
  } catch (e) {
    console.warn("Haptic safely ignored:", e);
  }
}
/* ===== TELEGRAM USER AUTO FILL ===== */

const tgUser = Telegram.WebApp.initDataUnsafe?.user;

// верхняя иконка
const topAvatar = document.querySelector("#profileBtn .avatar");

// профиль
const profileAvatar = document.querySelector(".profile-avatar");
const profileName = document.querySelector(".profile-name");

if (tgUser) {
const fullName =
tgUser.first_name + (tgUser.last_name ? " " + tgUser.last_name : "");

// имя в профиле
if (profileName) {
profileName.innerText = fullName;
}

// если есть фото
if (tgUser.photo_url) {
const img = `
<img src="${tgUser.photo_url}"
style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />
`;

// верхняя иконка
if (topAvatar) topAvatar.innerHTML = img;

// аватар в профиле
if (profileAvatar) profileAvatar.innerHTML = img;
}
}
function validateRequired(input) {
const wrap = input.closest(".input-wrap");
const value = parseNumber(input.value || "0");

if (!value) {
wrap.classList.add("error");

// перезапуск shake
wrap.classList.remove("shake");
void wrap.offsetWidth; // force reflow (ВАЖНО)
wrap.classList.add("shake");

// placeholder
if (!input.dataset.placeholder) {
input.dataset.placeholder = input.placeholder;
}

input.value = "";
input.placeholder = "Обязательное поле";

haptic("error");

return false;
}

wrap.classList.remove("error", "shake");

if (input.dataset.placeholder) {
input.placeholder = input.dataset.placeholder;
}

return true;
}

// ===== WATERMARK (загружается один раз) =====
const watermarkLogo = new Image();
watermarkLogo.src = "logo.svg";

function clearFactInputError() {
const factInput = document.getElementById("factInput");
if (!factInput) return;

factInput.classList.remove("error", "shake");
}

/* ===== PREMIUM DYNAMIC TIMELINE SYSTEM ===== */

var _lastKnownMonth = new Date().getMonth();
var _lastKnownYear = new Date().getFullYear();

var timelineView = {
  mode: "overview",
  activeSegment: null
};

var _timelineCache = {
  monthsLeft: null,
  segments: null,
  calendar: null
};

var _zoomAnim = {
  progress: 0,
  targetProgress: 0,
  fromSegment: null,
  toSegment: null,
  rafId: null
};

function generateCalendarTimeline(startDate, monthsCount) {
  var result = [];
  var base = new Date(startDate);
  base.setDate(1);
  base.setHours(0, 0, 0, 0);
  var monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн",
                    "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
  for (var i = 0; i <= monthsCount; i++) {
    var d = new Date(base);
    d.setMonth(d.getMonth() + i);
    result.push({
      date: d,
      label: monthNames[d.getMonth()] + " " + d.getFullYear(),
      shortLabel: monthNames[d.getMonth()] + " " + String(d.getFullYear()).slice(2),
      monthIndex: i
    });
  }
  return result;
}

function buildTimeSegments(monthsCount) {
  if (monthsCount <= 3) {
    return [{ startMonth: 0, endMonth: monthsCount, label: "Все", monthCount: monthsCount }];
  }

  var segCount;
  if (monthsCount <= 6) segCount = 2;
  else if (monthsCount <= 12) segCount = Math.ceil(monthsCount / 3);
  else if (monthsCount <= 24) segCount = 6;
  else segCount = Math.min(8, Math.ceil(monthsCount / 6));

  var perSeg = Math.floor(monthsCount / segCount);
  var remainder = monthsCount % segCount;
  var segments = [];
  var cursor = 0;

  for (var i = 0; i < segCount; i++) {
    var count = perSeg + (i < remainder ? 1 : 0);
    segments.push({
      startMonth: cursor,
      endMonth: cursor + count,
      label: "Q" + (i + 1),
      monthCount: count
    });
    cursor += count;
  }
  return segments;
}

function getTimelineData(monthsLeft) {
  if (_timelineCache.monthsLeft === monthsLeft && _timelineCache.segments && _timelineCache.calendar) {
    return _timelineCache;
  }
  var calendar = generateCalendarTimeline(new Date(), monthsLeft);
  var segments = buildTimeSegments(monthsLeft);
  _timelineCache = { monthsLeft: monthsLeft, segments: segments, calendar: calendar };
  return _timelineCache;
}

function cubicBezierEase(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function calcTimelineX(monthIndex, totalMonths, W, padX) {
  if (totalMonths <= 0) return padX;
  var drawW = W - padX * 2;

  if (timelineView.mode === "overview" || !timelineView.activeSegment) {
    return padX + (monthIndex / totalMonths) * drawW;
  }

  var data = getTimelineData(totalMonths);
  var segs = data.segments;
  var activeSeg = timelineView.activeSegment;
  var prog = cubicBezierEase(_zoomAnim.progress);

  var activeRatio = 0.2 + 0.6 * prog;
  var inactiveTotal = 1 - activeRatio;

  var inactiveSegCount = segs.length - 1;
  var inactiveEach = inactiveSegCount > 0 ? inactiveTotal / inactiveSegCount : 0;

  var xOffset = 0;
  for (var i = 0; i < segs.length; i++) {
    var seg = segs[i];
    var segWidth;
    if (seg === activeSeg) {
      segWidth = activeRatio * drawW;
    } else {
      segWidth = inactiveEach * drawW;
    }

    if (monthIndex >= seg.startMonth && monthIndex <= seg.endMonth) {
      var localProgress = seg.monthCount > 0
        ? (monthIndex - seg.startMonth) / seg.monthCount
        : 0;
      return padX + xOffset + localProgress * segWidth;
    }
    xOffset += segWidth;
  }

  return padX + (monthIndex / totalMonths) * drawW;
}

function checkMonthTransition() {
  var now = new Date();
  var curMonth = now.getMonth();
  var curYear = now.getFullYear();
  if (curMonth !== _lastKnownMonth || curYear !== _lastKnownYear) {
    _lastKnownMonth = curMonth;
    _lastKnownYear = curYear;
    _timelineCache = { monthsLeft: null, segments: null, calendar: null };
    if (lastCalc.ok) {
      drawStaticLayer();
      animateFactLine();
    }
  }
}

function startZoomAnimation(targetSegment) {
  if (_zoomAnim.rafId) cancelAnimationFrame(_zoomAnim.rafId);

  var isZoomIn = !!targetSegment;
  timelineView.activeSegment = targetSegment;
  timelineView.mode = isZoomIn ? "segment" : "overview";

  _zoomAnim.targetProgress = isZoomIn ? 1 : 0;
  var startProg = _zoomAnim.progress;
  var startTime = null;
  var duration = 350;

  function frame(ts) {
    if (!startTime) startTime = ts;
    var elapsed = ts - startTime;
    var t = Math.min(elapsed / duration, 1);
    var eased = cubicBezierEase(t);

    _zoomAnim.progress = startProg + ((_zoomAnim.targetProgress - startProg) * eased);

    drawStaticLayer();
    var gs = computeGraphState();
    if (gs.hasFact) {
      var total = Math.max(0, factHistory.filter(function (f) { return f.to === "main"; }).reduce(function (s, f) { return s + f.value; }, 0));
      var goalValue = gs.plannedMonthly * gs.goalMonths;
      var maxValue = Math.max(total, goalValue, 1);
      drawFactLayer(1, total, maxValue);
    } else {
      hideFactLayer();
    }

    if (t < 1) {
      _zoomAnim.rafId = requestAnimationFrame(frame);
    } else {
      _zoomAnim.rafId = null;
      if (!isZoomIn) {
        timelineView.activeSegment = null;
      }
      updateTimelineBackBtn();
    }
  }

  updateTimelineBackBtn();
  _zoomAnim.rafId = requestAnimationFrame(frame);
}

function updateTimelineBackBtn() {
  var btn = document.getElementById("timelineBackBtn");
  if (!btn) return;
  var controls = btn.parentElement;
  if (timelineView.mode === "segment") {
    btn.style.display = "flex";
    btn.style.opacity = "1";
  } else {
    btn.style.opacity = "0";
    setTimeout(function () {
      if (timelineView.mode === "overview") {
        btn.style.display = "none";
      }
    }, 300);
  }
}

function handleTimelineSegmentClick(clickX, W, padX) {
  var gs = computeGraphState();
  var vMonths = gs.visibleMonths;
  if (!vMonths || vMonths <= 3 || gs.actualMonths < 4) return;

  var focused = document.activeElement;
  if (focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA")) return;

  var data = getTimelineData(vMonths);
  var segs = data.segments;
  if (segs.length <= 1) return;

  var drawW = W - padX * 2;

  if (timelineView.mode === "segment") return;

  for (var i = 0; i < segs.length; i++) {
    var seg = segs[i];
    var x1 = padX + (seg.startMonth / vMonths) * drawW;
    var x2 = padX + (seg.endMonth / vMonths) * drawW;
    if (clickX >= x1 && clickX <= x2) {
      haptic("light");
      startZoomAnimation(seg);
      return;
    }
  }
}

/* ===== GRAPH (CLEAN & STABLE) ===== */

let bgCanvas, bgCtx;
let factCanvas, factCtx;
let lastFactPoint = null;
const pad = 40;
let factDots = [];
let activeFactDot = null;
let factAnimationProgress = 1;
let isFactAnimating = false;
let dotScale = 1;
let dotTargetScale = 1;
let dotAnimating = false;
var _planLineAlpha = 1;
var _planAnimRafId = null;

function initChart() {
  var wrap = document.querySelector(".chart-wrap");

  bgCanvas = document.getElementById("chartBg");
  factCanvas = document.getElementById("chartFact");

  var dpr = window.devicePixelRatio || 1;
  var width = wrap.clientWidth;
  var height = wrap.clientHeight;

  [bgCanvas, factCanvas].forEach(function (c) {
    c.style.width = width + "px";
    c.style.height = height + "px";
    c.width = width * dpr;
    c.height = height * dpr;
  });

  bgCtx = bgCanvas.getContext("2d");
  factCtx = factCanvas.getContext("2d");

  bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  factCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  timelineView.mode = "overview";
  timelineView.activeSegment = null;
  _zoomAnim.progress = 0;

  drawStaticLayer();

  factCanvas.addEventListener("pointerdown", function (e) {
    e.stopPropagation();

    var rect = factCanvas.getBoundingClientRect();
    var clickX = e.clientX - rect.left;
    var clickY = e.clientY - rect.top;

    var gs = computeGraphState();
    if (gs.hasFact && lastFactPoint) {
      var dx = clickX - lastFactPoint.x;
      var dy = clickY - lastFactPoint.y;
      var distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= 25) {
        animateDotScale(1.8);
        showFactTooltip({ value: gs.factBalance, onHide: function () { animateDotScale(1); } });
        return;
      }
    }

    var W = width;
    handleTimelineSegmentClick(clickX, W, 40);
  });

  var backBtn = document.getElementById("timelineBackBtn");
  if (backBtn) {
    backBtn.onclick = function () {
      haptic("light");
      startZoomAnimation(null);
    };
  }

  updateTimelineBackBtn();
}

function buildPlanTimeline(startDate, monthlyAmount, months) {
const points = [];

let total = 0;

for (let i = 0; i <= months; i++) {
points.push({
date: addMonths(startDate, i),
value: Math.max(0, total)
});
total += monthlyAmount;
}

return points;
}

function formatDate(d) {
return d.toLocaleDateString("ru-RU", {
month: "short",
year: "2-digit"
});
}

function runBrain() {
if (!factHistory.length) return;

// группируем факты по месяцам
const grouped = {};

factHistory.forEach(f => {
const d = new Date(f.date);
const key = `${d.getFullYear()}-${d.getMonth()}`;

if (!grouped[key]) grouped[key] = 0;
grouped[key] += f.value;
});

const monthsPassed = Object.keys(grouped).length;

const actual = Object.values(grouped)
.reduce((s, v) => s + v, 0);

const planned = plannedMonthly * monthsPassed;
const diff = actual - planned;

let text = "";

if (diff >= 0) {
text = "Ты идёшь по плану или лучше. Всё под контролем.";
} else if (diff > -planned * 0.1) {
text = "Есть небольшое отставание. Пока не критично.";
} else {
text = "Ты заметно отстаёшь от плана. Стоит пересмотреть стратегию.";
}

showBrainMessage(text);
}

function showBrainMessage(text) {
  const container = document.getElementById("brainMessageContainer");
  if (!container) return;
  container.innerHTML = "";

  const block = document.createElement("div");
  block.className = "brain-message";
  block.style.marginTop = "12px";
  block.style.padding = "12px";
  block.style.borderRadius = "12px";
  block.style.background = "#0e0e0e";
  block.style.border = "1px solid #222";
  block.style.fontSize = "14px";
  block.innerText = text;

  container.appendChild(block);
}

/**
 * Всплывающая toast-подсказка сверху экрана.
 * @param {string} message - Текст сообщения
 * @param {string} type - "error" | "success" | "info"
 */
function showToast(message, type) {
  type = type === "error" || type === "success" || type === "info" ? type : "info";

  const existing = document.getElementById("protocol-toast");
  if (existing) {
    clearTimeout(existing._toastTimeout);
    existing.remove();
  }

  const el = document.createElement("div");
  el.id = "protocol-toast";
  el.className = "toast toast--" + type;
  el.textContent = message;
  document.body.appendChild(el);

  requestAnimationFrame(() => {
    el.classList.add("toast--visible");
  });

  const duration = 2000;
  el._toastTimeout = setTimeout(() => {
    el.classList.remove("toast--visible");
    el.classList.add("toast--hiding");
    setTimeout(() => {
      el.remove();
    }, 300);
  }, duration);
}

function showFactTooltip({ value, onHide }) {
  const container = document.getElementById("factTooltipContainer");
  if (container) {
    const old = container.querySelector(".fact-tooltip");
    if (old) old.remove();
    container.innerHTML = "";
  }

  const block = document.createElement("div");
  block.className = "fact-tooltip";

  const factOnly = Math.max(0, value);
  const date = new Date().toLocaleDateString("ru-RU");
  block.innerHTML = `
<div class="fact-date">${date}</div>
<div class="fact-value">
Отложено: ${factOnly.toLocaleString()} ₽
</div>
`;

  if (container) {
    container.appendChild(block);
  } else {
    adviceCard.appendChild(block);
  }

  setTimeout(() => {
    block.classList.add("hide");
    if (onHide) onHide();
    setTimeout(() => {
      block.remove();
      if (container) container.innerHTML = "";
      activeFactDot = null;
    }, 280);
  }, 4000);
}

/**
 * Обновляет UI элементов счетов
 * ⚠️ ВАЖНО: Эта функция вызывается из recalcPlan().
 * Не вызывайте её напрямую - используйте recalcPlan() для обновления состояния.
 */
function renderAccountsUI() {
console.log("chosenPlan:", chosenPlan);
const mainEl = document.getElementById("mainAmount");
const reserveEl = document.getElementById("reserveAmount");
const mainTitleEl = document.getElementById("mainAccountTitle");

var goals = getGoals();
var activeGoal = goals[activeGoalIndex] || goals[0] || null;

if (mainEl) {
  if (activeGoal) {
    mainEl.innerText = (activeGoal.saved || 0).toLocaleString();
  } else {
    mainEl.innerText = accounts.main.toLocaleString();
  }
}

if (mainTitleEl) {
  if (activeGoalIndex === 0 || !activeGoal) {
    mainTitleEl.innerText = "Основной счёт";
  } else {
    mainTitleEl.innerText = activeGoal.title || "Счёт";
  }
}

if (reserveEl) {
reserveEl.innerText = accounts.reserve.toLocaleString();
}

const reserveBlock = document.querySelector(
'.account-block[data-account="reserve"]'
);

if (reserveBlock) {
if (chosenPlan === "buffer") {
reserveBlock.classList.add("show-reserve");
requestAnimationFrame(function () {
  var inner = reserveBlock.querySelector(".flip-inner");
  var front = reserveBlock.querySelector(".account-flip-front");
  if (inner && front && front.scrollHeight > 0) {
    inner.style.height = front.scrollHeight + "px";
  }
});
} else {
reserveBlock.classList.remove("show-reserve");
}
}

if (typeof renderAccountBackCards === "function") renderAccountBackCards();
}

/**
 * Обновляет UI элементов цели
 * ⚠️ ВАЖНО: Эта функция вызывается из recalcPlan().
 * Не вызывайте её напрямую - используйте recalcPlan() для обновления состояния.
 */
function renderGoals() {
if (!lastCalc.ok) return;

const titleEl = document.getElementById("goalTitle");
if (titleEl) {
titleEl.innerText = goalMeta.title;
}

// ===== ОСНОВНАЯ ЦЕЛЬ =====
const saved = accounts.main;
const total = parseNumber(goalInput.value || "0");

const percent = total
? Math.min(100, Math.round((saved / total) * 100))
: 0;

document.getElementById("goalTotal").innerText =
total.toLocaleString();

document.getElementById("goalSaved").innerText =
saved.toLocaleString();

document.getElementById("goalPercent").innerText = percent;

document.getElementById("goalProgressBar").style.width =
percent + "%";

const verdict = document.getElementById("goalVerdict");

if (percent >= 100) {
verdict.innerText =
"Цель достигнута. Protocol фиксирует успех.";
} else if (percent >= 70) {
verdict.innerText =
"Цель близка к завершению. Темп хороший.";
} else {
verdict.innerText =
"Цель в процессе. Стабильность важнее скорости.";
}

// ===== РЕЗЕРВ =====
const reserveCard = document.getElementById("goalReserveCard");

if (chosenPlan === "buffer") {
reserveCard.style.display = "block";
document.getElementById("goalReserveAmount").innerText =
accounts.reserve.toLocaleString();
} else {
reserveCard.style.display = "none";
}

if (typeof updateGoalsButton === "function") updateGoalsButton();
}

function fireCelebration() {
// haptic — аккуратно
Telegram.WebApp.HapticFeedback.notificationOccurred("success");

const duration = 2600;
const end = Date.now() + duration;

const base = {
spread: 60,
ticks: 140,
gravity: 0.9,
decay: 0.92,
startVelocity: 28,
colors: [
"#3a7bfd",
"#60a5fa",
"#1e3a8a",
"#ffffff"
]
};

(function frame() {
confetti({
particleCount: 6,
angle: 60,
spread: 70,
origin: { x: 0 },
colors: PROTOCOL_COLORS
});

confetti({
particleCount: 6,
angle: 120,
spread: 70,
origin: { x: 1 },
colors: PROTOCOL_COLORS
});

if (Date.now() < end) {
requestAnimationFrame(frame);
}
})();
}

let confettiInstance = null;

function initConfetti() {
const canvas = document.getElementById("confetti-canvas");
if (!canvas || !window.confetti) return;

confettiInstance = window.confetti.create(canvas, {
resize: true,
useWorker: true
});
}

// сразу инициализируем
initConfetti();

if (editGoalBtn) {
editGoalBtn.onclick = () => {
haptic("light");

hideBottomNav();
if (advancedBtn) advancedBtn.style.display = "none";

goalEditTitle.value = goalMeta.title;
goalEditAmount.value = goalInput.value;
goalEditBaseValue = parseNumber(goalInput.value || "0");

goalEditorOverlay.style.display = "block";

// 🔥 ДАЁМ БРАУЗЕРУ 1 КАДР
requestAnimationFrame(() => {
goalEditorSheet.style.transform = "translateY(0)";
});
};
}

goalEditorOverlay.onclick = () => {
goalEditorSheet.style.transform = "translateY(100%)";
setTimeout(() => {
goalEditorOverlay.style.display = "none";
showBottomNav();
if (advancedBtn && isInitialized) advancedBtn.style.display = "flex";
goalEditHint.classList.remove("show");
}, 550);
};

goalEditSave.onclick = () => {
haptic("medium");

const newTitle = goalEditTitle.value.trim();
const newAmount = parseNumber(goalEditAmount.value || "0");

if (!newTitle || !newAmount) {
haptic("error");
return;
}

// 1️⃣ обновляем мету цели
goalMeta.title = newTitle;

// 2️⃣ обновляем ТОЛЬКО цель (не трогаем accounts)
goalInput.value = formatNumber(String(newAmount));

// 3️⃣ если цель стала меньше накопленного — считаем её выполненной
if (accounts.main >= newAmount) {
goalCompleted = true;
}

// 4️⃣ закрываем редактор
goalEditorSheet.style.transform = "translateY(100%)";
setTimeout(() => {
goalEditorOverlay.style.display = "none";
showBottomNav();
if (advancedBtn && isInitialized) advancedBtn.style.display = "flex";
}, 550);
recalcPlan();
pulseGoalCard();
};

goalEditAmount.addEventListener("input", e => {
e.target.value = formatNumber(e.target.value);

const newValue = parseNumber(e.target.value || "0");
if (!goalEditBaseValue || !newValue) return;

const ratio = newValue / goalEditBaseValue;

clearTimeout(goalEditHintTimeout);

goalEditHintTimeout = setTimeout(() => {
handleGoalEditHint(ratio);
}, 420);
});

function pulseGoalCard() {
const card = document.getElementById("activeGoalCard");
if (!card) return;

card.classList.add("pulse");
setTimeout(() => card.classList.remove("pulse"), 400);
}

let goalPulseTimeout = null;

function pulseGoalCard() {
const card = document.getElementById("activeGoalCard");
if (!card) return;

card.classList.remove("pulse");
clearTimeout(goalPulseTimeout);

card.classList.add("pulse");
goalPulseTimeout = setTimeout(() => {
card.classList.remove("pulse");
}, 400);
}

function recalcPlanAfterGoalChange() {
  recalcPlan();
}

function isCashflowNoData() {
  var s = getState();
  if (s.financialModel !== "cashflow") return false;
  var d = s.derivedState || {};
  return !d.hasIncomeData;
}

function updatePlanHeader() {
const monthlyEl = document.getElementById("planMonthly");
const explainEl = document.getElementById("planExplanation");

if (!monthlyEl || !explainEl) return;

if (isFlexibleUnconfigured()) {
  monthlyEl.innerText = "";
  explainEl.innerHTML = "";
  return;
}

if (isCashflowNoData()) {
  monthlyEl.innerText = "Заполните гибкую финансовую модель";
  explainEl.innerHTML = "Добавьте хотя бы одно событие дохода через «Добавить событие»,<br>чтобы Protocol рассчитал прогноз.";
  return;
}

if (!lastCalc.ok) return;

monthlyEl.innerText =
  `План: ${plannedMonthly.toLocaleString()} ₽ / месяц`;

var s = getState();
var isCashflow = (s.financialModel === "cashflow");

var explainText = lastCalc.ok
  ? (isCashflow ? "Прогноз дохода: " + (lastCalc.forecastIncome || 0).toLocaleString() + " ₽ / мес\n"
      + "Прогноз расхода: " + (lastCalc.forecastExpense || 0).toLocaleString() + " ₽ / мес\n" : "")
    + "Свободно в месяц: " + (lastCalc.free || 0).toLocaleString() + " ₽\n"
    + "Откладываете: " + (lastCalc.monthlySave || 0).toLocaleString() + " ₽\n"
    + "Это ~" + Math.round((lastCalc.pace || 0) * 100) + "% от свободных средств\n"
    + "Цель будет достигнута примерно за " + (lastCalc.months || 0) + " мес"
  : "Когда расходы больше доходов, любой план будет нестабильным.";
explainEl.innerHTML = explainText.replace(/\n/g, "<br>");

var inflationEl = document.getElementById("inflationHint");
if (inflationEl) {
  var infl = (typeof getActiveInflation === "function") ? getActiveInflation() : null;
  if (infl != null && infl > 0) {
    inflationEl.textContent = "Текущая инфляция: " + infl + "%";
    inflationEl.style.display = "";
  } else {
    inflationEl.textContent = "";
    inflationEl.style.display = "none";
  }
}
}

function handleGoalEditHint(ratio) {
if (!goalEditHint) return;

if (ratio < 1.2) {
goalEditHint.classList.remove("show");
return;
}

let text = "";

if (ratio >= 3) {
text =
"Цель увеличена более чем в 3 раза. План станет значительно длиннее — убедитесь, что это осознанное решение.";
} else if (ratio >= 2) {
text =
"Цель увеличена в 2 раза. Срок и нагрузка изменятся.";
} else {
text =
"Цель заметно увеличена. Protocol пересчитает план.";
}

goalEditHint.innerText = text;
goalEditHint.classList.add("show");
}

function drawStaticLayer() {
var W = bgCanvas.width / (window.devicePixelRatio || 1);
var H = bgCanvas.height / (window.devicePixelRatio || 1);

bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

var padX = 40;
var gridY = 5;

// СЕТКА (горизонтальные линии)
bgCtx.strokeStyle = "rgba(255,255,255,0.06)";
bgCtx.lineWidth = 1;

for (var i = 1; i < gridY; i++) {
  var y = padX + (i / gridY) * (H - padX * 2);
  bgCtx.beginPath();
  bgCtx.moveTo(padX, y);
  bgCtx.lineTo(W - padX, y);
  bgCtx.stroke();
}

var graphState = computeGraphState();
var actualMonths = graphState.actualMonths;
var vMonths = graphState.visibleMonths;
var divisions = 0;
if (actualMonths >= 4) {
  divisions = Math.floor((actualMonths - 1) / 3);
}

if (divisions > 0) {
  bgCtx.save();
  bgCtx.strokeStyle = "rgba(255,255,255,0.15)";
  bgCtx.lineWidth = 1;
  for (var di = 1; di <= divisions; di++) {
    var divMonth = di * 3;
    if (divMonth >= vMonths) continue;
    var divX = padX + (divMonth / vMonths) * (W - padX * 2);
    if (divX >= W - padX - 5) continue;
    bgCtx.beginPath();
    bgCtx.moveTo(divX, padX);
    bgCtx.lineTo(divX, H - padX);
    bgCtx.stroke();
  }
  bgCtx.restore();
}

// ОСИ
bgCtx.strokeStyle = "#333";
bgCtx.lineWidth = 1;
bgCtx.beginPath();
bgCtx.moveTo(padX, padX);
bgCtx.lineTo(padX, H - padX);
bgCtx.lineTo(W - padX, H - padX);
bgCtx.stroke();

drawPlanLine();
drawMonthLabels();

// ===== WATERMARK =====
// drawSegmentLabels removed to avoid duplicate month labels
var size = 170;
var centerX = W / 2;
var centerY = H / 2;

bgCtx.save();

bgCtx.globalAlpha = 0.07;
bgCtx.drawImage(
  watermarkLogo,
  centerX - size / 2,
  centerY - size / 2 - 12,
  size,
  size
);

bgCtx.globalAlpha = 0.16;
bgCtx.fillStyle = "#ffffff";
bgCtx.font = "600 16px Inter, system-ui";
bgCtx.textAlign = "center";
bgCtx.textBaseline = "top";

var textY = centerY + size / 2 - 20;
bgCtx.fillText("Protocol", centerX, textY);

var protocolWidth = bgCtx.measureText("Protocol").width;

bgCtx.globalAlpha = 0.12;
bgCtx.font = "400 10px Inter, system-ui";
bgCtx.fillText("™", centerX + protocolWidth / 2 + 3, textY - 4);

bgCtx.restore();
}

function drawMonthLabels() {
  var gs = computeGraphState();
  var vMonths = gs.visibleMonths;
  if (!vMonths) return;

  var W = bgCanvas.width / (window.devicePixelRatio || 1);
  var H = bgCanvas.height / (window.devicePixelRatio || 1);
  var padX = 40;
  var drawW = W - padX * 2;

  var data = getTimelineData(vMonths);
  var calendar = data.calendar;

  bgCtx.font = "11px Inter, system-ui";
  bgCtx.textAlign = "center";
  bgCtx.textBaseline = "top";

  var minGap = 62;
  var maxLabels = Math.max(2, Math.floor(drawW / minGap));
  var step = Math.max(1, Math.ceil(vMonths / maxLabels));

  var lastDrawnX = -Infinity;

  for (var i = 0; i <= vMonths; i++) {
    if (i % step !== 0 && i !== vMonths && i !== 0) continue;
    if (i >= calendar.length) break;

    var x = padX + (i / vMonths) * drawW;
    if (x - lastDrawnX < minGap - 5 && i !== 0) continue;

    var label = calendar[i].shortLabel;
    bgCtx.fillStyle = "rgba(255,255,255,0.35)";
    bgCtx.fillText(label, x, H - padX + 8);
    lastDrawnX = x;
  }
}

function drawSegmentLabels() {
  var gs = computeGraphState();
  var monthsTotal = gs.visibleMonths;
  if (!monthsTotal || monthsTotal <= 3) return;

  var W = bgCanvas.width / (window.devicePixelRatio || 1);
  var H = bgCanvas.height / (window.devicePixelRatio || 1);
  var padX = 40;
  var data = getTimelineData(monthsTotal);
  var segs = data.segments;
  var calendar = data.calendar;

  if (segs.length <= 1) return;

  bgCtx.font = "600 10px Inter, system-ui";
  bgCtx.textAlign = "center";
  bgCtx.textBaseline = "bottom";

  for (var i = 0; i < segs.length; i++) {
    var seg = segs[i];
    var sx1 = calcTimelineX(seg.startMonth, monthsTotal, W, padX);
    var sx2 = calcTimelineX(seg.endMonth, monthsTotal, W, padX);
    var cx = (sx1 + sx2) / 2;

    var isActive = (timelineView.mode === "segment" && timelineView.activeSegment === seg);
    var alpha = isActive ? 0.7 : 0.3;

    var startLabel = seg.startMonth < calendar.length ? calendar[seg.startMonth].shortLabel : "";
    var endLabel = seg.endMonth < calendar.length ? calendar[seg.endMonth].shortLabel : "";
    var segLabel = startLabel + " – " + endLabel;

    bgCtx.fillStyle = "rgba(255,255,255," + alpha + ")";
    bgCtx.fillText(segLabel, cx, padX - 4);
  }
}

function drawPlanLine() {
  var gs = computeGraphState();
  var W = bgCanvas.width / (window.devicePixelRatio || 1);
  var H = bgCanvas.height / (window.devicePixelRatio || 1);
  var padX = 40;
  var goalMonths = gs.goalMonths;
  if (!goalMonths) return;

  var points = buildPlanTimeline(new Date(), plannedMonthly, goalMonths);
  var goalValue = plannedMonthly * goalMonths;
  var maxValue = Math.max(goalValue, points[points.length - 1].value, 1);
  if (maxValue <= 0) return;

  bgCtx.save();
  bgCtx.globalAlpha = _planLineAlpha;

  var monthlyNet = lastCalc.free || 0;
  if (monthlyNet <= 0) {
    bgCtx.strokeStyle = "#ef4444";
  } else {
    var gradient = bgCtx.createLinearGradient(padX, 0, W - padX, 0);
    gradient.addColorStop(0, "#3a7bfd");
    gradient.addColorStop(1, "#60a5fa");
    bgCtx.strokeStyle = gradient;
  }

  bgCtx.lineWidth = 2.5;
  bgCtx.shadowColor = "rgba(58,123,253,0.35)";
  bgCtx.shadowBlur = 14;
  bgCtx.lineCap = "round";
  bgCtx.lineJoin = "round";
  bgCtx.beginPath();

  var drawW = W - padX * 2;

  for (var i = 0; i < points.length; i++) {
    var x = padX + (i / goalMonths) * drawW;
    var val = Math.max(0, points[i].value);
    var y = H - padX - (val / maxValue) * (H - padX * 2);
    y = Math.max(padX, Math.min(y, H - padX));
    if (i === 0) bgCtx.moveTo(x, y);
    else bgCtx.lineTo(x, y);
  }

  bgCtx.stroke();
  bgCtx.restore();
}

function animatePlanGrowth() {
  if (_planAnimRafId) cancelAnimationFrame(_planAnimRafId);
  _planLineAlpha = 0;

  function step() {
    _planLineAlpha = Math.min(_planLineAlpha + 0.04, 1);
    drawStaticLayer();
    if (_planLineAlpha < 1) {
      _planAnimRafId = requestAnimationFrame(step);
    } else {
      _planAnimRafId = null;
    }
  }

  _planAnimRafId = requestAnimationFrame(step);
}

let animationFrameId = null;

function hideFactLayer() {
  if (factCtx) factCtx.clearRect(0, 0, factCanvas.width, factCanvas.height);
  lastFactPoint = null;
  var tooltip = document.getElementById("factTooltipContainer");
  if (tooltip) tooltip.innerHTML = "";
}

function animateFactLine() {
var gs = computeGraphState();

if (!gs.hasFact) {
  hideFactLayer();
  return;
}

if (!gs.plannedMonthly || !gs.goalMonths) return;

var total = Math.max(0, factHistory
  .filter(function (f) { return f.to === "main"; })
  .reduce(function (s, f) { return s + f.value; }, 0));

var goalValue = gs.plannedMonthly * gs.goalMonths;
var maxValue = Math.max(total, goalValue, 1);

var start = null;
var duration = 900;

function frame(timestamp) {
  if (!start) start = timestamp;
  var progress = Math.min((timestamp - start) / duration, 1);
  var eased = 1 - Math.pow(1 - progress, 3);
  drawFactLayer(eased, total, maxValue);
  if (progress < 1) {
    requestAnimationFrame(frame);
  }
}

requestAnimationFrame(frame);
}

function drawFactLayer(progress, total, maxValue) {
  var gs = computeGraphState();
  var W = factCanvas.width / (window.devicePixelRatio || 1);
  var H = factCanvas.height / (window.devicePixelRatio || 1);
  var padX = 40;
  var drawW = W - padX * 2;

  factCtx.clearRect(0, 0, factCanvas.width, factCanvas.height);

  var goalMonths = gs.goalMonths;
  if (!goalMonths) return;

  var mainFacts = factHistory.filter(function (f) { return f.to === "main"; });

  if (mainFacts.length === 0) {
    lastFactPoint = null;
    return;
  }

  var monthsPassed = Math.max(1, gs.actualMonths);

  var factValue = Math.max(0, total);
  var targetX = padX + (monthsPassed / goalMonths) * drawW;
  var x = padX + (targetX - padX) * progress;
  var y = H - padX - (factValue / maxValue) * (H - padX * 2) * progress;
  y = Math.max(padX, Math.min(y, H - padX));

  lastFactPoint = { x: x, y: y };

  factCtx.save();
  factCtx.strokeStyle = "#ffffff";
  factCtx.lineWidth = 2.2;
  factCtx.lineCap = "round";
  factCtx.shadowColor = "rgba(255,255,255,0.4)";
  factCtx.shadowBlur = 10;

  factCtx.beginPath();
  factCtx.moveTo(padX, H - padX);
  factCtx.lineTo(x, y);
  factCtx.stroke();
  factCtx.restore();

  if (progress >= 1) {
    var radius = 5 * dotScale;

    factCtx.save();
    factCtx.shadowColor = "rgba(255,255,255,0.5)";
    factCtx.shadowBlur = 12;

    factCtx.beginPath();
    factCtx.arc(x, y, radius, 0, Math.PI * 2);
    factCtx.fillStyle = "#ffffff";
    factCtx.fill();

    factCtx.lineWidth = 1.2;
    factCtx.strokeStyle = "rgba(255,255,255,0.6)";
    factCtx.stroke();
    factCtx.restore();

    if (dotScale > 1.05) {
      var glowRadius = radius * 2.8;
      var glow = factCtx.createRadialGradient(x, y, 0, x, y, glowRadius);
      glow.addColorStop(0, "rgba(255,255,255,0.4)");
      glow.addColorStop(0.4, "rgba(255,255,255,0.18)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      factCtx.beginPath();
      factCtx.arc(x, y, glowRadius, 0, Math.PI * 2);
      factCtx.fillStyle = glow;
      factCtx.fill();
    }
  }
}

function animateDotScale(target, duration = 220) {
dotTargetScale = target;
const startScale = dotScale;
const diff = target - startScale;

let start = null;
dotAnimating = true;

function frame(ts) {
if (!start) start = ts;

const progress = Math.min((ts - start) / duration, 1);
const eased = 1 - Math.pow(1 - progress, 3);

dotScale = startScale + diff * eased;

var gs = computeGraphState();
var total = Math.max(0, factHistory
.filter(function (f) { return f.to === "main"; })
.reduce(function (s, f) { return s + f.value; }, 0));

var goalValue = gs.plannedMonthly * gs.goalMonths;
var maxValue = Math.max(total, goalValue, 1);

drawFactLayer(1, total, maxValue);

if (progress < 1) {
requestAnimationFrame(frame);
} else {
dotAnimating = false;
}
}

requestAnimationFrame(frame);
}

/* ===== ADVANCED SCREEN LOGIC ===== */

if (advancedBtn) {
  advancedBtn.onclick = () => {

    haptic("light");
    
       document.body.classList.add("advanced-active");

    // скрываем все экраны
document.querySelectorAll(".screen")
  .forEach(s => s.classList.remove("active"));

    // показываем advanced
    document
      .getElementById("screen-advanced")
      .classList.add("active");
      
      document.querySelector(".app").scrollTop = 0;

    // скрываем nav
    hideBottomNav();

    // скрываем кнопку
    advancedBtn.style.display = "none";
  };
}

if (advancedBack) {
  advancedBack.onclick = () => {

    haptic("light");
    
    document.body.classList.remove("advanced-active");

    openScreen("goals", buttons[3]);

    showBottomNav();
  };
}

/* ===== ADD ACCOUNT SCREEN ===== */

if (addAccountBack) {
  addAccountBack.onclick = () => {

    haptic("light");

    openScreen("accounts", buttons[2]);

    showBottomNav();
  };
}

/* ===== FLIP CARD SWIPE ===== */

function measureBackContentHeight(wrapper) {
  var backCard = wrapper.querySelector(".account-back-card");
  var backContent = wrapper.querySelector(".account-back-content");
  if (!backContent || !backCard) return 0;

  var prevCardH = backCard.style.height;
  var prevContentH = backContent.style.height;
  backCard.style.height = "auto";
  backContent.style.height = "auto";
  var h = backContent.scrollHeight;
  backCard.style.height = prevCardH;
  backContent.style.height = prevContentH;
  return h;
}

function syncAccountFlipHeight(wrapper, isFlipped) {
  if (!wrapper || !wrapper.classList.contains("account-block")) return;
  if (wrapper.classList.contains("reserve") && !wrapper.classList.contains("show-reserve")) return;
  var inner = wrapper.querySelector(".flip-inner");
  if (!inner) return;
  var front = wrapper.querySelector(".account-flip-front");
  if (!front) return;

  var frontH = front.scrollHeight;
  if (frontH <= 0) return;

  if (!isFlipped) {
    inner.style.height = frontH + "px";
    return;
  }

  var backH = measureBackContentHeight(wrapper);
  inner.style.height = Math.max(frontH, backH) + "px";
}

function setupFlipSwipe(wrapper) {
  if (!wrapper) return;
  const inner = wrapper.querySelector(".flip-inner");
  if (!inner) return;

  if (wrapper.classList.contains("account-block")) {
    var front = wrapper.querySelector(".account-flip-front");
    if (front && front.scrollHeight > 0) {
      inner.style.height = front.scrollHeight + "px";
    }
  }

  let startX = 0;
  let dx = 0;
  let swiping = false;
  const THRESHOLD = 60;

  wrapper.addEventListener("touchstart", function (e) {
    const t = e.touches[0];
    startX = t.clientX;
    dx = 0;
    swiping = true;
    inner.style.transition = "none";
  }, { passive: true });

  wrapper.addEventListener("touchmove", function (e) {
    if (!swiping) return;
    dx = e.touches[0].clientX - startX;
    const flipped = inner.classList.contains("flipped");
    const base = flipped ? 180 : 0;
    const sign = flipped ? 1 : -1;
    const angle = base + sign * (dx / wrapper.offsetWidth) * 90;
    inner.style.transform = "rotateY(" + (-angle) + "deg)";
  }, { passive: true });

  wrapper.addEventListener("touchend", function () {
    if (!swiping) return;
    swiping = false;
    inner.style.transition = "";
    if (dx < -THRESHOLD) {
      inner.classList.add("flipped");
      syncAccountFlipHeight(wrapper, true);
      wrapper._flipJustSwiped = true;
      setTimeout(function () { wrapper._flipJustSwiped = false; }, 300);
    } else if (dx > THRESHOLD) {
      inner.classList.remove("flipped");
      syncAccountFlipHeight(wrapper, false);
      wrapper._flipJustSwiped = true;
      setTimeout(function () { wrapper._flipJustSwiped = false; }, 300);
    }
    inner.style.transform = "";
  });

  wrapper.addEventListener("touchcancel", function () {
    if (!swiping) return;
    swiping = false;
    inner.style.transition = "";
    inner.style.transform = "";
  });
}

(function initFlipSwipe() {
  document.querySelectorAll(".account-block.flip-wrapper").forEach(function (wrapper) {
    setupFlipSwipe(wrapper);
  });
})();

/* ===== UNEXPECTED EXPENSE SYSTEM ===== */

let selectedExpenseSource = null;

function openUnexpectedExpenseScreen() {
  selectedExpenseSource = null;

  document.activeElement?.blur();

  const options = document.querySelectorAll(".unexpected-option");
  options.forEach(o => o.classList.remove("selected"));

  const amountBlock = document.getElementById("unexpectedAmountBlock");
  const skipBlock = document.getElementById("unexpectedSkipBlock");
  const amountInput = document.getElementById("unexpectedAmount");
  if (amountBlock) amountBlock.style.display = "none";
  if (skipBlock) skipBlock.style.display = "none";
  if (amountInput) amountInput.value = "";

  const reserveOption = document.querySelector('.unexpected-option[data-source="reserve"]');
  if (reserveOption) {
    reserveOption.style.display = chosenPlan === "buffer" ? "flex" : "none";
    reserveOption.classList.toggle("disabled", accounts.reserve === 0);
  }

  openScreen("unexpected", null);
  hideBottomNav();
  window.scrollTo(0, 0);
}

// Выбор варианта
document.querySelectorAll(".unexpected-option").forEach(opt => {
  opt.addEventListener("click", function () {
    if (this.classList.contains("disabled")) {
      if (this.dataset.source === "reserve") {
        showToast("Недостаточно средств в резерве.", "error");
      }
      haptic("error");
      return;
    }
    haptic("light");

    document.querySelectorAll(".unexpected-option").forEach(o => o.classList.remove("selected"));
    this.classList.add("selected");

    selectedExpenseSource = this.dataset.source;

    const amountBlock = document.getElementById("unexpectedAmountBlock");
    const skipBlock = document.getElementById("unexpectedSkipBlock");

    if (selectedExpenseSource === "skip") {
      if (amountBlock) amountBlock.style.display = "none";
      if (skipBlock) skipBlock.style.display = "block";
    } else {
      if (skipBlock) skipBlock.style.display = "none";
      if (amountBlock) amountBlock.style.display = "block";
      const amountInput = document.getElementById("unexpectedAmount");
      if (amountInput) {
        amountInput.value = "";
        amountInput.focus();
      }
    }
  });
});

// Форматирование ввода суммы
const unexpectedAmountInput = document.getElementById("unexpectedAmount");
if (unexpectedAmountInput) {
  unexpectedAmountInput.addEventListener("input", function (e) {
    const p = e.target.selectionStart;
    const b = e.target.value.length;
    e.target.value = formatNumber(e.target.value);
    const a = e.target.value.length;
    e.target.selectionEnd = p + (a - b);
  });
}

// Подтверждение расхода из цели/резерва
const unexpectedConfirmBtn = document.getElementById("unexpectedConfirm");
if (unexpectedConfirmBtn) {
  unexpectedConfirmBtn.addEventListener("click", function () {
    const input = document.getElementById("unexpectedAmount");
    const amount = parseNumber(input?.value || "0");

    if (!amount || amount <= 0) {
      haptic("error");
      const wrap = input?.closest(".input-wrap");
      if (wrap) {
        wrap.classList.add("error");
        wrap.classList.remove("shake");
        void wrap.offsetWidth;
        wrap.classList.add("shake");
      }
      return;
    }

    // Проверяем что не списываем больше, чем есть
    if (selectedExpenseSource === "goal" && amount > accounts.main) {
      haptic("error");
      const wrap = input?.closest(".input-wrap");
      if (wrap) {
        wrap.classList.add("error");
        wrap.classList.remove("shake");
        void wrap.offsetWidth;
        wrap.classList.add("shake");
      }
      return;
    }
    if (selectedExpenseSource === "reserve" && amount > accounts.reserve) {
      haptic("error");
      const wrap = input?.closest(".input-wrap");
      if (wrap) {
        wrap.classList.add("error");
        wrap.classList.remove("shake");
        void wrap.offsetWidth;
        wrap.classList.add("shake");
      }
      return;
    }

    haptic("medium");
    applyFinancialEvent(selectedExpenseSource, amount);
  });
}

// Подтверждение пропуска месяца
const unexpectedSkipConfirmBtn = document.getElementById("unexpectedSkipConfirm");
if (unexpectedSkipConfirmBtn) {
  unexpectedSkipConfirmBtn.addEventListener("click", function () {
    haptic("medium");
    applyFinancialEvent("skip", 0);
  });
}

// Кнопка «Назад»
const unexpectedBackBtn = document.getElementById("unexpectedBack");
if (unexpectedBackBtn) {
  unexpectedBackBtn.addEventListener("click", function () {
    haptic("light");
    openScreen("advice", buttons[1]);
    showBottomNav();
  });
}

/**
 * Создаёт финансовое событие, пересчитывает план через event engine,
 * обновляет UI (счета, график, brain, цели).
 */
function applyFinancialEvent(source, amount) {
  FinancialEvents.createEvent({
    type: FinancialEvents.EVENT_TYPES.UNEXPECTED_EXPENSE,
    amount: amount,
    source: source,
    date: new Date()
  });

  if (source !== "skip") {
    const now = new Date();
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
    factHistory.push({
      value: -amount,
      date: now,
      to: source === "reserve" ? "reserve" : "main"
    });
  }

  recalcPlan();

  const analysis = FinancialEvents.buildExpenseAnalysis();
  if (analysis) {
    showBrainMessage(analysis.message);
  }

  openScreen("advice", buttons[1]);
  showBottomNav();
}

/* ===== CASHFLOW SETTINGS ===== */

function checkPremiumGate() {
  var s = getState();
  if (s.financialModel === "cashflow" && !s.isPremium) {
    updateState({ financialModel: "simple", incomeType: "fixed", expenseType: "fixed" });
    recalcPlan();
    return true;
  }
  return false;
}

function isFlexibleUnconfigured() {
  var s = getState();
  if (s.financialModel !== "cashflow") return false;
  var events = s.cashflowEvents || [];
  for (var i = 0; i < events.length; i++) {
    var freq = events[i].frequency || "once";
    if (freq !== "once") return false;
  }
  return true;
}

function freqLabel(freq, days) {
  switch (freq) {
    case "weekly": return "раз в неделю";
    case "biweekly": return "раз в 2 недели";
    case "custom":
      var daysStr = Array.isArray(days) && days.length ? days.join(", ") : "—";
      return "свой график (" + daysStr + ")";
    default: return "фиксированный";
  }
}

function shakeFlexHint() {
  var hint = document.getElementById("flexHint");
  if (!hint) return;
  hint.classList.add("visible");
  hint.classList.remove("shake");
  void hint.offsetWidth;
  hint.classList.add("shake");
  setTimeout(function () { hint.classList.remove("shake"); }, 400);
}

function syncFlexibleUI() {
  var unconfigured = isFlexibleUnconfigured();
  var noData = isCashflowNoData();
  var blocked = unconfigured || noData;
  var s = getState();
  var isCashflow = (s.financialModel === "cashflow");

  var factRow = document.querySelector(".fact-input-row");
  var factInput = document.getElementById("factInput");
  var applyBtn = document.getElementById("applyFact");

  if (factRow) factRow.classList.toggle("fact-row-disabled", blocked);
  if (factInput) factInput.disabled = blocked;
  if (applyBtn) applyBtn.disabled = blocked;

  if (factRow && !factRow.dataset.flexShakeBound) {
    factRow.dataset.flexShakeBound = "1";
    factRow.addEventListener("click", function () {
      if (isFlexibleUnconfigured() || isCashflowNoData()) {
        shakeFlexHint();
        haptic("error");
      }
    });
  }

  var hint = document.getElementById("flexHint");
  if (!hint && factRow && factRow.parentNode) {
    hint = document.createElement("div");
    hint.id = "flexHint";
    hint.className = "flex-hint flex-hint--alert";
    factRow.parentNode.insertBefore(hint, factRow.nextSibling);
  }
  if (hint) {
    hint.classList.add("flex-hint--alert");
    if (unconfigured) {
      hint.textContent = "Сначала настройте гибкую финансовую модель";
    } else if (noData) {
      hint.textContent = "Добавьте событие дохода, чтобы построить прогноз";
    }
    hint.classList.toggle("visible", blocked);
  }

  var summaryMonthlyEl = document.getElementById("summaryMonthly");
  var summaryMonthsEl = document.getElementById("summaryMonths");
  var summaryModeEl = document.getElementById("summaryMode");

  if (unconfigured || noData) {
    if (summaryMonthlyEl) summaryMonthlyEl.innerText = "—";
    if (summaryMonthsEl) summaryMonthsEl.innerText = "—";
    if (summaryModeEl) summaryModeEl.innerText = noData ? "Гибкий (нет данных)" : "Гибкий (не настроен)";
  } else if (isCashflow && lastCalc.ok) {
    if (summaryMonthlyEl) summaryMonthlyEl.innerText = lastCalc.monthlySave.toLocaleString();
    if (summaryMonthsEl) summaryMonthsEl.innerText = lastCalc.months;
  }

  // ── Weekly/biweekly hint ──
  var freqHintEl = document.getElementById("summaryFreqHint");
  if (freqHintEl) {
    var incFreq = s.incomeFrequency || "monthly";
    if (isCashflow && lastCalc.ok && lastCalc.monthlySave && !unconfigured) {
      if (incFreq === "weekly") {
        freqHintEl.innerText = "≈ " + Math.round(lastCalc.monthlySave / 4.33).toLocaleString() + " ₽ в неделю";
        freqHintEl.style.display = "";
      } else if (incFreq === "biweekly") {
        freqHintEl.innerText = "≈ " + Math.round(lastCalc.monthlySave / 2.16).toLocaleString() + " ₽ раз в 2 недели";
        freqHintEl.style.display = "";
      } else {
        freqHintEl.style.display = "none";
      }
    } else {
      freqHintEl.style.display = "none";
    }
  }

  // ── Model report ──
  var reportEl = document.getElementById("summaryModelReport");
  if (reportEl) {
    if (isCashflow && !unconfigured) {
      var incLabel = freqLabel(s.incomeFrequency, s.incomeMonthDays);
      var expLabel = freqLabel(s.expenseFrequency, s.expenseMonthDays);
      reportEl.innerHTML = "Доход: " + incLabel + "<br>Расход: " + expLabel;
      reportEl.style.display = "";
    } else {
      reportEl.style.display = "none";
    }
  }
}

function applyPremiumUI(isPremium) {
  var variableBtns = document.querySelectorAll(
    '#incomeToggle .mode-btn[data-value="variable"], #expenseToggle .mode-btn[data-value="variable"]'
  );
  var freqBtns = document.querySelectorAll(
    '#incomeFrequencySelector .freq-btn:not([data-freq="monthly"]), #expenseFrequencySelector .freq-btn:not([data-freq="monthly"])'
  );
  var addEventBtn = document.getElementById("addFinancialEvent");
  for (var i = 0; i < variableBtns.length; i++) {
    variableBtns[i].classList.toggle("premium-locked", !isPremium);
    variableBtns[i].disabled = !isPremium;
  }
  for (var j = 0; j < freqBtns.length; j++) {
    freqBtns[j].classList.toggle("premium-locked", !isPremium);
    freqBtns[j].disabled = !isPremium;
  }
  if (addEventBtn) {
    addEventBtn.classList.toggle("premium-locked", !isPremium);
    addEventBtn.disabled = !isPremium;
  }
}

function parseMonthDays(str) {
  if (!str) return [];
  return str.split(",")
    .map(function (s) { return parseInt(s.trim(), 10); })
    .filter(function (n) { return n >= 1 && n <= 31; });
}

function resetToFlexibleMode() {
  if (incomeInput) incomeInput.value = "";
  if (expensesInput) expensesInput.value = "";
  if (goalInput) goalInput.value = "";
  if (savedInput) savedInput.value = "";

  factHistory.length = 0;
  chosenPlan = null;
  plannedMonthly = 0;
  accounts.main = 0;
  accounts.reserve = 0;
  lastCalc = {};
  goalCompleted = false;
  isInitialized = false;
  initialBalance = 0;

  updateState({
    financialModel: "cashflow",
    hasSeenFlexibleOnboarding: true,
    income: "", expenses: "", goal: "", saved: "",
    factHistory: [], cashflowEvents: [],
    chosenPlan: null, plannedMonthly: 0,
    accounts: { main: 0, reserve: 0 },
    derivedState: {},
    lastCalc: {},
    goalCompleted: false,
    isInitialized: false,
    initialBalance: 0
  });
  saveFullState();

  if (planSummary) planSummary.style.display = "none";
  document.querySelectorAll(
    "#screen-calc label, #screen-calc .input-wrap, .mode-buttons, #calculate"
  ).forEach(function (el) { el.style.display = ""; });

  openScreen("calc", buttons[0]);
  hideBottomNav();
}

function enableFlexibleMode() {
  updateState({
    financialModel: "cashflow",
    hasSeenFlexibleOnboarding: true
  });
  recalcPlan();
}

function renderMonthDaysList(listId, stateKey) {
  var listEl = document.getElementById(listId);
  if (!listEl) return;
  listEl.innerHTML = "";
  var selected = getState()[stateKey] || [];
  selected.forEach(function (day) {
    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "monthday-chip";
    chip.textContent = day;
    chip.dataset.day = day;
    chip.addEventListener("click", function () {
      haptic("light");
      var cur = (getState()[stateKey] || []).slice();
      var idx = cur.indexOf(day);
      if (idx !== -1) cur.splice(idx, 1);
      var patch = {};
      patch[stateKey] = cur;
      updateState(patch);
      renderMonthDaysList(listId, stateKey);
      recalcPlan();
    });
    listEl.appendChild(chip);
  });
}

function setupMonthDaysDateInput(dateInputId, listId, stateKey) {
  var dateInput = document.getElementById(dateInputId);
  if (!dateInput) return;
  dateInput.value = "";
  dateInput.addEventListener("change", function () {
    var val = this.value;
    if (!val) return;
    var d = new Date(val);
    if (isNaN(d.getTime())) return;
    var day = d.getDate();
    var cur = (getState()[stateKey] || []).slice();
    if (cur.indexOf(day) !== -1) { this.value = ""; return; }
    cur.push(day);
    cur.sort(function (a, b) { return a - b; });
    var patch = {};
    patch[stateKey] = cur;
    updateState(patch);
    renderMonthDaysList(listId, stateKey);
    recalcPlan();
    this.value = "";
  });
  renderMonthDaysList(listId, stateKey);
}

function initCashflowSettings() {
  var flexToggle = document.getElementById("flexibleToggle");
  var flexContent = document.getElementById("flexibleContent");
  var incomeToggle = document.getElementById("incomeToggle");
  var expenseToggle = document.getElementById("expenseToggle");
  var incomeFreqBlock = document.getElementById("incomeFrequencySelector");
  var expenseFreqBlock = document.getElementById("expenseFrequencySelector");
  var addEventBtn = document.getElementById("addFinancialEvent");
  var incomeMonthDaysWrap = document.getElementById("incomeMonthDaysWrap");
  var expenseMonthDaysWrap = document.getElementById("expenseMonthDaysWrap");
  var fixedIncomeWrap = document.getElementById("fixedIncomeWrap");
  var fixedExpenseWrap = document.getElementById("fixedExpenseWrap");
  var fixedIncomeInput = document.getElementById("fixedIncomeInput");
  var fixedExpenseInput = document.getElementById("fixedExpenseInput");

  var onboardingModal = document.getElementById("flexibleOnboarding");
  var onboardConfirm = document.getElementById("flexOnboardConfirm");
  var onboardCancel = document.getElementById("flexOnboardCancel");

  if (!flexToggle || !flexContent) return;

  var currentState = getState();
  var incomeType = currentState.incomeType || "fixed";
  var expenseType = currentState.expenseType || "fixed";
  var incomeFrequency = currentState.incomeFrequency || "monthly";
  var expenseFrequency = currentState.expenseFrequency || "monthly";

  applyPremiumUI(true);

  if (currentState.financialModel === "cashflow" || currentState.hasSeenFlexibleOnboarding) {
    flexContent.classList.add("open");
    flexToggle.classList.add("open");
  }

  syncToggleUI(incomeToggle, incomeType);
  syncToggleUI(expenseToggle, expenseType);
  updateFixedAmountVisibility(incomeType, expenseType);
  if (fixedIncomeInput && (currentState.fixedIncomeAmount != null)) fixedIncomeInput.value = currentState.fixedIncomeAmount;
  if (fixedExpenseInput && (currentState.fixedExpenseAmount != null)) fixedExpenseInput.value = currentState.fixedExpenseAmount;
  syncFreqUIBlock(incomeFreqBlock, incomeFrequency);
  syncFreqUIBlock(expenseFreqBlock, expenseFrequency);
  updateFrequencyVisibility(incomeType, expenseType);
  updateMonthDaysVisibility(incomeFrequency, "income");
  updateMonthDaysVisibility(expenseFrequency, "expense");

  setupMonthDaysDateInput("incomeMonthDaysDate", "incomeMonthDaysList", "incomeMonthDays");
  setupMonthDaysDateInput("expenseMonthDaysDate", "expenseMonthDaysList", "expenseMonthDays");

  flexToggle.addEventListener("click", function () {
    haptic("light");
    var s = getState();

    if (s.financialModel === "simple" && !s.hasSeenFlexibleOnboarding) {
      if (onboardingModal) onboardingModal.classList.add("visible");
      return;
    }

    if (flexContent.classList.contains("open")) {
      flexContent.classList.remove("open");
      flexToggle.classList.remove("open");
    } else {
      requestAnimationFrame(function () {
        flexContent.classList.add("open");
        flexToggle.classList.add("open");
      });
    }
  });

  if (onboardConfirm) {
    onboardConfirm.addEventListener("click", function () {
      haptic("medium");
      if (onboardingModal) onboardingModal.classList.remove("visible");
      enableFlexibleMode();
      flexContent.classList.add("open");
      flexToggle.classList.add("open");
    });
  }

  if (onboardCancel) {
    onboardCancel.addEventListener("click", function () {
      haptic("light");
      if (onboardingModal) onboardingModal.classList.remove("visible");
    });
  }

  if (incomeToggle) {
    incomeToggle.addEventListener("click", function (e) {
      var btn = e.target.closest(".mode-btn");
      if (!btn || btn.disabled) return;
      e.stopPropagation();
      haptic("light");
      incomeType = btn.dataset.value;
      syncToggleUI(incomeToggle, incomeType);
      updateFixedAmountVisibility(incomeType, expenseType);
      applySettingsChange();
    });
  }

  if (expenseToggle) {
    expenseToggle.addEventListener("click", function (e) {
      var btn = e.target.closest(".mode-btn");
      if (!btn || btn.disabled) return;
      e.stopPropagation();
      haptic("light");
      expenseType = btn.dataset.value;
      syncToggleUI(expenseToggle, expenseType);
      updateFixedAmountVisibility(incomeType, expenseType);
      applySettingsChange();
    });
  }

  if (fixedIncomeInput) {
    fixedIncomeInput.addEventListener("input", function () {
      var p = this.selectionStart;
      var b = this.value.length;
      this.value = formatNumber(this.value);
      var a = this.value.length;
      this.selectionEnd = p + (a - b);
      updateState({ fixedIncomeAmount: this.value.trim() });
      recalcPlan();
    });
    fixedIncomeInput.addEventListener("blur", function () { saveFullState(); });
  }
  if (fixedExpenseInput) {
    fixedExpenseInput.addEventListener("input", function () {
      var p = this.selectionStart;
      var b = this.value.length;
      this.value = formatNumber(this.value);
      var a = this.value.length;
      this.selectionEnd = p + (a - b);
      updateState({ fixedExpenseAmount: this.value.trim() });
      recalcPlan();
    });
    fixedExpenseInput.addEventListener("blur", function () { saveFullState(); });
  }

  function onFreqClick(block, e) {
    var btn = e.target.closest(".freq-btn");
    if (!btn || btn.disabled) return;
    haptic("light");
    var freq = btn.dataset.freq;
    var forIncome = block && block.getAttribute("data-for") === "income";
    if (forIncome) {
      incomeFrequency = freq;
      updateState({ incomeFrequency: freq });
      syncFreqUIBlock(incomeFreqBlock, freq);
      updateMonthDaysVisibility(freq, "income");
    } else {
      expenseFrequency = freq;
      updateState({ expenseFrequency: freq });
      syncFreqUIBlock(expenseFreqBlock, freq);
      updateMonthDaysVisibility(freq, "expense");
    }
    recalcPlan();
  }

  if (incomeFreqBlock) incomeFreqBlock.addEventListener("click", function (e) { onFreqClick(incomeFreqBlock, e); });
  if (expenseFreqBlock) expenseFreqBlock.addEventListener("click", function (e) { onFreqClick(expenseFreqBlock, e); });


  if (addEventBtn) {
    addEventBtn.addEventListener("click", function () {
      if (addEventBtn.disabled) return;
      haptic("light");
      openEventEditor();
    });
  }

  function applySettingsChange() {
    var model = (incomeType === "variable" || expenseType === "variable") ? "cashflow" : "simple";
    updateState({
      incomeType: incomeType,
      expenseType: expenseType,
      incomeFrequency: incomeFrequency,
      expenseFrequency: expenseFrequency,
      financialModel: model
    });
    updateFrequencyVisibility(incomeType, expenseType);
    recalcPlan();
  }

  function updateFrequencyVisibility(inc, exp) {
    if (incomeFreqBlock) incomeFreqBlock.classList.toggle("visible", inc === "variable");
    if (expenseFreqBlock) expenseFreqBlock.classList.toggle("visible", exp === "variable");
  }

  function updateMonthDaysVisibility(freq, type) {
    var wrap = type === "income" ? incomeMonthDaysWrap : expenseMonthDaysWrap;
    if (wrap) wrap.style.display = freq === "custom" ? "block" : "none";
  }

  function updateFixedAmountVisibility(inc, exp) {
    if (fixedIncomeWrap) fixedIncomeWrap.style.display = (inc === "fixed") ? "block" : "none";
    if (fixedExpenseWrap) fixedExpenseWrap.style.display = (exp === "fixed") ? "block" : "none";
  }

  function syncToggleUI(container, value) {
    if (!container) return;
    var btns = container.querySelectorAll("button.mode-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", btns[i].getAttribute("data-value") === value);
    }
  }

  function syncFreqUIBlock(block, value) {
    if (!block) return;
    var btns = block.querySelectorAll(".freq-btn");
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle("active", btns[i].dataset.freq === value);
  }
}

/* ===== EVENT EDITOR ===== */

var eventEditorOverlay = document.getElementById("eventEditorOverlay");
var eventEditorSheet = document.getElementById("eventEditorSheet");
var eventTypeToggle = document.getElementById("eventTypeToggle");
var eventAmountInput = document.getElementById("eventAmount");
var eventDateInput = document.getElementById("eventDate");
var eventSubmitBtn = document.getElementById("eventSubmit");

var selectedEventType = "income";

function openEventEditor() {
  selectedEventType = "income";
  if (eventTypeToggle) syncEventTypeUI("income");
  if (eventAmountInput) eventAmountInput.value = "";
  if (eventDateInput) {
    var today = new Date();
    eventDateInput.value = today.toISOString().slice(0, 10);
  }
  if (eventEditorOverlay) eventEditorOverlay.style.display = "block";
  if (eventEditorSheet) {
    requestAnimationFrame(function () {
      eventEditorSheet.classList.add("open");
      requestAnimationFrame(function () {
        constrainEventDateInputWidth();
        setTimeout(constrainEventDateInputWidth, 100);
        setTimeout(constrainEventDateInputWidth, 300);
        setTimeout(constrainEventDateInputWidth, 600);
        setTimeout(constrainEventDateInputWidth, 900);
      });
      eventEditorSheet.addEventListener("transitionend", function onOpen() {
        eventEditorSheet.removeEventListener("transitionend", onOpen);
        constrainEventDateInputWidth();
        setTimeout(constrainEventDateInputWidth, 150);
        setTimeout(constrainEventDateInputWidth, 400);
      }, { once: true });
    });
  }
}

function constrainEventDateInputWidth() {
  var sheet = document.getElementById("eventEditorSheet");
  var wrap = document.querySelector(".event-date-wrap");
  var input = document.getElementById("eventDate");
  var amountWrap = document.getElementById("eventAmount") && document.getElementById("eventAmount").closest(".input-wrap");
  var fieldsContainer = document.querySelector(".event-editor-fields");
  if (!sheet || !wrap || !input) return;
  var vv = window.visualViewport;
  var visibleW = (vv && typeof vv.width === "number") ? vv.width : (window.innerWidth || document.documentElement.clientWidth || 320);
  var safeFallback = Math.max(200, Math.floor(visibleW) - 56);
  sheet.style.width = visibleW + "px";
  sheet.style.maxWidth = visibleW + "px";
  var targetPx = safeFallback;
  if (amountWrap && amountWrap.offsetWidth > 0) {
    targetPx = amountWrap.offsetWidth - 2;
    if (targetPx < 180) targetPx = amountWrap.offsetWidth;
  }
  if (fieldsContainer) {
    fieldsContainer.style.setProperty("--event-field-width", targetPx + "px");
  }
  wrap.style.width = targetPx + "px";
  wrap.style.maxWidth = targetPx + "px";
  input.style.width = targetPx + "px";
  input.style.maxWidth = targetPx + "px";
  input.style.boxSizing = "border-box";
}

function onEventEditorResize() {
  if (eventEditorSheet && eventEditorSheet.classList.contains("open")) {
    constrainEventDateInputWidth();
  }
}

function closeEventEditor() {
  if (eventEditorSheet) {
    eventEditorSheet.classList.remove("open");
    eventEditorSheet.style.width = "";
    eventEditorSheet.style.maxWidth = "";
  }
  var wrap = document.querySelector(".event-date-wrap");
  var input = document.getElementById("eventDate");
  var fieldsContainer = document.querySelector(".event-editor-fields");
  if (wrap) { wrap.style.maxWidth = ""; wrap.style.width = ""; }
  if (input) { input.style.maxWidth = ""; input.style.width = ""; input.style.boxSizing = ""; }
  if (fieldsContainer) { fieldsContainer.style.removeProperty("--event-field-width"); }
  setTimeout(function () {
    if (eventEditorOverlay) eventEditorOverlay.style.display = "none";
  }, 550);
}

function syncEventTypeUI(value) {
  if (!eventTypeToggle) return;
  var btns = eventTypeToggle.querySelectorAll(".mode-btn");
  for (var i = 0; i < btns.length; i++) btns[i].classList.toggle("active", btns[i].dataset.value === value);
}

if (eventTypeToggle) {
  eventTypeToggle.addEventListener("click", function (e) {
    var btn = e.target.closest(".mode-btn");
    if (!btn) return;
    haptic("light");
    selectedEventType = btn.dataset.value;
    syncEventTypeUI(selectedEventType);
  });
}

if (eventEditorOverlay) {
  eventEditorOverlay.addEventListener("click", function () { closeEventEditor(); });
}

window.addEventListener("resize", onEventEditorResize);
window.addEventListener("orientationchange", function () { setTimeout(onEventEditorResize, 100); });
if (typeof window !== "undefined" && window.visualViewport) {
  window.visualViewport.addEventListener("resize", onEventEditorResize);
}

if (eventSubmitBtn) {
  eventSubmitBtn.addEventListener("click", function () {
    var rawAmount = parseNumber(eventAmountInput?.value || "0");
    if (!rawAmount) {
      haptic("error");
      if (eventAmountInput) {
        eventAmountInput.classList.add("error", "shake");
        setTimeout(function () { eventAmountInput.classList.remove("error", "shake"); }, 400);
      }
      return;
    }

    var dateVal = eventDateInput?.value;
    var eventDate = dateVal ? new Date(dateVal) : new Date();
    if (isNaN(eventDate.getTime())) eventDate = new Date();

    var H = CashflowEngineHelpers;
    var isIncome = selectedEventType === "income";
    var s = getState();

    if (isIncome) {
      var incFreq = s.incomeFrequency || "monthly";
      var meta = { userCreated: true };
      if (incFreq === "custom" && Array.isArray(s.incomeMonthDays) && s.incomeMonthDays.length) {
        meta.monthDays = s.incomeMonthDays;
      }
      var normalized = H.normalizeEvent({
        type: H.EVENT_TYPE.INCOME,
        amount: rawAmount,
        frequency: incFreq,
        startDate: eventDate,
        meta: meta
      });
      var evts = s.cashflowEvents || [];
      evts.push(normalized);
      updateState({ cashflowEvents: evts });
    } else {
      var expFreq = s.expenseFrequency || "monthly";
      var expMeta = { to: "main", source: "goal", userCreated: true };
      if (expFreq === "custom" && Array.isArray(s.expenseMonthDays) && s.expenseMonthDays.length) {
        expMeta.monthDays = s.expenseMonthDays;
      }
      var normalizedExp = H.normalizeEvent({
        type: H.EVENT_TYPE.EXPENSE,
        amount: rawAmount,
        frequency: expFreq,
        startDate: eventDate,
        meta: expMeta
      });
      var evtsExp = s.cashflowEvents || [];
      evtsExp.push(normalizedExp);
      updateState({ cashflowEvents: evtsExp });

      var now = new Date(eventDate);
      now.setDate(1);
      now.setHours(0, 0, 0, 0);
      factHistory.push({ value: -rawAmount, date: now, to: "main" });
    }

    haptic("success");
    closeEventEditor();
    recalcPlan();
    showToast(isIncome ? "Доход добавлен" : "Расход добавлен", "success");
  });
}

if (eventAmountInput) {
  eventAmountInput.addEventListener("input", function (e) {
    e.target.value = formatNumber(e.target.value);
  });
}

initCashflowSettings();

/* ===== ACCOUNT STATS SYSTEM ===== */

var STATS_COUNTRY_MAP = {
  RU: { currency: "RUB", inflation: 7, label: "Россия" },
  US: { currency: "USD", inflation: 3, label: "США" },
  IN: { currency: "INR", inflation: 6, label: "Индия" },
  CN: { currency: "CNY", inflation: 2, label: "Китай" }
};

var STATS_TYPE_LABELS = {
  cash: "Наличные",
  stock: "Фондовый рынок",
  deposit: "Вклад / копилка",
  metals: "Драг. металлы"
};

var _statsSelectedType = null;
var _statsTargetAccount = "main";

(function initAccountStats() {
  var statsScreen = document.getElementById("screen-account-stats");
  if (!statsScreen) return;

  var backBtn = document.getElementById("accountStatsBack");
  var typeGrid = document.getElementById("statsTypeGrid");
  var cashFields = document.getElementById("statsCashFields");
  var countrySelect = document.getElementById("statsCountry");
  var currencySelect = document.getElementById("statsCurrency");
  var submitBtn = document.getElementById("statsSubmit");

  function updateSubmitState() {
    if (!submitBtn) return;
    if (!_statsSelectedType) { submitBtn.disabled = true; return; }
    if (_statsSelectedType === "cash" && !countrySelect.value) { submitBtn.disabled = true; return; }
    submitBtn.disabled = false;
  }

  if (typeGrid) {
    typeGrid.addEventListener("click", function (e) {
      var card = e.target.closest(".stats-type-card");
      if (!card) return;
      typeGrid.querySelectorAll(".stats-type-card").forEach(function (c) { c.classList.remove("active"); });
      card.classList.add("active");
      _statsSelectedType = card.getAttribute("data-stype");
      cashFields.style.display = (_statsSelectedType === "cash") ? "" : "none";
      updateSubmitState();
    });
  }

  if (countrySelect) {
    countrySelect.addEventListener("change", function () {
      var code = countrySelect.value;
      var info = STATS_COUNTRY_MAP[code];
      if (info && currencySelect) currencySelect.value = info.currency;
      updateSubmitState();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", function () {
      var statsData = { type: _statsSelectedType, country: null, currency: null, inflation: null };

      if (_statsSelectedType === "cash") {
        var code = countrySelect.value;
        var info = STATS_COUNTRY_MAP[code];
        statsData.country = code;
        statsData.currency = currencySelect ? currencySelect.value : (info ? info.currency : null);
        statsData.inflation = info ? info.inflation : null;
      }

      var patch = {};
      patch[_statsTargetAccount] = statsData;
      updateState({ accountStats: patch });

      document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
      document.getElementById("screen-accounts").classList.add("active");
      showBottomNav();
      moveProfileToActiveHeader();
      renderAccountBackCards();
      showToast("Статистика добавлена", "success");
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", function () {
      document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
      document.getElementById("screen-accounts").classList.add("active");
      showBottomNav();
      moveProfileToActiveHeader();
    });
  }
})();

function openAccountStatsScreen(accountKey) {
  _statsTargetAccount = accountKey || "main";

  var s = getState();
  var allStats = s.accountStats || {};
  var stats = allStats[_statsTargetAccount] || {};
  _statsSelectedType = stats.type || null;

  document.querySelectorAll(".screen").forEach(function (sc) { sc.classList.remove("active"); });
  document.getElementById("screen-account-stats").classList.add("active");
  hideBottomNav();
  moveProfileToActiveHeader();

  var typeGrid = document.getElementById("statsTypeGrid");
  if (typeGrid) {
    typeGrid.querySelectorAll(".stats-type-card").forEach(function (c) { c.classList.remove("active"); });
    if (stats.type) {
      var existing = typeGrid.querySelector('[data-stype="' + stats.type + '"]');
      if (existing) existing.classList.add("active");
    }
  }

  var cashFields = document.getElementById("statsCashFields");
  if (cashFields) cashFields.style.display = (stats.type === "cash") ? "" : "none";

  var countrySelect = document.getElementById("statsCountry");
  if (countrySelect) countrySelect.value = stats.country || "";

  var currencySelect = document.getElementById("statsCurrency");
  if (currencySelect) currencySelect.value = stats.currency || "";

  var submitBtn = document.getElementById("statsSubmit");
  if (submitBtn) submitBtn.disabled = !stats.type;
}

function getActiveInflation() {
  var s = getState();
  var allStats = s.accountStats || {};
  var mainStats = allStats.main;
  if (mainStats && mainStats.inflation != null) return mainStats.inflation;
  var resStats = allStats.reserve;
  if (resStats && resStats.inflation != null) return resStats.inflation;
  return null;
}

function calculateInflationAdjustedValue(amount, inflationRate, monthsLeft) {
  if (!amount || amount <= 0) return null;
  if (!inflationRate || inflationRate <= 0) return null;
  if (!monthsLeft || monthsLeft <= 0 || !isFinite(monthsLeft)) return null;

  var years = monthsLeft / 12;
  var adjustedValue = Math.round(amount / Math.pow(1 + inflationRate, years));
  var loss = amount - adjustedValue;

  return {
    adjustedValue: adjustedValue,
    loss: loss,
    years: years
  };
}

function calculateInflationCompensation(goal, monthsLeft, inflationRate) {
  if (!goal || goal <= 0) return null;
  if (!inflationRate || inflationRate <= 0) return null;
  if (!monthsLeft || monthsLeft <= 0 || !isFinite(monthsLeft)) return null;

  var years = monthsLeft / 12;
  var realGoal = Math.round(goal * Math.pow(1 + inflationRate, years));
  var extraMonthly = Math.round((realGoal - goal) / monthsLeft);

  return {
    realGoal: realGoal,
    extraMonthly: extraMonthly
  };
}

function renderAccountBackCards() {
  var s = getState();
  var allStats = s.accountStats || {};
  var monthsLeft = (lastCalc && lastCalc.months) ? lastCalc.months : 0;

  document.querySelectorAll(".account-block.flip-wrapper").forEach(function (block) {
    var accountKey = block.getAttribute("data-account");
    var backCard = block.querySelector(".account-back-card");
    if (!backCard) return;

    var stats = allStats[accountKey] || null;

    if (!stats || !stats.type) {
      backCard.innerHTML = '<div class="account-back-content stats-empty">' +
        '<button type="button" class="stats-add-btn" data-action="add-stats" data-account="' + accountKey + '">+ Добавить статистику</button>' +
        '</div>';
      return;
    }

    var amount = (accountKey === "main") ? accounts.main : accounts.reserve;
    var typeLabel = STATS_TYPE_LABELS[stats.type] || stats.type || "—";
    var countryLabel = stats.country ? (STATS_COUNTRY_MAP[stats.country] ? STATS_COUNTRY_MAP[stats.country].label : stats.country) : "—";
    var currencyLabel = stats.currency || "—";
    var inflation = stats.inflation;

    var html = '<div class="account-back-content">' +
      '<div class="stats-info-row"><span>Тип хранения</span><span>' + typeLabel + '</span></div>' +
      '<div class="stats-info-row"><span>Страна</span><span>' + countryLabel + '</span></div>' +
      '<div class="stats-info-row"><span>Валюта</span><span>' + currencyLabel + '</span></div>';

    var inflRate = (inflation || 0) / 100;
    var result = calculateInflationAdjustedValue(amount, inflRate, monthsLeft);
    var goalVal = parseNumber(goalInput ? goalInput.value || "0" : "0");
    var comp = calculateInflationCompensation(goalVal, monthsLeft, inflRate);

    if (result || comp) {
      var timeStr = "";
      if (result) {
        if (result.years < 1) {
          var months = Math.round(result.years * 12);
          timeStr = "Через " + months + " " + (months === 1 ? "месяц" : (months >= 2 && months <= 4 ? "месяца" : "месяцев"));
        } else {
          timeStr = "Через " + result.years.toFixed(1) + " года";
        }
      }

      html += '<div class="inflation-card">';

      if (timeStr) {
        html += '<div class="inflation-time">' + timeStr + '</div>';
        if (inflation) {
          html += '<div class="inflation-disclaimer">Если инфляция останется ' + inflation + '%</div>';
        }
      }

      if (result) {
        html +=
          '<div class="stats-purchasing-label">Покупательная способность</div>' +
          '<div class="stats-purchasing-value">' + result.adjustedValue.toLocaleString() + ' ₽</div>' +
          '<div class="loss-inflation">' +
            'Потеря из-за инфляции' +
            '<br>−' + result.loss.toLocaleString() + ' ₽ ' +
            '<span class="arrow-down">↓</span>' +
          '</div>';
      }

      if (comp && comp.extraMonthly > 0) {
        html +=
          '<div class="compensation-block">' +
            '<div class="compensation-label">Чтобы сохранить покупательную способность:</div>' +
            '<div class="extra-monthly">+' + comp.extraMonthly.toLocaleString() + ' ₽ / месяц</div>' +
          '</div>';
      }

      html += '</div>';
    }

    html += '<button type="button" class="stats-change-btn" data-action="add-stats" data-account="' + accountKey + '">Изменить</button>';
    html += '</div>';
    backCard.innerHTML = html;

    var isFlipped = block.querySelector(".flip-inner.flipped") !== null;
    syncAccountFlipHeight(block, isFlipped);
  });
}

document.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-action='add-stats']");
  if (btn) {
    var acc = btn.getAttribute("data-account") || "main";
    openAccountStatsScreen(acc);
  }
});

renderAccountBackCards();

/* ============================================================
 *  ADVANCED GOALS SYSTEM
 *  Multi-goal management, 3-state flip, accounts local nav,
 *  goal-management screen (priorities / deadlines / allocation)
 * ============================================================ */

(function initGoalsSystem() {

  var MAX_GOALS = 3;

  /* ───── Swipe wrapper ──────────────────────────────────── */

  var graphFlipWrapper = document.getElementById("flipWrapper");
  var graphGoalIndicator = document.getElementById("graphGoalIndicator");
  var _slideAnimating = false;

  /* ───── setActiveGoal — single entry point for switching goals ─── */

  function setActiveGoal(index) {
    var goals = getGoals();
    if (index < 0 || index >= goals.length) return;
    activeGoalIndex = index;
    updateState({ activeGoalIndex: index });
    saveState();
    recalcPlan();
    updateAccountsLocalNav();
    updateGraphGoalIndicator();
  }

  window.setActiveGoal = setActiveGoal;

  /* ───── Graph goal slide + swipe ─────────────────────────── */

  function getGoalFaceCount() {
    return Math.min(getGoals().length, MAX_GOALS);
  }

  function setGraphFace(idx) {
    var count = getGoalFaceCount();
    if (idx < 0) idx = 0;
    if (idx >= count) idx = count - 1;
    if (idx === activeGoalIndex || _slideAnimating) return;

    var advCard = document.getElementById("adviceCard");
    if (!advCard) { setActiveGoal(idx); return; }

    _slideAnimating = true;
    var goingLeft = idx > activeGoalIndex;

    advCard.classList.add(goingLeft ? "slide-out-left" : "slide-out-right");

    setTimeout(function () {
      setActiveGoal(idx);

      advCard.classList.remove("slide-out-left", "slide-out-right");
      advCard.classList.add(goingLeft ? "slide-in-left" : "slide-in-right");

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          advCard.classList.remove("slide-in-left", "slide-in-right");
          setTimeout(function () { _slideAnimating = false; }, 300);
        });
      });
    }, 280);
  }

  if (graphFlipWrapper) {
    var gfStartX = 0, gfDx = 0, gfSwiping = false;
    var GF_THRESHOLD = 40;
    graphFlipWrapper.addEventListener("touchstart", function (e) {
      if (!e.touches || !e.touches.length) return;
      gfStartX = e.touches[0].clientX; gfDx = 0; gfSwiping = true;
    }, { passive: true });
    graphFlipWrapper.addEventListener("touchmove", function (e) {
      if (!gfSwiping || !e.touches || !e.touches.length) return;
      gfDx = e.touches[0].clientX - gfStartX;
    }, { passive: true });
    graphFlipWrapper.addEventListener("touchend", function () {
      if (!gfSwiping) return; gfSwiping = false;
      var count = getGoalFaceCount();
      if (count <= 1) return;
      if (gfDx < -GF_THRESHOLD && activeGoalIndex < count - 1) setGraphFace(activeGoalIndex + 1);
      else if (gfDx > GF_THRESHOLD && activeGoalIndex > 0) setGraphFace(activeGoalIndex - 1);
    });
    graphFlipWrapper.addEventListener("touchcancel", function () {
      gfSwiping = false;
    });
  }

  /* ───── Graph goal indicator dots ───────────────────────── */

  function updateGraphGoalIndicator() {
    if (!graphGoalIndicator) return;
    var goals = getGoals();
    if (goals.length <= 1) {
      graphGoalIndicator.classList.remove("visible");
      graphGoalIndicator.innerHTML = "";
      return;
    }
    graphGoalIndicator.classList.add("visible");
    var html = "";
    for (var i = 0; i < goals.length && i < MAX_GOALS; i++) {
      html += '<span class="graph-goal-dot' + (i === activeGoalIndex ? ' active' : '') + '" data-idx="' + i + '"></span>';
    }
    graphGoalIndicator.innerHTML = html;
    graphGoalIndicator.querySelectorAll(".graph-goal-dot").forEach(function (dot) {
      dot.addEventListener("click", function () {
        if (typeof haptic === "function") haptic("light");
        setGraphFace(Number(this.dataset.idx));
      });
    });
  }

  /* ───── Accounts Local Nav ────────────────────────────────── */

  var localNav = document.getElementById("accountsLocalNav");
  var localNavScroll = localNav ? localNav.querySelector(".accounts-local-nav-scroll") : null;
  var goalNavSvgs = [
    '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
    '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="1.8"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>'
  ];

  function updateAccountsLocalNav() {
    if (!localNav || !localNavScroll) return;
    var goals = getGoals();
    if (goals.length <= 1) { localNav.classList.remove("visible"); return; }
    localNav.classList.add("visible");

    var existing = localNavScroll.querySelectorAll(".goal-nav-icon");
    var needRebuild = (existing.length !== Math.min(goals.length, MAX_GOALS));

    if (needRebuild) {
      localNavScroll.innerHTML = "";
      for (var i = 0; i < goals.length && i < MAX_GOALS; i++) {
        var btn = document.createElement("button");
        btn.className = "goal-nav-icon" + (i === activeGoalIndex ? " active" : "");
        btn.setAttribute("data-goal-idx", String(i));
        btn.innerHTML = goalNavSvgs[i] || goalNavSvgs[0];
        btn.addEventListener("click", (function (idx) {
          return function () {
            if (typeof haptic === "function") haptic("light");
            setGraphFace(idx);
          };
        })(i));
        localNavScroll.appendChild(btn);
      }
    } else {
      for (var j = 0; j < existing.length; j++) {
        var isActive = (j === activeGoalIndex);
        if (existing[j].classList.contains("active") !== isActive) {
          existing[j].classList.toggle("active", isActive);
        }
      }
    }
  }

  /* ───── Advanced Emerald Cards ──────────────────────────────── */

  var advCardGoalsBtn = document.getElementById("advCardGoalsBtn");
  var advCardGoalsTitle = document.getElementById("advCardGoalsTitle");
  var advCardGoalsDesc = document.getElementById("advCardGoalsDesc");
  var advCardDeadlines = document.getElementById("advCardDeadlines");
  var advCardPriorities = document.getElementById("advCardPriorities");
  var advancedGoalsBack = document.getElementById("advancedGoalsBack");
  var goalMgmtBack = document.getElementById("goalMgmtBack");

  function openAdvancedGoalsScreen() {
    goalsListCameFromAdvanced = true;
    document.getElementById("screen-advanced").classList.remove("active");
    document.getElementById("screen-advanced-goals").classList.add("active");
    renderAdvancedGoals();
  }

  function closeAdvancedGoalsScreen() {
    document.getElementById("screen-advanced-goals").classList.remove("active");
    document.getElementById("screen-advanced").classList.add("active");
    updateAdvCards();
  }

  function openGoalManagementScreen() {
    document.getElementById("screen-advanced").classList.remove("active");
    document.getElementById("screen-goal-management").classList.add("active");
    renderGoalManagement();
  }

  function closeGoalManagementScreen() {
    document.getElementById("screen-goal-management").classList.remove("active");
    document.getElementById("screen-advanced").classList.add("active");
    updateAdvCards();
  }

  /* ── "Ваши цели" / "Добавить цель" card on advanced screen ── */
  if (advCardGoalsBtn) {
    advCardGoalsBtn.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      var goals = getGoals();
      if (goals.length === 0) {
        openAdvGoalSheet(null);
      } else {
        openAdvancedGoalsScreen();
      }
    });
  }

  window.updateGoalsButton = function () { /* no-op: goalsMainBtn removed */ };

  var goalsListCameFromAdvanced = false;

  if (advancedGoalsBack) {
    advancedGoalsBack.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      if (goalsListCameFromAdvanced) {
        closeAdvancedGoalsScreen();
      } else {
        document.body.classList.remove("advanced-active");
        openScreen("goals", buttons[3]);
        if (typeof showBottomNav === "function") showBottomNav();
        updateGoalsButton();
      }
    });
  }

  /* ── "Управление сроками" → goal-management ── */
  if (advCardDeadlines) {
    advCardDeadlines.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      if (getGoals().length > 0) openGoalManagementScreen();
    });
  }

  /* ── "Приоритеты" → goal-management ── */
  if (advCardPriorities) {
    advCardPriorities.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      if (getGoals().length > 0) openGoalManagementScreen();
    });
  }

  if (goalMgmtBack) {
    goalMgmtBack.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      closeGoalManagementScreen();
    });
  }

  function updateAdvCards() {
    if (!advCardGoalsTitle || !advCardGoalsDesc || !advCardGoalsBtn) return;
    advCardGoalsTitle.innerText = "Новая цель";
    advCardGoalsDesc.innerText = "Создайте новую цель и управляйте несколькими накоплениями одновременно";
    advCardGoalsBtn.classList.remove("disabled-card");
  }

  /* ───── Goal Create/Edit Sheet ─────────────────────────────── */

  var advGoalsList = document.getElementById("advancedGoalsList");
  var addGoalBtn = document.getElementById("addGoalBtn");
  var advGoalOverlay = document.getElementById("advGoalOverlay");
  var advGoalSheet = document.getElementById("advGoalSheet");
  var advGoalSheetTitle = document.getElementById("advGoalSheetTitle");
  var advGoalTitleInput = document.getElementById("advGoalTitle");
  var advGoalAmountInput = document.getElementById("advGoalAmount");
  var advGoalSave = document.getElementById("advGoalSave");
  var advPriorityToggle = document.getElementById("advPriorityToggle");

  var editingGoalId = null;
  var selectedPriority = 1;

  function setAdvPriority(val) {
    selectedPriority = val;
    if (!advPriorityToggle) return;
    advPriorityToggle.querySelectorAll(".mode-btn").forEach(function (b) {
      b.classList.toggle("active", Number(b.dataset.value) === val);
    });
  }

  if (advPriorityToggle) {
    advPriorityToggle.querySelectorAll(".mode-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        if (typeof haptic === "function") haptic("light");
        setAdvPriority(Number(this.dataset.value));
      });
    });
  }

  function openAdvGoalSheet(goalId) {
    editingGoalId = goalId || null;
    var g = goalId ? getGoalById(goalId) : null;
    if (advGoalSheetTitle) advGoalSheetTitle.innerText = g ? "Редактирование цели" : "Новая цель";
    if (advGoalTitleInput) advGoalTitleInput.value = g ? g.title : "";
    if (advGoalAmountInput) advGoalAmountInput.value = g ? formatNumber(String(g.amount || 0)) : "";
    setAdvPriority(g ? g.priority : getNextFreePriority());
    if (advGoalOverlay) advGoalOverlay.style.display = "block";
    requestAnimationFrame(function () {
      if (advGoalSheet) advGoalSheet.style.transform = "translateY(0)";
    });
  }

  function closeAdvGoalSheet() {
    if (advGoalSheet) advGoalSheet.style.transform = "translateY(100%)";
    setTimeout(function () { if (advGoalOverlay) advGoalOverlay.style.display = "none"; }, 550);
    editingGoalId = null;
  }

  function getNextFreePriority() {
    var goals = getGoals();
    var used = {};
    goals.forEach(function (g) { used[g.priority] = true; });
    for (var p = 1; p <= 3; p++) { if (!used[p]) return p; }
    return goals.length + 1;
  }

  if (advGoalOverlay) { advGoalOverlay.addEventListener("click", closeAdvGoalSheet); }

  if (advGoalAmountInput) {
    advGoalAmountInput.addEventListener("input", function (e) {
      e.target.value = formatNumber(e.target.value);
    });
  }

  /* ───── SAVE BUTTON — creates/edits goal via state-manager ── */

  function addGoal() {
    var title = advGoalTitleInput ? advGoalTitleInput.value.trim() : "";
    var amount = advGoalAmountInput ? parseNumber(advGoalAmountInput.value || "0") : 0;
    var priority = selectedPriority || 1;

    if (!title || !amount) {
      if (typeof haptic === "function") haptic("error");
      if (typeof showToast === "function") showToast("Заполните название и сумму", "error");
      return;
    }

    var goals = getGoals();

    if (editingGoalId) {
      var existing = getGoalById(editingGoalId);
      if (existing) {
        existing.title = title;
        existing.amount = amount;
        existing.priority = priority;
        if (existing === goals[0]) {
          goalMeta.title = title;
          if (goalInput) goalInput.value = formatNumber(String(amount));
        }
      }
    } else {
      if (goals.length >= MAX_GOALS) {
        if (typeof showToast === "function") showToast("Можно создать максимум 3 цели", "error");
        return;
      }
      goals.push({
        id: generateGoalId(),
        title: title,
        amount: amount,
        saved: 0,
        priority: priority,
        monthlyShare: 0,
        monthsLeft: 0
      });
      if (goals.length === 1) {
        goalMeta.title = title;
        if (goalInput) goalInput.value = formatNumber(String(amount));
      }
    }

    var keepId = editingGoalId || goals[goals.length - 1].id;
    resolvePriorityConflicts(keepId, goals);
    goals.sort(function (a, b) { return a.priority - b.priority; });
    computeGoalsAllocation(goals, plannedMonthly || 0);
    persistGoals(goals);

    closeAdvGoalSheet();
    recalcPlan();
    renderAdvancedGoals();
    updateAccountsLocalNav();
    updateGraphGoalIndicator();
    updateAdvCards();
    if (typeof renderGoals === "function") renderGoals();
  }

  if (advGoalSave) {
    advGoalSave.onclick = function () {
      if (typeof haptic === "function") haptic("medium");
      addGoal();
    };
  }

  function resolvePriorityConflicts(keepId, goals) {
    var byPriority = {};
    goals.forEach(function (g) {
      if (!byPriority[g.priority]) byPriority[g.priority] = [];
      byPriority[g.priority].push(g);
    });
    Object.keys(byPriority).forEach(function (p) {
      var arr = byPriority[p];
      if (arr.length <= 1) return;
      var bump = Number(p);
      arr.forEach(function (g) {
        if (g.id !== keepId) {
          bump++;
          while (bump <= MAX_GOALS && goals.some(function (x) { return x.priority === bump && x.id !== g.id; })) bump++;
          if (bump > MAX_GOALS) bump = MAX_GOALS;
          g.priority = bump;
        }
      });
    });
  }

  function deleteGoal(goalId) {
    var goals = getGoals();
    if (goals.length <= 1) return;
    var idx = -1;
    for (var i = 0; i < goals.length; i++) { if (goals[i].id === goalId) { idx = i; break; } }
    if (idx < 0) return;

    goals.splice(idx, 1);
    if (!goals.some(function (g) { return g.priority === 1; })) { goals[0].priority = 1; }
    goals.sort(function (a, b) { return a.priority - b.priority; });
    computeGoalsAllocation(goals, plannedMonthly || 0);
    persistGoals(goals);

    if (activeGoalIndex >= goals.length) activeGoalIndex = goals.length - 1;
    renderAdvancedGoals();
    setActiveGoal(activeGoalIndex);
  }

  if (addGoalBtn) {
    addGoalBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (typeof haptic === "function") haptic("light");
      openAdvGoalSheet(null);
    });
  }

  function updateAddGoalBtnVisibility() {
    if (!addGoalBtn) return;
    var goals = getGoals();
    addGoalBtn.style.display = goals.length >= MAX_GOALS ? "none" : "";
  }

  /* ───── Render: Goals List (screen-advanced-goals) ─────────── */

  function renderAdvancedGoals() {
    if (!advGoalsList) return;
    var goals = getGoals();

    updateAddGoalBtnVisibility();
    updateAdvCards();
    advGoalsList.innerHTML = "";

    goals.forEach(function (g) {
      var card = document.createElement("div");
      card.className = "adv-goal-card" + (g.priority === 1 ? " primary" : "");
      var pClass = g.priority === 1 ? "adv-goal-card-priority p1" : "adv-goal-card-priority";
      var pctDone = g.amount > 0 ? Math.min(100, Math.round(((g.saved || 0) / g.amount) * 100)) : 0;

      card.innerHTML =
        '<div class="adv-goal-card-header">' +
          '<div class="adv-goal-card-title">' + escapeHtml(g.title) + '</div>' +
          '<div class="' + pClass + '">P' + g.priority + '</div>' +
        '</div>' +
        '<div class="adv-goal-card-info">' +
          '<span>Накоплено: <b>' + (g.saved || 0).toLocaleString() + ' ₽</b></span>' +
          '<span>Цель: <b>' + (g.amount || 0).toLocaleString() + ' ₽</b></span>' +
        '</div>' +
        '<div class="adv-goal-card-info">' +
          '<span>В месяц: <b>' + (g.monthlyShare || 0).toLocaleString() + ' ₽</b></span>' +
          '<span>Срок: <b>' + (g.monthsLeft || "—") + ' мес.</b></span>' +
        '</div>' +
        '<div class="adv-goal-card-progress">' +
          '<div style="height:4px;border-radius:4px;background:#222;overflow:hidden">' +
            '<div style="height:100%;width:' + pctDone + '%;background:#3a7bfd;transition:width .4s ease"></div>' +
          '</div>' +
          '<div style="font-size:12px;opacity:.5;margin-top:3px">' + pctDone + '%</div>' +
        '</div>' +
        '<div class="adv-goal-card-actions">' +
          (g.priority === 1 ? '' : '<button class="adv-goal-edit-btn" data-goal-id="' + g.id + '">Изменить</button>') +
          (goals.length > 1 ? '<button class="adv-goal-delete-btn" data-goal-id="' + g.id + '">Удалить</button>' : '') +
        '</div>';
      advGoalsList.appendChild(card);
    });

    advGoalsList.querySelectorAll(".adv-goal-edit-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (typeof haptic === "function") haptic("light");
        openAdvGoalSheet(this.dataset.goalId);
      });
    });
    advGoalsList.querySelectorAll(".adv-goal-delete-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (typeof haptic === "function") haptic("light");
        deleteGoal(this.dataset.goalId);
      });
    });
  }

  /* ───── Render: Goal Management (screen-goal-management) ───── */

  var goalMgmtAllocation = document.getElementById("goalMgmtAllocation");
  var goalMgmtPriorities = document.getElementById("goalMgmtPriorities");

  function renderGoalManagement() {
    var goals = getGoals();
    var monthly = plannedMonthly || 0;

    if (goalMgmtAllocation) {
      goalMgmtAllocation.innerHTML = "";
      if (monthly > 0 && goals.length > 0) {
        var totalEl = document.createElement("div");
        totalEl.className = "goal-mgmt-total";
        totalEl.innerHTML = "Ежемесячный взнос: <b>" + monthly.toLocaleString() + " ₽</b>";
        goalMgmtAllocation.appendChild(totalEl);
      }
      goals.forEach(function (g) {
        var pct = monthly > 0 ? Math.round(((g.monthlyShare || 0) / monthly) * 100) : 0;
        var row = document.createElement("div");
        row.className = "goal-mgmt-alloc-row";
        row.innerHTML =
          '<div class="goal-mgmt-alloc-header">' +
            '<span class="goal-mgmt-alloc-name">' + escapeHtml(g.title) + '</span>' +
            '<span class="goal-mgmt-alloc-amount">' + (g.monthlyShare || 0).toLocaleString() + ' ₽ <span class="goal-mgmt-alloc-pct">(' + pct + '%)</span></span>' +
          '</div>' +
          '<div class="goal-mgmt-alloc-bar-bg">' +
            '<div class="goal-mgmt-alloc-bar" style="width:' + pct + '%"></div>' +
          '</div>' +
          '<div class="goal-mgmt-alloc-meta">Осталось: ' + (g.monthsLeft || "—") + ' мес.</div>';
        goalMgmtAllocation.appendChild(row);
      });
    }

    if (goalMgmtPriorities) {
      goalMgmtPriorities.innerHTML = "";
      goals.forEach(function (g) {
        var card = document.createElement("div");
        card.className = "goal-mgmt-prio-card" + (g.priority === 1 ? " primary" : "");
        var pctDone = g.amount > 0 ? Math.min(100, Math.round(((g.saved || 0) / g.amount) * 100)) : 0;
        card.innerHTML =
          '<div class="goal-mgmt-prio-header">' +
            '<div class="goal-mgmt-prio-name">' + escapeHtml(g.title) + '</div>' +
            '<div class="goal-mgmt-prio-badge">P' + g.priority + '</div>' +
          '</div>' +
          '<div class="goal-mgmt-prio-info">' +
            '<span>' + pctDone + '% выполнено</span>' +
            '<span>' + (g.saved || 0).toLocaleString() + ' / ' + (g.amount || 0).toLocaleString() + ' ₽</span>' +
          '</div>' +
          '<div class="goal-mgmt-prio-controls">' +
            '<label class="goal-mgmt-prio-label">Приоритет</label>' +
            '<div class="toggle-group goal-mgmt-prio-toggle" data-goal-id="' + g.id + '">' +
              '<button class="mode-btn' + (g.priority === 1 ? " active" : "") + '" data-value="1">1</button>' +
              '<button class="mode-btn' + (g.priority === 2 ? " active" : "") + '" data-value="2">2</button>' +
              '<button class="mode-btn' + (g.priority === 3 ? " active" : "") + '" data-value="3">3</button>' +
            '</div>' +
          '</div>';
        goalMgmtPriorities.appendChild(card);
      });

      goalMgmtPriorities.querySelectorAll(".goal-mgmt-prio-toggle").forEach(function (toggle) {
        var goalId = toggle.dataset.goalId;
        toggle.querySelectorAll(".mode-btn").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (typeof haptic === "function") haptic("light");
            var newP = Number(this.dataset.value);
            var goal = getGoalById(goalId);
            if (!goal) return;
            goal.priority = newP;
            var g2 = getGoals();
            resolvePriorityConflicts(goalId, g2);
            g2.sort(function (a, b) { return a.priority - b.priority; });
            computeGoalsAllocation(g2, plannedMonthly || 0);
            persistGoals(g2);
            recalcPlan();
            renderGoalManagement();
            updateAccountsLocalNav();
            updateGraphGoalIndicator();
          });
        });
      });
    }
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ───── Initialize ─────────────────────────────────────────── */

  ensureDefaultGoal();
  var initGoals = getGoals();
  computeGoalsAllocation(initGoals, plannedMonthly || 0);
  persistGoals(initGoals);
  renderAdvancedGoals();
  updateAdvCards();

  var savedIdx = getState().activeGoalIndex || 0;
  if (savedIdx > 0 && savedIdx < initGoals.length) {
    activeGoalIndex = savedIdx;
  }

  updateAccountsLocalNav();
  updateGraphGoalIndicator();

})();