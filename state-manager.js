/**
 * Protocol Finance — State Management & Storage Layer
 *
 * Единый слой управления состоянием.
 * Сейчас использует localStorage, но спроектирован так,
 * чтобы заменить адаптер на backend / Telegram Cloud Storage
 * без переписывания логики приложения.
 *
 * Загружается ДО app.js.
 */

const STATE_VERSION = 8;
const STORAGE_KEY = "protocol_app_state";

// ─── Default State ────────────────────────────────────────────

function getDefaultState() {
  return {
    stateVersion: STATE_VERSION,
    lastActiveScreen: "calc",
    lastActiveNavIndex: 0,

    income: "",
    expenses: "",
    goal: "",
    saved: "",

    saveMode: "calm",

    lastCalc: {},
    chosenPlan: null,
    plannedMonthly: 0,
    planStartValue: 0,
    initialBalance: 0,
    factRatio: null,
    goalCompleted: false,
    selectedScenario: null,
    isInitialized: false,

    accounts: { main: 0, reserve: 0 },

    factHistory: [],
    financialEvents: [],

    goalMeta: { title: "Основная цель" },

    // ── Multi-goal (v6) ──
    goals: [],
    activeGoalIndex: 0,
    completedGoals: [],

    // ── Engine (v3) ──
    financialModel: "simple",
    cashflowEvents: [],
    derivedState: {},

    // ── Cashflow settings (v3) ──
    incomeType: "fixed",
    expenseType: "fixed",
    frequency: "monthly",
    incomeFrequency: "monthly",
    expenseFrequency: "monthly",
    fixedIncomeAmount: "",
    fixedExpenseAmount: "",

    // ── Premium (v4) ──
    isPremium: false,

    // ── Flexible onboarding (v5) ──
    hasSeenFlexibleOnboarding: false,
    incomeMonthDays: [],
    expenseMonthDays: [],

    // ── Account Stats (v5) ──
    accountStats: {
      main: null,
      reserve: null
    },

    // ── Debts (v7) ──
    debts: [],
    debtPlanningMode: false,
    debtOverlaySeen: false,
    debtPaymentHistory: [],
    activeDebtIndex: 0,

    // ── Expenses Tracker (v8) ──
    expensesLog: [],

    uiState: {
      goalTotal: 0,
      goalSaved: 0,
      reserveAmount: 0,
      monthlyContribution: 0,
      monthsLeft: 0,
      mode: null,
      hasReserve: false
    }
  };
}

// ─── Storage Adapters ─────────────────────────────────────────

const localStorageAdapter = {
  save(data) {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, serialized);
      return true;
    } catch (e) {
      console.warn("[Storage] save failed:", e);
      return false;
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[Storage] load failed:", e);
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      // Совместимость: удаляем старые ключи
      localStorage.removeItem("protocol_persist");
      localStorage.removeItem("protocol_state");
      return true;
    } catch (e) {
      console.warn("[Storage] clear failed:", e);
      return false;
    }
  }
};

// ─── Abstract Storage (swappable) ─────────────────────────────

const storage = {
  _adapter: localStorageAdapter,

  setAdapter(adapter) {
    this._adapter = adapter;
  },

  save(data) {
    return this._adapter.save(data);
  },

  load() {
    return this._adapter.load();
  },

  clear() {
    return this._adapter.clear();
  }
};

// ─── App State (единственный источник истины) ─────────────────

let appState = getDefaultState();

// ─── Migration ────────────────────────────────────────────────

function migrateState(saved) {
  if (!saved || typeof saved !== "object") return getDefaultState();

  const version = saved.stateVersion || 0;

  // v0 → v1: старый формат (protocol_persist) — конвертируем
  if (version < 1) {
    saved.stateVersion = STATE_VERSION;
    if (!saved.lastActiveScreen) saved.lastActiveScreen = "calc";
    if (!saved.lastActiveNavIndex) saved.lastActiveNavIndex = 0;
    if (!saved.uiState && saved.state) {
      saved.uiState = { ...saved.state };
      delete saved.state;
    }
    if (!saved.uiState) {
      saved.uiState = getDefaultState().uiState;
    }
  }

  // v1 → v2: добавлен financialEvents
  if (version < 2) {
    saved.stateVersion = 2;
    if (!Array.isArray(saved.financialEvents)) {
      saved.financialEvents = [];
    }
  }

  // v2 → v3: CashflowEngine fields
  if (version < 3) {
    saved.stateVersion = 3;
    if (!saved.financialModel) saved.financialModel = "simple";
    if (!Array.isArray(saved.cashflowEvents)) saved.cashflowEvents = [];
    if (!saved.derivedState || typeof saved.derivedState !== "object") saved.derivedState = {};
    if (!saved.incomeType) saved.incomeType = "fixed";
    if (!saved.expenseType) saved.expenseType = "fixed";
    if (!saved.frequency) saved.frequency = "monthly";
    if (!saved.incomeFrequency) saved.incomeFrequency = "monthly";
    if (!saved.expenseFrequency) saved.expenseFrequency = "monthly";
  }

  // v3 → v4: isPremium
  if (version < 4) {
    saved.stateVersion = 4;
    if (typeof saved.isPremium !== "boolean") saved.isPremium = false;
  }

  // v4 → v5: flexible onboarding + monthDays
  if (version < 5) {
    saved.stateVersion = 5;
    if (typeof saved.hasSeenFlexibleOnboarding !== "boolean") saved.hasSeenFlexibleOnboarding = false;
    if (!Array.isArray(saved.incomeMonthDays)) saved.incomeMonthDays = [];
    if (!Array.isArray(saved.expenseMonthDays)) saved.expenseMonthDays = [];
  }

  // v5 → v6: multi-goal support
  if (version < 6) {
    saved.stateVersion = 6;
    if (!Array.isArray(saved.goals) || saved.goals.length === 0) {
      var goalAmount = 0;
      if (saved.goal) {
        goalAmount = Number(String(saved.goal).replace(/\./g, "")) || 0;
      }
      var goalSaved = 0;
      if (saved.accounts && saved.accounts.main) {
        goalSaved = Number(saved.accounts.main) || 0;
      }
      var goalMonths = 0;
      if (saved.lastCalc && saved.lastCalc.months) {
        goalMonths = saved.lastCalc.months;
      }
      var goalTitle = "Основная цель";
      if (saved.goalMeta && saved.goalMeta.title) {
        goalTitle = saved.goalMeta.title;
      }
      saved.goals = [{
        id: "goal_1",
        title: goalTitle,
        amount: goalAmount,
        saved: goalSaved,
        priority: 1,
        monthlyShare: 0,
        monthsLeft: goalMonths
      }];
    }
    if (typeof saved.activeGoalIndex !== "number") saved.activeGoalIndex = 0;

    saved.goals.forEach(function (g) {
      if (typeof g.monthlyShare !== "number") g.monthlyShare = 0;
      if (typeof g.monthsLeft !== "number") {
        g.monthsLeft = g.monthsTarget || 0;
      }
      delete g.monthsTarget;
    });
  }

  // v6 → v7: debts support
  if (version < 7) {
    saved.stateVersion = 7;
    if (!Array.isArray(saved.debts)) saved.debts = [];
    if (typeof saved.debtPlanningMode !== "boolean") saved.debtPlanningMode = false;
    if (typeof saved.debtOverlaySeen !== "boolean") saved.debtOverlaySeen = false;
  }

  // v7 → v8: expenses tracker
  if (version < 8) {
    saved.stateVersion = 8;
    if (!Array.isArray(saved.expensesLog)) saved.expensesLog = [];
  }

  // Ensure debtPaymentHistory exists (added post-v7)
  if (!Array.isArray(saved.debtPaymentHistory)) saved.debtPaymentHistory = [];

  // Ensure all goals have the paused field
  if (Array.isArray(saved.goals)) {
    saved.goals.forEach(function (g) {
      if (typeof g.paused !== "boolean") g.paused = false;
    });
  }

  return saved;
}

// ─── Serialization Helpers ────────────────────────────────────

function serializeFactHistory(history) {
  return history.map(({ value, date, to }) => ({
    value: Number(value) || 0,
    date: date instanceof Date
      ? date.toISOString()
      : (typeof date === "string" ? date : new Date().toISOString()),
    to: to || "main"
  }));
}

function deserializeFactHistory(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(({ value, date, to }) => {
    let parsedDate;
    if (date) {
      parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        parsedDate = new Date();
      }
      parsedDate.setDate(1);
      parsedDate.setHours(0, 0, 0, 0);
    } else {
      parsedDate = new Date();
      parsedDate.setDate(1);
      parsedDate.setHours(0, 0, 0, 0);
    }
    return {
      value: Number(value) || 0,
      date: parsedDate,
      to: to || "main"
    };
  });
}

// ─── Public API ───────────────────────────────────────────────

function initState() {
  let saved = storage.load();

  // Совместимость со старым форматом (protocol_persist)
  if (!saved) {
    try {
      const legacyRaw = localStorage.getItem("protocol_persist");
      if (legacyRaw) {
        saved = JSON.parse(legacyRaw);
        saved.stateVersion = 0; // помечаем как старый формат
      }
    } catch (e) { /* ignore */ }
  }

  if (saved) {
    saved = migrateState(saved);
    applyState(saved);
  } else {
    appState = getDefaultState();
  }

  return appState;
}

function updateState(partial) {
  if (!partial || typeof partial !== "object") return;
  Object.keys(partial).forEach(key => {
    if (key === "accounts" || key === "goalMeta" || key === "uiState" || key === "accountStats") {
      appState[key] = { ...appState[key], ...partial[key] };
    } else if (key === "goals" || key === "completedGoals" || key === "debts" || key === "expensesLog" || key === "debtPaymentHistory") {
      appState[key] = Array.isArray(partial[key]) ? partial[key].map(g => ({ ...g })) : appState[key];
    } else {
      appState[key] = partial[key];
    }
  });
}

function saveState() {
  const toSave = {
    ...appState,
    factHistory: serializeFactHistory(appState.factHistory),
    financialEvents: typeof FinancialEvents !== "undefined"
      ? FinancialEvents.serialize()
      : (appState.financialEvents || []),
    cashflowEvents: serializeCashflowEvents(appState.cashflowEvents),
    derivedState: appState.derivedState || {}
  };
  storage.save(toSave);
}

function loadState() {
  const saved = storage.load();
  if (!saved) return null;
  return migrateState(saved);
}

function applyState(saved) {
  const defaults = getDefaultState();

  appState.stateVersion = saved.stateVersion || defaults.stateVersion;
  appState.lastActiveScreen = saved.lastActiveScreen || defaults.lastActiveScreen;
  appState.lastActiveNavIndex = saved.lastActiveNavIndex != null
    ? saved.lastActiveNavIndex
    : defaults.lastActiveNavIndex;

  appState.income = saved.income ?? defaults.income;
  appState.expenses = saved.expenses ?? defaults.expenses;
  appState.goal = saved.goal ?? defaults.goal;
  appState.saved = saved.saved ?? defaults.saved;

  appState.saveMode = saved.saveMode || defaults.saveMode;

  appState.lastCalc = (saved.lastCalc && saved.lastCalc.ok)
    ? saved.lastCalc
    : defaults.lastCalc;
  appState.chosenPlan = saved.chosenPlan ?? defaults.chosenPlan;
  appState.plannedMonthly = saved.plannedMonthly ?? defaults.plannedMonthly;
  appState.planStartValue = saved.planStartValue ?? defaults.planStartValue;
  appState.initialBalance = Number(saved.initialBalance) || defaults.initialBalance;
  appState.factRatio = saved.factRatio != null
    ? (Number(saved.factRatio) || null)
    : defaults.factRatio;
  appState.goalCompleted = typeof saved.goalCompleted === "boolean"
    ? saved.goalCompleted
    : defaults.goalCompleted;
  appState.selectedScenario = saved.selectedScenario ?? defaults.selectedScenario;
  appState.isInitialized = typeof saved.isInitialized === "boolean"
    ? saved.isInitialized
    : defaults.isInitialized;

  appState.accounts = {
    main: Number(saved.accounts?.main) || 0,
    reserve: Number(saved.accounts?.reserve) || 0
  };

  appState.factHistory = deserializeFactHistory(saved.factHistory);

  // Восстанавливаем финансовые события в движок
  appState.financialEvents = Array.isArray(saved.financialEvents) ? saved.financialEvents : [];
  if (typeof FinancialEvents !== "undefined") {
    FinancialEvents.setEvents(FinancialEvents.deserialize(appState.financialEvents));
  }

  appState.goalMeta = saved.goalMeta && typeof saved.goalMeta === "object"
    ? { ...defaults.goalMeta, ...saved.goalMeta }
    : { ...defaults.goalMeta };

  // ── Multi-goal (v6) ──
  appState.goals = Array.isArray(saved.goals) && saved.goals.length > 0
    ? saved.goals.map(function (g) { return { ...g }; })
    : defaults.goals;
  appState.activeGoalIndex = typeof saved.activeGoalIndex === "number"
    ? saved.activeGoalIndex : 0;
  appState.completedGoals = Array.isArray(saved.completedGoals) ? saved.completedGoals : [];

  // ── Engine (v3) ──
  appState.financialModel = saved.financialModel || defaults.financialModel;
  appState.cashflowEvents = Array.isArray(saved.cashflowEvents) ? saved.cashflowEvents : [];
  appState.derivedState = (saved.derivedState && typeof saved.derivedState === "object")
    ? saved.derivedState
    : {};

  // ── Cashflow settings ──
  appState.incomeType = saved.incomeType || defaults.incomeType;
  appState.expenseType = saved.expenseType || defaults.expenseType;
  appState.frequency = saved.frequency || defaults.frequency;
  appState.incomeFrequency = saved.incomeFrequency || defaults.incomeFrequency;
  appState.expenseFrequency = saved.expenseFrequency || defaults.expenseFrequency;
  appState.fixedIncomeAmount = saved.fixedIncomeAmount ?? defaults.fixedIncomeAmount;
  appState.fixedExpenseAmount = saved.fixedExpenseAmount ?? defaults.fixedExpenseAmount;

  // ── Premium (v4) ──
  appState.isPremium = typeof saved.isPremium === "boolean" ? saved.isPremium : defaults.isPremium;

  // ── Flexible onboarding (v5) ──
  appState.hasSeenFlexibleOnboarding = typeof saved.hasSeenFlexibleOnboarding === "boolean"
    ? saved.hasSeenFlexibleOnboarding : defaults.hasSeenFlexibleOnboarding;
  appState.incomeMonthDays = Array.isArray(saved.incomeMonthDays) ? saved.incomeMonthDays : [];
  appState.expenseMonthDays = Array.isArray(saved.expenseMonthDays) ? saved.expenseMonthDays : [];

  // ── Debts (v7) ──
  appState.debts = Array.isArray(saved.debts) ? saved.debts.map(function (d) { return { ...d }; }) : [];
  appState.debtPlanningMode = typeof saved.debtPlanningMode === "boolean" ? saved.debtPlanningMode : false;
  appState.debtOverlaySeen = typeof saved.debtOverlaySeen === "boolean" ? saved.debtOverlaySeen : false;
  appState.debtPaymentHistory = Array.isArray(saved.debtPaymentHistory) ? saved.debtPaymentHistory.map(function (e) { return { ...e }; }) : [];
  appState.activeDebtIndex = typeof saved.activeDebtIndex === "number" ? saved.activeDebtIndex : 0;

  // ── Expenses Tracker (v8) ──
  appState.expensesLog = Array.isArray(saved.expensesLog) ? saved.expensesLog.map(function (e) { return { ...e }; }) : [];

  if (saved.accountStats && typeof saved.accountStats === "object") {
    if (saved.accountStats.main !== undefined || saved.accountStats.reserve !== undefined) {
      appState.accountStats = {
        main: saved.accountStats.main || null,
        reserve: saved.accountStats.reserve || null
      };
    } else if (saved.accountStats.type) {
      appState.accountStats = { main: saved.accountStats, reserve: null };
    } else {
      appState.accountStats = { main: null, reserve: null };
    }
  } else {
    appState.accountStats = { main: null, reserve: null };
  }

  if (saved.uiState && typeof saved.uiState === "object") {
    appState.uiState = { ...defaults.uiState, ...saved.uiState };
  } else {
    appState.uiState = { ...defaults.uiState };
  }

  if (appState.planStartValue === 0 && appState.initialBalance > 0) {
    appState.planStartValue = appState.initialBalance;
  }
}

function clearState() {
  storage.clear();
  appState = getDefaultState();
  if (typeof FinancialEvents !== "undefined") {
    FinancialEvents.clearEvents();
  }
}

function serializeCashflowEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.map(function (e) {
    var copy = {};
    for (var k in e) {
      if (e.hasOwnProperty(k)) copy[k] = e[k];
    }
    if (copy.startDate instanceof Date) copy.startDate = copy.startDate.toISOString();
    if (copy.endDate instanceof Date) copy.endDate = copy.endDate.toISOString();
    return copy;
  });
}

function getState() {
  return appState;
}
