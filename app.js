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

const progressScreen = document.getElementById("screen-progress");
const calcLock = document.getElementById("calcLock");
const lockText = document.getElementById("lockText");

/* ===== STATE ===== */
let lastCalc = {};
let chosenPlan = null;

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

/* ===== NAV ===== */
const screens = document.querySelectorAll(".screen");
const buttons = document.querySelectorAll(".nav-btn");
const indicator = document.querySelector(".nav-indicator");

function openScreen(name, btn) {
screens.forEach(s => s.classList.remove("active"));
document.getElementById("screen-" + name).classList.add("active");

buttons.forEach(b => b.classList.remove("active"));
if (btn) btn.classList.add("active");

if (btn) {
const r = btn.getBoundingClientRect();
const p = btn.parentElement.getBoundingClientRect();
indicator.style.transform = `translateX(${r.left - p.left}px)`;
}

tg?.HapticFeedback?.impactOccurred("light");
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

/* ===== GRAPH ===== */
function drawGraph(monthly, goal) {
const months = Math.ceil(goal / monthly);

progressScreen.innerHTML = `
<h2>Прогресс</h2>
<canvas id="chart" width="360" height="260"></canvas>
`;

const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

const pad = 40;
const w = canvas.width - pad * 2;
const h = canvas.height - pad * 2;

const x = m => pad + (m / months) * w;
const y = v => canvas.height - pad - (v / goal) * h;

ctx.strokeStyle = "#333";
ctx.beginPath();
ctx.moveTo(pad, pad);
ctx.lineTo(pad, canvas.height - pad);
ctx.lineTo(canvas.width - pad, canvas.height - pad);
ctx.stroke();

ctx.strokeStyle = "#fff";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(x(0), y(0));
ctx.lineTo(x(months), y(goal));
ctx.stroke();
}

/* ===== STAGED FLOW ===== */
function protocolFlow(mode) {
chosenPlan = mode;
lockText.innerText =
`У вас уже выбран план: ${mode === "buffer" ? "с подушкой" : "без подушки"}`;
calcLock.style.display = "block";

openScreen("advice", buttons[1]);
loader.classList.remove("hidden");

const free = lastCalc.income - lastCalc.expenses;
let monthly = Math.round(free * lastCalc.pace);
if (mode === "buffer") monthly = Math.round(monthly * 0.9);

adviceCard.innerText = "Выбран режим.";

setTimeout(() => {
adviceCard.innerText = "Часть средств будет направляться в резерв.";
}, 2000);

setTimeout(() => {
adviceCard.innerText = "Готово.";
}, 4000);

setTimeout(() => {
loader.classList.add("hidden");
drawGraph(monthly, lastCalc.goal);

// 🔥 ВАЖНОЕ ИСПРАВЛЕНИЕ
openScreen("progress", buttons[2]);
}, 6000);
}

/* ===== CHOICES ===== */
noBuffer.onclick = () => { closeSheet(); protocolFlow("direct"); };
withBuffer.onclick = () => { closeSheet(); protocolFlow("buffer"); };