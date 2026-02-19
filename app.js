const tg = window.Telegram?.WebApp;
tg?.expand();

const buttons = document.querySelectorAll(".nav-btn");
const screens = document.querySelectorAll(".screen");
const indicator = document.querySelector(".nav-indicator");

if (window.Telegram?.WebApp) {
Telegram.WebApp.ready();
Telegram.WebApp.expand();
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
const editPlanBtn = document.getElementById("editPlan");

const summaryMonthly = document.getElementById("summaryMonthly");
const summaryMonths = document.getElementById("summaryMonths");
const summaryMode = document.getElementById("summaryMode");

let selectedMode = "calm"; // calm | medium | aggressive

const modeButtons = document.querySelectorAll(".mode-btn");

modeButtons.forEach(btn => {
btn.onclick = () => {
haptic("light");
// снять активность со всех
modeButtons.forEach(b => b.classList.remove("active"));

// активировать текущую
btn.classList.add("active");

// сохранить режим
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

indicator.style.transform = `translateX(${x}px)`;
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
 * Централизованная функция перерасчёта плана
 * Обновляет все UI элементы на основе текущего state
 * 
 * ⚠️ ВАЖНО: Любое изменение данных должно вызывать ТОЛЬКО recalcPlan(),
 * а не обновлять UI вручную в разных местах.
 */
function recalcPlan() {
  // 1. Синхронизируем state с текущими данными
  state.goalTotal = parseNumber(document.getElementById("goal")?.value || "0");
  state.goalSaved = accounts.main;
  state.reserveAmount = accounts.reserve;
  state.monthlyContribution = plannedMonthly;
  state.monthsLeft = lastCalc.months || 0;
  state.mode = chosenPlan;
  state.hasReserve = chosenPlan === "buffer";

  // 2. Обновляем UI через существующие функции (для совместимости)
  renderGoals();
  renderAccountsUI();

  // 3. Обновляем summaryMonths если элемент существует
  const summaryMonthsEl = document.getElementById("summaryMonths");
  if (summaryMonthsEl && lastCalc.months) {
    summaryMonthsEl.innerText = state.monthsLeft;
  }

  // 4. Обновляем график и план
  if (lastCalc.ok) {
    drawStaticLayer();
    animateFactLine();
    updatePlanHeader();
  }

  // 5. Сохраняем все данные в localStorage (память между входами)
  saveFullState();
}

const STORAGE_KEY_PERSIST = "protocol_persist";
const STORAGE_KEY_STATE = "protocol_state";

/**
 * Сохраняет все данные приложения в localStorage (память между входами).
 */
function saveFullState() {
  try {
    const payload = {
      income: incomeInput?.value?.trim() || "",
      expenses: expensesInput?.value?.trim() || "",
      goal: goalInput?.value?.trim() || "",
      saved: savedInput?.value?.trim() || "",
      saveMode: saveMode || "calm",
      factHistory: factHistory.map(({ value, date, to }) => ({
        value: Number(value) || 0,
        date: date instanceof Date ? date.toISOString() : (typeof date === "string" ? date : new Date().toISOString()),
        to: to || "main"
      })),
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
      state: { ...state }
    };
    localStorage.setItem(STORAGE_KEY_PERSIST, JSON.stringify(payload));
    localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save full state:", e);
  }
}

/**
 * Загружает все данные из localStorage при запуске приложения.
 */
function loadFullState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PERSIST);
    if (!raw) {
      loadStateFromStorage();
      return;
    }
    const p = JSON.parse(raw);

    if (p.income != null && incomeInput) incomeInput.value = p.income;
    if (p.expenses != null && expensesInput) expensesInput.value = p.expenses;
    if (p.goal != null && goalInput) goalInput.value = p.goal;
    if (p.saved != null && savedInput) savedInput.value = p.saved;

    if (p.saveMode) {
      saveMode = p.saveMode;
      selectedMode = p.saveMode;
      modeButtons.forEach(b => {
        b.classList.toggle("active", b.dataset.mode === p.saveMode);
      });
    }

    if (Array.isArray(p.factHistory)) {
      factHistory = p.factHistory.map(({ value, date, to }) => {
        let parsedDate;
        if (date) {
          parsedDate = new Date(date);
          // Проверяем валидность даты
          if (isNaN(parsedDate.getTime())) {
            parsedDate = new Date();
            parsedDate.setDate(1);
            parsedDate.setHours(0, 0, 0, 0);
          } else {
            // Нормализуем дату к началу месяца
            parsedDate.setDate(1);
            parsedDate.setHours(0, 0, 0, 0);
          }
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

    if (p.lastCalc && p.lastCalc.ok) lastCalc = p.lastCalc;
    if (p.accounts) {
      accounts.main = Number(p.accounts.main) || 0;
      accounts.reserve = Number(p.accounts.reserve) || 0;
    }
    if (p.chosenPlan != null) chosenPlan = p.chosenPlan;
    if (p.plannedMonthly != null) plannedMonthly = p.plannedMonthly;
    if (p.planStartValue != null) planStartValue = p.planStartValue;
    if (p.initialBalance != null) initialBalance = Number(p.initialBalance) || 0;
    if (p.factRatio != null) factRatio = Number(p.factRatio) || null;
    if (typeof p.goalCompleted === "boolean") goalCompleted = p.goalCompleted;
    if (p.selectedScenario != null) selectedScenario = p.selectedScenario;
    if (typeof p.isInitialized === "boolean") isInitialized = p.isInitialized;
    if (p.goalMeta && typeof p.goalMeta === "object") Object.assign(goalMeta, p.goalMeta);
    if (p.state && typeof p.state === "object") Object.assign(state, p.state);

    // Если initialBalance не был сохранён, вычисляем из savedInput (обратная совместимость)
    if (initialBalance === 0 && savedInput?.value) {
      initialBalance = parseNumber(savedInput.value || "0");
    }

    // Синхронизируем planStartValue с initialBalance, если он не был сохранён
    if (planStartValue === 0 && initialBalance > 0) {
      planStartValue = initialBalance;
    }

    // Если accounts восстановлены, но initialBalance не был сохранён, используем accounts.main
    if (initialBalance === 0 && accounts.main > 0) {
      initialBalance = accounts.main;
      planStartValue = accounts.main;
    }

    if (isInitialized) {
      lockTabs(false);
      planSummary.style.display = "block";
      if (summaryMonthly && lastCalc.monthlySave) summaryMonthly.innerText = lastCalc.monthlySave.toLocaleString();
      if (summaryMonths && lastCalc.months) summaryMonths.innerText = lastCalc.months;
      if (summaryMode) summaryMode.innerText = saveMode === "calm" ? "Спокойный" : saveMode === "normal" ? "Умеренный" : "Агрессивный";
      document.querySelectorAll("#screen-calc label, #screen-calc .input-wrap, .mode-buttons, #calculate").forEach(el => el.style.display = "none");
      renderAccountsUI();
      renderGoals();

      // Восстановление экрана: если сценарий выбран — возвращаем на график
      // Откладываем на следующий тик, чтобы после "обновить страницу" DOM и экран успели отрисоваться
      if (chosenPlan && lastCalc?.ok) {
        if (!plannedMonthly || plannedMonthly === 0) {
          plannedMonthly = lastCalc.monthlySave;
          if (chosenPlan === "buffer") plannedMonthly = Math.round(plannedMonthly * 0.9);
        }

        openScreen("advice", buttons[1]);
        if (loader) loader.classList.add("hidden");

        const restoreGraph = () => {
          renderProtocolAdviceGraph();
          if (factHistory.length) runBrain();
          lockTabs(false);
          showBottomNav();
          if (buttons[1]) {
            buttons.forEach(b => b.classList.remove("active"));
            buttons[1].classList.add("active");
            moveIndicator(buttons[1]);
          }
          requestAnimationFrame(() => {
            lockTabs(false);
            bottomNav.style.pointerEvents = "auto";
            buttons.forEach((b, i) => {
              b.style.pointerEvents = i === 0 && !isInitialized ? "none" : "auto";
              b.style.opacity = i === 0 && !isInitialized ? "0.35" : "1";
            });
          });
        };

        if (typeof requestAnimationFrame !== "undefined") {
          requestAnimationFrame(() => {
            restoreGraph();
          });
        } else {
          setTimeout(restoreGraph, 0);
        }
      } else if (lastCalc?.ok) {
        // если план посчитан, но сценарий не выбран — возвращаем к выбору сценария
        const advice = ProtocolCore.buildAdvice(lastCalc);
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
    console.warn("Failed to load full state:", e);
    loadStateFromStorage();
  }
}

/**
 * Загружает только state из localStorage (совместимость со старыми сохранениями).
 */
function loadStateFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STATE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.goalTotal != null) state.goalTotal = parsed.goalTotal;
      if (parsed.goalSaved != null) state.goalSaved = parsed.goalSaved;
      if (parsed.reserveAmount != null) state.reserveAmount = parsed.reserveAmount;
      if (parsed.monthlyContribution != null) state.monthlyContribution = parsed.monthlyContribution;
      if (parsed.monthsLeft != null) state.monthsLeft = parsed.monthsLeft;
      if (parsed.mode != null) state.mode = parsed.mode;
      if (typeof parsed.hasReserve === "boolean") state.hasReserve = parsed.hasReserve;
    }
  } catch (e) {
    console.warn("Failed to load state from localStorage:", e);
  }
}

// Загружаем сохранённые данные при запуске
loadFullState();

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
  // После «обновить страницу» навбар может не реагировать — принудительно включаем клики по кнопкам
  buttons.forEach((b, i) => {
    b.style.pointerEvents = i === 0 && !isInitialized ? "none" : "auto";
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

  // закрываем модалки при любой навигации
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

const baseResult = ProtocolCore.calculateBase({
income: parseNumber(incomeInput.value),
expenses: parseNumber(expensesInput.value),
goal: parseNumber(goalInput.value),
saved: parseNumber(savedInput?.value || "0"),
mode: saveMode
});

if (!baseResult.ok) {
alert(baseResult.message);
return;
}

const advice = ProtocolCore.buildAdvice(baseResult);

lastCalc = baseResult;

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

/* ===== EDIT PLAN ===== */
editPlanBtn.onclick = () => {
haptic("light");

// показать форму обратно
document.querySelectorAll(
"#screen-calc label, #screen-calc .input-wrap, .mode-buttons, #calculate"
).forEach(el => el.style.display = "");

// спрятать summary
planSummary.style.display = "none";
};

/* ===== TIME HELPERS ===== */

function addMonths(date, n) {
const d = new Date(date);
d.setMonth(d.getMonth() + n);
return d;
}

function renderProtocolAdviceGraph() {
  const advice = ProtocolCore.buildAdvice(lastCalc);

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
</div>

<div style="
margin-top:10px;
padding:10px 12px;
border-radius:14px;
background:#111;
border:1px solid #222;
font-size:14px;
">
${advice.text}
</div>

<div class="graph-block">
<div class="chart-card">
<div class="chart-wrap" style="width:100%; height:260px; margin:0; position:relative;">
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
`;

  initChart();
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
        accounts.reserve += toReserve;
      }

      accounts.main += toMain;

      const now = new Date();
      now.setDate(1);
      now.setHours(0, 0, 0, 0);

      factHistory.push({
        value: toMain,
        date: now,
        to: "main"
      });

      if (toReserve > 0) {
        factHistory.push({
          value: toReserve,
          date: now,
          to: "reserve"
        });
      }

      factRatio = fact / plannedMonthly;

      drawStaticLayer();
      animateFactLine();
      runBrain();
      renderAccountsUI();
      renderGoals();
      const goalTotal = parseNumber(goalInput.value || "0");

      if (!goalCompleted && goalTotal > 0 && accounts.main >= goalTotal) {
        goalCompleted = true;
        setTimeout(fireCelebration, 120);
      }

      factInput.value = "";
      factInput.blur();
      recalcPlan();
    };
  }

}

/* ===== STAGED FLOW ===== */
function protocolFlow(mode) {
chosenPlan = mode;
if (protocolBack) protocolBack.style.display = "none";
// 🔥 СИНХРОНИЗАЦИЯ С УЖЕ НАКОПЛЕННЫМ
// Если accounts уже восстановлены из сохранения, не перезаписываем их
const initialSaved = parseNumber(savedInput?.value || "0");
if (accounts.main === 0 && accounts.reserve === 0) {
  // Только если accounts пустые, инициализируем из savedInput
  initialBalance = initialSaved;
  planStartValue = initialSaved;
  accounts.main = initialSaved;
  accounts.reserve = 0;
} else {
  // Если accounts уже заполнены (из сохранения), используем их
  initialBalance = planStartValue || accounts.main;
  planStartValue = planStartValue || accounts.main;
}

isInitialized = true;
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

  try {
    localStorage.removeItem(STORAGE_KEY_STATE);
    localStorage.removeItem(STORAGE_KEY_PERSIST);
  } catch (e) {
    console.warn("Failed to clear storage:", e);
  }

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

function getFactGradient(ctx, W) {
const g = ctx.createLinearGradient(0, 0, W, 0);
g.addColorStop(0, "#1e3a8a"); // тёмный как у резерва
g.addColorStop(0.5, "#2563eb"); // фирменный синий
g.addColorStop(1, "#60a5fa"); // мягкий светлый
return g;
}

function initChart() {
const wrap = document.querySelector(".chart-wrap");

bgCanvas = document.getElementById("chartBg");
factCanvas = document.getElementById("chartFact");

const dpr = window.devicePixelRatio || 1;

const width = wrap.clientWidth;
const height = wrap.clientHeight;

[bgCanvas, factCanvas].forEach(c => {
c.style.width = width + "px";
c.style.height = height + "px";

c.width = width * dpr;
c.height = height * dpr;
});

bgCtx = bgCanvas.getContext("2d");
factCtx = factCanvas.getContext("2d");

bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
factCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

drawStaticLayer();
factCanvas.addEventListener("pointerdown", e => {
e.stopPropagation();

if (!lastFactPoint) return;

const rect = factCanvas.getBoundingClientRect();

const clickX = e.clientX - rect.left;
const clickY = e.clientY - rect.top;

const dx = clickX - lastFactPoint.x;
const dy = clickY - lastFactPoint.y;

const distance = Math.sqrt(dx * dx + dy * dy);

if (distance <= 25) {

animateDotScale(1.8);

const total = factHistory
.filter(f => f.to === "main")
.reduce((s, f) => s + f.value, 0);
showFactTooltip({
value: total,
onHide: () => animateDotScale(1)
});
}
});
}

function addMonths(date, n) {
const d = new Date(date);
d.setMonth(d.getMonth() + n);
return d;
}

function buildPlanTimeline(startDate, monthlyAmount, months) {
const points = [];

let total = 0;

for (let i = 0; i <= months; i++) {
points.push({
date: addMonths(startDate, i),
value: total
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

function showFactTooltip({ value, onHide }) {
  const container = document.getElementById("factTooltipContainer");
  if (container) {
    const old = container.querySelector(".fact-tooltip");
    if (old) old.remove();
    container.innerHTML = "";
  }

  const block = document.createElement("div");
  block.className = "fact-tooltip";

  const date = new Date().toLocaleDateString("ru-RU");
  block.innerHTML = `
<div class="fact-date">${date}</div>
<div class="fact-value">
Отложено: ${value.toLocaleString()} ₽
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

if (mainEl) {
mainEl.innerText = accounts.main.toLocaleString();
}

if (reserveEl) {
reserveEl.innerText = accounts.reserve.toLocaleString();
}

// 🔥 вот это главное
const reserveBlock = document.querySelector(
'.account-block[data-account="reserve"]'
);

if (reserveBlock) {
if (chosenPlan === "buffer") {
reserveBlock.classList.add("show-reserve");
} else {
reserveBlock.classList.remove("show-reserve");
}
}
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
}, 550);
goalEditHint.classList.remove("show");
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
goalEditorOverlay.onclick = () => {
goalEditorSheet.style.transform = "translateY(100%)";
setTimeout(() => {
goalEditorOverlay.style.display = "none";
}, 550);
};
// 5️⃣ пересчитываем UI
recalcPlanAfterGoalChange();
renderGoals();
updatePlanHeader();
renderAccountsUI();

recalcPlanAfterGoalChange();
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
if (!lastCalc.ok) return;

const newGoal = parseNumber(goalInput.value || "0");
if (!newGoal) return;

const baseResult = ProtocolCore.calculateBase({
income: parseNumber(incomeInput.value),
expenses: parseNumber(expensesInput.value),
goal: newGoal,
saved: accounts.main,
mode: saveMode
});

if (!baseResult.ok) return;

lastCalc = baseResult;

plannedMonthly = baseResult.monthlySave;
if (chosenPlan === "buffer") {
plannedMonthly = Math.round(plannedMonthly * 0.9);
}

drawStaticLayer();
animateFactLine();

}

function updatePlanHeader() {
if (!lastCalc.ok) return;

const monthlyEl = document.getElementById("planMonthly");
const explainEl = document.getElementById("planExplanation");

if (!monthlyEl || !explainEl) return;

monthlyEl.innerText =
`План: ${plannedMonthly.toLocaleString()} ₽ / месяц`;

explainEl.innerHTML = ProtocolCore
.explain(lastCalc)
.replace(/\n/g, "<br>");
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
const W = bgCanvas.width / (window.devicePixelRatio || 1);
const H = bgCanvas.height / (window.devicePixelRatio || 1);

bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

// СЕТКА
bgCtx.strokeStyle = "rgba(255,255,255,0.06)";
bgCtx.lineWidth = 1;

const pad = 40;
const gridX = 4;
const gridY = 5;

for (let i = 1; i < gridY; i++) {
const y = pad + (i / gridY) * (H - pad * 2);
bgCtx.beginPath();
bgCtx.moveTo(pad, y);
bgCtx.lineTo(W - pad, y);
bgCtx.stroke();
}

for (let i = 1; i < gridX; i++) {
const x = pad + (i / gridX) * (W - pad * 2);
bgCtx.beginPath();
bgCtx.moveTo(x, pad);
bgCtx.lineTo(x, H - pad);
bgCtx.stroke();
}

// ОСИ
bgCtx.strokeStyle = "#333";
bgCtx.beginPath();
bgCtx.moveTo(pad, pad);
bgCtx.lineTo(pad, H - pad);
bgCtx.lineTo(W - pad, H - pad);
bgCtx.stroke();

drawPlanLine();
drawMonthLabels();
// ===== WATERMARK =====
const size = 170;
const centerX = W / 2;
const centerY = H / 2;

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

const textY = centerY + size / 2 - 20;

bgCtx.fillText("Protocol", centerX, textY);

const protocolWidth = bgCtx.measureText("Protocol").width;

bgCtx.globalAlpha = 0.12;
bgCtx.font = "400 10px Inter, system-ui";

bgCtx.fillText(
"™",
centerX + protocolWidth / 2 + 3,
textY - 4
);

bgCtx.restore();
}

function drawMonthLabels() {
if (!lastCalc.months) return;

const W = bgCanvas.width / (window.devicePixelRatio || 1);
const H = bgCanvas.height / (window.devicePixelRatio || 1);
const pad = 40;

const monthsTotal = lastCalc.months;

// 🔥 рассчитываем шаг отображения
let step = 1;

if (monthsTotal > 24) step = 4;
else if (monthsTotal > 12) step = 3;
else if (monthsTotal > 6) step = 2;

bgCtx.fillStyle = "rgba(255,255,255,0.35)";
bgCtx.font = "12px Inter, system-ui";
bgCtx.textAlign = "center";
bgCtx.textBaseline = "top";

for (let i = 0; i <= monthsTotal; i++) {

if (i % step !== 0 && i !== monthsTotal) continue;

const x =
pad +
(i / monthsTotal) *
(W - pad * 2);

bgCtx.fillText(i, x, H - pad + 8);
}
}

function drawPlanLine() {
const W = bgCanvas.width / (window.devicePixelRatio || 1);
const H = bgCanvas.height / (window.devicePixelRatio || 1);
const pad = 40;

const points = buildPlanTimeline(new Date(), plannedMonthly, lastCalc.months);
const maxValue = points[points.length - 1].value;

let planColor = "#ffffff";

// если пользователь ещё не вводил реальные пополнения — линия всегда белая
if (factHistory.length === 0) {
bgCtx.strokeStyle = "#ffffff";
bgCtx.lineWidth = 2;

const points = buildPlanTimeline(new Date(), plannedMonthly, lastCalc.months);
const maxValue = points[points.length - 1].value;

bgCtx.beginPath();

points.forEach((p, i) => {
const x = pad + (i / (points.length - 1)) * (W - pad * 2);
const y = H - pad - (p.value / maxValue) * (H - pad * 2);

if (i === 0) bgCtx.moveTo(x, y);
else bgCtx.lineTo(x, y);
});

bgCtx.stroke();
return; // ← ВАЖНО
}

if (factHistory.length > 0) {
const mainFacts = factHistory.filter(f => f.to === "main");

const total = mainFacts.reduce((s, f) => s + f.value, 0);

const uniqueMonths = new Set(
mainFacts.map(f => {
const d = new Date(f.date);
return `${d.getFullYear()}-${d.getMonth()}`;
})
);

const monthsPassed = uniqueMonths.size;
const plannedSoFar = plannedMonthly * monthsPassed;

if (total >= plannedSoFar) {
planColor = "#4ade80";
} else {
planColor = "#ef4444";
}
}

bgCtx.strokeStyle = planColor;
bgCtx.lineWidth = 2;
bgCtx.beginPath();

points.forEach((p, i) => {
const x = pad + (i / (points.length - 1)) * (W - pad * 2);
const y = H - pad - (p.value / maxValue) * (H - pad * 2);

if (i === 0) bgCtx.moveTo(x, y);
else bgCtx.lineTo(x, y);
});

bgCtx.stroke();
}

let animationFrameId = null;

function animateFactLine() {
if (!factHistory.length) {
factCtx.clearRect(0, 0, factCanvas.width, factCanvas.height);
return;
}

if (!plannedMonthly || !lastCalc.months) return;

const total = factHistory
.filter(f => f.to === "main")
.reduce((s, f) => s + f.value, 0);

const planMax = plannedMonthly * lastCalc.months;

const maxValue = Math.max(total, planMax, 1); // ← защита от 0

let start = null;
const duration = 900;

function frame(timestamp) {
if (!start) start = timestamp;

const progress = Math.min((timestamp - start) / duration, 1);
const eased = 1 - Math.pow(1 - progress, 3);

drawFactLayer(eased, total, maxValue);

if (progress < 1) {
requestAnimationFrame(frame);
}
}

requestAnimationFrame(frame);
}

function drawFactLayer(progress, total, maxValue) {
const W = factCanvas.width / (window.devicePixelRatio || 1);
const H = factCanvas.height / (window.devicePixelRatio || 1);
const pad = 40;

factCtx.clearRect(0, 0, factCanvas.width, factCanvas.height);

const monthsTotal = lastCalc.months;

// сколько месяцев прошло
const mainFacts = factHistory.filter(f => f.to === "main");

const uniqueMonths = new Set(
mainFacts.map(f => {
const d = new Date(f.date);
return `${d.getFullYear()}-${d.getMonth()}`;
})
);
const monthsPassed = Math.max(1, uniqueMonths.size);

const x =
pad +
(monthsPassed / monthsTotal) *
(W - pad * 2) *
progress;

const y =
H - pad -
(total / maxValue) *
(H - pad * 2) *
progress;

const lastFact = mainFacts[mainFacts.length - 1];

lastFactPoint = { x, y };

factCtx.strokeStyle = "#2563eb";
factCtx.lineWidth = 2;

factCtx.beginPath();
factCtx.moveTo(pad, H - pad);
factCtx.lineTo(x, y);
factCtx.stroke();

if (progress === 1) {

const radius = 5 * dotScale;

const fillGrad = factCtx.createLinearGradient(
x, y - radius,
x, y + radius
);
fillGrad.addColorStop(0, "#60a5fa");
fillGrad.addColorStop(1, "#2563eb");

factCtx.beginPath();
factCtx.arc(x, y, radius, 0, Math.PI * 2);
factCtx.fillStyle = fillGrad;
factCtx.fill();

// ===== Тонкий белый кант =====
factCtx.lineWidth = 1.2;
factCtx.strokeStyle = "rgba(255,255,255,0.45)";
factCtx.stroke();

if (dotScale > 1.05) {
const glowRadius = radius * 2.8;
const glow = factCtx.createRadialGradient(
x, y, 0,
x, y, glowRadius
);
glow.addColorStop(0, "rgba(37,99,235,0.35)");
glow.addColorStop(0.4, "rgba(37,99,235,0.18)");
glow.addColorStop(1, "rgba(37,99,235,0)");
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

const total = factHistory
.filter(f => f.to === "main")
.reduce((s, f) => s + f.value, 0);

const planMax = plannedMonthly * lastCalc.months;
const maxValue = Math.max(total, planMax, 1);

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
(function initFlipSwipe() {
  const wrapper = document.getElementById("flipWrapper");
  if (!wrapper) return;
  const inner = wrapper.querySelector(".flip-inner");
  if (!inner) return;

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
    const coef = flipped ? -1 : 1; // лицевая: свайп влево (dx<0) → угол в минус; оборотная: свайп вправо (dx>0) → угол к 0
    const angle = base + coef * (dx / wrapper.offsetWidth) * 90;
    inner.style.transform = "rotateY(" + angle + "deg)";
  }, { passive: true });

  wrapper.addEventListener("touchend", function () {
    if (!swiping) return;
    swiping = false;
    inner.style.transition = "";
    if (dx < -THRESHOLD) {
      inner.classList.add("flipped");
    } else if (dx > THRESHOLD) {
      inner.classList.remove("flipped");
    }
    inner.style.transform = "";
  });

  wrapper.addEventListener("touchcancel", function () {
    if (!swiping) return;
    swiping = false;
    inner.style.transition = "";
    inner.style.transform = "";
  });
})();