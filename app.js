const tg = window.Telegram?.WebApp;
tg?.expand();

/* ===== CLOSE KEYBOARD ON TAP ===== */
document.addEventListener("touchstart", e => {
  if (e.target.tagName.toLowerCase() !== "input") {
    document.activeElement?.blur();
  }
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
const sideBtns = document.querySelectorAll(".side-btn");

/* ===== STATE ===== */
let lastCalc = {};
let initialized = false;

/* ===== INPUT FORMAT ===== */
[incomeInput, expensesInput, goalInput].forEach(input => {
  input.addEventListener("input", e => {
    e.target.value = formatNumber(e.target.value);
  });
});

/* ===== SLIDER ===== */
paceInput.oninput = () => percentLabel.innerText = paceInput.value + "%";

/* ===== OPEN SCREEN ===== */
function openScreen(name, btn) {
  if (!initialized && name !== "calc") return;

  screens.forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + name).classList.add("active");

  buttons.forEach(b => b.classList.remove("active"));
  btn?.classList.add("active");
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
  const income = parseNumber(incomeInput.value);
  const expenses = parseNumber(expensesInput.value);
  const goal = parseNumber(goalInput.value);

  if (!income || !goal || income - expenses <= 0) return;

  lastCalc = { income, expenses, goal };
  openSheet();
};

/* ===== PROTOCOL FLOW ===== */
function protocolFlow() {
  initialized = true;

  sideBtns.forEach(b => b.classList.remove("hidden"));

  closeSheet();
  openScreen("advice", buttons[1]);

  loader.classList.remove("hidden");
  adviceCard.innerText = "Protocol анализирует данные…";

  setTimeout(() => {
    loader.classList.add("hidden");
    adviceCard.innerText = "Готово.";
  }, 3000);
}

/* ===== CHOICES ===== */
noBuffer.onclick = protocolFlow;
withBuffer.onclick = protocolFlow;

/* ===== RESET ===== */
resetBtn.onclick = () => confirmReset.style.display = "block";
confirmNo.onclick = () => confirmReset.style.display = "none";
confirmYes.onclick = () => location.reload();