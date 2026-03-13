const tg = window.Telegram?.WebApp;
tg?.expand();

const buttons = document.querySelectorAll(".nav-btn");
const screens = document.querySelectorAll(".screen");
const indicator = document.querySelector(".nav-indicator");

/* ===== NAV ICON ANIMATIONS ===== */
var navAccountsLottie = null;
(function initNavIcons() {
  var lottieContainer = document.getElementById("nav-accounts-lottie");
  if (lottieContainer && typeof lottie !== "undefined") {
    navAccountsLottie = lottie.loadAnimation({
      container: lottieContainer,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: "assets/animation/Wallet-doublle.json"
    });
  }
})();

function replayNavIconForScreen(screenName) {
  if (screenName === "accounts" && navAccountsLottie) {
    navAccountsLottie.goToAndStop(0, true);
    navAccountsLottie.play();
  }
  if (screenName === "advice") {
    var svgIcon = document.getElementById("nav-protocol-svg");
    if (!svgIcon) return;
    var line = svgIcon.querySelector(".chart-line");
    var arrow = svgIcon.querySelector(".chart-arrow");
    svgIcon.classList.remove("animate");
    if (line) {
      line.style.animation = "none";
      line.style.strokeDashoffset = "30";
    }
    if (arrow) {
      arrow.style.animation = "none";
      arrow.style.strokeDashoffset = "10";
      arrow.style.transform = "translateY(4px)";
      arrow.style.opacity = "0";
    }
    void svgIcon.offsetWidth;
    svgIcon.classList.add("animate");
    if (line) line.style.animation = "";
    if (arrow) arrow.style.animation = "";
  }
}

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
      monthsLeft: 0,
      paused: false
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
    if (g.paused) {
      g.monthlyShare = 0;
      g.monthsLeft = 0;
      return;
    }
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

/**
 * Distributes a given distributableAmount across active goals by priority weights.
 * Returns array of { goalId, amount }. Paused and completed goals get 0.
 * Final rounding remainder goes to the highest-priority active goal.
 */
function allocateFactByPriority(goals, distributableAmount) {
  if (!goals || !goals.length || !distributableAmount || distributableAmount <= 0) {
    return goals.map(function (g) { return { goalId: g.id, amount: 0 }; });
  }

  var active = [];
  var result = {};
  goals.forEach(function (g) {
    result[g.id] = 0;
    var remaining = Math.max(0, (g.amount || 0) - (g.saved || 0));
    if (!g.paused && remaining > 0) {
      active.push(g);
    }
  });

  if (active.length === 0) {
    return goals.map(function (g) { return { goalId: g.id, amount: 0 }; });
  }

  if (active.length === 1) {
    result[active[0].id] = distributableAmount;
    return goals.map(function (g) { return { goalId: g.id, amount: result[g.id] }; });
  }

  var totalWeight = 0;
  active.forEach(function (g) { totalWeight += 1 / (g.priority || 1); });

  var allocated = 0;
  active.forEach(function (g) {
    var weight = (1 / (g.priority || 1)) / totalWeight;
    var share = Math.round(distributableAmount * weight);
    result[g.id] = share;
    allocated += share;
  });

  var diff = distributableAmount - allocated;
  if (diff !== 0) {
    var highest = active.slice().sort(function (a, b) { return a.priority - b.priority; })[0];
    result[highest.id] += diff;
  }

  return goals.map(function (g) { return { goalId: g.id, amount: result[g.id] }; });
}

function getFactPreviewForGoal(goalIndex, rawInputAmount) {
  var goals = getGoals();
  if (!goals.length || goalIndex < 0 || goalIndex >= goals.length) return 0;

  var amount = rawInputAmount || 0;
  if (amount <= 0 && plannedMonthly > 0) {
    amount = plannedMonthly;
  }
  if (amount <= 0) return 0;

  var distributable = amount;
  if (chosenPlan === "buffer") {
    distributable = amount - Math.round(amount * 0.1);
  }

  var alloc = allocateFactByPriority(goals, distributable);
  for (var i = 0; i < alloc.length; i++) {
    if (alloc[i].goalId === goals[goalIndex].id) return alloc[i].amount;
  }
  return 0;
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

  if (activeGoalIndex > 0 && activeGoal) {
    factBalance = activeGoal.saved || 0;
  }

  var hasFact = (activeGoalIndex > 0 && activeGoal)
    ? (factBalance > 0)
    : (factHistory && factHistory.length > 0);

  var actualMonths = 0;
  if (activeGoalIndex === 0 && factHistory && factHistory.length > 0) {
    var mainFacts = factHistory.filter(function (f) { return f.to === "main"; });
    var uniqueM = {};
    mainFacts.forEach(function (f) {
      var d = new Date(f.date);
      uniqueM[d.getFullYear() + "-" + d.getMonth()] = true;
    });
    actualMonths = Object.keys(uniqueM).length;
  } else if (activeGoalIndex > 0 && hasFact) {
    actualMonths = 1;
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
function getDebtMonthlyTotal() {
  var s = getState();
  if (!s.debtPlanningMode) return 0;
  var debts = s.debts || [];
  var total = 0;
  debts.forEach(function (d) {
    if (d.isActive !== false) total += (Number(d.monthlyPayment) || 0);
  });
  return total;
}

function recalcPlan() {
  // ── Engine recalculation (когда план активен) ──
  if (isInitialized && chosenPlan && typeof CashflowEngine !== "undefined") {
    var goalVal = parseNumber(goalInput?.value || "0");
    var s = getState();
    var modelType = s.financialModel || "simple";
    var incomeVal = parseNumber(incomeInput?.value || "0");
    var expensesVal = parseNumber(expensesInput?.value || "0") + getDebtMonthlyTotal();
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
    renderSVGGraph();
  }

  if (typeof updateGraphGoalIndicator === "function") updateGraphGoalIndicator();
  if (typeof updateAccountsLocalNav === "function") updateAccountsLocalNav();

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
    advancedBtn.style.display = "none";
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

// floating кнопка + скрыта, вместо неё кнопка в блоке графика
if (advancedBtn) {
  advancedBtn.style.display = "none";
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

replayNavIconForScreen(name);
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
<div class="chart-card"></div>
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
</div>

<div id="factTooltipContainer" class="fact-tooltip-container graph-tooltip-bottom"></div>
`;

  var actionsContainer = document.getElementById("protocolActionsContainer");
  if (actionsContainer) {
    actionsContainer.innerHTML = '<button id="unexpectedExpenseBtn" class="unexpected-expense-trigger" type="button">Непредвиденный расход</button>';
  }

  renderSVGGraph();
  if (protocolBack) protocolBack.style.display = "none";
  showBottomNav();
  buttons.forEach(b => b.classList.remove("active"));
  buttons[1].classList.add("active");
  moveIndicator(buttons[1]);
  updatePlanHeader();
  if (typeof updateFactInputVisibility === "function") updateFactInputVisibility();
  if (typeof updateGraphGoalIndicator === "function") updateGraphGoalIndicator();
  if (typeof updateAccountsLocalNav === "function") updateAccountsLocalNav();

  const factInput = document.getElementById("factInput");
  const applyBtn = document.getElementById("applyFact");

  if (factInput) {
    factInput.addEventListener("input", e => {
      e.target.value = formatNumber(e.target.value);
      factInput.classList.remove("error", "shake");
      updatePlanHeader();
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

      let toReserve = 0;
      let distributable = fact;

      if (chosenPlan === "buffer") {
        toReserve = Math.round(fact * 0.1);
        distributable = fact - toReserve;
      }

      const now = new Date();
      now.setDate(1);
      now.setHours(0, 0, 0, 0);

      var goals = getGoals();
      var alloc = allocateFactByPriority(goals, distributable);

      alloc.forEach(function (entry) {
        if (entry.amount <= 0) return;
        var g = getGoalById(entry.goalId);
        if (!g) return;
        if (g.priority === 1 || goals.indexOf(g) === 0) {
          factHistory.push({ value: entry.amount, date: now, to: "main" });
        } else {
          g.saved = (g.saved || 0) + entry.amount;
        }
      });

      if (toReserve > 0) {
        factHistory.push({ value: toReserve, date: now, to: "reserve" });
      }

      factRatio = fact / plannedMonthly;

      computeGoalsAllocation(goals, plannedMonthly || 0);
      persistGoals(goals);
      recalcPlan();
      renderProtocolAdviceGraph();
      renderGoals();
      renderAccountsUI();
      if (typeof updateGraphGoalIndicator === "function") updateGraphGoalIndicator();
      if (typeof updateAccountsLocalNav === "function") updateAccountsLocalNav();
      runBrain();

      const goalTotal = parseNumber(goalInput.value || "0");
      if (!goalCompleted && goalTotal > 0 && accounts.main >= goalTotal) {
        goalCompleted = true;
        setTimeout(fireCelebration, 120);
      }

      checkGoalCompletion();

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

/* ===== GOAL HISTORY ===== */

var goalHistoryBtn = document.getElementById("goalHistoryBtn");
var goalHistoryBack = document.getElementById("goalHistoryBack");

if (goalHistoryBtn) {
  goalHistoryBtn.addEventListener("click", function () {
    haptic("light");
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    document.getElementById("screen-goal-history").classList.add("active");
    renderGoalHistory();
    moveProfileToActiveHeader();
  });
}

if (goalHistoryBack) {
  goalHistoryBack.addEventListener("click", function () {
    haptic("light");
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    document.getElementById("screen-profile").classList.add("active");
    moveProfileToActiveHeader();
  });
}

function renderGoalHistory() {
  var list = document.getElementById("goalHistoryList");
  var emptyMsg = document.getElementById("goalHistoryEmpty");
  var completed = getState().completedGoals || [];

  if (!list) return;
  list.innerHTML = "";

  if (completed.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "block";
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";

  var monthNames = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

  completed.forEach(function (g) {
    var card = document.createElement("div");
    card.className = "goal-history-card";

    var dateStr = "";
    if (g.completedDate) {
      var d = new Date(g.completedDate);
      dateStr = monthNames[d.getMonth()] + " " + d.getFullYear();
    }

    var durationStr = g.durationMonths ? ("Достигнута за " + g.durationMonths + " мес.") : "";

    card.innerHTML =
      '<div class="goal-history-card-title">' + escapeHtmlSafe(g.title || "Цель") + '</div>' +
      '<div class="goal-history-card-amount">' + (g.amount || 0).toLocaleString() + ' ₽</div>' +
      '<div class="goal-history-card-meta">' +
        '<span>' + durationStr + '</span>' +
        '<span>' + dateStr + '</span>' +
      '</div>';
    list.appendChild(card);
  });
}

function escapeHtmlSafe(str) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function checkGoalCompletion() {
  var goals = getGoals();
  var completed = getState().completedGoals || [];
  var changed = false;

  for (var i = goals.length - 1; i >= 0; i--) {
    var g = goals[i];
    if (g.amount > 0 && (g.saved || 0) >= g.amount) {
      var startDate = null;
      if (factHistory && factHistory.length > 0) {
        var sorted = factHistory.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
        startDate = new Date(sorted[0].date);
      }

      var now = new Date();
      var duration = 0;
      if (startDate) {
        duration = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
        if (duration < 1) duration = 1;
      }

      completed.push({
        id: g.id,
        title: g.title,
        amount: g.amount,
        saved: g.saved,
        completedDate: now.toISOString(),
        durationMonths: duration
      });

      goals.splice(i, 1);
      changed = true;
    }
  }

  if (changed) {
    if (goals.length === 0) {
      goals.push({
        id: "goal_" + Date.now(),
        title: "Основная цель",
        amount: 0,
        saved: 0,
        priority: 1,
        monthlyShare: 0,
        monthsLeft: 0,
        paused: false
      });
    }
    persistGoals(goals);
    updateState({ completedGoals: completed });
    saveState();
    if (activeGoalIndex >= goals.length) activeGoalIndex = goals.length - 1;
  }
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
/* watermark now rendered by SVG graph engine */

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
      renderSVGGraph();
    }
  }
}

function startZoomAnimation(targetSegment) {
  if (_zoomAnim.rafId) cancelAnimationFrame(_zoomAnim.rafId);

  var isZoomIn = !!targetSegment;
  timelineView.activeSegment = targetSegment;
  timelineView.mode = isZoomIn ? "segment" : "overview";
  _zoomAnim.progress = isZoomIn ? 1 : 0;

  renderSVGGraph();

  if (!isZoomIn) {
    timelineView.activeSegment = null;
  }
  updateTimelineBackBtn();
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

/* ===== SVG GRAPH BRIDGE ===== */

function renderSVGGraph() {
  var gs = computeGraphState();
  ProtocolGraph.render(adviceCard, gs, factHistory, plannedMonthly);
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
if (chosenPlan === "buffer" && activeGoalIndex === 0) {
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

function updateGoalVerdict(text) {
  var verdict = document.getElementById("goalVerdict");
  if (!verdict) return;
  if (verdict.dataset.text === text) return;
  verdict.dataset.text = text;

  verdict.classList.add("verdict-fade-out");

  setTimeout(function () {
    verdict.innerText = text;
    verdict.classList.remove("verdict-fade-out");
    verdict.classList.add("verdict-fade-in");

    setTimeout(function () {
      verdict.classList.remove("verdict-fade-in");
    }, 450);
  }, 350);
}

function renderGoals() {
if (!lastCalc.ok) return;

var goals = getGoals();
var idx = activeGoalIndex;
if (idx < 0 || idx >= goals.length) idx = 0;
var goal = goals[idx] || null;

var titleEl = document.getElementById("goalTitle");
var totalEl = document.getElementById("goalTotal");
var savedEl = document.getElementById("goalSaved");
var percentEl = document.getElementById("goalPercent");
var progressBar = document.getElementById("goalProgressBar");
var verdict = document.getElementById("goalVerdict");
var reserveCard = document.getElementById("goalReserveCard");
var card = document.getElementById("activeGoalCard");
var pausedBadge = document.getElementById("goalPausedBadge");
var pauseBtn = document.getElementById("goalPauseBtn");

var title, saved, total;
if (idx === 0) {
  title = goalMeta.title;
  saved = accounts.main;
  total = parseNumber(goalInput.value || "0");
} else if (goal) {
  title = goal.title || "Цель " + (idx + 1);
  saved = goal.saved || 0;
  total = goal.amount || 0;
} else {
  title = "—";
  saved = 0;
  total = 0;
}

if (titleEl) titleEl.innerText = title;

var percent = total ? Math.min(100, Math.round((saved / total) * 100)) : 0;

if (totalEl) totalEl.innerText = total.toLocaleString();
if (savedEl) savedEl.innerText = saved.toLocaleString();
if (percentEl) percentEl.innerText = percent;
if (progressBar) progressBar.style.width = percent + "%";

var percentLabel = document.getElementById("goalPercentLabel");
if (percentLabel) {
  var section = percentLabel.parentElement;
  if (section) {
    var sw = section.offsetWidth;
    var lw = percentLabel.offsetWidth;
    var progressX = (percent / 100) * sw;
    var targetLeft = progressX - lw - 4;
    var minLeft = 0;
    var maxLeft = sw - lw;
    if (targetLeft < minLeft) targetLeft = minLeft;
    if (targetLeft > maxLeft) targetLeft = maxLeft;
    percentLabel.style.left = targetLeft + "px";
  }
}

var isPaused = goal && goal.paused;

if (verdict) {
  var verdictText;
  if (isPaused) {
    verdictText = "Цель на паузе — средства не начисляются.";
  } else if (percent >= 100) {
    verdictText = "Цель достигнута. Protocol фиксирует успех.";
  } else if (percent >= 70) {
    verdictText = "Цель близка к завершению. Темп хороший.";
  } else {
    verdictText = "Цель в процессе. Стабильность важнее скорости.";
  }
  updateGoalVerdict(verdictText);
}

if (reserveCard) {
  if (chosenPlan === "buffer" && idx === 0) {
    reserveCard.style.display = "block";
    var reserveEl = document.getElementById("goalReserveAmount");
    if (reserveEl) reserveEl.innerText = accounts.reserve.toLocaleString();
  } else {
    reserveCard.style.display = "none";
  }
}

if (card) {
  card.classList.toggle("goal-card-paused", !!isPaused);
}

if (pausedBadge) {
  pausedBadge.style.display = isPaused ? "" : "none";
}

if (editGoalBtn) {
  editGoalBtn.style.display = (idx === 0) ? "" : "none";
}

if (pauseBtn) {
  pauseBtn.style.display = (idx > 0 && goal) ? "" : "none";
  pauseBtn.innerText = isPaused ? "▶" : "⏸";
}

renderGoalSwipeIndicator();

if (typeof updateGoalsButton === "function") updateGoalsButton();
}

function renderGoalSwipeIndicator() {
  var indicator = document.getElementById("goalSwipeIndicator");
  if (!indicator) return;
  var goals = getGoals();
  if (goals.length <= 1) {
    indicator.style.display = "none";
    indicator.innerHTML = "";
    return;
  }
  indicator.style.display = "";
  var html = "";
  for (var i = 0; i < goals.length && i < 3; i++) {
    html += '<span class="goal-swipe-dot' + (i === activeGoalIndex ? ' active' : '') + '" data-gidx="' + i + '"></span>';
  }
  indicator.innerHTML = html;

  indicator.querySelectorAll(".goal-swipe-dot").forEach(function (dot) {
    dot.addEventListener("click", function () {
      var targetIdx = parseInt(dot.getAttribute("data-gidx"), 10);
      if (targetIdx !== activeGoalIndex) {
        goalSwipeToIndex(targetIdx, targetIdx > activeGoalIndex);
      }
    });
  });
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

var goals = getGoals();
var activeGoal = goals[activeGoalIndex] || goals[0] || null;
if (activeGoalIndex === 0) {
  goalEditTitle.value = goalMeta.title;
  goalEditAmount.value = goalInput.value;
  goalEditBaseValue = parseNumber(goalInput.value || "0");
} else if (activeGoal) {
  goalEditTitle.value = activeGoal.title || "";
  goalEditAmount.value = formatNumber(String(activeGoal.amount || 0));
  goalEditBaseValue = activeGoal.amount || 0;
}

goalEditorOverlay.style.display = "block";

requestAnimationFrame(() => {
goalEditorSheet.style.transform = "translateY(0)";
});
};
}

var goalPauseBtn = document.getElementById("goalPauseBtn");
if (goalPauseBtn) {
  goalPauseBtn.onclick = function () {
    haptic("light");
    var goals = getGoals();
    var goal = goals[activeGoalIndex];
    if (!goal || activeGoalIndex === 0) return;
    goal.paused = !goal.paused;
    computeGoalsAllocation(goals, plannedMonthly || 0);
    persistGoals(goals);
    renderGoals();
    if (typeof renderAccountsUI === "function") renderAccountsUI();
    if (typeof renderSVGGraph === "function") renderSVGGraph();
  };
}

var advSettingsGoals = document.getElementById("advancedSettingsGoals");
if (advSettingsGoals) {
  advSettingsGoals.onclick = function () {
    if (advancedBtn && advancedBtn.onclick) {
      advancedBtn.onclick();
    }
  };
}

goalEditorOverlay.onclick = () => {
goalEditorSheet.style.transform = "translateY(100%)";
setTimeout(() => {
goalEditorOverlay.style.display = "none";
showBottomNav();
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

var goals = getGoals();
if (activeGoalIndex === 0) {
  goalMeta.title = newTitle;
  goalInput.value = formatNumber(String(newAmount));
  if (accounts.main >= newAmount) {
    goalCompleted = true;
  }
} else {
  var activeGoal = goals[activeGoalIndex];
  if (activeGoal) {
    activeGoal.title = newTitle;
    activeGoal.amount = newAmount;
  }
  persistGoals(goals);
}

goalEditorSheet.style.transform = "translateY(100%)";
setTimeout(() => {
goalEditorOverlay.style.display = "none";
showBottomNav();
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
var monthlyEl = document.getElementById("planMonthly");
var explainEl = document.getElementById("planExplanation");

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

var goals = getGoals();
var activeGoal = goals[activeGoalIndex] || null;

if (activeGoalIndex > 0 && activeGoal) {
  monthlyEl.innerText = activeGoal.title || ("Цель " + (activeGoalIndex + 1));

  var factEl = document.getElementById("factInput");
  var rawInput = factEl ? parseNumber(factEl.value || "0") : 0;
  var preview = getFactPreviewForGoal(activeGoalIndex, rawInput);

  var lines = "Откладывается: " + (activeGoal.monthlyShare || 0).toLocaleString() + " ₽ / мес"
    + "<br>Приоритет: " + (activeGoal.priority || 1)
    + "<br>При вводе суммы сюда пойдёт: " + preview.toLocaleString() + " ₽"
    + "<br>Цель будет достигнута за: " + (activeGoal.monthsLeft || "—") + " мес";

  explainEl.innerHTML = lines;

  var inflationEl = document.getElementById("inflationHint");
  if (inflationEl) { inflationEl.textContent = ""; inflationEl.style.display = "none"; }
  return;
}

monthlyEl.innerText =
  "План: " + plannedMonthly.toLocaleString() + " ₽ / месяц";

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

/* drawStaticLayer / animateFactLine / drawFactLayer / animateDotScale
   removed — now handled by graph-engine-svg.js via renderSVGGraph() */

/* ===== ADVANCED SCREEN LOGIC ===== */

if (advancedBtn) {
  advancedBtn.onclick = () => {

    haptic("light");
    
       document.body.classList.add("advanced-active");
       var fog = document.querySelector(".advanced-fog");
       if (fog) {
         fog.style.animation = "";
         fog.style.opacity = "";
         fog.style.transition = "";
         fog.style.pointerEvents = "";
       }

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

  function resetAccountFlips() {
    document.querySelectorAll(".account-block.flip-wrapper").forEach(function (block) {
      var inner = block.querySelector(".flip-inner");
      if (inner && inner.classList.contains("flipped")) {
        inner.classList.remove("flipped");
        inner.style.transition = "";
        inner.style.transform = "";
        syncAccountFlipHeight(block, false);
      }
    });
  }

  function updateFactInputVisibility() {
    var factRow = document.querySelector(".fact-input-row");
    if (!factRow) return;
    factRow.style.display = "";
  }

  function setActiveGoal(index) {
    var goals = getGoals();
    if (goals.length <= 1) index = 0;
    if (index < 0 || index >= goals.length) return;
    activeGoalIndex = index;
    updateState({ activeGoalIndex: index });
    saveState();
    recalcPlan();
    resetAccountFlips();
    updateFactInputVisibility();
    updateAccountsLocalNav();
    updateGraphGoalIndicator();
  }

  window.setActiveGoal = setActiveGoal;
  window.updateFactInputVisibility = updateFactInputVisibility;
  window.updateGraphGoalIndicator = updateGraphGoalIndicator;
  window.updateAccountsLocalNav = updateAccountsLocalNav;

  /* ───── Graph goal slide + swipe ─────────────────────────── */

  function getGoalFaceCount() {
    return Math.min(getGoals().length, MAX_GOALS);
  }

  function setGraphFace(idx, goLeft) {
    var count = getGoalFaceCount();
    if (count <= 1) return;
    idx = ((idx % count) + count) % count;
    if (idx === activeGoalIndex || _slideAnimating) return;

    var advCard = document.getElementById("adviceCard");
    if (!advCard) { setActiveGoal(idx); return; }

    if (goLeft === undefined) {
      if (activeGoalIndex === count - 1 && idx === 0) goLeft = true;
      else if (activeGoalIndex === 0 && idx === count - 1) goLeft = false;
      else goLeft = idx > activeGoalIndex;
    }

    _slideAnimating = true;

    advCard.classList.remove("swipe-dragging", "swipe-cancel", "swipe-enter");
    advCard.classList.add("swipe-exit");
    advCard.style.transform = goLeft ? "translateX(-110%)" : "translateX(110%)";
    advCard.style.opacity = "0";

    setTimeout(function () {
      advCard.classList.remove("swipe-exit");
      setActiveGoal(idx);

      advCard.style.transition = "none";
      advCard.style.transform = goLeft ? "translateX(70px)" : "translateX(-70px)";
      advCard.style.opacity = "0";

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          advCard.style.transition = "";
          advCard.classList.add("swipe-enter");
          advCard.style.transform = "translateX(0)";
          advCard.style.opacity = "1";

          setTimeout(function () {
            advCard.classList.remove("swipe-enter");
            advCard.style.transform = "";
            advCard.style.opacity = "";
            advCard.style.transition = "";
            _slideAnimating = false;
          }, 400);
        });
      });
    }, 360);
  }

  /* ───── Touch swipe: finger-following drag ───────────────── */

  if (graphFlipWrapper) {
    var _swStartX = 0;
    var _swStartY = 0;
    var _swDeltaX = 0;
    var _swActive = false;
    var _swLocked = false;
    var _swRafId = null;
    var GF_THRESHOLD = 80;

    graphFlipWrapper.addEventListener("touchstart", function (e) {
      if (_slideAnimating || !e.touches || !e.touches.length) return;
      var advCard = document.getElementById("adviceCard");
      if (!advCard) return;
      _swStartX = e.touches[0].clientX;
      _swStartY = e.touches[0].clientY;
      _swDeltaX = 0;
      _swActive = true;
      _swLocked = false;

      advCard.classList.remove("swipe-exit", "swipe-enter", "swipe-cancel");
      advCard.classList.add("swipe-dragging");
    }, { passive: true });

    graphFlipWrapper.addEventListener("touchmove", function (e) {
      if (!_swActive || !e.touches || !e.touches.length) return;

      var cx = e.touches[0].clientX;
      var cy = e.touches[0].clientY;
      var rawDx = cx - _swStartX;
      var rawDy = cy - _swStartY;

      if (!_swLocked) {
        if (Math.abs(rawDx) < 8 && Math.abs(rawDy) < 8) return;
        if (Math.abs(rawDy) > Math.abs(rawDx)) {
          _swActive = false;
          var advCard = document.getElementById("adviceCard");
          if (advCard) {
            advCard.classList.remove("swipe-dragging");
            advCard.style.transform = "";
            advCard.style.opacity = "";
          }
          return;
        }
        _swLocked = true;
      }

      e.preventDefault();
      _swDeltaX = rawDx;

      if (_swRafId) cancelAnimationFrame(_swRafId);
      _swRafId = requestAnimationFrame(function () {
        _swRafId = null;
        var advCard = document.getElementById("adviceCard");
        if (!advCard) return;
        advCard.style.transform = "translateX(" + _swDeltaX + "px)";
        var progress = Math.min(Math.abs(_swDeltaX) / 250, 1);
        advCard.style.opacity = String(1 - progress * 0.4);
      });
    }, { passive: false });

    function finishSwipe() {
      if (!_swActive && !_swLocked) return;
      _swActive = false;
      _swLocked = false;

      if (_swRafId) { cancelAnimationFrame(_swRafId); _swRafId = null; }

      var advCard = document.getElementById("adviceCard");
      if (!advCard) return;
      advCard.classList.remove("swipe-dragging");

      var count = getGoalFaceCount();
      var dx = _swDeltaX;

      if (Math.abs(dx) > GF_THRESHOLD && count > 1) {
        var goLeft = dx < 0;
        var next;
        if (goLeft) next = (activeGoalIndex + 1) % count;
        else        next = (activeGoalIndex - 1 + count) % count;

        if (typeof haptic === "function") haptic("light");
        setGraphFace(next, goLeft);
        return;
      }

      advCard.classList.add("swipe-cancel");
      advCard.style.transform = "translateX(0)";
      advCard.style.opacity = "1";
      setTimeout(function () {
        advCard.classList.remove("swipe-cancel");
        advCard.style.transform = "";
        advCard.style.opacity = "";
      }, 300);
    }

    graphFlipWrapper.addEventListener("touchend", finishSwipe);
    graphFlipWrapper.addEventListener("touchcancel", finishSwipe);
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

  function updateAccountsLocalNav(overrideIndex) {
    if (!localNav || !localNavScroll) return;
    var goals = getGoals();
    if (goals.length <= 1) { localNav.classList.remove("visible"); return; }
    localNav.classList.add("visible");

    var activeIdx = overrideIndex !== undefined ? overrideIndex : activeGoalIndex;
    var existing = localNavScroll.querySelectorAll(".goal-nav-icon");
    var needRebuild = (existing.length !== Math.min(goals.length, MAX_GOALS));

    if (needRebuild) {
      localNavScroll.innerHTML = "";
      for (var i = 0; i < goals.length && i < MAX_GOALS; i++) {
        var btn = document.createElement("button");
        btn.className = "goal-nav-icon" + (i === activeIdx ? " active" : "");
        btn.setAttribute("data-goal-idx", String(i));
        btn.innerHTML = goalNavSvgs[i] || goalNavSvgs[0];
        btn.addEventListener("click", (function (idx) {
          return function () {
            if (typeof haptic === "function") haptic("light");
            updateAccountsLocalNav(idx);
            setGraphFace(idx);
          };
        })(i));
        localNavScroll.appendChild(btn);
      }
    } else {
      for (var j = 0; j < existing.length; j++) {
        var isActive = (j === activeIdx);
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

  function showAdvancedFog() {
    var fog = document.querySelector(".advanced-fog");
    if (!fog) return;
    fog.classList.remove("advanced-fog--hidden");
    fog.classList.add("advanced-fog--visible");
  }

  function hideAdvancedFog() {
    var fog = document.querySelector(".advanced-fog");
    if (!fog) return;
    fog.classList.remove("advanced-fog--visible");
    fog.classList.add("advanced-fog--hidden");
  }

  function openAdvancedGoalsScreen() {
    goalsListCameFromAdvanced = true;
    hideAdvancedFog();
    document.getElementById("screen-advanced").classList.remove("active");
    document.getElementById("screen-advanced-goals").classList.add("active");
    renderAdvancedGoals();
  }

  function closeAdvancedGoalsScreen() {
    document.getElementById("screen-advanced-goals").classList.remove("active");
    document.getElementById("screen-advanced").classList.add("active");
    showAdvancedFog();
    updateAdvCards();
  }

  function openGoalTimelineManager() {
    hideAdvancedFog();
    document.getElementById("screen-advanced").classList.remove("active");
    document.getElementById("screen-goal-timeline").classList.add("active");
    renderGoalTimeline();
  }

  function closeGoalTimelineScreen() {
    document.getElementById("screen-goal-timeline").classList.remove("active");
    document.getElementById("screen-advanced").classList.add("active");
    showAdvancedFog();
    updateAdvCards();
  }

  var goalPriorityDraft = null;
  var goalPriorityOriginal = null;

  function openGoalPriorityManager() {
    var real = getGoals();
    goalPriorityOriginal = JSON.parse(JSON.stringify(real));
    goalPriorityDraft = JSON.parse(JSON.stringify(real));

    hideAdvancedFog();
    document.getElementById("screen-advanced").classList.remove("active");
    document.getElementById("screen-goal-priority").classList.add("active");
    renderGoalPriority(goalPriorityDraft);
  }

  function closeGoalPriorityScreen() {
    goalPriorityDraft = null;
    goalPriorityOriginal = null;
    document.getElementById("screen-goal-priority").classList.remove("active");
    document.getElementById("screen-advanced").classList.add("active");
    showAdvancedFog();
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

  /* ── "Управление сроками" → goal-timeline ── */
  if (advCardDeadlines) {
    advCardDeadlines.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      if (getGoals().length > 0) openGoalTimelineManager();
    });
  }

  /* ── "Приоритеты" → goal-priority ── */
  if (advCardPriorities) {
    advCardPriorities.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      if (getGoals().length > 0) openGoalPriorityManager();
    });
  }

  var goalTimelineBack = document.getElementById("goalTimelineBack");
  if (goalTimelineBack) {
    goalTimelineBack.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      closeGoalTimelineScreen();
    });
  }

  var goalPriorityBack = document.getElementById("goalPriorityBack");
  if (goalPriorityBack) {
    goalPriorityBack.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      closeGoalPriorityScreen();
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
  var priorityHintEl = document.getElementById("priorityHint");

  var editingGoalId = null;
  var selectedPriority = 1;

  var priorityHintTexts = {
    1: "Цель получит наибольшую долю накоплений.\nЕсли выбрана позиция 1, остальные цели автоматически сдвинутся ниже.",
    2: "Средний приоритет.\nЧасть накоплений будет направляться в эту цель.",
    3: "Низкий приоритет.\nЦель будет получать минимальную долю накоплений."
  };

  function willShiftOtherGoals(priority) {
    if (editingGoalId) return false;
    var goals = getGoals();
    return goals.some(function (g) { return g.priority >= priority; });
  }

  function showPriorityHint(priority) {
    if (!priorityHintEl) return;
    var text = priorityHintTexts[priority] || "";
    var shift = willShiftOtherGoals(priority);
    var html = '<span>' + text.replace(/\n/g, '<br>') + '</span>';
    if (shift) {
      html += '<span class="priority-hint-shift">Приоритет выбранной цели изменит порядок других целей.</span>';
    }
    priorityHintEl.innerHTML = html;
    requestAnimationFrame(function () { priorityHintEl.classList.add("visible"); });
  }

  function hidePriorityHint() {
    if (priorityHintEl) priorityHintEl.classList.remove("visible");
  }

  function getMaxAllowedPriority() {
    var goals = getGoals();
    var count = editingGoalId ? goals.length : goals.length + 1;
    return Math.min(count, MAX_GOALS);
  }

  function updatePriorityButtons() {
    if (!advPriorityToggle) return;
    var maxP = getMaxAllowedPriority();
    advPriorityToggle.querySelectorAll(".mode-btn").forEach(function (b) {
      var val = Number(b.dataset.value);
      b.classList.toggle("prio-disabled", val > maxP);
    });
  }

  function setAdvPriority(val) {
    selectedPriority = val;
    if (!advPriorityToggle) return;
    advPriorityToggle.querySelectorAll(".mode-btn").forEach(function (b) {
      b.classList.toggle("active", Number(b.dataset.value) === val);
    });
    showPriorityHint(val);
  }

  if (advPriorityToggle) {
    advPriorityToggle.querySelectorAll(".mode-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var val = Number(this.dataset.value);
        if (val > getMaxAllowedPriority()) return;
        if (typeof haptic === "function") haptic("light");
        setAdvPriority(val);
      });
    });
  }

  function openAdvGoalSheet(goalId) {
    editingGoalId = goalId || null;
    var g = goalId ? getGoalById(goalId) : null;
    if (advGoalSheetTitle) advGoalSheetTitle.innerText = g ? "Редактирование цели" : "Новая цель";
    if (advGoalTitleInput) advGoalTitleInput.value = g ? g.title : "";
    if (advGoalAmountInput) advGoalAmountInput.value = g ? formatNumber(String(g.amount || 0)) : "";
    updatePriorityButtons();
    hidePriorityHint();
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
    hidePriorityHint();
  }

  function getNextFreePriority() {
    var goals = getGoals();
    var count = goals.length;
    if (count === 0) return 1;
    return Math.min(count + 1, MAX_GOALS);
  }

  if (advGoalOverlay) { advGoalOverlay.addEventListener("click", closeAdvGoalSheet); }

  if (advGoalAmountInput) {
    advGoalAmountInput.addEventListener("input", function (e) {
      e.target.value = formatNumber(e.target.value);
    });
  }

  /* ───── Priority Insertion ───────────────────────────────── */

  function insertGoalWithPriority(goals, newGoal, priority) {
    goals.forEach(function (g) {
      if (g.priority >= priority) {
        g.priority += 1;
      }
    });
    newGoal.priority = priority;
    goals.push(newGoal);
    goals.sort(function (a, b) { return a.priority - b.priority; });
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
        var oldPriority = existing.priority;
        existing.title = title;
        existing.amount = amount;
        if (priority !== oldPriority) {
          existing.priority = priority;
          resolvePriorityConflicts(editingGoalId, goals);
        }
        if (existing === goals[0]) {
          goalMeta.title = title;
          if (goalInput) goalInput.value = formatNumber(String(amount));
        }
      }
      goals.sort(function (a, b) { return a.priority - b.priority; });
    } else {
      if (goals.length >= MAX_GOALS) {
        if (typeof showToast === "function") showToast("Можно создать максимум 3 цели", "error");
        return;
      }
      var newGoal = {
        id: generateGoalId(),
        title: title,
        amount: amount,
        saved: 0,
        priority: 1,
        monthlyShare: 0,
        monthsLeft: 0,
        paused: false
      };
      insertGoalWithPriority(goals, newGoal, priority);
      if (goals.length === 1) {
        goalMeta.title = title;
        if (goalInput) goalInput.value = formatNumber(String(amount));
      }
    }

    computeGoalsAllocation(goals, plannedMonthly || 0);
    persistGoals(goals);

    closeAdvGoalSheet();
    recalcPlan();
    renderAdvancedGoals();
    updateAccountsLocalNav();
    updateGraphGoalIndicator();
    updateAdvCards();
    if (typeof renderGoals === "function") renderGoals();
    if (typeof renderAccountsUI === "function") renderAccountsUI();
    if (typeof renderSVGGraph === "function") renderSVGGraph();
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

  /* ───── Render: Goal Timeline (screen-goal-timeline) ───── */

  var goalTimelineAllocation = document.getElementById("goalTimelineAllocation");

  function renderGoalTimeline() {
    var goals = getGoals();
    var monthly = plannedMonthly || 0;

    if (!goalTimelineAllocation) return;
    goalTimelineAllocation.innerHTML = "";

    if (monthly > 0 && goals.length > 0) {
      var totalEl = document.createElement("div");
      totalEl.className = "goal-mgmt-total";
      totalEl.innerHTML = "Ежемесячный взнос: <b>" + monthly.toLocaleString() + " ₽</b>";
      goalTimelineAllocation.appendChild(totalEl);
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
      goalTimelineAllocation.appendChild(row);
    });
  }

  /* ───── Render: Goal Priority (screen-goal-priority) ───── */

  var goalPriorityList = document.getElementById("goalPriorityList");

  function resolveDraftPriorityConflicts(keepId, draftGoals) {
    var byPriority = {};
    draftGoals.forEach(function (g) {
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
          while (bump <= 3 && draftGoals.some(function (x) { return x.priority === bump && x.id !== g.id; })) bump++;
          if (bump > 3) bump = 3;
          g.priority = bump;
        }
      });
    });
  }

  function renderGoalPriority(draftGoals) {
    var goals = draftGoals || getGoals();

    if (!goalPriorityList) return;

    var previewClone = JSON.parse(JSON.stringify(goals));
    computeGoalsAllocation(previewClone, plannedMonthly || 0);

    var goalPriorityBody = document.getElementById("goalPriorityBody");
    goalPriorityList.innerHTML = "";

    previewClone.forEach(function (g) {
      var card = document.createElement("div");
      card.className = "goal-mgmt-prio-card" + (g.priority === 1 ? " primary" : "");
      var pctDone = g.amount > 0 ? Math.min(100, Math.round(((g.saved || 0) / g.amount) * 100)) : 0;
      var pausedTag = g.paused ? ' <span class="goal-prio-paused-tag">На паузе</span>' : '';
      card.innerHTML =
        '<div class="goal-mgmt-prio-header">' +
          '<div class="goal-mgmt-prio-name">' + escapeHtml(g.title) + pausedTag + '</div>' +
          '<div class="goal-mgmt-prio-badge">P' + g.priority + '</div>' +
        '</div>' +
        '<div class="goal-mgmt-prio-info">' +
          '<span>' + pctDone + '% выполнено</span>' +
          '<span>' + (g.saved || 0).toLocaleString() + ' / ' + (g.amount || 0).toLocaleString() + ' ₽</span>' +
        '</div>' +
        '<div class="goal-mgmt-prio-detail">' +
          'Откладывается: ' + (g.monthlyShare || 0).toLocaleString() + ' ₽ / мес' +
          '<br>Цель будет достигнута за: ' + (g.monthsLeft || "—") + ' мес' +
        '</div>' +
        '<div class="goal-mgmt-prio-controls">' +
          '<label class="goal-mgmt-prio-label">Приоритет</label>' +
          '<div class="toggle-group goal-mgmt-prio-toggle" data-goal-id="' + g.id + '">' +
            '<button class="mode-btn' + (g.priority === 1 ? " active" : "") + '" data-value="1">1</button>' +
            '<button class="mode-btn' + (g.priority === 2 ? " active" : "") + '" data-value="2">2</button>' +
            '<button class="mode-btn' + (g.priority === 3 ? " active" : "") + '" data-value="3">3</button>' +
          '</div>' +
        '</div>';
      goalPriorityList.appendChild(card);
    });

    goalPriorityList.querySelectorAll(".goal-mgmt-prio-toggle").forEach(function (toggle) {
      var goalId = toggle.dataset.goalId;
      toggle.querySelectorAll(".mode-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (typeof haptic === "function") haptic("light");
          var newP = Number(this.dataset.value);

          if (goalPriorityDraft) {
            var dg = null;
            for (var i = 0; i < goalPriorityDraft.length; i++) {
              if (goalPriorityDraft[i].id === goalId) { dg = goalPriorityDraft[i]; break; }
            }
            if (!dg) return;
            dg.priority = newP;
            resolveDraftPriorityConflicts(goalId, goalPriorityDraft);
            goalPriorityDraft.sort(function (a, b) { return a.priority - b.priority; });
            renderGoalPriority(goalPriorityDraft);
          } else {
            var goal = getGoalById(goalId);
            if (!goal) return;
            goal.priority = newP;
            var g2 = getGoals();
            resolvePriorityConflicts(goalId, g2);
            g2.sort(function (a, b) { return a.priority - b.priority; });
            computeGoalsAllocation(g2, plannedMonthly || 0);
            persistGoals(g2);
            recalcPlan();
            renderGoalPriority();
            updateAccountsLocalNav();
            updateGraphGoalIndicator();
          }
        });
      });
    });

    var existingSaveBtn = document.getElementById("saveGoalPriorityBtn");
    if (!existingSaveBtn && goalPriorityBody) {
      var saveBtn = document.createElement("button");
      saveBtn.id = "saveGoalPriorityBtn";
      saveBtn.className = "advanced-settings-btn save-priority-btn";
      saveBtn.type = "button";
      saveBtn.textContent = "Сохранить приоритет";
      goalPriorityBody.appendChild(saveBtn);
    }

    var savePrioBtn = document.getElementById("saveGoalPriorityBtn");
    if (savePrioBtn) {
      savePrioBtn.onclick = function () {
        if (typeof haptic === "function") haptic("medium");

        if (!goalPriorityDraft || !goalPriorityOriginal) {
          showToast("Приоритеты целей не были изменены", "info");
          return;
        }

        var changed = false;
        for (var i = 0; i < goalPriorityDraft.length; i++) {
          var orig = null;
          for (var j = 0; j < goalPriorityOriginal.length; j++) {
            if (goalPriorityOriginal[j].id === goalPriorityDraft[i].id) {
              orig = goalPriorityOriginal[j];
              break;
            }
          }
          if (!orig || orig.priority !== goalPriorityDraft[i].priority) {
            changed = true;
            break;
          }
        }

        if (!changed) {
          showToast("Приоритеты целей не были изменены", "info");
          return;
        }

        var realGoals = getGoals();
        goalPriorityDraft.forEach(function (dg) {
          for (var k = 0; k < realGoals.length; k++) {
            if (realGoals[k].id === dg.id) {
              realGoals[k].priority = dg.priority;
              break;
            }
          }
        });
        realGoals.sort(function (a, b) { return a.priority - b.priority; });
        computeGoalsAllocation(realGoals, plannedMonthly || 0);
        persistGoals(realGoals);
        recalcPlan();
        renderGoalPriority(realGoals);
        renderGoals();
        if (typeof renderProtocolAdviceGraph === "function") renderProtocolAdviceGraph();
        renderAccountsUI();
        if (typeof updateGraphGoalIndicator === "function") updateGraphGoalIndicator();
        if (typeof updateAccountsLocalNav === "function") updateAccountsLocalNav();
        showToast("Приоритет сохранён", "success");

        goalPriorityOriginal = JSON.parse(JSON.stringify(realGoals));
        goalPriorityDraft = JSON.parse(JSON.stringify(realGoals));
      };
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

/* ===== GOAL CARD SWIPE (screen-goals) ===== */

var _goalSwipeAnimating = false;

function goalSwipeToIndex(idx, goLeft) {
  var goals = getGoals();
  var count = Math.min(goals.length, 3);
  if (count <= 1) return;
  idx = ((idx % count) + count) % count;
  if (idx === activeGoalIndex || _goalSwipeAnimating) return;

  var content = document.getElementById("goalSwipeContent");
  if (!content) { setActiveGoal(idx); return; }

  if (goLeft === undefined) {
    goLeft = idx > activeGoalIndex;
  }

  _goalSwipeAnimating = true;
  content.style.transition = "transform 0.35s cubic-bezier(.4,0,.2,1), opacity 0.3s ease";
  content.style.transform = goLeft ? "translateX(-110%)" : "translateX(110%)";
  content.style.opacity = "0";

  setTimeout(function () {
    if (typeof setActiveGoal === "function") {
      setActiveGoal(idx);
    } else {
      activeGoalIndex = idx;
      updateState({ activeGoalIndex: idx });
      saveState();
    }
    renderGoals();

    content.style.transition = "none";
    content.style.transform = goLeft ? "translateX(70px)" : "translateX(-70px)";
    content.style.opacity = "0";

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        content.style.transition = "transform 0.35s cubic-bezier(.4,0,.2,1), opacity 0.3s ease";
        content.style.transform = "translateX(0)";
        content.style.opacity = "1";

        setTimeout(function () {
          content.style.transform = "";
          content.style.opacity = "";
          content.style.transition = "";
          _goalSwipeAnimating = false;
        }, 380);
      });
    });
  }, 350);
}

/* ===== PACE CHANGE SCREEN ===== */
(function initPaceChangeScreen() {
  var changePaceBtn = document.getElementById("changePaceBtn");
  var paceBackBtn = document.getElementById("paceBack");
  var paceConfirmBtn = document.getElementById("paceConfirmBtn");
  var paceModeButtons = document.querySelectorAll("#paceModeButtons .mode-btn");
  var pacePreviewCard = document.getElementById("pacePreviewCard");

  var draftPace = null;
  var originalPace = null;

  var PACE_LABELS = { calm: "Спокойно", normal: "Умеренно", aggressive: "Агрессивно" };
  var PACE_HINTS = {
    calm: "~40% от свободных средств. Комфортный режим без лишнего давления на бюджет.",
    normal: "~60% от свободных средств. Баланс между скоростью и комфортом.",
    aggressive: "~80% от свободных средств. Максимальная скорость, но выше нагрузка на бюджет."
  };
  var paceHintEl = document.getElementById("paceHint");

  function updatePaceHint(mode) {
    if (paceHintEl) paceHintEl.textContent = PACE_HINTS[mode] || "";
  }

  function simulatePace(mode) {
    var goalVal = parseNumber(goalInput ? goalInput.value || "0" : "0");
    var incomeVal = parseNumber(incomeInput ? incomeInput.value || "0" : "0");
    var expensesVal = parseNumber(expensesInput ? expensesInput.value || "0" : "0") + getDebtMonthlyTotal();
    if (goalVal <= 0 || incomeVal <= expensesVal) return null;

    var s = getState();
    var events = assembleCashflowEvents();
    var engine = new CashflowEngine({
      modelType: s.financialModel || "simple",
      baseConfig: {
        goal: goalVal,
        income: incomeVal,
        expenses: expensesVal,
        saved: initialBalance,
        mode: mode,
        hasReserve: chosenPlan === "buffer"
      },
      events: events
    });
    var d = engine.recalculate();
    if (!d.ok) return null;
    return { monthlySave: d.monthlySave, months: d.monthsLeft };
  }

  function openPaceScreen() {
    originalPace = saveMode || "calm";
    draftPace = originalPace;

    var curLabel = PACE_LABELS[originalPace] || originalPace;
    var curModeEl = document.getElementById("paceCurrentMode");
    var curMonthlyEl = document.getElementById("paceCurrentMonthly");
    var curMonthsEl = document.getElementById("paceCurrentMonths");
    if (curModeEl) curModeEl.textContent = curLabel;
    if (curMonthlyEl) curMonthlyEl.textContent = (lastCalc.monthlySave || plannedMonthly || 0).toLocaleString();
    if (curMonthsEl) curMonthsEl.textContent = lastCalc.months || "—";

    paceModeButtons.forEach(function (b) {
      b.classList.toggle("active", b.dataset.mode === draftPace);
    });

    if (pacePreviewCard) pacePreviewCard.style.display = "none";
    updatePaceHint(draftPace);

    openScreen("pace", null);
  }

  function updatePacePreview() {
    if (!pacePreviewCard) return;
    if (draftPace === originalPace) {
      pacePreviewCard.style.display = "block";
      var txtEl = document.getElementById("pacePreviewText");
      if (txtEl) txtEl.innerHTML = "Это ваш текущий темп накоплений.";
      var pmEl = document.getElementById("pacePreviewMonthly");
      var pmoEl = document.getElementById("pacePreviewMonths");
      if (pmEl) pmEl.textContent = (lastCalc.monthlySave || 0).toLocaleString();
      if (pmoEl) pmoEl.textContent = lastCalc.months || "—";
      return;
    }

    var sim = simulatePace(draftPace);
    if (!sim) {
      pacePreviewCard.style.display = "none";
      return;
    }
    pacePreviewCard.style.display = "block";

    var curMonthly = lastCalc.monthlySave || plannedMonthly || 0;
    var curMonths = lastCalc.months || 0;
    var diff = sim.monthlySave - curMonthly;
    var monthsDiff = curMonths - sim.months;
    var txtEl = document.getElementById("pacePreviewText");

    if (diff > 0) {
      txtEl.innerHTML = "Ваш темп увеличится.<br>Вы будете откладывать на " + Math.abs(diff).toLocaleString() + " ₽ больше в месяц.<br>Срок достижения цели сократится на " + Math.abs(monthsDiff) + " мес.";
    } else if (diff < 0) {
      txtEl.innerHTML = "Ваш темп уменьшится.<br>Вы будете откладывать на " + Math.abs(diff).toLocaleString() + " ₽ меньше в месяц.<br>Срок достижения цели увеличится на " + Math.abs(monthsDiff) + " мес.";
    } else {
      txtEl.innerHTML = "Это ваш текущий темп накоплений.";
    }

    var pmEl = document.getElementById("pacePreviewMonthly");
    var pmoEl = document.getElementById("pacePreviewMonths");
    if (pmEl) pmEl.textContent = sim.monthlySave.toLocaleString();
    if (pmoEl) pmoEl.textContent = sim.months;
  }

  if (changePaceBtn) {
    changePaceBtn.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      openPaceScreen();
    });
  }

  paceModeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      draftPace = btn.dataset.mode;
      paceModeButtons.forEach(function (b) {
        b.classList.toggle("active", b.dataset.mode === draftPace);
      });
      updatePaceHint(draftPace);
      updatePacePreview();
    });
  });

  if (paceBackBtn) {
    paceBackBtn.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      draftPace = null;
      originalPace = null;
      openScreen(lastScreenBeforeProfile || "calc", buttons[0]);
    });
  }

  if (paceConfirmBtn) {
    paceConfirmBtn.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("medium");
      if (!draftPace || draftPace === originalPace) {
        showToast("Темп накоплений не был изменён", "info");
        return;
      }

      saveMode = draftPace;
      selectedMode = draftPace;
      modeButtons.forEach(function (b) {
        b.classList.toggle("active", b.dataset.mode === draftPace);
      });

      recalcPlan();

      if (typeof renderProtocolAdviceGraph === "function") renderProtocolAdviceGraph();
      renderGoals();
      renderAccountsUI();
      if (typeof updateGraphGoalIndicator === "function") updateGraphGoalIndicator();
      if (typeof updateAccountsLocalNav === "function") updateAccountsLocalNav();

      var smEl = document.getElementById("summaryMonthly");
      var smoEl = document.getElementById("summaryMonths");
      var smoodeEl = document.getElementById("summaryMode");
      if (smEl && lastCalc.monthlySave) smEl.innerText = lastCalc.monthlySave.toLocaleString();
      if (smoEl && lastCalc.months) smoEl.innerText = lastCalc.months;
      if (smoodeEl) smoodeEl.innerText = PACE_LABELS[saveMode] || saveMode;

      saveFullState();

      originalPace = draftPace;
      showToast("Темп накоплений обновлён", "success");

      openScreen("calc", buttons[0]);
    });
  }
})();

/* ===== DEBTS / CREDITS SCREEN ===== */
(function initDebtsScreen() {
  var addDebtsBtn = document.getElementById("addDebtsBtn");
  var debtsBackBtn = document.getElementById("debtsBack");
  var addDebtBtn = document.getElementById("addDebtBtn");
  var debtEntryOverlay = document.getElementById("debtEntryOverlay");
  var debtEntryNo = document.getElementById("debtEntryNo");
  var debtEntryYes = document.getElementById("debtEntryYes");
  var addDebtOverlay = document.getElementById("addDebtOverlay");
  var addDebtSheet = document.getElementById("addDebtSheet");
  var debtSaveBtn = document.getElementById("debtSaveBtn");
  var debtPlanningToggle = document.getElementById("debtPlanningToggle");
  var debtTypeToggle = document.querySelectorAll("#debtTypeToggle .mode-btn");
  var debtCardFields = document.getElementById("debtCardFields");

  var TYPE_LABELS = { credit: "Кредит", debt: "Долг", installment: "Рассрочка", card: "Кредитная карта" };
  var editingDebtId = null;

  function getDebts() {
    return getState().debts || [];
  }

  function persistDebts(debts) {
    updateState({ debts: debts.map(function (d) { return { ...d }; }) });
    saveState();
  }

  function openDebtsScreen() {
    var s = getState();
    if (debtPlanningToggle) debtPlanningToggle.checked = !!s.debtPlanningMode;

    renderDebtList();
    renderDebtSummary();
    openScreen("debts", null);

    if (!s.debtOverlaySeen && debtEntryOverlay) {
      debtEntryOverlay.classList.add("visible");
    }
  }

  function closeDebtsScreen() {
    openScreen("calc", buttons[0]);
  }

  function renderDebtSummary() {
    var debts = getDebts();
    var totalAmount = 0, totalRemaining = 0, nextPayment = null;
    debts.forEach(function (d) {
      if (d.isActive === false) return;
      totalAmount += Number(d.totalAmount) || 0;
      totalRemaining += Number(d.remainingAmount) || 0;
      if (d.nextPaymentDate) {
        var nd = new Date(d.nextPaymentDate);
        if (!nextPayment || nd < nextPayment) nextPayment = nd;
      }
    });

    var totalEl = document.getElementById("debtSummaryTotal");
    var remainEl = document.getElementById("debtSummaryRemaining");
    var nextEl = document.getElementById("debtSummaryNext");
    var statusEl = document.getElementById("debtSummaryStatus");

    if (totalEl) totalEl.textContent = totalAmount.toLocaleString() + " ₽";
    if (remainEl) remainEl.textContent = totalRemaining.toLocaleString() + " ₽";
    if (nextEl) {
      if (nextPayment) {
        nextEl.textContent = nextPayment.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
      } else {
        nextEl.textContent = "—";
      }
    }

    var s = getState();
    if (statusEl) {
      if (debts.length === 0) {
        statusEl.textContent = "";
      } else if (s.debtPlanningMode) {
        statusEl.textContent = "Платежи учтены в финансовом плане";
      } else {
        statusEl.textContent = "Долги отслеживаются, но не влияют на расчёт";
      }
    }
  }

  function renderDebtList() {
    var listEl = document.getElementById("debtList");
    if (!listEl) return;
    var debts = getDebts();

    if (debts.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:24px 0;font-size:14px;opacity:0.4;">Добавьте свой первый кредит или долг</div>';
      return;
    }

    var html = "";
    debts.forEach(function (d) {
      var typeLabel = TYPE_LABELS[d.type] || d.type;
      var endStr = d.endDate ? new Date(d.endDate).toLocaleDateString("ru-RU", { month: "short", year: "numeric" }) : "—";
      var nextStr = d.nextPaymentDate ? new Date(d.nextPaymentDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "—";

      html += '<div class="debt-item-card" data-debt-id="' + d.id + '">'
        + '<div class="debt-item-header">'
        + '<div class="debt-item-title">' + (d.title || "Без названия") + '</div>'
        + '<span class="debt-item-type-badge">' + typeLabel + '</span>'
        + '</div>'
        + '<div class="debt-item-rows">'
        + '<div class="debt-item-row"><span>Общая сумма</span><span>' + (Number(d.totalAmount) || 0).toLocaleString() + ' ₽</span></div>'
        + '<div class="debt-item-row"><span>Осталось</span><span>' + (Number(d.remainingAmount) || 0).toLocaleString() + ' ₽</span></div>'
        + '<div class="debt-item-row"><span>Ежемесячный платёж</span><span>' + (Number(d.monthlyPayment) || 0).toLocaleString() + ' ₽</span></div>'
        + '<div class="debt-item-row"><span>Следующий платёж</span><span>' + nextStr + '</span></div>'
        + '<div class="debt-item-row"><span>Окончание</span><span>' + endStr + '</span></div>';

      if (d.type === "card" && d.creditLimit) {
        html += '<div class="debt-item-row"><span>Кредитный лимит</span><span>' + (Number(d.creditLimit) || 0).toLocaleString() + ' ₽</span></div>';
        html += '<div class="debt-item-row"><span>Свободный лимит</span><span>' + (Number(d.freeLimit) || 0).toLocaleString() + ' ₽</span></div>';
      }

      if (d.note) {
        html += '<div class="debt-item-row"><span>Заметка</span><span>' + d.note + '</span></div>';
      }

      html += '</div>'
        + '<div class="debt-item-actions">'
        + '<button class="debt-item-delete-btn" data-delete-id="' + d.id + '">Удалить</button>'
        + '</div>'
        + '</div>';
    });
    listEl.innerHTML = html;

    listEl.querySelectorAll(".debt-item-delete-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (typeof haptic === "function") haptic("medium");
        var id = btn.dataset.deleteId;
        var debts = getDebts().filter(function (d) { return d.id !== id; });
        persistDebts(debts);
        renderDebtList();
        renderDebtSummary();
        recalcWithDebts();
        showToast("Удалено", "success");
      });
    });
  }

  function recalcWithDebts() {
    var s = getState();
    if (s.debtPlanningMode) {
      recalcPlan();
      if (typeof renderProtocolAdviceGraph === "function") renderProtocolAdviceGraph();
      renderGoals();
      renderAccountsUI();
      if (typeof updateGraphGoalIndicator === "function") updateGraphGoalIndicator();
      if (typeof updateAccountsLocalNav === "function") updateAccountsLocalNav();
    }
  }

  function openAddDebtSheet(existingDebt) {
    editingDebtId = existingDebt ? existingDebt.id : null;
    var title = document.getElementById("debtTitle");
    var totalAmt = document.getElementById("debtTotalAmount");
    var remainAmt = document.getElementById("debtRemainingAmount");
    var monthlyPay = document.getElementById("debtMonthlyPayment");
    var nextDate = document.getElementById("debtNextDate");
    var endDate = document.getElementById("debtEndDate");
    var creditLim = document.getElementById("debtCreditLimit");
    var freeLim = document.getElementById("debtFreeLimit");
    var note = document.getElementById("debtNote");

    if (existingDebt) {
      if (title) title.value = existingDebt.title || "";
      if (totalAmt) totalAmt.value = existingDebt.totalAmount ? formatNumber(String(existingDebt.totalAmount)) : "";
      if (remainAmt) remainAmt.value = existingDebt.remainingAmount ? formatNumber(String(existingDebt.remainingAmount)) : "";
      if (monthlyPay) monthlyPay.value = existingDebt.monthlyPayment ? formatNumber(String(existingDebt.monthlyPayment)) : "";
      if (nextDate) nextDate.value = existingDebt.nextPaymentDate || "";
      if (endDate) endDate.value = existingDebt.endDate || "";
      if (creditLim) creditLim.value = existingDebt.creditLimit ? formatNumber(String(existingDebt.creditLimit)) : "";
      if (freeLim) freeLim.value = existingDebt.freeLimit ? formatNumber(String(existingDebt.freeLimit)) : "";
      if (note) note.value = existingDebt.note || "";

      var debtType = existingDebt.type || "credit";
      debtTypeToggle.forEach(function (b) {
        b.classList.toggle("active", b.dataset.value === debtType);
      });
      if (debtCardFields) debtCardFields.style.display = debtType === "card" ? "" : "none";
    } else {
      [title, totalAmt, remainAmt, monthlyPay, nextDate, endDate, creditLim, freeLim, note].forEach(function (el) {
        if (el) el.value = "";
      });
      debtTypeToggle.forEach(function (b, i) { b.classList.toggle("active", i === 0); });
      if (debtCardFields) debtCardFields.style.display = "none";
    }

    if (addDebtOverlay) addDebtOverlay.style.display = "block";
    setTimeout(function () {
      if (addDebtSheet) addDebtSheet.classList.add("open");
    }, 10);
  }

  function closeAddDebtSheet() {
    if (addDebtSheet) addDebtSheet.classList.remove("open");
    setTimeout(function () {
      if (addDebtOverlay) addDebtOverlay.style.display = "none";
    }, 400);
    editingDebtId = null;
  }

  function getSelectedDebtType() {
    var active = document.querySelector("#debtTypeToggle .mode-btn.active");
    return active ? active.dataset.value : "credit";
  }

  if (addDebtsBtn) {
    addDebtsBtn.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      openDebtsScreen();
    });
  }

  if (debtsBackBtn) {
    debtsBackBtn.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      closeDebtsScreen();
    });
  }

  if (debtEntryNo) {
    debtEntryNo.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      updateState({ debtOverlaySeen: true });
      saveState();
      if (debtEntryOverlay) debtEntryOverlay.classList.remove("visible");
    });
  }

  if (debtEntryYes) {
    debtEntryYes.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      updateState({ debtOverlaySeen: true });
      saveState();
      if (debtEntryOverlay) debtEntryOverlay.classList.remove("visible");
      showToast("Вы можете рассчитать кредиты и долги точнее, если сумма расходов была указана приблизительно.", "info");
    });
  }

  if (addDebtBtn) {
    addDebtBtn.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      openAddDebtSheet(null);
    });
  }

  if (addDebtOverlay) {
    addDebtOverlay.addEventListener("click", function () {
      closeAddDebtSheet();
    });
  }

  debtTypeToggle.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      debtTypeToggle.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      if (debtCardFields) debtCardFields.style.display = btn.dataset.value === "card" ? "" : "none";
    });
  });

  [document.getElementById("debtTotalAmount"),
   document.getElementById("debtRemainingAmount"),
   document.getElementById("debtMonthlyPayment"),
   document.getElementById("debtCreditLimit"),
   document.getElementById("debtFreeLimit")].forEach(function (el) {
    if (el) {
      el.addEventListener("input", function () {
        el.value = formatNumber(el.value);
      });
    }
  });

  if (debtSaveBtn) {
    debtSaveBtn.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("medium");

      var titleEl = document.getElementById("debtTitle");
      var monthlyPayEl = document.getElementById("debtMonthlyPayment");
      if (!titleEl || !titleEl.value.trim()) { showToast("Укажите название", "error"); return; }
      if (!monthlyPayEl || !parseNumber(monthlyPayEl.value)) { showToast("Укажите ежемесячный платёж", "error"); return; }

      var type = getSelectedDebtType();
      var entry = {
        id: editingDebtId || ("debt_" + Date.now() + "_" + Math.floor(Math.random() * 1000)),
        type: type,
        title: titleEl.value.trim(),
        totalAmount: parseNumber(document.getElementById("debtTotalAmount").value || "0"),
        remainingAmount: parseNumber(document.getElementById("debtRemainingAmount").value || "0"),
        monthlyPayment: parseNumber(monthlyPayEl.value || "0"),
        nextPaymentDate: document.getElementById("debtNextDate").value || "",
        endDate: document.getElementById("debtEndDate").value || "",
        creditLimit: type === "card" ? parseNumber(document.getElementById("debtCreditLimit").value || "0") : 0,
        freeLimit: type === "card" ? parseNumber(document.getElementById("debtFreeLimit").value || "0") : 0,
        note: (document.getElementById("debtNote").value || "").trim(),
        isActive: true
      };

      var debts = getDebts();
      if (editingDebtId) {
        for (var i = 0; i < debts.length; i++) {
          if (debts[i].id === editingDebtId) { debts[i] = entry; break; }
        }
      } else {
        debts.push(entry);
      }
      persistDebts(debts);

      closeAddDebtSheet();
      renderDebtList();
      renderDebtSummary();
      recalcWithDebts();
      showToast(editingDebtId ? "Изменения сохранены" : "Кредит / долг добавлен", "success");
    });
  }

  if (debtPlanningToggle) {
    debtPlanningToggle.addEventListener("change", function () {
      if (typeof haptic === "function") haptic("light");
      var enabled = debtPlanningToggle.checked;
      updateState({ debtPlanningMode: enabled });
      saveState();
      renderDebtSummary();
      recalcWithDebts();
      if (enabled) {
        showToast("Долги учтены в расчёте", "success");
      }
    });
  }

})();

(function initGoalSwipe() {
  var wrapper = document.getElementById("goalSwipeWrapper");
  if (!wrapper) return;

  var _gsStartX = 0;
  var _gsStartY = 0;
  var _gsDeltaX = 0;
  var _gsActive = false;
  var _gsLocked = false;
  var _gsRafId = null;
  var GS_THRESHOLD = 80;

  wrapper.addEventListener("pointerdown", function (e) {
    if (_goalSwipeAnimating) return;
    var content = document.getElementById("goalSwipeContent");
    if (!content) return;
    _gsStartX = e.clientX;
    _gsStartY = e.clientY;
    _gsDeltaX = 0;
    _gsActive = true;
    _gsLocked = false;
    content.style.transition = "none";
  });

  wrapper.addEventListener("pointermove", function (e) {
    if (!_gsActive) return;

    var rawDx = e.clientX - _gsStartX;
    var rawDy = e.clientY - _gsStartY;

    if (!_gsLocked) {
      if (Math.abs(rawDx) < 8 && Math.abs(rawDy) < 8) return;
      if (Math.abs(rawDy) > Math.abs(rawDx)) {
        _gsActive = false;
        var content = document.getElementById("goalSwipeContent");
        if (content) { content.style.transform = ""; content.style.opacity = ""; }
        return;
      }
      _gsLocked = true;
      wrapper.setPointerCapture(e.pointerId);
    }

    e.preventDefault();
    _gsDeltaX = rawDx;

    if (_gsRafId) cancelAnimationFrame(_gsRafId);
    _gsRafId = requestAnimationFrame(function () {
      _gsRafId = null;
      var content = document.getElementById("goalSwipeContent");
      if (!content) return;
      content.style.transform = "translateX(" + _gsDeltaX + "px)";
      var progress = Math.min(Math.abs(_gsDeltaX) / 250, 1);
      content.style.opacity = String(1 - progress * 0.4);
    });
  });

  function finishGoalSwipe(e) {
    if (!_gsActive && !_gsLocked) return;
    _gsActive = false;
    _gsLocked = false;
    if (e && e.pointerId !== undefined) {
      try { wrapper.releasePointerCapture(e.pointerId); } catch (ex) {}
    }

    if (_gsRafId) { cancelAnimationFrame(_gsRafId); _gsRafId = null; }

    var content = document.getElementById("goalSwipeContent");
    if (!content) return;

    var goals = getGoals();
    var count = Math.min(goals.length, 3);
    var dx = _gsDeltaX;

    if (Math.abs(dx) > GS_THRESHOLD && count > 1) {
      var goLeft = dx < 0;
      var next;
      if (goLeft) next = (activeGoalIndex + 1) % count;
      else        next = (activeGoalIndex - 1 + count) % count;

      if (typeof haptic === "function") haptic("light");
      goalSwipeToIndex(next, goLeft);
      return;
    }

    content.style.transition = "transform 0.35s cubic-bezier(.4,0,.2,1), opacity 0.2s ease";
    content.style.transform = "translateX(0)";
    content.style.opacity = "1";
    setTimeout(function () {
      content.style.transform = "";
      content.style.opacity = "";
      content.style.transition = "";
    }, 350);
  }

  wrapper.addEventListener("pointerup", finishGoalSwipe);
  wrapper.addEventListener("pointercancel", finishGoalSwipe);
})();