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

const progressScreen = document.getElementById("screen-progress");

/* ===== INPUT FORMAT ===== */
[incomeInput, expensesInput, goalInput].forEach(input => {
input.addEventListener("input", e => {
const pos = e.target.selectionStart;
const before = e.target.value.length;
e.target.value = formatNumber(e.target.value);
const after = e.target.value.length;
e.target.selectionEnd = pos + (after - before);
});
});

/* ===== SLIDER ===== */
function updatePercent() {
percentLabel.innerText = paceInput.value + "%";
}
paceInput.addEventListener("input", updatePercent);
updatePercent();

/* ===== NAV (БЕЗ ИЗМЕНЕНИЙ) ===== */
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

buttons.forEach(btn => {
btn.addEventListener("click", () => openScreen(btn.dataset.screen, btn));
});

/* ===== GRAPH ===== */
function drawGraph(monthly, goal) {
progressScreen.innerHTML = `
<h2>Прогресс</h2>
<canvas id="chart" width="360" height="240"></canvas>
`;

const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

const months = Math.ceil(goal / monthly);
const padding = 32;
const w = canvas.width - padding * 2;
const h = canvas.height - padding * 2;

function x(i) {
return padding + (i / months) * w;
}
function y(v) {
return canvas.height - padding - (v / goal) * h;
}

// оси
ctx.strokeStyle = "#333";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(padding, padding);
ctx.lineTo(padding, canvas.height - padding);
ctx.lineTo(canvas.width - padding, canvas.height - padding);
ctx.stroke();

// PLAN
ctx.strokeStyle = "#fff";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(x(0), y(0));
ctx.lineTo(x(months), y(goal));
ctx.stroke();

// FACT (пока = план, пунктир)
ctx.setLineDash([6, 6]);
ctx.strokeStyle = "#777";
ctx.beginPath();
ctx.moveTo(x(0), y(0));
ctx.lineTo(x(months), y(goal));
ctx.stroke();
ctx.setLineDash([]);
}

/* ===== CALCULATE ===== */
calculateBtn.addEventListener("click", () => {
const income = parseNumber(incomeInput.value);
const expenses = parseNumber(expensesInput.value);
const goal = parseNumber(goalInput.value);
const pace = Number(paceInput.value) / 100;

if (!income || !goal) {
tg?.HapticFeedback?.notificationOccurred("error");
return;
}

const free = income - expenses;
if (free <= 0) {
adviceCard.innerText =
"Protocol: сейчас нет свободных средств. Сначала стабилизируй баланс.";
openScreen("advice", buttons[1]);
return;
}

const monthly = Math.round(free * pace);
const months = Math.ceil(goal / monthly);

adviceCard.innerText =
`Protocol построил план.\n\n` +
`Ежемесячно: ${monthly} ₽\n` +
`Срок: ~${months} мес.`;

drawGraph(monthly, goal);

tg?.HapticFeedback?.impactOccurred("medium");
openScreen("advice", buttons[1]);
});