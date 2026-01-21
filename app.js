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

/* ===== INPUT FORMAT ===== */
["income","expenses","goal"].forEach(id=>{
  const i=document.getElementById(id);
  i.addEventListener("input",e=>{
    const p=e.target.selectionStart;
    const b=e.target.value.length;
    e.target.value=formatNumber(e.target.value);
    const a=e.target.value.length;
    e.target.selectionEnd=p+(a-b);
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
  btn.classList.add("active");

  const r = btn.getBoundingClientRect();
  const p = btn.parentElement.getBoundingClientRect();
  indicator.style.transform = `translateX(${r.left - p.left}px)`;

  tg?.HapticFeedback?.impactOccurred("light");
}

buttons.forEach(btn => {
  btn.onclick = () => openScreen(btn.dataset.screen, btn);
});

/* ===== PROTOCOL ===== */
calculate.onclick = () => {
  const income = parseNumber(income.value);
  const expenses = parseNumber(expenses.value);
  const goal = parseNumber(goal.value);

  const free = income - expenses;
  let text = "";

  if (free <= 0) {
    text = "Protocol: сначала нужно стабилизировать баланс.";
  } else {
    text = `Protocol рекомендует начать с ${Math.round(free * 0.5)} ₽ в месяц.`;
  }

  adviceCard.innerText = text;
  openScreen("advice", buttons[1]);
};