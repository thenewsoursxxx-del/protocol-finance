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
const calculateBtn = document.getElementById("calculate");
const adviceCard = document.getElementById("adviceCard");

const sheet = document.getElementById("sheet");
const sheetOverlay = document.getElementById("sheetOverlay");
const noBuffer = document.getElementById("noBuffer");
const withBuffer = document.getElementById("withBuffer");

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

/* ===== NAV (без изменений) ===== */
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
btn.onclick = () => openScreen(btn.dataset.screen, btn);
});

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
const income = parseNumber(incomeInput.value);
const expenses = parseNumber(expensesInput.value);
const goal = parseNumber(goalInput.value);

if (!income || !goal || income - expenses <= 0) {
tg?.HapticFeedback?.notificationOccurred("error");
return;
}

openSheet();
};

/* ===== CHOICE ===== */
noBuffer.onclick = () => {
adviceCard.innerText =
"Выбран режим без подушки.\nМаксимальная скорость, без резерва.";
closeSheet();
openScreen("advice", buttons[1]);
};

withBuffer.onclick = () => {
adviceCard.innerText =
"Выбран режим с подушкой.\nЧасть средств будет направляться в резерв для устойчивости плана.";
closeSheet();
openScreen("advice", buttons[1]);
};