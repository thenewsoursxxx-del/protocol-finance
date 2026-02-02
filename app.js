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
// ÑÐ½ÑÑÑ Ð°ÐºÑÐ¸Ð²Ð½Ð¾ÑÑÑ ÑÐ¾ Ð²ÑÐµÑ
modeButtons.forEach(b => b.classList.remove("active"));

// Ð°ÐºÑÐ¸Ð²Ð¸ÑÐ¾Ð²Ð°ÑÑ ÑÐµÐºÑÑÑÑ
btn.classList.add("active");

// ÑÐ¾ÑÑÐ°Ð½Ð¸ÑÑ ÑÐµÐ¶Ð¸Ð¼
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
// â ÑÐºÑÑÐ²Ð°ÐµÐ¼ bottom-nav Ð¿ÑÐ¸ ÑÑÐ°ÑÑÐµ (ÑÐºÑÐ°Ð½ ÑÐ°ÑÑÑÑÐ°)
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

/* ===== STATE ===== */
let lastCalc = {};
let chosenPlan = null;
let plannedMonthly = 0;
let factRatio = null;
let factHistory = [];
let isInitialized = false;
let saveMode = "calm";
let selectedScenario = null;
let lastScreenBeforeProfile = "calc";
let lastNavBtnBeforeProfile = buttons[0];

/* ===== PACE SELECT ===== */


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

// Ð·Ð°Ð¿Ð¾Ð¼Ð¸Ð½Ð°ÐµÐ¼, Ð¾ÑÐºÑÐ´Ð° Ð¿ÑÐ¸ÑÐ»Ð¸
lastScreenBeforeProfile = btn.dataset.screen;
lastNavBtnBeforeProfile = btn;

openScreen(btn.dataset.screen, btn);
};
});

const profileBack = document.getElementById("profileBack");

if (profileBack) {
profileBack.onclick = () => {
haptic("light");

openScreen(lastScreenBeforeProfile, lastNavBtnBeforeProfile);

// nav Ð¿Ð¾ÐºÐ°Ð·ÑÐ²Ð°ÐµÐ¼ Ð¢ÐÐÐ¬ÐÐ ÐµÑÐ»Ð¸ ÑÑÐ¾ Ð½Ðµ calc
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
ÐÐ¾Ð·Ð¼Ð¾Ð¶Ð½ÑÐµ Ð²Ð°ÑÐ¸Ð°Ð½ÑÑ:
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
const bufferRate = 0.1; // 10% Ð² Ð¿Ð¾Ð´ÑÑÐºÑ

const scenarios = [
{
id: "direct",
title: "ÐÑÑ Ð² ÑÐµÐ»Ñ",
toGoal: baseMonthly,
toBuffer: 0,
months: lastCalc.months,
risk: "ÐÑÑÐµ"
},
{
id: "buffer",
title: "Ð¡ ÑÐµÐ·ÐµÑÐ²Ð¾Ð¼",
toGoal: Math.round(baseMonthly * (1 - bufferRate)),
toBuffer: Math.round(baseMonthly * bufferRate),
months: Math.ceil(
lastCalc.effectiveGoal /
Math.round(baseMonthly * (1 - bufferRate))
),
risk: "ÐÐ¸Ð¶Ðµ"
}
];

const scenariosHTML = scenarios.map(s => `
<div class="card scenario-card" data-id="${s.id}">
<div style="color:#fff;font-weight:600;font-size:19px;margin-bottom:12px">
${s.title}
</div>

Ð ÑÐµÐ»Ñ: ${s.toGoal.toLocaleString()} â½ / Ð¼ÐµÑ<br>
${s.toBuffer ? `Ð ÑÐµÐ·ÐµÑÐ²: ${s.toBuffer.toLocaleString()} â½<br>` : ""}
Ð¡ÑÐ¾Ðº: ~${s.months} Ð¼ÐµÑ<br>

<span style="opacity:.6">Ð Ð¸ÑÐº: ${s.risk}</span>

${
s.id === "buffer"
? `
<div class="reserve-info">
<b>Ð ÐµÐ·ÐµÑÐ²</b><br>
Ð­ÑÐ¾ Ð²Ð°ÑÐ° Ð¿Ð¾Ð´ÑÑÐºÐ° Ð±ÐµÐ·Ð¾Ð¿Ð°ÑÐ½Ð¾ÑÑÐ¸.
Ð­ÑÐ¸ ÑÑÐµÐ´ÑÑÐ²Ð° Ð¼Ð¾Ð¶Ð½Ð¾ Ð¾ÑÐºÐ»Ð°Ð´ÑÐ²Ð°ÑÑ Ð½Ð° Ð¾ÑÐ´ÐµÐ»ÑÐ½ÑÐ¹ Ð½Ð°ÐºÐ¾Ð¿Ð¸ÑÐµÐ»ÑÐ½ÑÐ¹
Ð¸Ð»Ð¸ Ð¸Ð½Ð²ÐµÑÑÐ¸ÑÐ¸Ð¾Ð½Ð½ÑÐ¹ ÑÑÑÑ.<br><br>
Ð ÐµÐ·ÐµÑÐ² Ð·Ð°ÑÐ¸ÑÐ°ÐµÑ Ð¾Ñ Ð½ÐµÐ¿ÑÐµÐ´Ð²Ð¸Ð´ÐµÐ½Ð½ÑÑ ÑÐ°ÑÑÐ¾Ð´Ð¾Ð²
Ð¸ ÑÐ½Ð¸Ð¶Ð°ÐµÑ ÑÐ¸ÑÐº ÑÑÑÐ²Ð° ÑÐµÐ»Ð¸.
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

isInitialized = true; // ÑÐ°Ð·ÑÐµÑÐ°ÐµÐ¼ Ð¿ÐµÑÐµÑÐ¾Ð´Ñ
openScreen("advice", null); // Ð¿Ð¾ÐºÐ°Ð·ÑÐ²Ð°ÐµÐ¼ ÑÐºÑÐ°Ð½ Ñ ÐºÐ°ÑÑÐ¾ÑÐºÐ°Ð¼Ð¸

// Ð¿Ð¾ÐºÐ°Ð·Ð°ÑÑ summary
planSummary.style.display = "block";

// Ð·Ð°Ð¿Ð¾Ð»Ð½Ð¸ÑÑ Ð´Ð°Ð½Ð½ÑÐµ
summaryMonthly.innerText = lastCalc.monthlySave.toLocaleString();
summaryMonths.innerText = lastCalc.months;
summaryMode.innerText =
saveMode === "calm" ? "Ð¡Ð¿Ð¾ÐºÐ¾Ð¹Ð½ÑÐ¹"
: saveMode === "normal" ? "Ð£Ð¼ÐµÑÐµÐ½Ð½ÑÐ¹"
: "ÐÐ³ÑÐµÑÑÐ¸Ð²Ð½ÑÐ¹";

// ÑÐ¿ÑÑÑÐ°ÑÑ ÑÐ¾ÑÐ¼Ñ
document.querySelectorAll(
"#screen-calc label, #screen-calc .input-wrap, .mode-buttons, #calculate"
).forEach(el => el.style.display = "none");

};

/* ===== EDIT PLAN ===== */
editPlanBtn.onclick = () => {
haptic("light");

// Ð¿Ð¾ÐºÐ°Ð·Ð°ÑÑ ÑÐ¾ÑÐ¼Ñ Ð¾Ð±ÑÐ°ÑÐ½Ð¾
document.querySelectorAll(
"#screen-calc label, #screen-calc .input-wrap, .mode-buttons, #calculate"
).forEach(el => el.style.display = "");

// ÑÐ¿ÑÑÑÐ°ÑÑ summary
planSummary.style.display = "none";
};

/* ===== TIME HELPERS ===== */

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

/* ===== STAGED FLOW ===== */
function protocolFlow(mode) {
// Ð²Ð¾Ð·Ð²ÑÐ°ÑÐ°ÐµÐ¼ bottom nav Ð¿Ð¾ÑÐ»Ðµ ÑÑÐ°ÑÑÐ° Ð¿Ð»Ð°Ð½Ð°
bottomNav.style.opacity = "1";
bottomNav.style.pointerEvents = "auto";
bottomNav.style.transform = "translateY(0)";
chosenPlan = mode;
isInitialized = true;
lockTabs(false);


openScreen("advice", buttons[1]);
loader.classList.remove("hidden");

plannedMonthly = lastCalc.monthlySave;

if (mode === "buffer") plannedMonthly = Math.round(plannedMonthly * 0.9);

adviceCard.innerText = "Protocol Ð°Ð½Ð°Ð»Ð¸Ð·Ð¸ÑÑÐµÑ Ð´Ð°Ð½Ð½ÑÐµâ¦";

setTimeout(() => {
adviceCard.innerText =
mode === "buffer"
? "Ð§Ð°ÑÑÑ ÑÑÐµÐ´ÑÑÐ² Ð±ÑÐ´ÐµÑ Ð½Ð°Ð¿ÑÐ°Ð²Ð»ÑÑÑÑÑ Ð² ÑÐµÐ·ÐµÑÐ²."
: "ÐÑÐµ ÑÑÐµÐ´ÑÑÐ²Ð° Ð¸Ð´ÑÑ Ð½Ð°Ð¿ÑÑÐ¼ÑÑ Ð² ÑÐµÐ»Ñ.";
}, 2000);

setTimeout(() => {
adviceCard.innerText = "ÐÐ¾ÑÐ¾Ð²Ð¾.";
}, 4000);

setTimeout(() => {
loader.classList.add("hidden");

const explanation = ProtocolCore.explain(lastCalc);
const advice = ProtocolCore.buildAdvice(lastCalc);

adviceCard.innerHTML = `
<div style="font-size:16px;font-weight:600">
ÐÐ»Ð°Ð½: ${plannedMonthly.toLocaleString()} â½ / Ð¼ÐµÑÑÑ
</div>

<div style="
margin-top:8px;
font-size:14px;
line-height:1.4;
opacity:0.75;
">
${explanation.replace(/\n/g, "<br>")}
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
placeholder="Ð¤Ð°ÐºÑÐ¸ÑÐµÑÐºÐ¸ Ð¾ÑÐ»Ð¾Ð¶ÐµÐ½Ð¾"
style="flex:1"/>
<button id="applyFact"
style="width:52px;height:52px;border-radius:50%">
â
</button>
</div>
`;

canvas = document.getElementById("chart");
ctx = canvas.getContext("2d");
initChart();

const factInput = document.getElementById("factInput");
const applyBtn = document.getElementById("applyFact");

factInput.addEventListener("input", e => {
e.target.value = formatNumber(e.target.value);
});

applyBtn.onclick = () => {
const fact = parseNumber(factInput.value);
if (!fact) return;

const now = new Date();
now.setDate(1);
now.setHours(0, 0, 0, 0);

factHistory.push({
value: fact,
date: now
});

// ð¥ ÐÐÐÐÐÐ
factRatio = fact / plannedMonthly;

drawChart();
runBrain();
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

// Ð·Ð°ÐºÑÑÐ²Ð°ÐµÐ¼ ÐºÐ»Ð°Ð²Ð¸Ð°ÑÑÑÑ
document.activeElement?.blur();

// Ð¿Ð¾ÐºÐ°Ð·ÑÐ²Ð°ÐµÐ¼ Ð¿ÑÐ¾ÑÐ¸Ð»Ñ
screens.forEach(s => s.classList.remove("active"));
document.getElementById("screen-profile").classList.add("active");

// ÑÐ±Ð¸ÑÐ°ÐµÐ¼ Ð°ÐºÑÐ¸Ð²Ð½Ð¾ÑÑÑ Ð½Ð°Ð²Ð±Ð°ÑÐ°
buttons.forEach(b => b.classList.remove("active"));

// Ð¿ÑÑÑÐµÐ¼ Ð½Ð¸Ð¶Ð½Ð¸Ð¹ Ð½Ð°Ð²Ð±Ð°Ñ (iOS-style)
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
wrap.classList.add("show-hint"); // â ÐÐÐ¢ Ð­Ð¢ÐÐÐ ÐÐ Ð¥ÐÐÐ¢ÐÐÐ

if (input.dataset.placeholder) {
input.placeholder = input.dataset.placeholder;
}
});

input.addEventListener("input", () => {
wrap.classList.remove("error", "shake");
wrap.classList.remove("show-hint"); // â Ð¿ÑÑÑÐµÐ¼ Ð¿ÑÐ¸ Ð²Ð²Ð¾Ð´Ðµ
});

input.addEventListener("blur", () => {
wrap.classList.remove("show-hint"); // â Ð¿ÑÑÑÐµÐ¼ Ð¿ÑÐ¸ ÑÑÐ¾Ð´Ðµ
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

// Ð²ÐµÑÑÐ½ÑÑ Ð¸ÐºÐ¾Ð½ÐºÐ°
const topAvatar = document.querySelector("#profileBtn .avatar");

// Ð¿ÑÐ¾ÑÐ¸Ð»Ñ
const profileAvatar = document.querySelector(".profile-avatar");
const profileName = document.querySelector(".profile-name");

if (tgUser) {
const fullName =
tgUser.first_name + (tgUser.last_name ? " " + tgUser.last_name : "");

// Ð¸Ð¼Ñ Ð² Ð¿ÑÐ¾ÑÐ¸Ð»Ðµ
if (profileName) {
profileName.innerText = fullName;
}

// ÐµÑÐ»Ð¸ ÐµÑÑÑ ÑÐ¾ÑÐ¾
if (tgUser.photo_url) {
const img = `
<img src="${tgUser.photo_url}"
style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />
`;

// Ð²ÐµÑÑÐ½ÑÑ Ð¸ÐºÐ¾Ð½ÐºÐ°
if (topAvatar) topAvatar.innerHTML = img;

// Ð°Ð²Ð°ÑÐ°Ñ Ð² Ð¿ÑÐ¾ÑÐ¸Ð»Ðµ
if (profileAvatar) profileAvatar.innerHTML = img;
}
}
function validateRequired(input) {
const wrap = input.closest(".input-wrap");
const value = parseNumber(input.value || "0");

if (!value) {
wrap.classList.add("error");

// Ð¿ÐµÑÐµÐ·Ð°Ð¿ÑÑÐº shake
wrap.classList.remove("shake");
void wrap.offsetWidth; // force reflow (ÐÐÐÐÐ)
wrap.classList.add("shake");

// placeholder
if (!input.dataset.placeholder) {
input.dataset.placeholder = input.placeholder;
}

input.value = "";
input.placeholder = "ÐÐ±ÑÐ·Ð°ÑÐµÐ»ÑÐ½Ð¾Ðµ Ð¿Ð¾Ð»Ðµ";

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

// Ð¼Ð°ÑÑÐ¸Ð² Ð¼ÐµÑÑÑÐµÐ² (1 Ð¼ÐµÑÑÑ = 1 ÑÐ¾ÑÐºÐ°)
const groupedArray = Object.values(groupedFacts);
let lineColor = "#e5e7eb"; // ÑÐ²ÐµÑÐ»Ð¾-ÑÐµÑÑÐ¹ Ð¿Ð¾ ÑÐ¼Ð¾Ð»ÑÐ°Ð½Ð¸Ñ (Ð½ÐµÐ¹ÑÑÐ°Ð»ÑÐ½ÑÐ¹)

if (typeof factRatio === "number") {
if (factRatio < 0.7) lineColor = "#ef4444"; // ÐºÑÐ°ÑÐ½ÑÐ¹
else if (factRatio < 0.95) lineColor = "#facc15"; // Ð¶ÑÐ»ÑÑÐ¹
else lineColor = "#4ade80"; // Ð·ÐµÐ»ÑÐ½ÑÐ¹
}

if (typeof factRatio === "number") {
if (factRatio < 0.7) lineColor = "#ef4444"; // ÐºÑÐ°ÑÐ½ÑÐ¹
else if (factRatio < 0.95) lineColor = "#facc15"; // Ð¶ÑÐ»ÑÑÐ¹
}
const dpr = window.devicePixelRatio || 1;
const W = canvas.width / dpr;
const H = canvas.height / dpr;

const startDate = new Date();
const months = lastCalc.months;
const monthly = plannedMonthly;

const points = buildPlanTimeline(startDate, monthly, months);
const maxValue = points[points.length - 1].value || 1;

// ===== Ð¤ÐÐÐ¢ÐÐ§ÐÐ¡ÐÐÐ Ð¢ÐÐ§ÐÐ (ÐÐ¡ÐÐÐÐ Ð¡ 0) =====
const factPoints = [
{ month: 0, value: 0 }
];

let acc = 0;
groupedArray.forEach((f, i) => {
acc += f.total;
factPoints.push({
month: i + 1,
value: acc
});
});

ctx.clearRect(0, 0, canvas.width, canvas.height);

// ÐÐ¡Ð
ctx.strokeStyle = "#333";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(pad, pad);
ctx.lineTo(pad, H - pad);
ctx.lineTo(W - pad, H - pad);
ctx.stroke();

// ÐÐÐÐÐ¯
ctx.strokeStyle = lineColor;
ctx.lineWidth = 2;
ctx.beginPath();

points.forEach((p, i) => {
const x = pad + (i / (points.length - 1)) * (W - pad * 2);
const y = H - pad - (p.value / maxValue) * (H - pad * 2);
if (i === 0) ctx.moveTo(x, y);
else ctx.lineTo(x, y);
});

ctx.stroke();
ctx.setLineDash([]);

// ===== ÐÐÐÐÐ¯ Ð¤ÐÐÐ¢Ð =====
if (factHistory.length > 0) {
ctx.strokeStyle = "rgba(96,165,250,0.9)"; // ÑÐ¿Ð¾ÐºÐ¾Ð¹Ð½ÑÐ¹ ÑÐ¸Ð½Ð¸Ð¹
ctx.lineWidth = 1.6;

ctx.beginPath();

let cumulative = 0;

groupedArray.forEach((f, i) => {
cumulative += f.total;

const progress = Math.max(
(i + 1) / (points.length - 1),
0.03 // ð¥ ÐÐÐÐÐÐÐÐ¬ÐÐ«Ð Ð¡ÐÐÐÐ â Ð»Ð¸Ð½Ð¸Ñ Ð¿Ð¾ÑÐ²Ð»ÑÐµÑÑÑ ÑÑÐ°Ð·Ñ
);

const x = pad + progress * (W - pad * 2);

const y =
H -
pad -
(cumulative / maxValue) * (H - pad * 2);

if (i === 0) {
ctx.moveTo(pad, H - pad); // ÑÑÐ°ÑÑ Ñ Ð½ÑÐ»Ñ
ctx.lineTo(x, y); // â Ð¼Ð¸ÐºÑÐ¾-Ð»Ð¸Ð½Ð¸Ñ ÑÐ¶Ðµ Ð² 1-Ð¹ Ð¼ÐµÑÑÑ
} else {
ctx.lineTo(x, y);
}
});

ctx.stroke();
}

// ===== Ð¢ÐÐ§ÐÐ Ð¤ÐÐÐ¢Ð =====
if (factHistory.length > 0) {
ctx.fillStyle = "#60a5fa";

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
(cumulative / maxValue) * (H - pad * 2);

// Ð¾Ð±ÑÑÐ½Ð°Ñ ÑÐ¾ÑÐºÐ°
ctx.beginPath();
ctx.arc(x, y, 3.5, 0, Math.PI * 2);
ctx.fill();

// ðµ ÐÐÐÐÐÐÐ Ð¢ÐÐÐ¬ÐÐ ÐÐ¡ÐÐ Ð­Ð¢Ð ÐÐÐ¢ÐÐÐÐÐ¯ Ð¢ÐÐ§ÐÐ
if (activeFactDot && activeFactDot.x === x && activeFactDot.y === y) {
ctx.strokeStyle = "#60a5fa";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(x, y, 7, 0, Math.PI * 2);
ctx.stroke();
}
// ð¥ Ð¿Ð¾Ð´ÑÐ²ÐµÑÐºÐ° Ð°ÐºÑÐ¸Ð²Ð½Ð¾Ð¹ ÑÐ¾ÑÐºÐ¸
if (
activeFactDot &&
activeFactDot.x === x &&
activeFactDot.y === y
) {
ctx.beginPath();
ctx.arc(x, y, 8, 0, Math.PI * 2);
ctx.strokeStyle = "rgba(96,165,250,0.6)";
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

// ÐÐÐÐÐÐ¡Ð X
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
let total = 0;
for (let i = 0; i <= months; i++) {
points.push({ date: addMonths(startDate, i), value: total });
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
const monthsPassed = factHistory.length;
if (!monthsPassed) return;

const planned = plannedMonthly * monthsPassed;
const actual = factHistory.reduce((s, x) => s + x.value, 0);

const diff = actual - planned;

let text = "";

if (diff >= 0) {
text = "Ð¢Ñ Ð¸Ð´ÑÑÑ Ð¿Ð¾ Ð¿Ð»Ð°Ð½Ñ Ð¸Ð»Ð¸ Ð»ÑÑÑÐµ. ÐÑÑ Ð¿Ð¾Ð´ ÐºÐ¾Ð½ÑÑÐ¾Ð»ÐµÐ¼.";
} else if (diff > -planned * 0.1) {
text = "ÐÑÑÑ Ð½ÐµÐ±Ð¾Ð»ÑÑÐ¾Ðµ Ð¾ÑÑÑÐ°Ð²Ð°Ð½Ð¸Ðµ. ÐÐ¾ÐºÐ° Ð½Ðµ ÐºÑÐ¸ÑÐ¸ÑÐ½Ð¾.";
} else {
text = "Ð¢Ñ Ð·Ð°Ð¼ÐµÑÐ½Ð¾ Ð¾ÑÑÑÐ°ÑÑÑ Ð¾Ñ Ð¿Ð»Ð°Ð½Ð°. Ð¡ÑÐ¾Ð¸Ñ Ð¿ÐµÑÐµÑÐ¼Ð¾ÑÑÐµÑÑ ÑÑÑÐ°ÑÐµÐ³Ð¸Ñ.";
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

block.style.marginTop = "10px";
block.style.padding = "10px 12px";
block.style.borderRadius = "12px";
block.style.background = "#0e0e0e";
block.style.border = "1px solid #222";
block.style.fontSize = "14px";

block.innerHTML = `
<div style="opacity:.6">${date}</div>
<div style="margin-top:4px;font-weight:600">
ÐÑÐ»Ð¾Ð¶ÐµÐ½Ð¾: ${f.value.toLocaleString()} â½
</div>
`;

adviceCard.appendChild(block);

setTimeout(() => {
block.remove();
activeFactDot = null;
drawChart();
}, 4000);
}