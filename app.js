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
const screens=document.querySelectorAll(".screen");
const buttons=document.querySelectorAll(".nav-btn");
const indicator=document.querySelector(".nav-indicator");

function openScreen(name,btn){
  screens.forEach(s=>s.classList.remove("active"));
  document.getElementById("screen-"+name).classList.add("active");

  buttons.forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");

  const r=btn.getBoundingClientRect();
  const p=btn.parentElement.getBoundingClientRect();
  indicator.style.transform=`translateX(${r.left-p.left}px)`;

  tg?.HapticFeedback?.impactOccurred("light");
}

buttons.forEach(btn=>{
  btn.onclick=()=>openScreen(btn.dataset.screen,btn);
});

/* ===== PROTOCOL LOGIC ===== */
calculate.onclick=()=>{
  const income=parseNumber(income.value);
  const expenses=parseNumber(expenses.value);
  const goal=parseNumber(goal.value);

  const free=income-expenses;

  let text="";

  if (free<=0) {
    text="Protocol видит, что сейчас нет свободных средств. Сначала нужно стабилизировать баланс.";
  } else if (goal/free<=6) {
    text=`Цель достижима быстро. Protocol рекомендует откладывать ${free} ₽ и закрыть её за ~${Math.ceil(goal/free)} мес.`;
  } else if (goal/free<=18) {
    text=`Сбалансированный путь. Откладывая ${Math.round(free*0.6)} ₽ в месяц, цель будет достигнута без давления.`;
  } else {
    text=`Долгосрочная цель. Protocol предлагает начать с ${Math.round(free*0.4)} ₽ и сохранить гибкость.`;
  }

  adviceCard.innerText=text;
  tg?.HapticFeedback?.impactOccurred("medium");
  openScreen("advice",buttons[1]);
};

acceptPlan.onclick=()=>{
  tg?.HapticFeedback?.notificationOccurred("success");
  openScreen("progress",buttons[2]);
};