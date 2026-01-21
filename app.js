const tg = window.Telegram?.WebApp;
tg?.expand();

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
const paceInput = document.getElementById("pace");
const percentLabel = document.getElementById("percentLabel");
const calculateBtn = document.getElementById("calculate");

const adviceCard = document.getElementById("adviceCard");
const loader = document.getElementById("loader");

const sheet = document.getElementById("sheet");
const sheetOverlay = document.getElementById("sheetOverlay");
const noBuffer = document.getElementById("noBuffer");
const withBuffer = document.getElementById("withBuffer");

const calcLock = document.getElementById("calcLock");
const lockText = document.getElementById("lockText");
const resetBtn = document.getElementById("resetPlan");

const confirmReset = document.getElementById("confirmReset");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");

/* ===== NAV ===== */
const screens = document.querySelectorAll(".screen");
const buttons = document.querySelectorAll(".nav-btn");
const indicator = document.querySelector(".nav-indicator");

/* ===== STATE ===== */
let lastCalc = {};
let chosenPlan = null;
let plannedMonthly = 0;
let isInitialized = false;

/* ===== INPUT FORMAT ===== */
[incomeInput, expensesInput, goalInput].forEach(input => {
input.addEventListener("input", e => {
const p = e.target.selectionStart;
const b = e.target.value.length;
e.target.value = formatNumber(e.target.value);
const a = e.target.value.length;
e.target.selectionEnd = p + (a - b);
});
});

/* ===== SLIDER ===== */
function updatePercent() {
percentLabel.innerText = paceInput.value + "%";
}
paceInput.addEventListener("input", updatePercent);
updatePercent();

/* ===== TAB LOCK ===== */
function lockTabs(lock) {
buttons.forEach((btn, i) => {
if (i === 0) return;
btn.style.opacity = lock ? "0.35" : "1";
btn.style.pointerEvents = lock ? "none" : "auto";
});
}
lockTabs(true);

/* ===== OPEN SCREEN ===== */
function openScreen(name, btn) {
if (!isInitialized && name !== "calc") return;

screens.forEach(s => s.classList.remove("active"));
document.getElementById("screen-" + name).classList.add("active");

buttons.forEach(b => b.classList.remove("active"));
if (btn) btn.classList.add("active");

if (btn) {
const r = btn.getBoundingClientRect();
const p = btn.parentElement.getBoundingClientRect();
indicator.style.transform = `translateX(${r.left - p.left}px)`;
}
}
buttons.forEach(btn => btn.onclick = () => openScreen(btn.dataset.screen, btn));

/* ===== BOTTOM SHEET ===== */
function openSheet() {
sheetOverlay.style.display = "block";
sheet.style.bottom = "0";
}
function closeSheet() {
sheet.style.bottom = "-100%";
sheetOverlay.style.display = "none";
}

/* ===== CALCULATE ===== */
calculateBtn.onclick = () => {
if (chosenPlan) return;

const income = parseNumber(incomeInput.value);
const expenses = parseNumber(expensesInput.value);
const goal = parseNumber(goalInput.value);
const pace = Number(paceInput.value) / 100;

if (!income || !goal || income - expenses <= 0) {
tg?.HapticFeedback?.notificationOccurred("error");
return;
}

lastCalc = { income, expenses, goal, pace };
openSheet();
};

/* ===== GRAPH HELPERS ===== */
let canvas, ctx, pad, w, h;

function drawAxes() {
ctx.strokeStyle = "#333";
ctx.beginPath();
ctx.moveTo(pad, pad);
ctx.lineTo(pad, canvas.height - pad);
ctx.lineTo(canvas.width - pad, canvas.height - pad);
ctx.stroke();
}
function drawPlan() {
ctx.strokeStyle = "#fff";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(pad, canvas.height - pad);
ctx.lineTo(canvas.width - pad, pad);
ctx.stroke();
}
function drawFact(progress) {
ctx.setLineDash([6,6]);
ctx.strokeStyle = "#777";
ctx.beginPath();
ctx.moveTo(pad, canvas.height - pad);
ctx.lineTo(pad + w * progress, canvas.height - pad - h * progress);
ctx.stroke();
ctx.setLineDash([]);
}
function animateFact(target) {
let current = 1;
function step() {
ctx.clearRect(0,0,canvas.width,canvas.height);
drawAxes();
drawPlan();
drawFact(current);
current += (target - current) * 0.06;
if (Math.abs(target - current) > 0.002) {
requestAnimationFrame(step);
}
}
step();
}

/* ===== STAGED FLOW ===== */
function protocolFlow(mode) {
chosenPlan = mode;
isInitialized = true;
lockTabs(false);

lockText.innerText =
`У вас уже выбран план: ${mode === "buffer" ? "с подушкой" : "без подушки"}`;
calcLock.style.display = "block";

openScreen("advice", buttons[1]);
loader.classList.remove("hidden");

const free = lastCalc.income - lastCalc.expenses;
plannedMonthly = Math.round(free * lastCalc.pace);
if (mode === "buffer") plannedMonthly = Math.round(plannedMonthly * 0.9);

adviceCard.innerText = "Protocol анализирует данные…";

setTimeout(() => {
adviceCard.innerText =
mode === "buffer"
? "Часть средств будет направляться в резерв для устойчивости плана."
: "Все средства будут направляться напрямую в цель.";
}, 2000);

setTimeout(() => {
adviceCard.innerText = "Готово.";
}, 4000);

setTimeout(() => {
loader.classList.add("hidden");

adviceCard.innerHTML = `
<div>План: ${plannedMonthly} ₽ в месяц</div>

<canvas id="chart" width="360" height="260" style="margin:16px 0"></canvas>

<div style="display:flex;gap:8px;align-items:center">
<input
id="factInput"
inputmode="numeric"
placeholder="Фактически отложено"
style="flex:1"
/>
<button id="applyFact" style="width:52px;height:52px;border-radius:50%">➜</button>
<button id="hideKb" style="width:52px;height:52px;border-radius:50%;display:none">⌄</button>
</div>

<div style="font-size:14px;opacity:.6;margin-top:8px">
Введите сумму, которую вы реально отложили.
Protocol сравнит её с планом и обновит график.
</div>
`;

canvas = document.getElementById("chart");
ctx = canvas.getContext("2d");

pad = 40;
w = canvas.width - pad * 2;
h = canvas.height - pad * 2;

drawAxes();
drawPlan();
drawFact(1);

const factInput = document.getElementById("factInput");
const applyBtn = document.getElementById("applyFact");
const hideKb = document.getElementById("hideKb");

factInput.addEventListener("input", e => {
e.target.value = formatNumber(e.target.value);
});

applyBtn.onclick = () => {
const fact = parseNumber(factInput.value);
if (!fact) return;
factInput.blur();
animateFact(Math.min(fact / plannedMonthly, 1.3));
};

hideKb.onclick = () => {
factInput.blur();
document.activeElement?.blur();
};

// 👇 управление клавиатурой
if (window.visualViewport) {
const baseHeight = window.visualViewport.height;
window.visualViewport.addEventListener("resize", () => {
const keyboardOpen = window.visualViewport.height < baseHeight - 100;
hideKb.style.display = keyboardOpen ? "block" : "none";
});
}

}, 6000);
}

/* ===== CHOICES ===== */
noBuffer.onclick = () => { closeSheet(); protocolFlow("direct"); };
withBuffer.onclick = () => { closeSheet(); protocolFlow("buffer"); };

/* ===== RESET (FIXED) ===== */
resetBtn.style.pointerEvents = "auto";
calcLock.style.pointerEvents = "none";
calcLock.querySelector(".lockCard").style.pointerEvents = "auto";

resetBtn.onclick = () => {
confirmReset.style.display = "block";
};
confirmNo.onclick = () => {
confirmReset.style.display = "none";
};
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