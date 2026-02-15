const tg = window.Telegram?.WebApp;
tg?.expand();

if (window.Telegram?.WebApp) {
Telegram.WebApp.ready();
Telegram.WebApp.expand();
}

document.addEventListener("click", e => {
if (
e.target.closest("input") ||
e.target.closest("textarea") ||
e.target.closest(".mode-btn") ||
e.target.closest(".nav-btn") ||
e.target.closest("#profileBtn") ||
e.target.closest(".protocol-back")
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

const confirmReset = document.getElementById("confirmReset");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");

/* ===== NAV ===== */
const screens = document.querySelectorAll(".screen");
const buttons = document.querySelectorAll(".nav-btn");
const indicator = document.querySelector(".nav-indicator");
const bottomNav = document.querySelector(".bottom-nav");
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
bottomNav.style.bottom = "26px";
bottomNav.style.left = "20px";
bottomNav.style.right = "20px";

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
if (!isInitialized && name !== "calc") return;

screens.forEach(s => s.classList.remove("active"));
document.getElementById("screen-" + name).classList.add("active");

buttons.forEach(b => b.classList.remove("active"));
if (btn) btn.classList.add("active");

if (btn) {
moveIndicator(btn);
} else {
indicator.style.opacity = "0";
}
clearFactInputError();
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

// nav показываем ТОЛЬКО если это не calc
if (lastScreenBeforeProfile === "calc") {
bottomNav.style.transform = "translateY(140%)";
bottomNav.style.opacity = "0";
bottomNav.style.pointerEvents = "none";
} else {
bottomNav.style.transform = "translateY(0)";
bottomNav.style.opacity = "1";
bottomNav.style.pointerEvents = "auto";
}
};
}

document.querySelectorAll(".account-block").forEach(block => {
block.onclick = () => {
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
isInitial: false
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
Возможные варианты:
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

/* ===== STAGED FLOW ===== */
function protocolFlow(mode) {
chosenPlan = mode;
if (protocolBack) protocolBack.style.display = "none";
// 🔥 СИНХРОНИЗАЦИЯ С УЖЕ НАКОПЛЕННЫМ
const initialSaved = parseNumber(savedInput?.value || "0");
initialBalance = initialSaved;
planStartValue = initialSaved;
accounts.main = initialSaved;
accounts.reserve = 0;

isInitialized = true;
renderAccountsUI();
lockTabs(false);

openScreen("advice", null);
const backBtn = document.getElementById("protocolBack");
if (backBtn) backBtn.style.display = "none";
hideBottomNav();

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

const fake = document.getElementById("fakeScreen");
const real = document.getElementById("realScreen");

// 1️⃣ расширяем маленький блок
fake.classList.add("expand");

// 2️⃣ через 500мс начинаем уезд
setTimeout(() => {
  fake.classList.add("slide-out");
}, 500);

// 3️⃣ после уезда показываем реальный контент
setTimeout(() => {

  const explanation = ProtocolCore.explain(lastCalc);
  const advice = ProtocolCore.buildAdvice(lastCalc);

  real.innerHTML = `
<div id="adviceSlider" style="
  width:200%;
  display:flex;
  transition: transform 0.6s cubic-bezier(.22,1,.36,1);
">

  <!-- ЛЕВАЯ ЧАСТЬ (ФЕЙК ЭКРАН) -->
  <div style="width:50%;padding:24px;">
    <div style="text-align:center;margin-top:60px">
      <div class="loader"></div>
      <div style="margin-top:16px">
        Готово.
      </div>
    </div>
  </div>

  <!-- ПРАВАЯ ЧАСТЬ (РЕАЛЬНЫЙ КОНТЕНТ) -->
  <div style="width:50%;padding:24px;">

    <div id="planHeader">
      <div id="planMonthly"
        style="font-size:16px;font-weight:600"></div>

      <div id="planExplanation"
        style="margin-top:8px;font-size:14px;line-height:1.4;opacity:0.75;">
      </div>
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

    <div class="chart-wrap"
      style="width:100%; height:260px; margin:16px 0; position:relative;">
      <canvas id="chartBg"></canvas>
      <canvas id="chartFact"></canvas>
    </div>

    <div class="fact-input-row">
      <input id="factInput" inputmode="numeric"
        placeholder="Сколько вы отложили" style="flex:1"/>
      <button id="applyFact"
        style="width:52px;height:52px;border-radius:50%">
        ➜
      </button>
    </div>

  </div>
</div>
`;

const slider = document.getElementById("adviceSlider");

setTimeout(() => {
  slider.style.transform = "translateX(-50%)";
}, 50);

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

factInput.addEventListener("input", e => {
e.target.value = formatNumber(e.target.value);

// 🔥 убираем ошибку как только начали ввод
factInput.classList.remove("error", "shake");
});

factInput.addEventListener("focus", () => {
factInput.classList.remove("error", "shake");
});

applyBtn.onclick = () => {

const fact = parseNumber(factInput.value || "0");

// 🔥 ВСЕГДА сначала очищаем ошибку
factInput.classList.remove("error", "shake");

if (!fact) {

factInput.classList.add("error");

void factInput.offsetWidth;
factInput.classList.add("shake");

haptic("error");
return;
}

// дальше твоя логика без изменений

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

drawStaticLayer(); // ← ДОБАВИТЬ ЭТУ СТРОКУ
animateFactLine();
runBrain();
renderAccountsUI();
renderGoals();
const goalTotal = parseNumber(goalInput.value || "0");

if (
!goalCompleted &&
goalTotal > 0 &&
accounts.main >= goalTotal
) {
goalCompleted = true;
setTimeout(fireCelebration, 120);
}

factInput.value = "";
factInput.blur();
};

  fake.style.display = "none";

}, 1100);

}, 6000);
}

/* ===== RESET ===== */
resetBtn.onclick = () => confirmReset.style.display = "block";
confirmNo.onclick = () => confirmReset.style.display = "none";
confirmYes.onclick = () => {
chosenPlan = null;
isInitialized = false;
lastCalc = {};
plannedMonthly = 0;

calcLock.style.display = "none";
confirmReset.style.display = "none";
lockTabs(true);

incomeInput.value = "";
expensesInput.value = "";
goalInput.value = "";

openScreen("calc", buttons[0]);
};

/* ===== PROFILE ===== */
const profileBtn = document.getElementById("profileBtn");

if (profileBtn) {
profileBtn.onclick = () => {
haptic("light");

// закрываем клавиатуру
document.activeElement?.blur();

// показываем профиль
screens.forEach(s => s.classList.remove("active"));
document.getElementById("screen-profile").classList.add("active");

// убираем активность навбара
buttons.forEach(b => b.classList.remove("active"));

// прячем нижний навбар (iOS-style)
bottomNav.style.transform = "translateY(140%)";
bottomNav.style.opacity = "0";
bottomNav.style.pointerEvents = "none";
};
}

/* ===== INPUT HINT LOGIC ===== */
document.querySelectorAll(".input-wrap input").forEach(input => {
const wrap = input.closest(".input-wrap");

input.addEventListener("focus", () => {
wrap.classList.remove("error", "shake");
wrap.classList.add("show-hint"); // ← ВОТ ЭТОГО НЕ ХВАТАЛО

if (input.dataset.placeholder) {
input.placeholder = input.dataset.placeholder;
}
});

input.addEventListener("input", () => {
wrap.classList.remove("error", "shake");
wrap.classList.remove("show-hint"); // ← прячем при вводе
});

input.addEventListener("blur", () => {
wrap.classList.remove("show-hint"); // ← прячем при уходе
});
});

/* ===== MICRO UX: HAPTIC ===== */
function haptic(type = "light") {
if (window.Telegram?.WebApp?.HapticFeedback) {
Telegram.WebApp.HapticFeedback.impactOccurred(type);
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

const total = factHistory
.filter(f => f.to === "main")
.reduce((s, f) => s + f.value, 0);

animateDotScale(1.8);

showFactTooltip({
value: total,
onHide: () => {
animateDotScale(1);
}
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
const old = adviceCard.querySelector(".brain-message");
if (old) old.remove();

const block = document.createElement("div");
block.className = "brain-message";

block.style.marginTop = "12px";
block.style.padding = "12px";
block.style.borderRadius = "12px";
block.style.background = "#0e0e0e";
block.style.border = "1px solid #222";
block.style.fontSize = "14px";
block.innerText = text;

adviceCard.appendChild(block);
}

function showFactTooltip({ value, onHide }) {
const old = adviceCard.querySelector(".fact-tooltip");
if (old) old.remove();

const block = document.createElement("div");
block.className = "fact-tooltip";

const date = new Date().toLocaleDateString("ru-RU");

block.innerHTML = `
<div class="fact-date">${date}</div>
<div class="fact-value">
Отложено: ${value.toLocaleString()} ₽
</div>
`;

adviceCard.appendChild(block);

setTimeout(() => {
block.classList.add("hide");

if (onHide) onHide();

setTimeout(() => {
block.remove();
activeFactDot = null;
}, 280);
}, 4000);
}

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

function renderGoals() {
if (!lastCalc.ok) return;

const titleEl = document.getElementById("goalTitle");
if (titleEl) {
titleEl.innerText = goalMeta.title;
}

function recalcPlanAfterGoalChange() {
const newGoal = parseNumber(goalInput.value || "0");
if (!newGoal || !plannedMonthly) return;

const remaining = Math.max(0, newGoal - accounts.main);
const newMonths = Math.ceil(remaining / plannedMonthly);

// обновляем текст над графиком
summaryMonths.innerText = newMonths;

// пересобираем график
drawStaticLayer();
animateFactLine();
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

if (newGoal > lastCalc.effectiveGoal + accounts.main) {
showBrainMessage("Цель увеличена — план автоматически пересчитан.");
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

lastFactPoint = { x, y };

factCtx.strokeStyle = "#2563eb";
factCtx.lineWidth = 2;

factCtx.beginPath();
factCtx.moveTo(pad, H - pad);
factCtx.lineTo(x, y);
factCtx.stroke();

if (progress === 1) {

const radius = 5 * dotScale;

// ===== PREMIUM FILL (вертикальный градиент) =====
const fillGrad = factCtx.createLinearGradient(
x, y - radius,
x, y + radius
);

fillGrad.addColorStop(0, "#60a5fa"); // свет сверху
fillGrad.addColorStop(1, "#2563eb"); // глубина снизу

factCtx.beginPath();
factCtx.arc(x, y, radius, 0, Math.PI * 2);
factCtx.fillStyle = fillGrad;
factCtx.fill();

// ===== Тонкий белый кант =====
factCtx.lineWidth = 1.2;
factCtx.strokeStyle = "rgba(255,255,255,0.45)";
factCtx.stroke();

// ===== Glow ТОЛЬКО если точка увеличена (нажата) =====
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