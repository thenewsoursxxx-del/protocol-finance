const tg = window.Telegram?.WebApp;
tg?.expand();

/* ===== HARD FIX ===== */
document.documentElement.style.height = "100%";
document.body.style.height = "100%";
document.body.style.overflow = "hidden";

/* ===== TAP ANYWHERE TO CLOSE KEYBOARD ===== */
document.addEventListener("touchstart", e => {
  if (!["input", "textarea"].includes(e.target.tagName.toLowerCase())) {
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

/* ===== NAV SWITCH ===== */
buttons.forEach(btn => {
  btn.onclick = () => {
    const name = btn.dataset.screen;
    if (!isInitialized && name !== "calc") return;

    screens.forEach(s => s.classList.remove("active"));
    document.getElementById("screen-" + name).classList.add("active");

    buttons.forEach(b => {
      b.classList.remove("active");
      b.querySelector(".nav-indicator")?.remove();
    });

    btn.classList.add("active");

    if (!btn.querySelector(".nav-indicator")) {
      const indicator = document.createElement("div");
      indicator.className = "nav-indicator";
      btn.prepend(indicator);
    }
  };
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
  if (chosenPlan) return;

  const income = parseNumber(incomeInput.value);
  const expenses = parseNumber(expensesInput.value);
  const goal = parseNumber(goalInput.value);
  const pace = Number(paceInput.value) / 100;

  if (!income || !goal || income - expenses <= 0) return;

  lastCalc = { income, expenses, goal, pace };
  openSheet();
};

/* ===== FLOW ===== */
function protocolFlow(mode) {
  chosenPlan = mode;
  isInitialized = true;

  lockText.innerText =
    `У вас уже выбран план: ${mode === "buffer" ? "с подушкой" : "без подушки"}`;
  calcLock.style.display = "block";

  document.querySelector('[data-screen="advice"]').click();

  loader.classList.remove("hidden");

  const free = lastCalc.income - lastCalc.expenses;
  plannedMonthly = Math.round(free * lastCalc.pace);
  if (mode === "buffer") plannedMonthly = Math.round(plannedMonthly * 0.9);

  adviceCard.innerText = "Protocol анализирует данные…";

  setTimeout(() => {
    adviceCard.innerText = "Готово.";
    loader.classList.add("hidden");
  }, 3000);
}

/* ===== CHOICES ===== */
noBuffer.onclick = () => { closeSheet(); protocolFlow("direct"); };
withBuffer.onclick = () => { closeSheet(); protocolFlow("buffer"); };

/* ===== RESET ===== */
resetBtn.onclick = () => confirmReset.style.display = "block";
confirmNo.onclick = () => confirmReset.style.display = "none";
confirmYes.onclick = () => location.reload();