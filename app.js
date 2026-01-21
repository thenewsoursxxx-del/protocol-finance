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

buttons.forEach(btn => {
  btn.addEventListener("click", () => openScreen(btn.dataset.screen, btn));
});

/* ===== CALCULATE ===== */
calculateBtn.addEventListener("click", () => {
  const income = parseNumber(incomeInput.value);
  const expenses = parseNumber(expensesInput.value);
  const goal = parseNumber(goalInput.value);
  const pace = Number(paceInput.value) / 100;

  const free = income - expenses;
  if (free <= 0 || !goal) {
    tg?.HapticFeedback?.notificationOccurred("error");
    return;
  }

  const monthly = Math.round(free * pace);
  const months = Math.ceil(goal / monthly);

  adviceCard.innerText =
    `Protocol выбран темп ${paceInput.value}%.\n` +
    `Рекомендуется откладывать ${monthly} ₽ в месяц.\n` +
    `Цель будет достигнута примерно за ${months} мес.`;

  tg?.HapticFeedback?.impactOccurred("medium");
  openScreen("advice", buttons[1]);
});