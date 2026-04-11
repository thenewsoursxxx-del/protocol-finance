const tg = window.Telegram?.WebApp;
tg?.expand();

const buttons = document.querySelectorAll(".nav-btn");
const screens = document.querySelectorAll(".screen");
const indicator = document.querySelector(".nav-indicator");

/* ===== NAV ICON ANIMATIONS ===== */
var navCalcLottie = null;
var navProtocolLottie = null;
var navAccountsLottie = null;
var navGoalsLottie = null;
var navExpensesLottie = null;

(function initNavIcons() {
  if (typeof lottie === "undefined") return;
  var navIcons = [
    { id: "nav-calc-lottie", path: "assets/animation/Coins-2.json", ref: "navCalcLottie" },
    { id: "nav-protocol-lottie", path: "assets/animation/trend-up-ai_.json", ref: "navProtocolLottie" },
    { id: "nav-accounts-lottie", path: "assets/animation/Wallet-doublle.json", ref: "navAccountsLottie" },
    { id: "nav-goals-lottie", path: "assets/animation/Marker.json", ref: "navGoalsLottie" },
    { id: "nav-expenses-lottie", path: "assets/animation/Align-bottom.json", ref: "navExpensesLottie" }
  ];
  navIcons.forEach(function (cfg) {
    var el = document.getElementById(cfg.id);
    if (el) {
      var anim = lottie.loadAnimation({
        container: el,
        renderer: "svg",
        loop: false,
        autoplay: false,
        path: cfg.path
      });
      if (cfg.ref === "navCalcLottie") navCalcLottie = anim;
      else if (cfg.ref === "navProtocolLottie") navProtocolLottie = anim;
      else if (cfg.ref === "navAccountsLottie") navAccountsLottie = anim;
      else if (cfg.ref === "navGoalsLottie") navGoalsLottie = anim;
      else if (cfg.ref === "navExpensesLottie") navExpensesLottie = anim;
    }
  });
})();

function replayNavIconForScreen(screenName) {
  var anim = null;
  if (screenName === "calc") anim = navCalcLottie;
  else if (screenName === "advice") anim = navProtocolLottie;
  else if (screenName === "accounts") anim = navAccountsLottie;
  else if (screenName === "goals") anim = navGoalsLottie;
  else if (screenName === "ai") anim = navExpensesLottie;
  if (anim) {
    anim.goToAndStop(0, true);
    anim.play();
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
  var d = v.replace(/\D/g, "");
  var sep = (window._protocolNumberFormat === "dots") ? "." : " ";
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}
function parseNumber(v) {
  return Number(v.replace(/[\.\s\u00A0]/g, ""));
}
function getCurrencySymbol() {
  var c = window._protocolCurrency || "RUB";
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  return "₽";
}
function protocolFormatAmount(n) {
  var num = Number(n) || 0;
  var sep = (window._protocolNumberFormat === "dots") ? "." : "\u00A0";
  var str = Math.abs(num).toString();
  var formatted = str.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (num < 0 ? "−" : "") + formatted + " " + getCurrencySymbol();
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
title: ""
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
  saveFullState();
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
      title: goalMeta.title || t("advGoals.mainGoal"),
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

  var overridden = [];
  var natural = [];
  var overriddenTotal = 0;

  active.forEach(function (g) {
    var remaining = Math.max(0, g.amount - (g.saved || 0));
    if (g.timelineOverrideMonths && g.timelineOverrideMonths > 0) {
      var needed = Math.ceil(remaining / g.timelineOverrideMonths);
      if (needed <= monthlyContribution && (overriddenTotal + needed) <= monthlyContribution) {
        g.monthlyShare = needed;
        g.monthsLeft = g.timelineOverrideMonths;
        overriddenTotal += needed;
        overridden.push(g);
        return;
      }
    }
    natural.push(g);
  });

  var poolForNatural = Math.max(0, monthlyContribution - overriddenTotal);

  if (natural.length > 0 && poolForNatural > 0) {
    var totalWeight = 0;
    natural.forEach(function (g) {
      totalWeight += 1 / (g.priority || 1);
    });
    natural.forEach(function (g) {
      var weight = (1 / (g.priority || 1)) / totalWeight;
      g.monthlyShare = Math.round(poolForNatural * weight);
      var remaining = Math.max(0, g.amount - (g.saved || 0));
      g.monthsLeft = g.monthlyShare > 0 ? Math.ceil(remaining / g.monthlyShare) : 0;
    });
  } else if (natural.length > 0) {
    natural.forEach(function (g) { g.monthlyShare = 0; g.monthsLeft = 0; });
  }

  return goals;
}

function computeMinAllowedMonths(goal, totalMonthlyPool) {
  var remaining = Math.max(0, (goal.amount || 0) - (goal.saved || 0));
  if (remaining <= 0) return 1;
  if (!totalMonthlyPool || totalMonthlyPool <= 0) return 1;
  return Math.max(1, Math.ceil(remaining / totalMonthlyPool));
}

function computeTimelinePreview(draftGoals, totalMonthly) {
  var preview = JSON.parse(JSON.stringify(draftGoals));
  computeGoalsAllocation(preview, totalMonthly);
  return preview;
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

  var goalTarget = goalValue || 1;
  var hasFact;
  if (activeGoalIndex > 0 && activeGoal) {
    hasFact = factBalance > 0 && (factBalance / goalTarget) > 0.005;
  } else {
    hasFact = factHistory && factHistory.length > 0;
  }

  var actualMonths = 0;
  var now = new Date();
  var nowMK = now.getFullYear() * 12 + now.getMonth();

  if (activeGoalIndex === 0 && factHistory && factHistory.length > 0) {
    var mainFacts = factHistory.filter(function (f) { return f.to === "main"; });
    if (mainFacts.length > 0) {
      var startMK = nowMK;
      mainFacts.forEach(function (f) {
        var d = new Date(f.date);
        var mk = d.getFullYear() * 12 + d.getMonth();
        if (mk < startMK) startMK = mk;
      });
      actualMonths = Math.max(1, nowMK - startMK + 1);
    }
  } else if (activeGoalIndex > 0 && hasFact) {
    var secondaryFacts = factHistory ? factHistory.filter(function (f) {
      return f.goalIndex === activeGoalIndex;
    }) : [];
    if (secondaryFacts.length > 0) {
      var startMKSec = nowMK;
      secondaryFacts.forEach(function (f) {
        var d = new Date(f.date);
        var mk = d.getFullYear() * 12 + d.getMonth();
        if (mk < startMKSec) startMKSec = mk;
      });
      actualMonths = Math.max(1, nowMK - startMKSec + 1);
    } else {
      actualMonths = 1;
    }
  }

  var visibleMonths = Math.max(3, actualMonths + 2, Math.min(goalMonths, actualMonths + 6));
  if (goalMonths > 0) visibleMonths = Math.min(visibleMonths, goalMonths);
  if (actualMonths > visibleMonths) visibleMonths = actualMonths;
  var minVisible = (goalMonths > 0 && goalMonths <= 3) ? Math.max(2, goalMonths) : 3;
  visibleMonths = Math.max(minVisible, visibleMonths);

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

/**
 * Distribute a repayment amount across active debts.
 * Priority: earliest nextPaymentDate first, then smallest remainingAmount.
 * Returns { applied: totalApplied, details: [{debtId, amount}] }.
 * Mutates debt objects in place (reduces remainingAmount, marks inactive if 0).
 */
function applyDebtRepayment(amount) {
  if (!amount || amount <= 0) return { applied: 0, details: [] };

  var s = getState();
  var debts = s.debts || [];
  var active = [];
  debts.forEach(function (d, idx) {
    if (d.isActive !== false && (Number(d.remainingAmount) || 0) > 0) {
      active.push({ debt: d, _origIdx: idx });
    }
  });

  if (active.length === 0) return { applied: 0, details: [] };

  active.sort(function (a, b) {
    var dateA = a.debt.nextPaymentDate ? new Date(a.debt.nextPaymentDate).getTime() : Infinity;
    var dateB = b.debt.nextPaymentDate ? new Date(b.debt.nextPaymentDate).getTime() : Infinity;
    if (dateA !== dateB) return dateA - dateB;
    var remA = Number(a.debt.remainingAmount) || 0;
    var remB = Number(b.debt.remainingAmount) || 0;
    if (remA !== remB) return remA - remB;
    return a._origIdx - b._origIdx;
  });

  var remaining = amount;
  var details = [];

  active.forEach(function (entry) {
    if (remaining <= 0) return;
    var debt = entry.debt;
    var owed = Number(debt.remainingAmount) || 0;
    var pay = Math.min(remaining, owed);
    if (pay <= 0) return;

    debt.remainingAmount = Math.max(0, owed - pay);
    remaining -= pay;
    details.push({ debtId: debt.id, amount: pay });

    if (debt.remainingAmount <= 0) {
      debt.remainingAmount = 0;
      debt.isActive = false;
    } else if (debt.nextPaymentDate) {
      var nd = new Date(debt.nextPaymentDate);
      nd.setMonth(nd.getMonth() + 1);
      debt.nextPaymentDate = nd.toISOString().split("T")[0];
    }
  });

  var totalApplied = amount - remaining;
  if (totalApplied > 0) {
    updateState({ debts: debts });
    saveFullState();
  }

  return { applied: totalApplied, details: details };
}

/**
 * Returns total monthly debt payment for active debts (regardless of toggle).
 */
function getActiveDebtMonthlyPayment() {
  var debts = getState().debts || [];
  var total = 0;
  debts.forEach(function (d) {
    if (d.isActive !== false && (Number(d.remainingAmount) || 0) > 0) {
      total += (Number(d.monthlyPayment) || 0);
    }
  });
  return total;
}

function addDebtPaymentRecord(opts) {
  var s = getState();
  var history = Array.isArray(s.debtPaymentHistory) ? s.debtPaymentHistory.slice() : [];
  history.push({
    id: "dp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    debtId: opts.debtId,
    amount: opts.amount,
    date: new Date().toISOString(),
    source: opts.source || "manual",
    totalInput: opts.totalInput || 0,
    savingsPart: opts.savingsPart || 0
  });
  updateState({ debtPaymentHistory: history });
  saveFullState();
}

var _debtBreakdownTimer = null;
function showDebtBreakdown(total, debtPart, savingsPart) {
  var el = document.getElementById("debtBreakdownBlock");
  if (!el) return;
  el.innerHTML =
    '<div class="debt-breakdown-title">' + t("debts.breakdown.from", {amount: fmtAmount(total)}) + '</div>' +
    '<div class="debt-breakdown-line"><span class="debt-breakdown-dot debt-breakdown-dot--debt"></span>' + fmtNum(debtPart) + ' ' + getCurrencySymbol() + ' ' + t("debts.breakdown.toDebt") + '</div>' +
    '<div class="debt-breakdown-line"><span class="debt-breakdown-dot debt-breakdown-dot--save"></span>' + fmtNum(savingsPart) + ' ' + getCurrencySymbol() + ' ' + t("debts.breakdown.toSavings") + '</div>';
  el.classList.remove("debt-breakdown--hidden");
  el.classList.add("debt-breakdown--visible");

  if (_debtBreakdownTimer) clearTimeout(_debtBreakdownTimer);
  _debtBreakdownTimer = setTimeout(function () {
    el.classList.remove("debt-breakdown--visible");
    el.classList.add("debt-breakdown--hidden");
  }, 8000);
}

/**
 * Returns a stable period key string for the given debt.
 * Uses nextPaymentDate month if available, otherwise current calendar month.
 */
function getDebtPeriodKey(debt) {
  if (debt.nextPaymentDate) {
    var d = new Date(debt.nextPaymentDate);
    if (!isNaN(d.getTime())) {
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    }
  }
  var now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
}

/**
 * Advances debt periods when the current date has moved past nextPaymentDate.
 * Resets paidInCurrentPeriod when a new cycle begins.
 * Also initializes period-tracking fields for debts that lack them.
 */
function advanceDebtPeriods() {
  var s = getState();
  var debts = s.debts || [];
  if (debts.length === 0) return;

  var changed = false;
  var now = new Date();
  now.setHours(0, 0, 0, 0);

  debts.forEach(function (d) {
    if (d.isActive === false) return;
    if ((Number(d.remainingAmount) || 0) <= 0) return;

    if (typeof d.paidInCurrentPeriod !== "number") { d.paidInCurrentPeriod = 0; changed = true; }
    if (typeof d.currentPeriodKey !== "string") { d.currentPeriodKey = ""; changed = true; }

    if (d.nextPaymentDate) {
      var dueDate = new Date(d.nextPaymentDate);
      dueDate.setHours(0, 0, 0, 0);
      while (now.getTime() > dueDate.getTime() && (Number(d.remainingAmount) || 0) > 0) {
        dueDate.setMonth(dueDate.getMonth() + 1);
        d.nextPaymentDate = dueDate.toISOString().split("T")[0];
        d.paidInCurrentPeriod = 0;
        changed = true;
      }
    }

    var expectedKey = getDebtPeriodKey(d);
    if (d.currentPeriodKey !== expectedKey) {
      d.paidInCurrentPeriod = 0;
      d.currentPeriodKey = expectedKey;
      changed = true;
    }
  });

  if (changed) {
    updateState({ debts: debts });
    saveFullState();
  }
}

/**
 * Returns current-period obligations for all active debts.
 * Each obligation has: debt ref, dueForPeriod, paidSoFar, stillOwed.
 * Sorted by earliest nextPaymentDate, then smallest remainingAmount, then creation order.
 */
function getCurrentDebtObligations() {
  var s = getState();
  var debts = s.debts || [];
  var obligations = [];
  var totalDue = 0;

  debts.forEach(function (d, idx) {
    if (d.isActive === false) return;
    var remaining = Number(d.remainingAmount) || 0;
    if (remaining <= 0) return;
    var monthly = Number(d.monthlyPayment) || 0;
    if (monthly <= 0) return;

    var dueForPeriod = Math.min(monthly, remaining);
    var paidSoFar = Number(d.paidInCurrentPeriod) || 0;
    var stillOwed = Math.max(0, dueForPeriod - paidSoFar);

    if (stillOwed > 0) {
      obligations.push({ debt: d, _origIdx: idx, dueForPeriod: dueForPeriod, paidSoFar: paidSoFar, stillOwed: stillOwed });
      totalDue += stillOwed;
    }
  });

  obligations.sort(function (a, b) {
    var dateA = a.debt.nextPaymentDate ? new Date(a.debt.nextPaymentDate).getTime() : Infinity;
    var dateB = b.debt.nextPaymentDate ? new Date(b.debt.nextPaymentDate).getTime() : Infinity;
    if (dateA !== dateB) return dateA - dateB;
    var remA = Number(a.debt.remainingAmount) || 0;
    var remB = Number(b.debt.remainingAmount) || 0;
    if (remA !== remB) return remA - remB;
    return a._origIdx - b._origIdx;
  });

  return { obligations: obligations, totalDue: totalDue };
}

/**
 * Auto-repayment: covers only the CURRENT period's unpaid obligations.
 * Does NOT advance nextPaymentDate (that is handled by advanceDebtPeriods).
 * Returns { applied, details: [{debtId, amount}] }.
 */
function applyAutoDebtRepayment(amount) {
  if (!amount || amount <= 0) return { applied: 0, details: [] };

  advanceDebtPeriods();

  var info = getCurrentDebtObligations();
  if (info.totalDue <= 0) return { applied: 0, details: [] };

  var pool = Math.min(amount, info.totalDue);
  var remaining = pool;
  var details = [];

  var s = getState();
  var debts = s.debts || [];

  info.obligations.forEach(function (ob) {
    if (remaining <= 0) return;
    var pay = Math.min(remaining, ob.stillOwed);
    if (pay <= 0) return;

    ob.debt.remainingAmount = Math.max(0, (Number(ob.debt.remainingAmount) || 0) - pay);
    ob.debt.paidInCurrentPeriod = (Number(ob.debt.paidInCurrentPeriod) || 0) + pay;
    remaining -= pay;
    details.push({ debtId: ob.debt.id, amount: pay });

    if (ob.debt.remainingAmount <= 0) {
      ob.debt.remainingAmount = 0;
      ob.debt.isActive = false;
    }
  });

  var totalApplied = pool - remaining;
  if (totalApplied > 0) {
    updateState({ debts: debts });
    saveFullState();
  }

  return { applied: totalApplied, details: details };
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

  // After allocation, sync state to active goal's derived values
  var activeGoalForState = goalsArr[activeGoalIndex] || null;
  if (goalsArr.length > 1 && activeGoalForState) {
    state.monthlyContribution = activeGoalForState.monthlyShare || 0;
    state.monthsLeft = activeGoalForState.monthsLeft || 0;
  }

  renderGoals();
  renderAccountsUI();

  const summaryMonthsEl = document.getElementById("summaryMonths");
  if (summaryMonthsEl && state.monthsLeft) {
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
 * localStorage — мгновенно. Supabase — через debounce (1 с).
 */
var _supabaseSaveTimer = null;
var SUPABASE_SAVE_DELAY = 1000;

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
  var serialized = saveState();

  if (window.saveAppState && serialized) {
    if (_supabaseSaveTimer) clearTimeout(_supabaseSaveTimer);
    var snapshot = JSON.parse(JSON.stringify(serialized));
    _supabaseSaveTimer = setTimeout(function () {
      _supabaseSaveTimer = null;
      var p = window.saveAppState(snapshot);
      if (p && typeof p.catch === "function") {
        p.catch(function (err) {
          console.error("[App] saveAppState:", err);
        });
      }
    }, SUPABASE_SAVE_DELAY);
  }
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

    if (s.settings) {
      window._protocolCurrency = s.settings.currency || "RUB";
      window._protocolNumberFormat = s.settings.numberFormat || "spaces";
      document.body.classList.toggle("reduce-motion", !s.settings.animationsEnabled);
    }
    if (typeof applyLanguageToDOM === "function") applyLanguageToDOM();

    ensureDefaultGoal();
    advanceDebtPeriods();

    if (isInitialized) {
      lockTabs(false);
      planSummary.style.display = "block";
      if (summaryMonthly && lastCalc.monthlySave) summaryMonthly.innerText = fmtNum(lastCalc.monthlySave);
      if (summaryMonths && lastCalc.months) summaryMonths.innerText = lastCalc.months;
      if (summaryMode) summaryMode.innerText = t("mode." + saveMode);
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
            if (adviceCard) adviceCard.innerHTML = "<p style='padding:20px'>" + t("protocol.loadFailed") + "</p>";
            if (loader) loader.classList.add("hidden");
          }
        }

        if (targetScreen === "ai" && typeof renderExpensesScreen === "function") {
          renderExpensesScreen();
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
            title: t("scenario.direct"),
            toGoal: baseMonthly,
            toBuffer: 0,
            months: lastCalc.months,
            risk: t("scenario.riskHigh")
          },
          {
            id: "buffer",
            title: t("scenario.buffer"),
            toGoal: Math.round(baseMonthly * (1 - bufferRate)),
            toBuffer: Math.round(baseMonthly * bufferRate),
            months: Math.ceil(
              lastCalc.effectiveGoal /
              Math.round(baseMonthly * (1 - bufferRate))
            ),
            risk: t("scenario.riskLow")
          }
        ];
        const scenariosHTML = scenarios.map(s => `
<div class="card scenario-card" data-id="${s.id}">
<div style="color:#fff;font-weight:600;font-size:19px;margin-bottom:12px">
${s.title}
</div>

${t("scenario.toGoal")}: ${fmtNum(s.toGoal)} ${getCurrencySymbol()} ${t("scenario.perMonth")}<br>
${s.toBuffer ? `${t("scenario.toReserve")}: ${fmtNum(s.toBuffer)} ${getCurrencySymbol()}<br>` : ""}
${t("scenario.term")}: ~${s.months} ${t("scenario.months")}<br>

<span style="opacity:.6">${t("scenario.risk")}: ${s.risk}</span>

${
s.id === "buffer"
? `
<div class="reserve-info reserve-ui">
<b>${t("scenario.reserveInfo")}</b><br>
${t("scenario.reserveDesc").replace(/\n/g, "<br>")}
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

(async () => {
  try {
    if (!window.loadAppState) return;

    var remote = await window.loadAppState();

    if (!remote || !remote.data || typeof remote.data !== "object") {
      console.log("[Sync] No remote state found");
      return;
    }

    var localState = loadState();

    var localTimestamp = (localState && localState.lastSavedAt) ? localState.lastSavedAt : null;
    var remoteTimestamp = (remote.data && remote.data.lastSavedAt)
      ? remote.data.lastSavedAt
      : (remote.updated_at || null);

    console.log("[Sync] Local timestamp:", localTimestamp || "(none)");
    console.log("[Sync] Remote timestamp:", remoteTimestamp || "(none)");

    if (!localState) {
      console.log("[Sync] No local state — applying remote state");
      applyState(migrateState(remote.data));
      saveState();
      loadFullState();
      return;
    }

    if (!remoteTimestamp) {
      console.log("[Sync] No valid remote timestamp — keeping local state");
      return;
    }

    var localDate = localTimestamp ? new Date(localTimestamp) : null;
    var remoteDate = new Date(remoteTimestamp);

    if (isNaN(remoteDate.getTime())) {
      console.log("[Sync] Invalid remote timestamp — keeping local state");
      return;
    }

    if (!localDate || isNaN(localDate.getTime())) {
      console.log("[Sync] Invalid or missing local timestamp — applying remote state");
      applyState(migrateState(remote.data));
      saveState();
      loadFullState();
      return;
    }

    if (remoteDate.getTime() > localDate.getTime()) {
      console.log("[Sync] Remote is newer — applying remote state");
      applyState(migrateState(remote.data));
      saveState();
      loadFullState();
    } else {
      console.log("[Sync] Keeping local state (local is newer or equal)");
    }

  } catch (e) {
    console.error("[Sync] Error during remote state comparison:", e);
  }
})();

// Убираем зависший экран «Protocol анализирует данные…» (при повторном входе и при возврате без перезагрузки)
function repairAdviceScreenIfStuck() {
  const adviceScreen = document.getElementById("screen-advice");
  if (!adviceScreen || !adviceScreen.classList.contains("active")) return;
  if (!isInitialized || !chosenPlan || !lastCalc?.ok) return;
  const card = document.getElementById("adviceCard");
  if (!card || !card.querySelector("#fakeScreen")) return;
  if (loader) loader.classList.add("hidden");
  try {
    renderProtocolAdviceGraph();
    if (factHistory.length) runBrain();
    showBottomNav();
  } catch (e) {
    console.warn("repairAdviceScreenIfStuck:", e);
    card.innerHTML = "<p style='padding:20px'>" + t("protocol.loadError") + "</p><button type='button' id='repairGoToCalc'>" + t("protocol.goToCalc") + "</button>";
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
bottomNav.style.visibility = "hidden";
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

/* ============================================================
   ProtoSheet — Unified Sheet Helpers
   ============================================================ */

window.ProtoSheet = {
  open: function (sheetEl, overlayEl) {
    if (!sheetEl) return;
    sheetEl.style.transform = "";
    sheetEl.style.transition = "";
    if (overlayEl) overlayEl.style.display = "block";
    hideBottomNav();
    requestAnimationFrame(function () {
      sheetEl.classList.add("open");
    });
  },

  close: function (sheetEl, overlayEl, opts) {
    if (!sheetEl) return;
    opts = opts || {};
    sheetEl.style.transform = "";
    sheetEl.style.transition = "";
    sheetEl.classList.remove("open");
    setTimeout(function () {
      if (overlayEl) overlayEl.style.display = "none";
      showBottomNav();
      if (opts.onClosed) opts.onClosed();
    }, 500);
  },

  initSwipe: function (sheetEl, closeFn) {
    if (!sheetEl) return;
    var startY = 0;
    var dy = 0;
    var dragging = false;

    sheetEl.addEventListener("touchstart", function (e) {
      if (sheetEl.scrollTop > 5) return;
      startY = e.touches[0].clientY;
      dy = 0;
      dragging = true;
    }, { passive: true });

    sheetEl.addEventListener("touchmove", function (e) {
      if (!dragging) return;
      dy = e.touches[0].clientY - startY;
      if (dy < 0) { dy = 0; return; }
      sheetEl.style.transition = "none";
      sheetEl.style.transform = "translateY(" + dy + "px)";
    }, { passive: true });

    sheetEl.addEventListener("touchend", function () {
      if (!dragging) return;
      dragging = false;
      sheetEl.style.transition = "";
      if (dy > 80) {
        if (typeof haptic === "function") haptic("light");
        sheetEl.style.transform = "";
        closeFn();
      } else {
        sheetEl.style.transform = "";
        sheetEl.classList.add("open");
      }
    });
  },

  resetAll: function () {
    document.querySelectorAll(".proto-sheet").forEach(function (s) {
      s.classList.remove("open");
      s.style.transform = "";
      s.style.transition = "";
    });
    document.querySelectorAll(".proto-sheet-overlay").forEach(function (o) {
      o.style.display = "none";
    });
  }
};

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
if (name === "advice" && isInitialized && chosenPlan && lastCalc?.ok && adviceCard && adviceCard.querySelector("#fakeScreen")) {
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
  saveFullState();
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

if (btn.dataset.screen === "ai") {
renderExpensesScreen();
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
? t("history.reserveTitle")
: t("history.mainTitle");

list.innerHTML = "";

// 1️⃣ собираем операции
let entries = factHistory
.filter(f =>
type === "reserve"
? f.to === "reserve"
: f.to === "main"
)
.map(f => {
var displayDate = f.timestamp ? new Date(f.timestamp) : new Date(f.date);
if (isNaN(displayDate.getTime())) displayDate = new Date();
return {
  value: f.value,
  date: displayDate,
  isInitial: false,
  isSpent: f.value < 0
};
});

// 2️⃣ добавляем стартовый баланс как самую старую запись
if (type === "main" && initialBalance > 0) {
entries.push({
value: initialBalance,
date: new Date(0),
isInitial: true
});
}

// 3️⃣ если вообще пусто
if (entries.length === 0) {
list.innerHTML = `
<div class="card" style="opacity:.6;font-size:14px">
${t("history.noOps")}
</div>
`;
openScreen("progress", null);
return;
}

// 4️⃣ сортируем: новые сверху
entries.sort((a, b) => b.date - a.date);

// 5️⃣ рисуем
entries.forEach(e => {
var dd = String(e.date.getDate()).padStart(2, "0");
var mm = String(e.date.getMonth() + 1).padStart(2, "0");
var yyyy = e.date.getFullYear();
var formatted = dd + "." + mm + "." + yyyy;

if (e.isInitial) {
list.innerHTML += `
<div class="card" style="opacity:.85">
<div style="font-size:15px;font-weight:600">
${t("history.initialBalance")}: ${fmtNum(e.value)} ${getCurrencySymbol()}
</div>
<div style="font-size:13px;opacity:.6;margin-top:4px">
${t("history.createdWithPlan")}
</div>
</div>
`;
} else if (e.isSpent) {
list.innerHTML += `
<div class="card">
<div style="font-size:15px;font-weight:600;color:#f59e0b">
−${fmtNum(Math.abs(e.value))} ${getCurrencySymbol()}
</div>
<div style="font-size:13px;opacity:.6;margin-top:4px">
${formatted}
</div>
<div style="font-size:12px;opacity:.7;margin-top:2px">
${t("history.unplannedExpense")}
</div>
</div>
`;
} else {
list.innerHTML += `
<div class="card">
<div style="font-size:15px;font-weight:600">
+${fmtNum(e.value)} ${getCurrencySymbol()}
</div>
<div style="font-size:13px;opacity:.6;margin-top:4px">
${formatted}
</div>
</div>
`;
}

});

openScreen("progress", null);
}

/* ===== BOTTOM SHEET ===== */
function openSheet() {
ProtoSheet.open(sheet, sheetOverlay);
}
function closeSheet() {
ProtoSheet.close(sheet, sheetOverlay);
}
ProtoSheet.initSwipe(sheet, closeSheet);

function renderProtocolResult({ scenariosHTML, advice }) {
var _actionsEl = document.getElementById("protocolActionsContainer");
if (_actionsEl) { _actionsEl.innerHTML = ""; _actionsEl.style.display = "none"; }
var _indicatorEl = document.getElementById("graphGoalIndicator");
if (_indicatorEl) { _indicatorEl.classList.remove("visible"); _indicatorEl.innerHTML = ""; }

adviceCard.innerHTML = `
<div style="margin-bottom:12px">
<div style="font-size:14px;opacity:.7;margin-bottom:6px">
${t("protocol.chooseScenario")}
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
  alert(t("engine.noBalance"));
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
title: t("scenario.direct"),
toGoal: baseMonthly,
toBuffer: 0,
months: lastCalc.months,
risk: t("scenario.riskHigh")
},
{
id: "buffer",
title: t("scenario.buffer"),
toGoal: Math.round(baseMonthly * (1 - bufferRate)),
toBuffer: Math.round(baseMonthly * bufferRate),
months: Math.ceil(
lastCalc.effectiveGoal /
Math.round(baseMonthly * (1 - bufferRate))
),
risk: t("scenario.riskLow")
}
];

const scenariosHTML = scenarios.map(s => `
<div class="card scenario-card" data-id="${s.id}">
<div style="color:#fff;font-weight:600;font-size:19px;margin-bottom:12px">
${s.title}
</div>

${t("scenario.toGoal")}: ${fmtNum(s.toGoal)} ${getCurrencySymbol()} ${t("scenario.perMonth")}<br>
${s.toBuffer ? `${t("scenario.toReserve")}: ${fmtNum(s.toBuffer)} ${getCurrencySymbol()}<br>` : ""}
${t("scenario.term")}: ~${s.months} ${t("scenario.months")}<br>

<span style="opacity:.6">${t("scenario.risk")}: ${s.risk}</span>

${
s.id === "buffer"
? `
<div class="reserve-info reserve-ui">
<b>${t("scenario.reserveInfo")}</b><br>
${t("scenario.reserveDesc").replace(/\n/g, "<br>")}
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
summaryMonthly.innerText = fmtNum(lastCalc.monthlySave);
summaryMonths.innerText = lastCalc.months;
summaryMode.innerText =
t("mode." + saveMode);

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
  const adviceBlockHtml = (advice && advice.text) ? `<div style="
margin-top:10px;
padding:10px 12px;
border-radius:14px;
background:#111;
border:1px solid #222;
font-size:14px;
">${advice.text}</div>` : "";

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
<button id="timelineBackBtn" class="timeline-back-btn" type="button" style="display:none">← ${t("misc.overview")}</button>
</div>
<div class="chart-card"></div>
<div class="fact-input-row">
<input id="factInput" inputmode="numeric"
placeholder="${t("calc.factPlaceholder")}"
style="flex:1"/>
<button id="applyFact"
style="width:52px;height:52px;border-radius:50%">
➜
</button>
</div>
<div id="brainMessageContainer"></div>
</div>

<div id="debtBreakdownBlock" class="debt-breakdown debt-breakdown--hidden"></div>

<div id="factTooltipContainer" class="fact-tooltip-container graph-tooltip-bottom"></div>
`;

  var actionsContainer = document.getElementById("protocolActionsContainer");
  if (actionsContainer) {
    actionsContainer.innerHTML = '<button id="unexpectedExpenseBtn" class="unexpected-expense-trigger" type="button">' + t("protocol.unexpectedBtn") + '</button>';
    actionsContainer.style.display = "";
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
      let debtRepaid = 0;

      var currentState = getState();
      if (currentState.debtPlanningMode) {
        var repayResult = applyAutoDebtRepayment(distributable);
        debtRepaid = repayResult.applied;
        distributable -= debtRepaid;
      }

      if (chosenPlan === "buffer") {
        toReserve = Math.round(distributable * 0.1);
        distributable = distributable - toReserve;
      }

      const now = new Date();
      const realTimestamp = now.toISOString();
      const periodDate = new Date(now);
      periodDate.setDate(1);
      periodDate.setHours(0, 0, 0, 0);

      var goals = getGoals();
      var alloc = allocateFactByPriority(goals, distributable);

      alloc.forEach(function (entry) {
        if (entry.amount <= 0) return;
        var g = getGoalById(entry.goalId);
        if (!g) return;
        if (g.priority === 1 || goals.indexOf(g) === 0) {
          factHistory.push({ value: entry.amount, date: periodDate, to: "main", timestamp: realTimestamp });
        } else {
          g.saved = (g.saved || 0) + entry.amount;
        }
      });

      if (toReserve > 0) {
        factHistory.push({ value: toReserve, date: periodDate, to: "reserve", timestamp: realTimestamp });
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

      if (debtRepaid > 0) {
        var savingsPart = fact - debtRepaid;
        repayResult.details.forEach(function (d) {
          addDebtPaymentRecord({
            debtId: d.debtId,
            amount: d.amount,
            source: "auto",
            totalInput: fact,
            savingsPart: savingsPart
          });
        });

        if (typeof renderDebtSummaryGlobal === "function") renderDebtSummaryGlobal();
        if (typeof renderDebtListGlobal === "function") renderDebtListGlobal();
        showToast(t("toast.debtRepaid"), "success");
        showDebtBreakdown(fact, debtRepaid, savingsPart);
      }

      factInput.value = "";
      factInput.blur();
    };
  }

  const unexpBtn = document.getElementById("unexpectedExpenseBtn");
  if (unexpBtn) {
    unexpBtn.onclick = () => {
      if (isCashflowNoData()) {
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
updateState({ settings: { allocationMode: mode === "buffer" ? "buffer" : "goal" } });
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

var actionsContainer = document.getElementById("protocolActionsContainer");
var graphIndicator = document.getElementById("graphGoalIndicator");
if (actionsContainer) { actionsContainer.innerHTML = ""; actionsContainer.style.display = "none"; }
if (graphIndicator) { graphIndicator.classList.remove("visible"); graphIndicator.innerHTML = ""; }

plannedMonthly = lastCalc.monthlySave;

if (mode === "buffer") plannedMonthly = Math.round(plannedMonthly * 0.9);

adviceCard.innerText = t("flow.analyzing");

setTimeout(() => {
adviceCard.innerText =
mode === "buffer"
? t("flow.bufferChosen")
: t("flow.directChosen");
}, 2000);

setTimeout(() => {
adviceCard.innerText = t("flow.done");
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
  goalMeta.title = t("goals.default");

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

/* ===== SETTINGS SCREEN ===== */

(function initSettingsScreen() {

  var settingsBtn = document.getElementById("settingsBtn");
  var settingsBack = document.getElementById("settingsBack");

  function applyI18nToSettings() {
    applyLanguageToDOM();
  }

  // ── Segment helper ──
  function initSegment(containerId, stateKey) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var btns = container.querySelectorAll(".settings-seg-btn");

    function sync() {
      var val = (getState().settings || {})[stateKey];
      btns.forEach(function (b) {
        b.classList.toggle("active", b.dataset.value === val);
      });
    }

    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (typeof haptic === "function") haptic("light");
        var patch = {};
        patch[stateKey] = btn.dataset.value;
        updateState({ settings: patch });
        saveFullState();
        sync();
        onSettingChanged(stateKey, btn.dataset.value);
      });
    });

    sync();
    return { sync: sync };
  }

  // ── Toggle helper ──
  function initToggle(inputId, stateKey, hintId, hintOnKey, hintOffKey) {
    var input = document.getElementById(inputId);
    if (!input) return;

    function sync() {
      var val = (getState().settings || {})[stateKey];
      input.checked = !!val;
      if (hintId) {
        var hint = document.getElementById(hintId);
        if (hint) hint.textContent = val ? t(hintOnKey) : t(hintOffKey);
      }
    }

    input.addEventListener("change", function () {
      if (typeof haptic === "function") haptic("light");
      var patch = {};
      patch[stateKey] = input.checked;
      updateState({ settings: patch });
      saveFullState();
      sync();
      onSettingChanged(stateKey, input.checked);
    });

    sync();
    return { sync: sync };
  }

  // ── Reactions when a setting changes ──
  function onSettingChanged(key, value) {
    if (key === "animationsEnabled") {
      document.body.classList.toggle("reduce-motion", !value);
      if (typeof lottie !== "undefined") {
        if (!value) lottie.pause();
        else lottie.play();
      }
    }

    if (key === "notificationsEnabled") {
      var nested = document.getElementById("settingsNotifNested");
      if (nested) nested.style.display = value ? "" : "none";
    }

    if (key === "language") {
      applyLanguageToDOM();
      updateDynamicHints();
    }

    if (key === "currency") {
      window._protocolCurrency = value;
      applyLanguageToDOM();
      _refreshDisplayedAmounts();
    }

    if (key === "numberFormat") {
      window._protocolNumberFormat = value;
      _refreshDisplayedAmounts();
    }

    if (key === "allocationMode") {
      if (typeof chosenPlan !== "undefined" && chosenPlan !== null) {
        chosenPlan = (value === "buffer") ? "buffer" : "direct";
        if (typeof recalcPlan === "function") recalcPlan();
        if (typeof renderAccountsUI === "function") renderAccountsUI();
        if (typeof renderGoals === "function") renderGoals();
      }
    }
  }

  function _refreshDisplayedAmounts() {
    if (typeof renderAccountsUI === "function") renderAccountsUI();
    if (typeof renderGoals === "function") renderGoals();
    if (typeof renderExpensesScreen === "function") renderExpensesScreen();
  }

  function updateDynamicHints() {
    var s = getState().settings || {};
    var carryHint = document.getElementById("settingsCarryOverHint");
    if (carryHint) carryHint.textContent = s.carryOverEnabled ? t("settings.carryOver.on") : t("settings.carryOver.off");
    var overpayHint = document.getElementById("settingsOverpayHint");
    if (overpayHint) overpayHint.textContent = s.allowOverpay ? t("settings.allowOverpay.on") : t("settings.allowOverpay.off");
  }

  // ── Init all controls ──
  var segments = {};
  segments.currency = initSegment("settingsCurrency", "currency");
  segments.allocation = initSegment("settingsAllocation", "allocationMode");
  segments.numberFormat = initSegment("settingsNumberFormat", "numberFormat");
  segments.reminderTime = initSegment("settingsReminderTime", "reminderTime");
  segments.language = initSegment("settingsLanguage", "language");

  var toggles = {};
  toggles.carryOver = initToggle("settingsCarryOver", "carryOverEnabled", "settingsCarryOverHint", "settings.carryOver.on", "settings.carryOver.off");
  toggles.overpay = initToggle("settingsOverpay", "allowOverpay", "settingsOverpayHint", "settings.allowOverpay.on", "settings.allowOverpay.off");
  toggles.animations = initToggle("settingsAnimations", "animationsEnabled");
  toggles.notifications = initToggle("settingsNotifications", "notificationsEnabled");
  toggles.depositReminder = initToggle("settingsDepositReminder", "depositReminderEnabled");
  toggles.debtReminder = initToggle("settingsDebtReminder", "debtReminderEnabled");

  function syncAllControls() {
    Object.keys(segments).forEach(function (k) { if (segments[k]) segments[k].sync(); });
    Object.keys(toggles).forEach(function (k) { if (toggles[k]) toggles[k].sync(); });

    var s = getState().settings || {};
    var nested = document.getElementById("settingsNotifNested");
    if (nested) nested.style.display = s.notificationsEnabled ? "" : "none";

    document.body.classList.toggle("reduce-motion", !s.animationsEnabled);
    window._protocolCurrency = s.currency || "RUB";
    window._protocolNumberFormat = s.numberFormat || "spaces";

    applyI18nToSettings();
    updateDynamicHints();
  }

  // ── Navigation ──
  if (settingsBtn) {
    settingsBtn.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      syncAllControls();
      document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
      document.getElementById("screen-settings").classList.add("active");
      if (typeof moveProfileToActiveHeader === "function") moveProfileToActiveHeader();
    });
  }

  if (settingsBack) {
    settingsBack.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
      document.getElementById("screen-profile").classList.add("active");
      if (typeof moveProfileToActiveHeader === "function") moveProfileToActiveHeader();
    });
  }

  // Apply persisted settings on load
  var s = getState().settings || {};
  document.body.classList.toggle("reduce-motion", !s.animationsEnabled);
  window._protocolCurrency = s.currency || "RUB";
  window._protocolNumberFormat = s.numberFormat || "spaces";

  /*
   * Real notification delivery requires backend / bot / scheduler
   * or platform-specific support (e.g. Telegram Bot API sendMessage
   * on a cron schedule). The UI and persistence are fully functional,
   * but actual push/local notification delivery is NOT implemented
   * because Telegram Mini Apps do not support client-side local
   * notifications or service workers with push capability.
   *
   * To enable real notifications in the future:
   * 1. Store notification preferences in Supabase (already done via state sync)
   * 2. Create a backend scheduler (Edge Function / cron) that queries
   *    user_state for users with notificationsEnabled: true
   * 3. Use the Telegram Bot API sendMessage to the user's chat_id
   *    at the configured reminderTime
   */

})();

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

  var monthNames = null; // replaced by getMonthName()

  completed.forEach(function (g) {
    var card = document.createElement("div");
    card.className = "goal-history-card";

    var dateStr = "";
    if (g.completedDate) {
      var d = new Date(g.completedDate);
      dateStr = getMonthName(d.getMonth()) + " " + d.getFullYear();
    }

    var durationStr = g.durationMonths ? t("goalHistory.achieved", {n: g.durationMonths}) : "";

    card.innerHTML =
      '<div class="goal-history-card-title">' + escapeHtmlSafe(g.title || t("goals.default")) + '</div>' +
      '<div class="goal-history-card-amount">' + fmtNum(g.amount || 0) + ' ' + getCurrencySymbol() + '</div>' +
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
        title: t("goals.default"),
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
    saveFullState();
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
input.placeholder = t("misc.required.field");

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
  var monthNames = [];
  for (var mi = 0; mi < 12; mi++) monthNames.push(getMonthNameShort(mi));
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
    return [{ startMonth: 0, endMonth: monthsCount, label: t("graph.segmentAll"), monthCount: monthsCount }];
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
text = t("status.onTrack");
} else if (diff > -planned * 0.1) {
text = t("status.slightlyBehind");
} else {
text = t("status.behind");
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
 * @param {object} opts - { duration, screenScope } duration в мс; screenScope="debts" — toast внутри экрана долгов (не виден на других вкладках, при возврате остаётся до конца таймера)
 */
function showToast(message, type, opts) {
  type = type === "error" || type === "success" || type === "info" ? type : "info";
  opts = opts || {};
  var duration = opts.duration || 2000;
  var screenScope = opts.screenScope;

  var existing = document.getElementById("protocol-toast");
  if (existing) {
    clearTimeout(existing._toastTimeout);
    existing.remove();
  }

  var el = document.createElement("div");
  el.id = "protocol-toast";
  el.className = "toast toast--" + type;
  el.textContent = message;

  var parent = screenScope === "debts" ? document.getElementById("screen-debts") : null;
  (parent || document.body).appendChild(el);

  requestAnimationFrame(function () {
    el.classList.add("toast--visible");
  });

  el._toastTimeout = setTimeout(function () {
    el.classList.remove("toast--visible");
    el.classList.add("toast--hiding");
    setTimeout(function () {
      if (el.parentNode) el.remove();
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
${t("history.deposited")}: ${fmtNum(factOnly)} ${getCurrencySymbol()}
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

/* ===== MONTHLY STATUS (current-month deposit tracker) ===== */

function computeMonthlyStatus() {
  if (activeGoalIndex > 0) {
    return { required: 0, actual: 0, complete: false, show: false };
  }

  var monthlyRequired = plannedMonthly || 0;
  if (monthlyRequired <= 0) {
    return { required: 0, actual: 0, complete: false, show: true };
  }

  var settings = (getState().settings) || {};

  var mainDeposits = [];
  if (factHistory && factHistory.length > 0) {
    factHistory.forEach(function (f) {
      if (f.to === "main" && f.value > 0) {
        mainDeposits.push(f);
      }
    });
  }

  var totalContributed = 0;
  mainDeposits.forEach(function (f) { totalContributed += f.value; });

  if (mainDeposits.length === 0) {
    return { required: monthlyRequired, actual: 0, complete: false, show: true };
  }

  var now = new Date();
  var currentMK = now.getFullYear() * 12 + now.getMonth();

  var startMK = currentMK;
  mainDeposits.forEach(function (f) {
    var d = new Date(f.date);
    var mk = d.getFullYear() * 12 + d.getMonth();
    if (mk < startMK) startMK = mk;
  });

  var monthsBefore = currentMK - startMK;
  var previousRequired = monthsBefore * monthlyRequired;
  var currentActual = Math.max(0, totalContributed - previousRequired);

  // carryOverEnabled: if ON, surplus from past months carries into current period
  // If OFF, only count deposits from the current month
  if (!settings.carryOverEnabled) {
    var currentMonthDeposits = 0;
    mainDeposits.forEach(function (f) {
      var d = new Date(f.date);
      var mk = d.getFullYear() * 12 + d.getMonth();
      if (mk === currentMK) currentMonthDeposits += f.value;
    });
    currentActual = currentMonthDeposits;
  }

  // allowOverpay: if OFF, cap the actual at the required amount
  if (!settings.allowOverpay && currentActual > monthlyRequired) {
    currentActual = monthlyRequired;
  }

  var complete = currentActual >= monthlyRequired;

  return {
    required: monthlyRequired,
    actual: Math.round(currentActual),
    complete: complete,
    show: true
  };
}

function renderMonthlyStatus() {
  var block = document.getElementById("monthlyStatusBlock");
  if (!block) return;

  var st = computeMonthlyStatus();

  if (!st.show) {
    block.classList.add("monthly-status--hidden");
    return;
  }
  block.classList.remove("monthly-status--hidden");

  var labelEl = document.getElementById("monthlyStatusLabel");
  var valueEl = document.getElementById("monthlyStatusValue");
  if (!labelEl || !valueEl) return;

  if (st.complete) {
    block.classList.add("monthly-status--complete");
    labelEl.textContent = t("monthly.complete");
    valueEl.textContent = t("monthly.completeValue");
  } else {
    block.classList.remove("monthly-status--complete");
    labelEl.textContent = t("monthly.deposited");
    valueEl.textContent = fmtNum(Math.round(st.actual))
      + " / " + fmtNum(Math.round(st.required)) + " " + getCurrencySymbol();
  }
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
    mainEl.innerText = fmtNum(activeGoal.saved || 0);
  } else {
    mainEl.innerText = fmtNum(accounts.main);
  }
}

if (mainTitleEl) {
  if (activeGoalIndex === 0 || !activeGoal) {
    mainTitleEl.innerText = t("accounts.main");
  } else {
    mainTitleEl.innerText = activeGoal.title || t("accounts.account");
  }
}

if (reserveEl) {
reserveEl.innerText = fmtNum(accounts.reserve);
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
renderMonthlyStatus();
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
var pausePlayBtn = document.getElementById("goalPausePlayBtn");

var title, saved, total;
if (idx === 0) {
  title = goalMeta.title;
  saved = accounts.main;
  total = parseNumber(goalInput.value || "0");
} else if (goal) {
  title = goal.title || t("goals.goalN", {n: idx + 1});
  saved = goal.saved || 0;
  total = goal.amount || 0;
} else {
  title = "—";
  saved = 0;
  total = 0;
}

if (titleEl) titleEl.innerText = title;

var percent = total ? Math.min(100, Math.round((saved / total) * 100)) : 0;

if (totalEl) totalEl.innerText = fmtNum(total);
if (savedEl) savedEl.innerText = fmtNum(saved);
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
    verdictText = t("verdict.paused");
  } else if (percent >= 100) {
    verdictText = t("verdict.complete");
  } else if (percent >= 70) {
    verdictText = t("verdict.almostDone");
  } else {
    verdictText = t("verdict.inProgress");
  }
  updateGoalVerdict(verdictText);
}

if (reserveCard) {
  if (chosenPlan === "buffer" && idx === 0) {
    reserveCard.style.display = "block";
    var reserveEl = document.getElementById("goalReserveAmount");
    if (reserveEl) reserveEl.innerText = fmtNum(accounts.reserve);
  } else {
    reserveCard.style.display = "none";
  }
}

if (card) {
  card.classList.toggle("goal-card-paused", !!isPaused);
}

if (pausedBadge) {
  if (idx === 0) {
    pausedBadge.style.display = "none";
  } else {
    pausedBadge.style.display = "";
    pausedBadge.classList.toggle("badge-visible", !!isPaused);
  }
}

if (editGoalBtn) {
  editGoalBtn.style.display = (idx === 0) ? "" : "none";
}

if (pausePlayBtn) {
  pausePlayBtn.style.display = (idx > 0 && goal) ? "" : "none";
  var pauseLottie = document.getElementById("goalPauseLottie");
  var playLottie = document.getElementById("goalPlayLottie");
  if (pauseLottie && playLottie) {
    pauseLottie.style.display = isPaused ? "none" : "";
    pauseLottie.parentElement.classList.toggle("showing-pause", !isPaused);
    playLottie.style.display = isPaused ? "" : "none";
    pauseLottie.parentElement.classList.toggle("showing-play", isPaused);
  }
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

ProtoSheet.open(goalEditorSheet, goalEditorOverlay);
};
}

var goalPausePlayBtn = document.getElementById("goalPausePlayBtn");
var goalPauseLottieAnim = null;
var goalPlayLottieAnim = null;

if (typeof lottie !== "undefined") {
  var pauseContainer = document.getElementById("goalPauseLottie");
  var playContainer = document.getElementById("goalPlayLottie");
  if (pauseContainer) {
    goalPauseLottieAnim = lottie.loadAnimation({
      container: pauseContainer,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: "assets/animation/Pause.json"
    });
  }
  if (playContainer) {
    goalPlayLottieAnim = lottie.loadAnimation({
      container: playContainer,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: "assets/animation/Play.json"
    });
  }
}

var editGoalLottieEl = document.getElementById("editGoalLottie");
if (editGoalLottieEl && typeof lottie !== "undefined") {
  lottie.loadAnimation({
    container: editGoalLottieEl,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: "assets/animation/Pen.json"
  });
}

if (goalPausePlayBtn) {
  goalPausePlayBtn.onclick = function () {
    haptic("light");
    var goals = getGoals();
    var goal = goals[activeGoalIndex];
    if (!goal || activeGoalIndex === 0) return;

    var inner = goalPausePlayBtn.querySelector(".goal-pause-play-inner");

    goal.paused = !goal.paused;
    computeGoalsAllocation(goals, plannedMonthly || 0);
    persistGoals(goals);
    renderGoals();
    if (typeof renderAccountsUI === "function") renderAccountsUI();
    if (typeof renderSVGGraph === "function") renderSVGGraph();
    updatePlanHeader();
    saveFullState();

    var currentAnim = goal.paused ? goalPauseLottieAnim : goalPlayLottieAnim;
    if (currentAnim) {
      currentAnim.goToAndStop(0, true);
      currentAnim.play();
      if (inner) inner.classList.add("swipe-transition");
      currentAnim.addEventListener("complete", function onComplete() {
        currentAnim.removeEventListener("complete", onComplete);
        if (inner) inner.classList.remove("swipe-transition");
      });
    }
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
ProtoSheet.close(goalEditorSheet, goalEditorOverlay, {
  onClosed: function () { goalEditHint.classList.remove("show"); }
});
};
ProtoSheet.initSwipe(goalEditorSheet, function () {
  goalEditorOverlay.onclick();
});

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

ProtoSheet.close(goalEditorSheet, goalEditorOverlay);
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

if (isCashflowNoData()) {
  monthlyEl.innerText = t("flex.noDataTitle");
  explainEl.innerHTML = t("flex.noDataHint");
  return;
}

if (!lastCalc.ok) return;

var goals = getGoals();
var activeGoal = goals[activeGoalIndex] || null;

if (activeGoalIndex > 0 && activeGoal) {
  monthlyEl.innerText = activeGoal.title || (t("misc.goalLabel") + " " + (activeGoalIndex + 1));

  var factEl = document.getElementById("factInput");
  var rawInput = factEl ? parseNumber(factEl.value || "0") : 0;
  var preview = getFactPreviewForGoal(activeGoalIndex, rawInput);

  var _cs = getCurrencySymbol();
  var lines = t("misc.saving") + ": " + fmtNum(activeGoal.monthlyShare || 0) + " " + _cs + " " + t("pace.perMonth")
    + "<br>" + t("advGoals.priority") + ": " + (activeGoal.priority || 1)
    + "<br>" + t("plan.accumulated") + ": " + fmtNum(preview) + " " + _cs
    + "<br>" + t("plan.remaining") + ": " + (activeGoal.monthsLeft || "—") + " " + t("misc.monthShort");

  explainEl.innerHTML = lines;

  var inflationEl = document.getElementById("inflationHint");
  if (inflationEl) { inflationEl.textContent = ""; inflationEl.style.display = "none"; }
  return;
}

var hasMultiGoals = goals.length > 1 && activeGoal;
var goalMonthly = hasMultiGoals ? (activeGoal.monthlyShare || 0) : plannedMonthly;
var goalMonthlySave = hasMultiGoals ? (activeGoal.monthlyShare || 0) : (lastCalc.monthlySave || 0);
var goalMonthsLeft = hasMultiGoals ? (activeGoal.monthsLeft || 0) : (lastCalc.months || 0);
var goalPace = (lastCalc.free && lastCalc.free > 0) ? (goalMonthlySave / lastCalc.free) : (lastCalc.pace || 0);

var _cs2 = getCurrencySymbol();
monthlyEl.innerText =
  t("plan.current") + ": " + fmtNum(goalMonthly) + " " + _cs2 + " " + t("plan.perMonth");

var s = getState();
var isCashflow = (s.financialModel === "cashflow");

var pctVal = Math.round(goalPace * 100);
var explainText = lastCalc.ok
  ? (isCashflow ? t("plan.forecastIncome") + ": " + fmtNum(lastCalc.forecastIncome || 0) + " " + _cs2 + " " + t("pace.perMonth") + "\n"
      + t("plan.forecastExpense") + ": " + fmtNum(lastCalc.forecastExpense || 0) + " " + _cs2 + " " + t("pace.perMonth") + "\n" : "")
    + t("plan.freePerMonth") + ": " + fmtNum(lastCalc.free || 0) + " " + _cs2 + "\n"
    + t("plan.youSave") + ": " + fmtNum(goalMonthlySave) + " " + _cs2 + "\n"
    + t("plan.paceOfFree", { pct: pctVal }) + "\n"
    + t("plan.goalReachedIn") + " " + goalMonthsLeft + " " + t("misc.monthShort")
  : t("engine.noBalance");
explainEl.innerHTML = explainText.replace(/\n/g, "<br>");

var inflationEl = document.getElementById("inflationHint");
if (inflationEl) {
  var infl = (typeof getActiveInflation === "function") ? getActiveInflation() : null;
  if (infl != null && infl > 0) {
    inflationEl.textContent = t("misc.inflation") + ": " + infl + "%";
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
text = t("goalEdit.warn3x");
} else if (ratio >= 2) {
text = t("goalEdit.warn2x");
} else {
text = t("goalEdit.warnIncrease");
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
        showToast(t("toast.insufficientReserve"), "error");
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
    const realTimestamp = now.toISOString();
    const periodDate = new Date(now);
    periodDate.setDate(1);
    periodDate.setHours(0, 0, 0, 0);
    factHistory.push({
      value: -amount,
      date: periodDate,
      to: source === "reserve" ? "reserve" : "main",
      timestamp: realTimestamp
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
  return false;
}

function freqLabel(freq, days) {
  switch (freq) {
    case "weekly": return t("freq.weekly");
    case "biweekly": return t("freq.biweekly");
    case "custom":
      var daysStr = Array.isArray(days) && days.length ? days.join(", ") : "—";
      return t("freq.custom") + " (" + daysStr + ")";
    default: return t("freq.fixed");
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

function cfFlowFreqLabel(freq, days) {
  switch (freq) {
    case "weekly": return t("freq.weekly");
    case "biweekly": return t("freq.biweekly");
    case "monthly": return t("freq.monthly");
    case "custom":
      if (Array.isArray(days) && days.length) {
        return t("freq.custom") + " (" + days.length + ")";
      }
      return t("freq.custom");
    default: return t("freq.monthly");
  }
}

function syncFlexibleUI() {
  var noData = isCashflowNoData();
  var s = getState();
  var isCashflow = (s.financialModel === "cashflow");

  var factRow = document.querySelector(".fact-input-row");
  var factInput = document.getElementById("factInput");
  var applyBtn = document.getElementById("applyFact");

  if (factRow) factRow.classList.toggle("fact-row-disabled", noData);
  if (factInput) factInput.disabled = noData;
  if (applyBtn) applyBtn.disabled = noData;

  if (factRow && !factRow.dataset.flexShakeBound) {
    factRow.dataset.flexShakeBound = "1";
    factRow.addEventListener("click", function () {
      if (isCashflowNoData()) {
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
    if (noData) {
      hint.textContent = t("flex.addIncomeHint");
    }
    hint.classList.toggle("visible", noData);
  }

  var summaryMonthlyEl = document.getElementById("summaryMonthly");
  var summaryMonthsEl = document.getElementById("summaryMonths");
  var summaryModeEl = document.getElementById("summaryMode");

  if (noData) {
    if (summaryMonthlyEl) summaryMonthlyEl.innerText = "—";
    if (summaryMonthsEl) summaryMonthsEl.innerText = "—";
    if (summaryModeEl) summaryModeEl.innerText = t("flex.noData");
  } else if (isCashflow && lastCalc.ok) {
    if (summaryMonthlyEl) summaryMonthlyEl.innerText = fmtNum(lastCalc.monthlySave);
    if (summaryMonthsEl) summaryMonthsEl.innerText = lastCalc.months;
  }

  // ── Weekly/biweekly hint ──
  var freqHintEl = document.getElementById("summaryFreqHint");
  if (freqHintEl) {
    var incFreq = s.incomeFrequency || "monthly";
    if (isCashflow && lastCalc.ok && lastCalc.monthlySave && !noData) {
      if (incFreq === "weekly") {
        freqHintEl.innerText = "≈ " + fmtNum(Math.round(lastCalc.monthlySave / 4.33)) + " " + getCurrencySymbol() + " " + t("misc.perWeek");
        freqHintEl.style.display = "";
      } else if (incFreq === "biweekly") {
        freqHintEl.innerText = "≈ " + fmtNum(Math.round(lastCalc.monthlySave / 2.16)) + " " + getCurrencySymbol() + " " + t("misc.perBiweek");
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
    if (isCashflow && !noData) {
      var incLabel = freqLabel(s.incomeFrequency, s.incomeMonthDays);
      var expLabel = freqLabel(s.expenseFrequency, s.expenseMonthDays);
      reportEl.innerHTML = t("flex.income") + ": " + incLabel + "<br>" + t("flex.expense") + ": " + expLabel;
      reportEl.style.display = "";
    } else {
      reportEl.style.display = "none";
    }
  }

  // ── Build labels ──
  var incType = s.incomeType || "fixed";
  var expType = s.expenseType || "fixed";
  var incTypeName = incType === "fixed" ? t("freq.fixed") : t("freq.variable");
  var expTypeName = expType === "fixed" ? t("freq.fixedPlural") : t("freq.variablePlural");
  var incFreqName = incType === "fixed"
    ? ""
    : ", " + cfFlowFreqLabel(s.incomeFrequency, s.incomeMonthDays);
  var expFreqName = expType === "fixed"
    ? ""
    : ", " + cfFlowFreqLabel(s.expenseFrequency, s.expenseMonthDays);

  // ── In-panel flow summary ──
  var flowSummary = document.getElementById("cfFlowSummary");
  var flowText = document.getElementById("cfFlowSummaryText");
  if (flowSummary && flowText) {
    flowText.innerHTML =
      '<div class="cf-summary-row"><span class="cf-summary-dot"></span>' + t("flex.income") + ': ' + incTypeName + incFreqName + '</div>' +
      '<div class="cf-summary-row"><span class="cf-summary-dot"></span>' + t("flex.expenses") + ': ' + expTypeName + expFreqName + '</div>';
  }

  // ── Inline per-card summaries ──
  var incInline = document.getElementById("incomeInlineSummary");
  if (incInline) {
    incInline.textContent = t("flex.income") + ": " + incTypeName + incFreqName;
    incInline.classList.add("visible");
  }
  var expInline = document.getElementById("expenseInlineSummary");
  if (expInline) {
    expInline.textContent = t("flex.expenses") + ": " + expTypeName + expFreqName;
    expInline.classList.add("visible");
  }

  // ── Card status indicators ──
  var incStatus = document.getElementById("incomeCardStatus");
  if (incStatus) incStatus.classList.add("visible");
  var expStatus = document.getElementById("expenseCardStatus");
  if (expStatus) expStatus.classList.add("visible");

  // ── Card configured border ──
  var incCard = document.getElementById("cfCardIncome");
  if (incCard) incCard.classList.add("cf-card--configured");
  var expCard = document.getElementById("cfCardExpense");
  if (expCard) expCard.classList.add("cf-card--configured");
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

function enableFlexibleMode() {
  updateState({
    financialModel: "cashflow"
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

  if (!flexToggle || !flexContent) return;

  var currentState = getState();
  var incomeType = currentState.incomeType || "fixed";
  var expenseType = currentState.expenseType || "fixed";
  var incomeFrequency = currentState.incomeFrequency || "monthly";
  var expenseFrequency = currentState.expenseFrequency || "monthly";

  applyPremiumUI(true);

  if (currentState.financialModel === "cashflow") {
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
  ProtoSheet.open(eventEditorSheet, eventEditorOverlay);
}

function constrainEventDateInputWidth() {}
function onEventEditorResize() {}

function closeEventEditor() {
  ProtoSheet.close(eventEditorSheet, eventEditorOverlay);
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
ProtoSheet.initSwipe(eventEditorSheet, closeEventEditor);

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
      var realTimestamp = new Date().toISOString();
      now.setDate(1);
      now.setHours(0, 0, 0, 0);
      factHistory.push({ value: -rawAmount, date: now, to: "main", timestamp: realTimestamp });
    }

    haptic("success");
    closeEventEditor();
    recalcPlan();
    showToast(isIncome ? t("event.incomeAdded") : t("event.expenseAdded"), "success");
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
  RU: { currency: "RUB", inflation: 7, labelKey: "stats.country.RU" },
  US: { currency: "USD", inflation: 3, labelKey: "stats.country.US" },
  IN: { currency: "INR", inflation: 6, labelKey: "stats.country.IN" },
  CN: { currency: "CNY", inflation: 2, labelKey: "stats.country.CN" }
};

function getStatsTypeLabel(type) {
  return t("stats.type." + type) || type || "—";
}

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
      showToast(t("stats.added"), "success");
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
        '<button type="button" class="stats-add-btn" data-action="add-stats" data-account="' + accountKey + '">' + t("stats.addBtn") + '</button>' +
        '</div>';
      return;
    }

    var amount = (accountKey === "main") ? accounts.main : accounts.reserve;
    var typeLabel = getStatsTypeLabel(stats.type);
    var countryLabel = stats.country ? (STATS_COUNTRY_MAP[stats.country] ? t(STATS_COUNTRY_MAP[stats.country].labelKey) : stats.country) : "—";
    var currencyLabel = stats.currency || "—";
    var inflation = stats.inflation;

    var html = '<div class="account-back-content">' +
      '<div class="stats-info-row"><span>' + t("stats.storageType") + '</span><span>' + typeLabel + '</span></div>' +
      '<div class="stats-info-row"><span>' + t("stats.country") + '</span><span>' + countryLabel + '</span></div>' +
      '<div class="stats-info-row"><span>' + t("stats.currency") + '</span><span>' + currencyLabel + '</span></div>';

    var inflRate = (inflation || 0) / 100;
    var result = calculateInflationAdjustedValue(amount, inflRate, monthsLeft);
    var goalVal = parseNumber(goalInput ? goalInput.value || "0" : "0");
    var comp = calculateInflationCompensation(goalVal, monthsLeft, inflRate);

    if (result || comp) {
      var timeStr = "";
      if (result) {
        if (result.years < 1) {
          var months = Math.round(result.years * 12);
          var mUnit = months === 1 ? t("stats.monthUnit1") : (months >= 2 && months <= 4 ? t("stats.monthUnit2_4") : t("stats.monthUnit5"));
          timeStr = t("stats.inMonths", { n: months, unit: mUnit });
        } else {
          timeStr = t("stats.inYears", { n: result.years.toFixed(1) });
        }
      }

      html += '<div class="inflation-card">';

      if (timeStr) {
        html += '<div class="inflation-time">' + timeStr + '</div>';
        if (inflation) {
          html += '<div class="inflation-disclaimer">' + t("stats.inflationDisclaimer", { pct: inflation }) + '</div>';
        }
      }

      if (result) {
        html +=
          '<div class="stats-purchasing-label">' + t("stats.purchasingLabel") + '</div>' +
          '<div class="stats-purchasing-value">' + fmtNum(result.adjustedValue) + ' ' + getCurrencySymbol() + '</div>' +
          '<div class="loss-inflation">' +
            t("stats.inflationLoss") +
            '<br>−' + fmtNum(result.loss) + ' ' + getCurrencySymbol() + ' ' +
            '<span class="arrow-down">↓</span>' +
          '</div>';
      }

      if (comp && comp.extraMonthly > 0) {
        html +=
          '<div class="compensation-block">' +
            '<div class="compensation-label">' + t("stats.compensationLabel") + '</div>' +
            '<div class="extra-monthly">+' + fmtNum(comp.extraMonthly) + ' ' + getCurrencySymbol() + ' ' + t("stats.extraMonthly") + '</div>' +
          '</div>';
      }

      html += '</div>';
    }

    html += '<button type="button" class="stats-change-btn" data-action="add-stats" data-account="' + accountKey + '">' + t("stats.changeBtn") + '</button>';
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
    factRow.style.display = (activeGoalIndex > 0) ? "none" : "";
  }

  function setActiveGoal(index) {
    var goals = getGoals();
    if (goals.length <= 1) index = 0;
    if (index < 0 || index >= goals.length) return;
    activeGoalIndex = index;
    updateState({ activeGoalIndex: index });
    saveFullState();
    if (typeof ProtocolGraph !== "undefined" && ProtocolGraph.hideTooltip) ProtocolGraph.hideTooltip();
    recalcPlan();
    resetAccountFlips();
    updateFactInputVisibility();
    updateAccountsLocalNav();
    updateGraphGoalIndicator();
    if (typeof renderSVGGraph === "function") renderSVGGraph();
    if (typeof updatePlanHeader === "function") updatePlanHeader();
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

    if (typeof ProtocolGraph !== "undefined" && ProtocolGraph.hideTooltip) ProtocolGraph.hideTooltip();

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
  var goalNavLottiePaths = [
    "assets/animation/Number-1-Square_.json",
    "assets/animation/Number-2-Square_.json",
    "assets/animation/Number-3-Square_.json"
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
        var lottieDiv = document.createElement("div");
        lottieDiv.className = "goal-nav-lottie";
        btn.appendChild(lottieDiv);
        if (typeof lottie !== "undefined") {
          lottie.loadAnimation({
            container: lottieDiv,
            renderer: "svg",
            loop: false,
            autoplay: false,
            path: goalNavLottiePaths[i] || goalNavLottiePaths[0]
          });
        }
        btn.addEventListener("click", (function (idx) {
          return function () {
            if (typeof haptic === "function") haptic("light");
            updateAccountsLocalNav(idx);
            setActiveGoal(idx);
            renderAccountsUI();
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

  var goalTimelineDraft = null;
  var goalTimelineOriginal = null;

  function openGoalTimelineManager() {
    var real = getGoals();
    goalTimelineOriginal = JSON.parse(JSON.stringify(real));
    goalTimelineDraft = JSON.parse(JSON.stringify(real));

    hideAdvancedFog();
    document.getElementById("screen-advanced").classList.remove("active");
    document.getElementById("screen-goal-timeline").classList.add("active");
    renderGoalTimeline();
  }

  function closeGoalTimelineScreen() {
    goalTimelineDraft = null;
    goalTimelineOriginal = null;
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
    advCardGoalsTitle.innerText = t("advGoals.newGoal");
    advCardGoalsDesc.innerText = t("advGoals.newGoalDesc");
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

  function getPriorityHintText(p) {
    return t("advGoals.priorityHint" + p);
  }

  function willShiftOtherGoals(priority) {
    if (editingGoalId) return false;
    var goals = getGoals();
    return goals.some(function (g) { return g.priority >= priority; });
  }

  function showPriorityHint(priority) {
    if (!priorityHintEl) return;
    var text = getPriorityHintText(priority);
    var shift = willShiftOtherGoals(priority);
    var html = '<span>' + text.replace(/\n/g, '<br>') + '</span>';
    if (shift) {
      html += '<span class="priority-hint-shift">' + t("advGoals.priorityShift") + '</span>';
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
    if (advGoalSheetTitle) advGoalSheetTitle.innerText = g ? t("advGoals.editTitle") : t("advGoals.newGoal");
    if (advGoalTitleInput) advGoalTitleInput.value = g ? g.title : "";
    if (advGoalAmountInput) advGoalAmountInput.value = g ? formatNumber(String(g.amount || 0)) : "";
    updatePriorityButtons();
    hidePriorityHint();
    setAdvPriority(g ? g.priority : getNextFreePriority());
    ProtoSheet.open(advGoalSheet, advGoalOverlay);
  }

  function closeAdvGoalSheet() {
    ProtoSheet.close(advGoalSheet, advGoalOverlay, {
      onClosed: function () { hidePriorityHint(); }
    });
    editingGoalId = null;
  }

  function getNextFreePriority() {
    var goals = getGoals();
    var count = goals.length;
    if (count === 0) return 1;
    return Math.min(count + 1, MAX_GOALS);
  }

  if (advGoalOverlay) { advGoalOverlay.addEventListener("click", closeAdvGoalSheet); }
  ProtoSheet.initSwipe(advGoalSheet, closeAdvGoalSheet);

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
      if (typeof showToast === "function") showToast(t("advGoals.fillRequired"), "error");
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
        if (typeof showToast === "function") showToast(t("advGoals.maxGoals"), "error");
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
          '<span>' + t("advGoals.savedLabel") + ': <b>' + fmtNum(g.saved || 0) + ' ' + getCurrencySymbol() + '</b></span>' +
          '<span>' + t("advGoals.goalLabel") + ': <b>' + fmtNum(g.amount || 0) + ' ' + getCurrencySymbol() + '</b></span>' +
        '</div>' +
        '<div class="adv-goal-card-info">' +
          '<span>' + t("advGoals.perMonthLabel") + ': <b>' + fmtNum(g.monthlyShare || 0) + ' ' + getCurrencySymbol() + '</b></span>' +
          '<span>' + t("advGoals.termLabel") + ': <b>' + (g.monthsLeft || "—") + ' ' + t("advGoals.termMonths") + '</b></span>' +
        '</div>' +
        '<div class="adv-goal-card-progress">' +
          '<div style="height:4px;border-radius:4px;background:#222;overflow:hidden">' +
            '<div style="height:100%;width:' + pctDone + '%;background:#3a7bfd;transition:width .4s ease"></div>' +
          '</div>' +
          '<div style="font-size:12px;opacity:.5;margin-top:3px">' + pctDone + '%</div>' +
        '</div>' +
        '<div class="adv-goal-card-actions">' +
          (g.priority === 1 ? '' : '<button class="adv-goal-edit-btn" data-goal-id="' + g.id + '">' + t("advGoals.editBtn") + '</button>') +
          (goals.length > 1 ? '<button class="adv-goal-delete-btn" data-goal-id="' + g.id + '">' + t("advGoals.deleteBtn") + '</button>' : '') +
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

  function getEffectiveDuration(draftGoal, previewGoal, minMonths) {
    if (draftGoal.timelineOverrideMonths && draftGoal.timelineOverrideMonths >= minMonths) {
      return draftGoal.timelineOverrideMonths;
    }
    return previewGoal.monthsLeft || minMonths || 1;
  }

  function renderGoalTimeline() {
    var draft = goalTimelineDraft || getGoals();
    var monthly = plannedMonthly || 0;

    if (!goalTimelineAllocation) return;
    goalTimelineAllocation.innerHTML = "";

    var preview = computeTimelinePreview(draft, monthly);

    var usedTotal = 0;
    preview.forEach(function (g) { usedTotal += (g.monthlyShare || 0); });

    if (monthly > 0 && draft.length > 0) {
      var totalEl = document.createElement("div");
      totalEl.className = "goal-mgmt-total";
      totalEl.innerHTML = t("timeline.toSavings") + ": <b>" + fmtNum(monthly) + " " + getCurrencySymbol() + "</b>" +
        (usedTotal > monthly
          ? ' <span class="timeline-over-limit">' + t("timeline.overLimit") + ' ' + fmtNum(usedTotal - monthly) + ' ' + getCurrencySymbol() + '</span>'
          : "");
      goalTimelineAllocation.appendChild(totalEl);
    }

    preview.forEach(function (gPreview, idx) {
      var draftGoal = draft[idx];
      var remaining = Math.max(0, (draftGoal.amount || 0) - (draftGoal.saved || 0));
      var minMonths = computeMinAllowedMonths(draftGoal, monthly);
      var isComplete = remaining <= 0;
      var isPaused = !!draftGoal.paused;
      var pctDone = draftGoal.amount > 0 ? Math.min(100, Math.round(((draftGoal.saved || 0) / draftGoal.amount) * 100)) : 0;

      var effectiveDur = getEffectiveDuration(draftGoal, gPreview, minMonths);
      var hasOverride = !!draftGoal.timelineOverrideMonths;
      var overrideInvalid = hasOverride && draftGoal.timelineOverrideMonths < minMonths;
      var requiredMonthly = effectiveDur > 0 ? Math.ceil(remaining / effectiveDur) : 0;

      var card = document.createElement("div");
      card.className = "goal-timeline-card" + (isPaused ? " paused" : "") + (isComplete ? " completed" : "");

      var pausedTag = isPaused ? '<span class="goal-prio-paused-tag">' + t("timeline.paused") + '</span>' : '';
      var completedTag = isComplete ? '<span class="goal-timeline-done-tag">' + t("timeline.completed") + '</span>' : '';

      var html =
        '<div class="goal-timeline-header">' +
          '<div class="goal-timeline-name">' + escapeHtml(draftGoal.title) + ' ' + pausedTag + completedTag + '</div>' +
        '</div>' +
        '<div class="goal-timeline-progress">' +
          '<span>' + t("timeline.pctDone", { pct: pctDone }) + '</span>' +
          '<span>' + fmtNum(draftGoal.saved || 0) + ' / ' + fmtNum(draftGoal.amount || 0) + ' ' + getCurrencySymbol() + '</span>' +
        '</div>';

      if (!isComplete) {
        html +=
          '<div class="goal-timeline-duration-row">' +
            '<div class="goal-timeline-duration-label">' + t("timeline.duration") + '</div>' +
            '<div class="goal-timeline-stepper" data-idx="' + idx + '">' +
              '<button class="goal-timeline-step-btn minus" data-idx="' + idx + '"' +
                (effectiveDur <= minMonths ? ' disabled' : '') + '>−</button>' +
              '<span class="goal-timeline-step-value">' + effectiveDur + ' ' + t("timeline.monthsUnit") + '</span>' +
              '<button class="goal-timeline-step-btn plus" data-idx="' + idx + '">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="goal-timeline-preview">' +
            t("timeline.requiredSaving") + ': <b>' + fmtNum(requiredMonthly) + ' ' + getCurrencySymbol() + ' ' + t("timeline.perMonth") + '</b>' +
          '</div>' +
          '<div class="goal-timeline-minmax">' +
            t("timeline.minimum") + ': ' + minMonths + ' ' + t("timeline.monthsUnit") +
            (hasOverride && !overrideInvalid
              ? ' · <span class="goal-timeline-custom-tag">' + t("timeline.customTerm") + '</span>'
              : ' · ' + t("timeline.auto")) +
          '</div>';

        if (isPaused) {
          html += '<div class="goal-timeline-paused-hint">' + t("timeline.pausedHint") + '</div>';
        }

        if (overrideInvalid) {
          html += '<div class="goal-timeline-limit-hint">' + t("timeline.unrealisticHint") + '</div>';
        } else if (effectiveDur <= minMonths && minMonths > 1) {
          html += '<div class="goal-timeline-limit-hint">' + t("timeline.minLimitHint") + '</div>';
        }
      }

      card.innerHTML = html;
      goalTimelineAllocation.appendChild(card);
    });

    goalTimelineAllocation.querySelectorAll(".goal-timeline-step-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (this.disabled) return;
        if (typeof haptic === "function") haptic("light");
        var idx = Number(this.dataset.idx);
        var draftGoal = goalTimelineDraft[idx];
        if (!draftGoal) return;

        var minMonths = computeMinAllowedMonths(draftGoal, monthly);
        var previewClone = computeTimelinePreview(goalTimelineDraft, monthly);
        var effectiveDur = getEffectiveDuration(draftGoal, previewClone[idx], minMonths);

        if (this.classList.contains("minus")) {
          var newDur = effectiveDur - 1;
          if (newDur < minMonths) return;
          draftGoal.timelineOverrideMonths = newDur;
        } else {
          draftGoal.timelineOverrideMonths = effectiveDur + 1;
        }

        renderGoalTimeline();
      });
    });

    var goalTimelineBody = document.getElementById("goalTimelineBody");
    var existingSaveBtn = document.getElementById("saveGoalTimelineBtn");
    if (!existingSaveBtn && goalTimelineBody) {
      var saveBtn = document.createElement("button");
      saveBtn.id = "saveGoalTimelineBtn";
      saveBtn.className = "advanced-settings-btn save-priority-btn";
      saveBtn.type = "button";
      saveBtn.textContent = t("timeline.saveBtn");
      goalTimelineBody.appendChild(saveBtn);
    }

    var saveTimelineBtn = document.getElementById("saveGoalTimelineBtn");
    if (saveTimelineBtn) {
      saveTimelineBtn.onclick = function () {
        if (typeof haptic === "function") haptic("medium");

        if (!goalTimelineDraft || !goalTimelineOriginal) {
          showToast(t("timeline.noChanges"), "info");
          return;
        }

        var changed = false;
        for (var i = 0; i < goalTimelineDraft.length; i++) {
          var origVal = goalTimelineOriginal[i] ? (goalTimelineOriginal[i].timelineOverrideMonths || null) : null;
          var draftVal = goalTimelineDraft[i].timelineOverrideMonths || null;
          if (origVal !== draftVal) {
            changed = true;
            break;
          }
        }

        if (!changed) {
          showToast(t("timeline.noChanges"), "info");
          return;
        }

        var realGoals = getGoals();
        goalTimelineDraft.forEach(function (dg) {
          for (var k = 0; k < realGoals.length; k++) {
            if (realGoals[k].id === dg.id) {
              var dgMin = computeMinAllowedMonths(dg, monthly);
              if (dg.timelineOverrideMonths && dg.timelineOverrideMonths >= dgMin) {
                realGoals[k].timelineOverrideMonths = dg.timelineOverrideMonths;
              } else {
                realGoals[k].timelineOverrideMonths = null;
              }
              break;
            }
          }
        });

        computeGoalsAllocation(realGoals, monthly);
        persistGoals(realGoals);
        recalcPlan();

        goalTimelineOriginal = JSON.parse(JSON.stringify(getGoals()));
        goalTimelineDraft = JSON.parse(JSON.stringify(getGoals()));
        renderGoalTimeline();

        renderGoals();
        if (typeof renderProtocolAdviceGraph === "function") renderProtocolAdviceGraph();
        renderAccountsUI();
        if (typeof updateGraphGoalIndicator === "function") updateGraphGoalIndicator();
        if (typeof updateAccountsLocalNav === "function") updateAccountsLocalNav();
        showToast(t("timeline.saved"), "success");
      };
    }
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
      var pausedTag = g.paused ? ' <span class="goal-prio-paused-tag">' + t("timeline.paused") + '</span>' : '';
      card.innerHTML =
        '<div class="goal-mgmt-prio-header">' +
          '<div class="goal-mgmt-prio-name">' + escapeHtml(g.title) + pausedTag + '</div>' +
          '<div class="goal-mgmt-prio-badge">P' + g.priority + '</div>' +
        '</div>' +
        '<div class="goal-mgmt-prio-info">' +
          '<span>' + t("timeline.pctDone", { pct: pctDone }) + '</span>' +
          '<span>' + fmtNum(g.saved || 0) + ' / ' + fmtNum(g.amount || 0) + ' ' + getCurrencySymbol() + '</span>' +
        '</div>' +
        '<div class="goal-mgmt-prio-detail">' +
          t("priority.saving") + ': ' + fmtNum(g.monthlyShare || 0) + ' ' + getCurrencySymbol() + ' ' + t("timeline.perMonth") +
          '<br>' + t("priority.goalReachedIn") + ': ' + (g.monthsLeft || "—") + ' ' + t("timeline.monthsUnit") +
        '</div>' +
        '<div class="goal-mgmt-prio-controls">' +
          '<label class="goal-mgmt-prio-label">' + t("priority.label") + '</label>' +
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
      saveBtn.textContent = t("priority.saveBtn");
      goalPriorityBody.appendChild(saveBtn);
    }

    var savePrioBtn = document.getElementById("saveGoalPriorityBtn");
    if (savePrioBtn) {
      savePrioBtn.onclick = function () {
        if (typeof haptic === "function") haptic("medium");

        if (!goalPriorityDraft || !goalPriorityOriginal) {
          showToast(t("priority.noChanges"), "info");
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
          showToast(t("priority.noChanges"), "info");
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
        showToast(t("priority.saved"), "success");

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

  if (typeof ProtocolGraph !== "undefined" && ProtocolGraph.hideTooltip) ProtocolGraph.hideTooltip();

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
      saveFullState();
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

  function getPaceLabel(mode) { return t("calc.mode." + mode); }
  var paceHintEl = document.getElementById("paceHint");

  function updatePaceHint(mode) {
    if (paceHintEl) paceHintEl.textContent = t("pace.hint." + mode) || "";
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

    var curLabel = getPaceLabel(originalPace);
    var curModeEl = document.getElementById("paceCurrentMode");
    var curMonthlyEl = document.getElementById("paceCurrentMonthly");
    var curMonthsEl = document.getElementById("paceCurrentMonths");
    if (curModeEl) curModeEl.textContent = curLabel;
    if (curMonthlyEl) curMonthlyEl.textContent = fmtNum(lastCalc.monthlySave || plannedMonthly || 0);
    if (curMonthsEl) curMonthsEl.textContent = lastCalc.months || "—";

    paceModeButtons.forEach(function (b) {
      b.classList.toggle("active", b.dataset.mode === draftPace);
    });

    updatePaceHint(draftPace);
    openScreen("pace", null);
    hideBottomNav();
    updatePacePreview();
  }

  function updatePacePreview() {
    if (!pacePreviewCard) return;
    if (draftPace === originalPace) {
      pacePreviewCard.style.display = "block";
      var txtEl = document.getElementById("pacePreviewText");
      if (txtEl) txtEl.innerHTML = t("pace.current");
      var pmEl = document.getElementById("pacePreviewMonthly");
      var pmoEl = document.getElementById("pacePreviewMonths");
      if (pmEl) pmEl.textContent = fmtNum(lastCalc.monthlySave || 0);
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
      txtEl.innerHTML = t("pace.increased", {amount: fmtNum(Math.abs(diff)) + " " + getCurrencySymbol(), months: Math.abs(monthsDiff)}).replace(/\n/g, "<br>");
    } else if (diff < 0) {
      txtEl.innerHTML = t("pace.decreased", {amount: fmtNum(Math.abs(diff)) + " " + getCurrencySymbol(), months: Math.abs(monthsDiff)}).replace(/\n/g, "<br>");
    } else {
      txtEl.innerHTML = t("pace.current");
    }

    var pmEl = document.getElementById("pacePreviewMonthly");
    var pmoEl = document.getElementById("pacePreviewMonths");
    if (pmEl) pmEl.textContent = fmtNum(sim.monthlySave);
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
      showBottomNav();
      openScreen("calc", buttons[0]);
    });
  }

  if (paceConfirmBtn) {
    paceConfirmBtn.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("medium");
      if (!draftPace || draftPace === originalPace) {
        showToast(t("pace.noChange"), "info");
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
      if (smEl && lastCalc.monthlySave) smEl.innerText = fmtNum(lastCalc.monthlySave);
      if (smoEl && lastCalc.months) smoEl.innerText = lastCalc.months;
      if (smoodeEl) smoodeEl.innerText = getPaceLabel(saveMode);

      saveFullState();

      originalPace = draftPace;
      showToast(t("pace.updated"), "success");

      showBottomNav();
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

  function getTypeLabel(type) {
    var map = { credit: "debts.credit", debt: "debts.debt", installment: "debts.installment", card: "debts.creditCard" };
    return t(map[type] || "debts.debt");
  }
  var editingDebtId = null;

  function getDebts() {
    return getState().debts || [];
  }

  function persistDebts(debts) {
    updateState({ debts: debts.map(function (d) { return { ...d }; }) });
    saveFullState();
  }

  function openDebtsScreen() {
    advanceDebtPeriods();
    var s = getState();
    if (debtPlanningToggle) debtPlanningToggle.checked = !!s.debtPlanningMode;
    _activeDebtIdx = s.activeDebtIndex || 0;
    clampDebtIndex();

    renderDebtList();
    renderDebtSummary();
    updateDebtModeUI();
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

    if (totalEl) totalEl.textContent = fmtNum(totalAmount) + " " + getCurrencySymbol();
    if (remainEl) remainEl.textContent = fmtNum(totalRemaining) + " " + getCurrencySymbol();
    if (nextEl) {
      if (nextPayment) {
        nextEl.textContent = nextPayment.getDate() + " " + getMonthNameShort(nextPayment.getMonth());
      } else {
        nextEl.textContent = "—";
      }
    }

    var s = getState();
    if (statusEl) {
      if (debts.length === 0) {
        statusEl.textContent = "";
      } else if (s.debtPlanningMode) {
        statusEl.textContent = t("debts.accounted");
      } else {
        statusEl.textContent = t("debts.tracked");
      }
    }
  }

  var _activeDebtIdx = getState().activeDebtIndex || 0;

  function clampDebtIndex() {
    var debts = getDebts();
    if (debts.length === 0) { _activeDebtIdx = 0; return; }
    if (_activeDebtIdx >= debts.length) _activeDebtIdx = debts.length - 1;
    if (_activeDebtIdx < 0) _activeDebtIdx = 0;
  }

  function setActiveDebtIndex(idx) {
    var debts = getDebts();
    if (debts.length === 0) { _activeDebtIdx = 0; return; }
    _activeDebtIdx = Math.max(0, Math.min(idx, debts.length - 1));
    updateState({ activeDebtIndex: _activeDebtIdx });
    saveFullState();
  }

  function renderDebtCard(d) {
    var typeLabel = getTypeLabel(d.type);
    var _locale = getCurrentLanguage() === "en" ? "en-US" : "ru-RU";
    var endStr = d.endDate ? new Date(d.endDate).toLocaleDateString(_locale, { month: "short", year: "numeric" }) : "—";
    var nextStr = d.nextPaymentDate ? new Date(d.nextPaymentDate).toLocaleDateString(_locale, { day: "numeric", month: "short" }) : "—";

    var html = '<div class="debt-item-card" data-debt-id="' + d.id + '">'
      + '<div class="debt-item-header">'
      + '<div class="debt-item-title">' + (d.title || t("misc.noTitle")) + '</div>'
      + '<span class="debt-item-type-badge">' + typeLabel + '</span>'
      + '</div>'
      + '<div class="debt-item-rows">'
      + '<div class="debt-item-row"><span>' + t("debts.totalAmount") + '</span><span>' + fmtNum(Number(d.totalAmount) || 0) + ' ' + getCurrencySymbol() + '</span></div>'
      + '<div class="debt-item-row"><span>' + t("debts.remaining") + '</span><span>' + fmtNum(Number(d.remainingAmount) || 0) + ' ' + getCurrencySymbol() + '</span></div>'
      + '<div class="debt-item-row"><span>' + t("debts.monthlyPayment") + '</span><span>' + fmtNum(Number(d.monthlyPayment) || 0) + ' ' + getCurrencySymbol() + '</span></div>'
      + '<div class="debt-item-row"><span>' + t("debts.nextPayment") + '</span><span>' + nextStr + '</span></div>'
      + '<div class="debt-item-row"><span>' + t("debts.endDate") + '</span><span>' + endStr + '</span></div>';

    if (d.type === "card" && d.creditLimit) {
      html += '<div class="debt-item-row"><span>' + t("debts.creditLimit") + '</span><span>' + fmtNum(Number(d.creditLimit) || 0) + ' ' + getCurrencySymbol() + '</span></div>';
      html += '<div class="debt-item-row"><span>' + t("debts.freeLimit") + '</span><span>' + fmtNum(Number(d.freeLimit) || 0) + ' ' + getCurrencySymbol() + '</span></div>';
    }

    if (d.note) {
      html += '<div class="debt-item-row"><span>' + t("debts.note") + '</span><span>' + d.note + '</span></div>';
    }

    html += '</div>'
      + '<div class="debt-item-actions">'
      + '<button class="debt-item-history-btn" data-history-id="' + d.id + '">' + t("debts.historyBtn") + '</button>'
      + '<button class="debt-item-delete-btn" data-delete-id="' + d.id + '">' + t("debts.deleteBtn") + '</button>'
      + '</div>'
      + '</div>';
    return html;
  }

  function renderDebtSwipeIndicator() {
    var indicator = document.getElementById("debtSwipeIndicator");
    if (!indicator) return;
    var debts = getDebts();
    if (debts.length <= 1) { indicator.innerHTML = ""; return; }

    var html = "";
    debts.forEach(function (d, i) {
      html += '<span class="debt-swipe-dot' + (i === _activeDebtIdx ? ' active' : '') + '" data-didx="' + i + '"></span>';
    });
    indicator.innerHTML = html;

    indicator.querySelectorAll(".debt-swipe-dot").forEach(function (dot) {
      dot.addEventListener("click", function () {
        var target = parseInt(dot.getAttribute("data-didx"), 10);
        if (target !== _activeDebtIdx) {
          if (typeof haptic === "function") haptic("light");
          debtSwipeToIndex(target, target > _activeDebtIdx);
        }
      });
    });
  }

  function renderDebtList() {
    var cardEl = document.getElementById("debtActiveCard");
    var wrapperEl = document.getElementById("debtSwipeWrapper");
    if (!cardEl) return;
    var debts = getDebts();

    var toggleWrap = document.querySelector(".debt-planning-toggle-wrap");
    var manualBlock = document.getElementById("debtManualRepayBlock");

    if (debts.length === 0) {
      if (toggleWrap) toggleWrap.style.display = "none";
      if (manualBlock) manualBlock.style.display = "none";
      cardEl.innerHTML = '<div class="debt-empty-hint">' + t("debts.emptyHint") + '</div>';
      if (wrapperEl) wrapperEl.style.display = "";
      renderDebtSwipeIndicator();
      return;
    }

    if (toggleWrap) toggleWrap.style.display = "";
    if (manualBlock) manualBlock.style.display = "";

    clampDebtIndex();
    var d = debts[_activeDebtIdx];
    cardEl.innerHTML = renderDebtCard(d);
    if (wrapperEl) wrapperEl.style.display = "";

    renderDebtSwipeIndicator();

    cardEl.querySelectorAll(".debt-item-history-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (typeof haptic === "function") haptic("light");
        openDebtHistorySheet(btn.dataset.historyId);
      });
    });

    cardEl.querySelectorAll(".debt-item-delete-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (typeof haptic === "function") haptic("medium");
        var id = btn.dataset.deleteId;
        var debts = getDebts().filter(function (d) { return d.id !== id; });
        persistDebts(debts);
        clampDebtIndex();
        setActiveDebtIndex(_activeDebtIdx);
        renderDebtList();
        renderDebtSummary();
        updateDebtModeUI();
        recalcWithDebts();
        showToast(t("debts.deleted"), "success");
      });
    });
  }

  // ── Debt swipe system ──
  var _debtSwipeAnimating = false;

  function debtSwipeToIndex(idx, goLeft) {
    var debts = getDebts();
    if (debts.length <= 1) return;
    idx = Math.max(0, Math.min(idx, debts.length - 1));
    if (idx === _activeDebtIdx || _debtSwipeAnimating) return;

    var content = document.getElementById("debtSwipeContent");
    if (!content) { setActiveDebtIndex(idx); renderDebtList(); return; }

    _debtSwipeAnimating = true;
    content.style.transition = "transform 0.3s cubic-bezier(.4,0,.2,1), opacity 0.25s ease";
    content.style.transform = goLeft ? "translateX(-100%)" : "translateX(100%)";
    content.style.opacity = "0";

    setTimeout(function () {
      setActiveDebtIndex(idx);
      renderDebtList();

      content.style.transition = "none";
      content.style.transform = goLeft ? "translateX(60px)" : "translateX(-60px)";
      content.style.opacity = "0";

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          content.style.transition = "transform 0.3s cubic-bezier(.4,0,.2,1), opacity 0.25s ease";
          content.style.transform = "translateX(0)";
          content.style.opacity = "1";

          setTimeout(function () {
            content.style.transform = "";
            content.style.opacity = "";
            content.style.transition = "";
            _debtSwipeAnimating = false;
          }, 320);
        });
      });
    }, 300);
  }

  // ── Debt touch swipe ──
  (function initDebtSwipe() {
    var wrapper = document.getElementById("debtSwipeWrapper");
    if (!wrapper) return;

    var _dsStartX = 0, _dsStartY = 0, _dsDeltaX = 0, _dsActive = false, _dsLocked = false, _dsRafId = null;
    var DS_THRESHOLD = 60;

    wrapper.addEventListener("touchstart", function (e) {
      if (_debtSwipeAnimating) return;
      _dsStartX = e.touches[0].clientX;
      _dsStartY = e.touches[0].clientY;
      _dsDeltaX = 0;
      _dsActive = true;
      _dsLocked = false;
      var content = document.getElementById("debtSwipeContent");
      if (content) content.style.transition = "none";
    }, { passive: true });

    wrapper.addEventListener("touchmove", function (e) {
      if (!_dsActive) return;
      var rawDx = e.touches[0].clientX - _dsStartX;
      var rawDy = e.touches[0].clientY - _dsStartY;

      if (!_dsLocked) {
        if (Math.abs(rawDx) < 8 && Math.abs(rawDy) < 8) return;
        if (Math.abs(rawDy) > Math.abs(rawDx)) {
          _dsActive = false;
          var c = document.getElementById("debtSwipeContent");
          if (c) { c.style.transform = ""; c.style.opacity = ""; }
          return;
        }
        _dsLocked = true;
      }

      e.preventDefault();
      _dsDeltaX = rawDx;

      if (_dsRafId) cancelAnimationFrame(_dsRafId);
      _dsRafId = requestAnimationFrame(function () {
        _dsRafId = null;
        var content = document.getElementById("debtSwipeContent");
        if (!content) return;
        content.style.transform = "translateX(" + _dsDeltaX + "px)";
        var progress = Math.min(Math.abs(_dsDeltaX) / 200, 1);
        content.style.opacity = String(1 - progress * 0.4);
      });
    }, { passive: false });

    function finishDebtSwipe() {
      if (!_dsActive && !_dsLocked) return;
      _dsActive = false;
      _dsLocked = false;

      if (_dsRafId) { cancelAnimationFrame(_dsRafId); _dsRafId = null; }

      var content = document.getElementById("debtSwipeContent");
      if (!content) return;

      var debts = getDebts();
      var dx = _dsDeltaX;

      if (Math.abs(dx) > DS_THRESHOLD && debts.length > 1) {
        var goLeft = dx < 0;
        var next;
        if (goLeft) next = Math.min(_activeDebtIdx + 1, debts.length - 1);
        else next = Math.max(_activeDebtIdx - 1, 0);

        if (next !== _activeDebtIdx) {
          if (typeof haptic === "function") haptic("light");
          debtSwipeToIndex(next, goLeft);
          return;
        }
      }

      content.style.transition = "transform 0.25s ease, opacity 0.15s ease";
      content.style.transform = "translateX(0)";
      content.style.opacity = "1";
      setTimeout(function () {
        content.style.transform = "";
        content.style.opacity = "";
        content.style.transition = "";
      }, 260);
    }

    wrapper.addEventListener("touchend", finishDebtSwipe, { passive: true });
    wrapper.addEventListener("touchcancel", finishDebtSwipe, { passive: true });
  })();

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

    ProtoSheet.open(addDebtSheet, addDebtOverlay);
  }

  function closeAddDebtSheet() {
    ProtoSheet.close(addDebtSheet, addDebtOverlay);
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
      saveFullState();
      if (debtEntryOverlay) debtEntryOverlay.classList.remove("visible");
      showToast(t("debts.entryNoToast"), "info", { duration: 6000, screenScope: "debts" });
    });
  }

  if (debtEntryYes) {
    debtEntryYes.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("light");
      updateState({ debtOverlaySeen: true });
      saveFullState();
      if (debtEntryOverlay) debtEntryOverlay.classList.remove("visible");
      showToast(t("debts.entryYesToast"), "info", { duration: 6000, screenScope: "debts" });
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
  ProtoSheet.initSwipe(addDebtSheet, closeAddDebtSheet);

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
      if (!titleEl || !titleEl.value.trim()) { showToast(t("debts.noTitle"), "error"); return; }
      if (!monthlyPayEl || !parseNumber(monthlyPayEl.value)) { showToast(t("debts.noPayment"), "error"); return; }

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
        isActive: true,
        paidInCurrentPeriod: 0,
        currentPeriodKey: ""
      };

      var nextDateVal = document.getElementById("debtNextDate").value || "";
      if (nextDateVal) {
        var tmpD = new Date(nextDateVal);
        if (!isNaN(tmpD.getTime())) {
          entry.currentPeriodKey = tmpD.getFullYear() + "-" + String(tmpD.getMonth() + 1).padStart(2, "0");
        }
      }
      if (!entry.currentPeriodKey) {
        var nowD = new Date();
        entry.currentPeriodKey = nowD.getFullYear() + "-" + String(nowD.getMonth() + 1).padStart(2, "0");
      }

      var debts = getDebts();
      if (editingDebtId) {
        var existingDebtForEdit = debts.find(function(dd) { return dd.id === editingDebtId; });
        if (existingDebtForEdit) {
          entry.paidInCurrentPeriod = existingDebtForEdit.paidInCurrentPeriod || 0;
          entry.currentPeriodKey = existingDebtForEdit.currentPeriodKey || entry.currentPeriodKey;
        }
        for (var i = 0; i < debts.length; i++) {
          if (debts[i].id === editingDebtId) { debts[i] = entry; break; }
        }
      } else {
        debts.push(entry);
      }
      persistDebts(debts);

      if (!editingDebtId) {
        setActiveDebtIndex(debts.length - 1);
      }

      closeAddDebtSheet();
      renderDebtList();
      renderDebtSummary();
      updateDebtModeUI();
      recalcWithDebts();
      showToast(editingDebtId ? t("debts.changesSaved") : t("debts.debtAdded"), "success");
    });
  }

  if (debtPlanningToggle) {
    debtPlanningToggle.addEventListener("change", function () {
      if (typeof haptic === "function") haptic("light");
      var enabled = debtPlanningToggle.checked;
      updateState({ debtPlanningMode: enabled });
      saveFullState();
      renderDebtSummary();
      updateDebtModeUI();
      recalcWithDebts();
      if (enabled) {
        showToast(t("debts.accountedToast"), "success");
      } else {
        showToast(t("debts.notAccountedToast"), "success");
      }
    });
  }

  function updateDebtModeUI() {
    var s = getState();
    var debts = getDebts();
    var toggleWrap = document.querySelector(".debt-planning-toggle-wrap");
    var manualBlock = document.getElementById("debtManualRepayBlock");
    var hintEl = document.getElementById("debtModeHint");

    if (debts.length === 0) {
      if (toggleWrap) toggleWrap.style.display = "none";
      if (manualBlock) manualBlock.style.display = "none";
      return;
    }

    if (toggleWrap) toggleWrap.style.display = "";

    if (manualBlock) {
      manualBlock.style.display = "";
      if (s.debtPlanningMode) {
        manualBlock.classList.add("collapsed");
      } else {
        manualBlock.classList.remove("collapsed");
      }
    }
    if (hintEl) {
      hintEl.textContent = s.debtPlanningMode
        ? t("debts.modeHintOn")
        : t("debts.modeHintOff");
    }
  }

  var manualRepayBtn = document.getElementById("debtManualRepayBtn");
  var manualRepayInput = document.getElementById("debtManualRepayInput");

  if (manualRepayBtn && manualRepayInput) {
    var manualRepayInputWrap = manualRepayInput.closest(".input-wrap");

    manualRepayInput.addEventListener("input", function () {
      manualRepayInput.value = formatNumber(manualRepayInput.value);
      if (manualRepayInputWrap) manualRepayInputWrap.classList.remove("error", "shake");
    });

    manualRepayBtn.addEventListener("click", function () {
      if (typeof haptic === "function") haptic("medium");
      var amount = parseNumber(manualRepayInput.value || "0");

      if (manualRepayInputWrap) manualRepayInputWrap.classList.remove("error", "shake");

      if (!amount || amount <= 0) {
        if (manualRepayInputWrap) {
          manualRepayInputWrap.classList.add("error");
          void manualRepayInputWrap.offsetWidth;
          manualRepayInputWrap.classList.add("shake");
        }
        haptic("error");
        return;
      }

      var activeDebts = (getState().debts || []).filter(function (d) {
        return d.isActive !== false && (Number(d.remainingAmount) || 0) > 0;
      });
      if (activeDebts.length === 0) {
        if (manualRepayInputWrap) {
          manualRepayInputWrap.classList.add("error");
          void manualRepayInputWrap.offsetWidth;
          manualRepayInputWrap.classList.add("shake");
        }
        haptic("error");
        return;
      }

      var result = applyDebtRepayment(amount);
      if (result.applied > 0) {
        result.details.forEach(function (d) {
          addDebtPaymentRecord({
            debtId: d.debtId,
            amount: d.amount,
            source: "manual"
          });
        });
        renderDebtList();
        renderDebtSummary();
        recalcWithDebts();
        manualRepayInput.value = "";
        showToast(t("debts.repaid"), "success");
      }
    });
  }

  // ── Debt Payment History Sheet ──
  var debtHistorySheet = document.getElementById("debtHistorySheet");
  var debtHistoryOverlay = document.getElementById("debtHistoryOverlay");

  function openDebtHistorySheet(debtId) {
    var debt = getDebts().find(function (d) { return d.id === debtId; });
    if (!debt) return;

    var nameEl = document.getElementById("debtHistoryName");
    var remainEl = document.getElementById("debtHistoryRemain");
    var listEl = document.getElementById("debtHistoryList");
    var emptyEl = document.getElementById("debtHistoryEmpty");

    if (nameEl) nameEl.textContent = debt.title || t("misc.noTitle");
    if (remainEl) remainEl.textContent = t("debts.remaining") + ": " + fmtNum(Number(debt.remainingAmount) || 0) + " " + getCurrencySymbol();

    var history = (getState().debtPaymentHistory || [])
      .filter(function (h) { return h.debtId === debtId; })
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    if (listEl) {
      if (history.length === 0) {
        listEl.innerHTML = "";
        if (emptyEl) emptyEl.style.display = "";
      } else {
        if (emptyEl) emptyEl.style.display = "none";
        var html = "";
        history.forEach(function (h, i) {
          var _hd = new Date(h.date);
          var dateStr = _hd.getDate() + " " + getMonthNameShort(_hd.getMonth()) + " " + _hd.getFullYear();
          var descHtml = "";
          if (h.source === "auto" && h.totalInput) {
            descHtml = '<div class="dph-entry-desc">' + t("debts.historyAutoDesc", { total: fmtNum(h.totalInput || 0) + ' ' + getCurrencySymbol(), amount: fmtNum(h.amount || 0) + ' ' + getCurrencySymbol() }) + '</div>';
          } else {
            descHtml = '<div class="dph-entry-desc">' + t("debts.historyManualDesc") + '</div>';
          }

          html += '<div class="dph-entry" style="animation-delay:' + (i * 0.04) + 's">'
            + '<div class="dph-entry-dot"></div>'
            + '<div class="dph-entry-body">'
            + '<div class="dph-entry-amount">' + fmtNum(h.amount || 0) + ' ' + getCurrencySymbol() + '</div>'
            + descHtml
            + '<div class="dph-entry-date">' + dateStr + '</div>'
            + '</div>'
            + '</div>';
        });
        listEl.innerHTML = html;
      }
    }

    ProtoSheet.open(debtHistorySheet, debtHistoryOverlay);
  }

  function closeDebtHistorySheet() {
    ProtoSheet.close(debtHistorySheet, debtHistoryOverlay);
  }

  if (debtHistoryOverlay) {
    debtHistoryOverlay.addEventListener("click", closeDebtHistorySheet);
  }
  ProtoSheet.initSwipe(debtHistorySheet, closeDebtHistorySheet);

  // Expose for external callers (fact submit handler)
  window.renderDebtSummaryGlobal = renderDebtSummary;
  window.renderDebtListGlobal = renderDebtList;
  window.updateDebtModeUI = updateDebtModeUI;

  // Initial mode UI sync on load
  updateDebtModeUI();

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

/* ============================================================
   EXPENSES TRACKER MODULE
   ============================================================ */

(function () {

  ProtoSheet.resetAll();

  var EXP_CATEGORIES = [
    { key: "food",       color: "#10b981" },
    { key: "transport",  color: "#3b82f6" },
    { key: "cafe",       color: "#f59e0b" },
    { key: "home",       color: "#8b5cf6" },
    { key: "subs",       color: "#ec4899" },
    { key: "fun",        color: "#06b6d4" },
    { key: "health",     color: "#14b8a6" },
    { key: "clothes",    color: "#f43f5e" },
    { key: "other",      color: "#6b7280" }
  ];

  var _expSelectedCat = null;

  function getCatByKey(key) {
    for (var i = 0; i < EXP_CATEGORIES.length; i++) {
      if (EXP_CATEGORIES[i].key === key) {
        var c = EXP_CATEGORIES[i];
        return { key: c.key, name: t("cat." + c.key), color: c.color };
      }
    }
    var last = EXP_CATEGORIES[EXP_CATEGORIES.length - 1];
    return { key: last.key, name: t("cat." + last.key), color: last.color };
  }

  function getMonthlyExpenseLimit() {
    var inp = document.getElementById("expenses");
    if (!inp || !inp.value) {
      var s = getState();
      if (s.expenses) return Number(String(s.expenses).replace(/\./g, "")) || 0;
      return 0;
    }
    return Number(inp.value.replace(/\./g, "")) || 0;
  }

  function getCurrentMonthKey() {
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    return y + "-" + m;
  }

  function getMonthExpenses() {
    var s = getState();
    var log = s.expensesLog || [];
    var mk = getCurrentMonthKey();
    var result = [];
    for (var i = 0; i < log.length; i++) {
      var e = log[i];
      var d = new Date(e.date);
      if (d.getFullYear() + "-" + d.getMonth() === mk) {
        result.push(e);
      }
    }
    return result;
  }

  function calcCategoryTotals(entries) {
    var totals = {};
    var totalSpent = 0;
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var k = e.category || "other";
      if (!totals[k]) totals[k] = 0;
      totals[k] += e.amount;
      totalSpent += e.amount;
    }
    var sorted = [];
    for (var key in totals) {
      sorted.push({ key: key, amount: totals[key], pct: totalSpent > 0 ? Math.round((totals[key] / totalSpent) * 100) : 0 });
    }
    sorted.sort(function (a, b) { return b.amount - a.amount; });
    return { categories: sorted, totalSpent: totalSpent };
  }

  /* ── Donut Chart (Canvas) ── */

  function drawDonut(catData, totalSpent) {
    var canvas = document.getElementById("expDonutCanvas");
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var size = 220;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";

    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    var cx = size / 2;
    var cy = size / 2;
    var outerR = 100;
    var innerR = 68;

    if (!catData.length || totalSpent === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
      return;
    }

    var startAngle = -Math.PI / 2;
    for (var i = 0; i < catData.length; i++) {
      var seg = catData[i];
      var cat = getCatByKey(seg.key);
      var sweep = (seg.amount / totalSpent) * Math.PI * 2;
      var gap = catData.length > 1 ? 0.03 : 0;

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle + gap / 2, startAngle + sweep - gap / 2);
      ctx.arc(cx, cy, innerR, startAngle + sweep - gap / 2, startAngle + gap / 2, true);
      ctx.closePath();
      ctx.fillStyle = cat.color;
      ctx.fill();

      startAngle += sweep;
    }
  }

  /* ── Render Category List ── */

  var _lastCatData = [];
  var _lastCatTotalSpent = 0;

  function renderCategoryList(catData, totalSpent) {
    var container = document.getElementById("expCategories");
    if (!container) return;
    _lastCatData = catData;
    _lastCatTotalSpent = totalSpent;
    if (!catData.length) {
      container.innerHTML = "";
      return;
    }
    var html = "";
    for (var i = 0; i < catData.length; i++) {
      var seg = catData[i];
      var cat = getCatByKey(seg.key);
      html += '<div class="exp-cat-row" data-cat="' + seg.key + '">' +
        '<div class="exp-cat-dot" style="background:' + cat.color + '"></div>' +
        '<div class="exp-cat-info">' +
          '<div class="exp-cat-name">' + cat.name + '</div>' +
          '<div class="exp-cat-amount">' + fmtNum(seg.amount) + ' ' + getCurrencySymbol() + '</div>' +
        '</div>' +
        '<div class="exp-cat-pct">' + seg.pct + '%</div>' +
      '</div>';
    }
    container.innerHTML = html;

    container.querySelectorAll(".exp-cat-row").forEach(function (row) {
      row.addEventListener("click", function () {
        haptic("light");
        openCatDetailSheet(row.dataset.cat);
      });
    });
  }

  /* ── Render Full Screen ── */

  window.renderExpensesScreen = function () {
    var entries = getMonthExpenses();
    var data = calcCategoryTotals(entries);
    var limit = getMonthlyExpenseLimit();
    var spent = data.totalSpent;
    var remaining = limit - spent;

    var elSpent = document.getElementById("expSpent");
    var elLimit = document.getElementById("expLimit");
    var elRemaining = document.getElementById("expRemaining");
    var elProgress = document.getElementById("expProgressFill");
    var elStatus = document.getElementById("expStatus");
    var elDonutTotal = document.getElementById("expDonutTotal");
    var elEmpty = document.getElementById("expEmpty");
    var elSummary = document.getElementById("expSummaryCard");
    var elDonut = document.getElementById("expDonutWrap");
    var elCats = document.getElementById("expCategories");
    var elAddBtn = document.getElementById("expAddBtn");

    if (entries.length === 0) {
      if (elEmpty) elEmpty.style.display = "flex";
      if (elSummary) elSummary.style.display = "none";
      if (elDonut) elDonut.style.display = "none";
      if (elCats) elCats.style.display = "none";
      if (elAddBtn) elAddBtn.style.display = "none";
      drawDonut([], 0);
      return;
    }

    if (elEmpty) elEmpty.style.display = "none";
    if (elSummary) elSummary.style.display = "";
    if (elDonut) elDonut.style.display = "";
    if (elCats) elCats.style.display = "";
    if (elAddBtn) elAddBtn.style.display = "";

    if (elSpent) elSpent.textContent = fmtNum(spent);
    if (elLimit) elLimit.textContent = limit > 0 ? fmtNum(limit) : "—";

    if (remaining >= 0) {
      if (elRemaining) elRemaining.textContent = fmtNum(remaining);
    } else {
      if (elRemaining) elRemaining.textContent = "−" + fmtNum(Math.abs(remaining));
    }

    var pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    if (elProgress) {
      elProgress.style.width = pct + "%";
      elProgress.classList.remove("warn", "over");
      if (limit > 0 && spent > limit) elProgress.classList.add("over");
      else if (limit > 0 && pct >= 80) elProgress.classList.add("warn");
    }

    if (elStatus) {
      elStatus.classList.remove("status-ok", "status-warn", "status-over");
      if (limit <= 0) {
        elStatus.textContent = t("expenses.noLimit");
        elStatus.classList.add("status-warn");
      } else if (spent > limit) {
        elStatus.textContent = t("expenses.limitExceeded", {amount: fmtNum(Math.abs(remaining)) + " " + getCurrencySymbol()});
        elStatus.classList.add("status-over");
      } else if (pct >= 80) {
        elStatus.textContent = t("expenses.limitAlmost");
        elStatus.classList.add("status-warn");
      } else {
        elStatus.textContent = t("expenses.withinLimit");
        elStatus.classList.add("status-ok");
      }
    }

    if (elDonutTotal) elDonutTotal.textContent = fmtNum(spent) + " " + getCurrencySymbol();

    drawDonut(data.categories, data.totalSpent);
    renderCategoryList(data.categories, data.totalSpent);
  };

  /* ── Category Grid in Sheet ── */

  function renderCatGrid() {
    var grid = document.getElementById("expCatGrid");
    if (!grid) return;
    var html = "";
    for (var i = 0; i < EXP_CATEGORIES.length; i++) {
      var c = EXP_CATEGORIES[i];
      html += '<div class="exp-cat-chip" data-cat="' + c.key + '">' +
        '<span class="exp-chip-dot" style="background:' + c.color + '"></span>' +
        t("cat." + c.key) +
      '</div>';
    }
    grid.innerHTML = html;

    grid.querySelectorAll(".exp-cat-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        grid.querySelectorAll(".exp-cat-chip").forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        _expSelectedCat = chip.dataset.cat;
        hideExpValidation();
      });
    });
  }

  /* ── Sheet Open / Close ── */

  var sheetOverlay = document.getElementById("expenseSheetOverlay");
  var sheet = document.getElementById("expenseSheet");

  function openExpenseSheet() {
    _expSelectedCat = null;
    var amtInput = document.getElementById("expenseAmount");
    var dateInput = document.getElementById("expenseDate");
    var noteInput = document.getElementById("expenseNote");
    if (amtInput) amtInput.value = "";
    if (noteInput) noteInput.value = "";
    if (dateInput) {
      var now = new Date();
      dateInput.value = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    }
    renderCatGrid();
    hideExpValidation();
    ProtoSheet.open(sheet, sheetOverlay);
  }

  function closeExpenseSheet() {
    ProtoSheet.close(sheet, sheetOverlay);
  }

  if (sheetOverlay) {
    sheetOverlay.addEventListener("click", function () {
      haptic("light");
      closeExpenseSheet();
    });
  }

  /* ── Validation ── */

  function showExpValidation(msg) {
    var el = document.getElementById("expValidation");
    if (el) {
      el.textContent = msg;
      el.style.display = "block";
    }
  }

  function hideExpValidation() {
    var el = document.getElementById("expValidation");
    if (el) el.style.display = "none";
  }

  /* ── Save Expense ── */

  var saveBtn = document.getElementById("expenseSaveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      haptic("light");

      if (!_expSelectedCat) {
        showExpValidation(t("expenses.selectCategory"));
        return;
      }

      var amtInput = document.getElementById("expenseAmount");
      var rawAmt = amtInput ? amtInput.value : "";
      var amount = Number(rawAmt.replace(/\./g, "").replace(/\D/g, "")) || 0;
      if (amount <= 0) {
        showExpValidation(t("expenses.enterAmount"));
        return;
      }

      var dateInput = document.getElementById("expenseDate");
      var noteInput = document.getElementById("expenseNote");
      var dateVal = dateInput ? dateInput.value : "";
      var noteVal = noteInput ? noteInput.value.trim() : "";

      if (!dateVal) {
        var now = new Date();
        dateVal = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
      }

      var entry = {
        id: "exp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        category: _expSelectedCat,
        amount: amount,
        date: dateVal,
        note: noteVal
      };

      var s = getState();
      var log = Array.isArray(s.expensesLog) ? s.expensesLog.slice() : [];
      log.push(entry);
      updateState({ expensesLog: log });
      saveFullState();

      closeExpenseSheet();
      renderExpensesScreen();

      showToast(t("expenses.added"), "success");
    });
  }

  /* ── Format amount input ── */

  var expAmtInput = document.getElementById("expenseAmount");
  if (expAmtInput) {
    expAmtInput.addEventListener("input", function (e) {
      var p = e.target.selectionStart;
      var b = e.target.value.length;
      e.target.value = formatNumber(e.target.value);
      var a = e.target.value.length;
      e.target.selectionEnd = p + (a - b);
    });
  }

  /* ── Wire up buttons ── */

  var addBtn = document.getElementById("expAddBtn");
  var addBtnEmpty = document.getElementById("expAddBtnEmpty");

  if (addBtn) addBtn.addEventListener("click", function () { haptic("light"); openExpenseSheet(); });
  if (addBtnEmpty) addBtnEmpty.addEventListener("click", function () { haptic("light"); openExpenseSheet(); });

  /* ── Donut chart click → open category detail ── */

  var donutCanvas = document.getElementById("expDonutCanvas");
  if (donutCanvas) {
    donutCanvas.addEventListener("click", function (e) {
      if (!_lastCatData.length || !_lastCatTotalSpent) return;
      var rect = donutCanvas.getBoundingClientRect();
      var x = e.clientX - rect.left - rect.width / 2;
      var y = e.clientY - rect.top - rect.height / 2;
      var dist = Math.sqrt(x * x + y * y);
      var scale = 220 / rect.width;
      var distScaled = dist * scale;
      if (distScaled < 68 || distScaled > 100) return;

      var angle = Math.atan2(y, x);
      if (angle < -Math.PI / 2) angle += Math.PI * 2;
      var adjustedAngle = angle + Math.PI / 2;
      if (adjustedAngle >= Math.PI * 2) adjustedAngle -= Math.PI * 2;

      var cumAngle = 0;
      for (var i = 0; i < _lastCatData.length; i++) {
        var sweep = (_lastCatData[i].amount / _lastCatTotalSpent) * Math.PI * 2;
        cumAngle += sweep;
        if (adjustedAngle <= cumAngle) {
          haptic("light");
          openCatDetailSheet(_lastCatData[i].key);
          return;
        }
      }
    });
  }

  /* ── Category Detail Sheet ── */

  var catDetailOverlay = document.getElementById("expCatDetailOverlay");
  var catDetailSheet = document.getElementById("expCatDetailSheet");

  function formatExpDate(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    var now = new Date();
    var base = d.getDate() + " " + getMonthNameGenitive(d.getMonth());
    if (d.getFullYear() !== now.getFullYear()) base += " " + d.getFullYear();
    return base;
  }

  function openCatDetailSheet(catKey) {
    var cat = getCatByKey(catKey);
    var allMonth = getMonthExpenses();
    var entries = allMonth.filter(function (e) {
      return (e.category || "other") === catKey;
    });
    entries.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    var dotEl = document.getElementById("expDetailDot");
    var nameEl = document.getElementById("expDetailCatName");
    var countEl = document.getElementById("expDetailCount");
    var totalEl = document.getElementById("expDetailTotal");
    var metaEl = document.getElementById("expDetailMeta");
    var progressWrap = document.getElementById("expDetailProgressWrap");
    var progressFill = document.getElementById("expDetailProgressFill");
    var listEl = document.getElementById("expDetailList");
    var emptyEl = document.getElementById("expDetailEmpty");

    if (dotEl) dotEl.style.background = cat.color;
    if (nameEl) nameEl.textContent = cat.name;

    var catTotal = 0;
    for (var i = 0; i < entries.length; i++) catTotal += entries[i].amount;

    if (countEl) {
      countEl.textContent = entries.length + " " + _pluralizeExpense(entries.length);
    }

    if (totalEl) totalEl.textContent = fmtNum(catTotal) + " " + getCurrencySymbol();

    var totalAllSpent = 0;
    for (var k = 0; k < allMonth.length; k++) totalAllSpent += allMonth[k].amount;
    var pctOfTotal = totalAllSpent > 0 ? Math.round((catTotal / totalAllSpent) * 100) : 0;

    var limit = getMonthlyExpenseLimit();
    if (metaEl) {
      var metaParts = [];
      metaParts.push(t("expenses.pctOfAll", { pct: pctOfTotal }));
      if (limit > 0) metaParts.push(t("expenses.ofTotal", { amount: fmtNum(catTotal), limit: fmtNum(limit), sym: getCurrencySymbol() }));
      metaEl.textContent = metaParts.join("  ·  ");
    }

    if (progressWrap && progressFill) {
      if (limit > 0) {
        progressWrap.style.display = "";
        var pctBar = Math.min((catTotal / limit) * 100, 100);
        progressFill.style.width = "0%";
        progressFill.style.background = cat.color;
        requestAnimationFrame(function () {
          progressFill.style.width = pctBar + "%";
        });
      } else {
        progressWrap.style.display = "none";
      }
    }

    if (!entries.length) {
      if (listEl) listEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "flex";
    } else {
      if (emptyEl) emptyEl.style.display = "none";
      var html = "";
      for (var j = 0; j < entries.length; j++) {
        var e = entries[j];
        var delay = Math.min(j * 40, 300);
        var noteHtml = e.note
          ? '<div class="exp-detail-entry-note">' + e.note.replace(/</g, "&lt;") + '</div>'
          : '<div class="exp-detail-entry-note muted">' + t("expenses.noNote") + '</div>';

        html += '<div class="exp-detail-entry" style="animation-delay:' + delay + 'ms">' +
          '<div class="exp-detail-entry-dot" style="background:' + cat.color + '"></div>' +
          '<div class="exp-detail-entry-body">' +
            '<div class="exp-detail-entry-amount">' + fmtNum(e.amount) + ' ' + getCurrencySymbol() + '</div>' +
            noteHtml +
          '</div>' +
          '<div class="exp-detail-entry-date">' + formatExpDate(e.date) + '</div>' +
          '<svg class="exp-detail-entry-chevron" width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</div>';
      }
      if (listEl) listEl.innerHTML = html;
    }

    ProtoSheet.open(catDetailSheet, catDetailOverlay);
  }

  function _pluralizeExpense(n) {
    if (getCurrentLanguage() === "en") {
      return n === 1 ? t("expenses.opPlural1") : t("expenses.opPlural0");
    }
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return t("expenses.opPlural0");
    if (mod10 === 1) return t("expenses.opPlural1");
    if (mod10 >= 2 && mod10 <= 4) return t("expenses.opPlural2_4");
    return t("expenses.opPlural0");
  }

  function closeCatDetailSheet() {
    ProtoSheet.close(catDetailSheet, catDetailOverlay);
  }

  if (catDetailOverlay) {
    catDetailOverlay.addEventListener("click", function () {
      haptic("light");
      closeCatDetailSheet();
    });
  }

  /* ── Init swipe-to-dismiss on expense sheets ── */

  ProtoSheet.initSwipe(sheet, closeExpenseSheet);
  ProtoSheet.initSwipe(catDetailSheet, closeCatDetailSheet);

})();