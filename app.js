const tg = window.Telegram?.WebApp;
tg?.expand();

/* ===== FORMAT ===== */
function formatNumber(value) {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function parseNumber(value) {
  return Number(value.replace(/\./g, ""));
}

/* ===== INPUT FORMAT ===== */
["income","expenses","saving"].forEach(id=>{
  const input=document.getElementById(id);
  input.addEventListener("input",e=>{
    const pos=e.target.selectionStart;
    const before=e.target.value.length;
    e.target.value=formatNumber(e.target.value);
    const after=e.target.value.length;
    e.target.selectionEnd=pos+(after-before);
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

/* ===== CALC ===== */
calculate.onclick=()=>{
  const income=parseNumber(income.value);
  const expenses=parseNumber(expenses.value);
  const saving=parseNumber(saving.value);

  if(income-expenses<saving){
    tg?.HapticFeedback?.notificationOccurred("warning");
    alert("Недостаточно средств");
    return;
  }

  tg?.HapticFeedback?.impactOccurred("medium");
  openScreen("progress",buttons[1]);
};