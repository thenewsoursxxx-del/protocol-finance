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
e.target.closest("#profileBtn")
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

if (btn) moveIndicator(btn);
}
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

const filtered = factHistory.filter(f =>
type === "reserve"
? f.to === "reserve"
: f.to === "main"
);

if (filtered.length === 0) {
list.innerHTML = `
<div class="card" style="opacity:.6;font-size:14px">
Операций пока нет
</div>
`;
} else {
filtered.forEach(f => {
list.innerHTML += `
<div class="card">
<div style="font-size:15px;font-weight:600">
+${f.value.toLocaleString()} ₽
</div>
<div style="font-size:13px;opacity:.6;margin-top:4px">
${new Date(f.date).toLocaleDateString("ru-RU")}
</div>
</div>
`;
});
}

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
// 🔥 СИНХРОНИЗАЦИЯ С УЖЕ НАКОПЛЕННЫМ
const initialSaved = parseNumber(savedInput?.value || "0");
accounts.main = 0;
accounts.reserve = 0;
// если есть уже накопленные средства — считаем это фактом
if (initialSaved > 0) {
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);

  factHistory = [{
    value: initialSaved,
    date: now,
    to: "main"
  }];
}
isInitialized = true;
renderAccountsUI();
lockTabs(false);

openScreen("advice", buttons[1]);
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

const explanation = ProtocolCore.explain(lastCalc);
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

<canvas
id="chart"
style="width:360px; height:260px; margin:16px 0;"
></canvas>

<div style="display:flex;gap:8px;align-items:center">
<input id="factInput" inputmode="numeric"
placeholder="Фактически отложено"
style="flex:1"/>
<button id="applyFact"
style="width:52px;height:52px;border-radius:50%">
➜
</button>
</div>
`;

canvas = document.getElementById("chart");
ctx = canvas.getContext("2d");
initChart();
animateFactLine();
showBottomNav();
updatePlanHeader();

const factInput = document.getElementById("factInput");
const applyBtn = document.getElementById("applyFact");

factInput.addEventListener("input", e => {
e.target.value = formatNumber(e.target.value);
});

applyBtn.onclick = () => {
const fact = parseNumber(factInput.value);
if (!fact) return;

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
/* ===== GRAPH (CLEAN & STABLE) ===== */

let canvas, ctx;
const pad = 40;
let factDots = [];
let activeFactDot = null;
let factAnimationProgress = 1;
let isFactAnimating = false;

function getFactGradient(ctx, W) {
const g = ctx.createLinearGradient(0, 0, W, 0);
g.addColorStop(0, "#1e3a8a"); // тёмный как у резерва
g.addColorStop(0.5, "#2563eb"); // фирменный синий
g.addColorStop(1, "#60a5fa"); // мягкий светлый
return g;
}

function initChart() {
canvas = document.getElementById("chart");
if (!canvas) return;

const dpr = window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();

canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;

ctx = canvas.getContext("2d");
ctx.scale(dpr, dpr);

drawChart();

canvas.addEventListener("click", e => {
const rect = canvas.getBoundingClientRect();
const x = e.clientX - rect.left;
const y = e.clientY - rect.top;

const hit = factDots.find(p => {
const dx = x - p.x;
const dy = y - p.y;
return Math.sqrt(dx * dx + dy * dy) < 10;
});

if (hit) {
activeFactDot = hit;
drawChart();
showFactTooltip(hit.data);
}
});
}

function drawChart() {
// ===== GROUP FACTS BY MONTH (SAFE) =====
const groupedFacts = {};
const start = new Date();

factHistory.forEach(f => {
const d = new Date(f.date);

const key = `${d.getFullYear()}-${d.getMonth()}`;

if (!groupedFacts[key]) {
groupedFacts[key] = {
date: d,
total: 0
};
}

groupedFacts[key].total += f.value;
});

// массив месяцев (1 месяц = 1 точка)
const groupedArray = Object.values(groupedFacts);
let lineColor = "#e5e7eb"; // светло-серый по умолчанию (нейтральный)

if (typeof factRatio === "number") {
if (factRatio < 0.7) lineColor = "#ef4444"; // красный
else if (factRatio < 0.95) lineColor = "#facc15"; // жёлтый
else lineColor = "#4ade80"; // зелёный
}
const dpr = window.devicePixelRatio || 1;
const W = canvas.width / dpr;
const H = canvas.height / dpr;

const startDate = new Date();
const months = lastCalc.months;
const monthly = plannedMonthly;

const points = buildPlanTimeline(startDate, monthly, months);

const plannedMax = points[points.length - 1].value;
const factTotal = factHistory.reduce((s, f) => s + f.value, 0);

const minValue = 0;
const maxValue = Math.max(plannedMax, accounts.main, factTotal, 1);

ctx.clearRect(0, 0, canvas.width, canvas.height);
// ===== GRID =====
const gridX = 4; // вертикальные деления (месяцы)
const gridY = 5; // горизонтальные деления (деньги)

ctx.strokeStyle = "rgba(255,255,255,0.06)";
ctx.lineWidth = 1;

// горизонтальная сетка
for (let i = 1; i < gridY; i++) {
  const y = pad + (i / gridY) * (H - pad * 2);
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(W - pad, y);
  ctx.stroke();
}

// вертикальная сетка
for (let i = 1; i < gridX; i++) {
  const x = pad + (i / gridX) * (W - pad * 2);
  ctx.beginPath();
  ctx.moveTo(x, pad);
  ctx.lineTo(x, H - pad);
  ctx.stroke();
}

// ОСИ
ctx.strokeStyle = "#333";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(pad, pad);
ctx.lineTo(pad, H - pad);
ctx.lineTo(W - pad, H - pad);
ctx.stroke();

// ЛИНИЯ
ctx.strokeStyle = lineColor;
ctx.lineWidth = 2;
ctx.beginPath();

points.forEach((p, i) => {
const x = pad + (i / (points.length - 1)) * (W - pad * 2);
const y =
H -
pad -
((p.value - minValue) / (maxValue - minValue)) * (H - pad * 2);
if (i === 0) ctx.moveTo(x, y);
else ctx.lineTo(x, y);
});

ctx.stroke();
ctx.setLineDash([]);


// ===== ЛИНИЯ ФАКТА =====
if (factHistory.length > 0 || accounts.main > 0) {

  const factGradient = getFactGradient(ctx, W);
  ctx.strokeStyle = factGradient;
  ctx.lineWidth = 1.6;
  ctx.beginPath();

  let cumulative = 0;

  groupedArray.forEach((f, i) => {

    cumulative += f.total * factAnimationProgress;

    const progress = Math.max(
      (i + 1) / (points.length - 1),
      0.03
    );

    const x = pad + progress * (W - pad * 2);

    const y =
      H - pad -
      ((cumulative + accounts.main - minValue) /
        (maxValue - minValue)) *
        (H - pad * 2);

    if (i === 0) {

      const startY =
        H - pad -
        ((accounts.main - minValue) /
          (maxValue - minValue)) *
          (H - pad * 2);

      ctx.moveTo(pad, startY);
    }

    ctx.lineTo(x, y);

  });

  ctx.stroke();
}

// ===== ТОЧКИ ФАКТА =====
if (factHistory.length > 0 && factAnimationProgress > 0.95) {
const factGradient = ctx.createLinearGradient(pad, 0, W - pad, 0);
factGradient.addColorStop(0, "#1e3a8a");
factGradient.addColorStop(0.5, "#2563eb");
factGradient.addColorStop(1, "#60a5fa");

ctx.fillStyle = factGradient;

let cumulative = 0;

factDots = [];
groupedArray.forEach((f, i) => {
cumulative += f.total;

const progress = Math.max(
(i + 1) / (points.length - 1),
0.03
);

const x = pad + progress * (W - pad * 2);
const y =
H - pad -
((cumulative + accounts.main - minValue) / (maxValue - minValue)) * (H - pad * 2);

// обычная точка
ctx.beginPath();
ctx.arc(x, y, 3.5, 0, Math.PI * 2);
ctx.fill();

// 🌟 ВНЕШНЕЕ СВЕТЯЩЕЕСЯ КОЛЬЦО ДЛЯ АКТИВНОЙ ТОЧКИ
if (activeFactDot && activeFactDot.x === x && activeFactDot.y === y) {
ctx.beginPath();
ctx.arc(x, y, 8, 0, Math.PI * 2);
ctx.strokeStyle = "rgba(96,165,250,0.45)";
ctx.lineWidth = 2;
ctx.stroke();

ctx.beginPath();
ctx.arc(x, y, 12, 0, Math.PI * 2);
ctx.strokeStyle = "rgba(96,165,250,0.18)";
ctx.lineWidth = 2;
ctx.stroke();
}

factDots.push({
x,
y,
data: {
value: f.total,
date: f.date
}
});
});
}

// ПОДПИСИ X
ctx.fillStyle = "#9a9a9a";
ctx.font = "13px -apple-system, BlinkMacSystemFont, system-ui";
ctx.textAlign = "center";
ctx.textBaseline = "top";

const step = Math.max(1, Math.floor(points.length / 4));

points.forEach((_, i) => {
if (i % step !== 0 && i !== points.length - 1) return;
const x = pad + (i / (points.length - 1)) * (W - pad * 2);
ctx.fillText(i.toString(), x, H - pad + 6);
});
}

function addMonths(date, n) {
const d = new Date(date);
d.setMonth(d.getMonth() + n);
return d;
}

function buildPlanTimeline(startDate, monthlyAmount, months) {
const points = [];

let total = accounts.main; // стартуем от текущего баланса

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

function showFactTooltip(f) {
const old = adviceCard.querySelector(".fact-tooltip");
if (old) old.remove();

const block = document.createElement("div");
block.className = "fact-tooltip";

const date = new Date().toLocaleDateString("ru-RU");

block.innerHTML = `
<div class="fact-date">${date}</div>
<div class="fact-value">
Отложено: ${f.value.toLocaleString()} ₽
</div>
`;

adviceCard.appendChild(block);

setTimeout(() => {
block.classList.add("hide");

setTimeout(() => {
block.remove();
activeFactDot = null;
drawChart();
}, 280); // ← совпадает с CSS transition
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

// перерисовываем график
drawChart();
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

showGoalCompleteMessage();
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
goalEditorSheet.style.bottom = "0";
};
}

goalEditorOverlay.onclick = () => {
goalEditorSheet.style.bottom = "-100%";
goalEditorOverlay.style.display = "none";
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
goalEditorSheet.style.bottom = "-100%";
goalEditorOverlay.style.display = "none";
goalEditHint.classList.remove("show");

// 5️⃣ пересчитываем UI
recalcPlanAfterGoalChange();
renderGoals();
updatePlanHeader();
renderAccountsUI();
drawChart();
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

// пересобираем график
drawChart();
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

function animateFactLine() {
  if (!factHistory.length) return;

  factAnimationProgress = 0;
  isFactAnimating = true;

  const duration = 800; // мс
  const start = performance.now();

  function frame(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);

    // easeOutCubic
    factAnimationProgress = 1 - Math.pow(1 - progress, 3);

    drawChart();

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      isFactAnimating = false;
    }
  }

  requestAnimationFrame(frame);
}