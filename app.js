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

/* ===== NAV ===== */
const screens = document.querySelectorAll(".screen");
const buttons = document.querySelectorAll(".nav-btn");
const indicator = document.querySelector(".nav-indicator");

function openScreen(name, btn) {
  screens.forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + name).classList.add("active");

  buttons.forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  if (btn && indicator) {
    const r = btn.getBoundingClientRect();
    const p = btn.parentElement.getBoundingClientRect();
    indicator.style.transform = `translateX(${r.left - p.left}px)`;
  }

  tg?.HapticFeedback?.impactOccurred("light");
}

buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    openScreen(btn.dataset.screen, btn);
  });
});

/* ===== CALCULATE ===== */
calculateBtn.addEventListener("click", () => {
  const income = parseNumber(incomeInput.value);
  const expenses = parseNumber(expensesInput.value);
  const goal = parseNumber(goalInput.value);

  const free = income - expenses;

  let text = "";

  if (!income || !goal) {
    tg?.HapticFeedback?.notificationOccurred("error");
    return;
  }

  if (free <= 0) {
    text = "Protocol: сейчас нет свободных средств. Сначала стабилизируй баланс.";
  } else if (goal / free <= 6) {
    text = `Protocol: цель достижима быстро. Можно закрыть её за ~${Math.ceil(goal / free)} мес.`;
  } else if (goal / free <= 18) {
    text = `Protocol: оптимальный темп — ${Math.round(free * 0.6)} ₽ в месяц без давления.`;
  } else {
    text = `Protocol: долгосрочная цель. Рекомендуется начать с ${Math.round(free * 0.4)} ₽.`;
  }

  adviceCard.innerText = text;

  tg?.HapticFeedback?.impactOccurred("medium");
  openScreen("advice", buttons[1]);
});