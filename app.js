const tg = window.Telegram?.WebApp;
tg?.expand();

/* ===== RESET через startapp ===== */
if (tg?.initDataUnsafe?.start_param === "reset") {
  localStorage.clear();
}

/* ===== HELPERS ===== */
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const parse = v => Number(v.replace(/\./g,""));

/* ===== ONBOARDING ===== */
function showOnboarding() {
  const ob = $("onboarding");
  if (ob) ob.style.display = "block";
}

function hideOnboarding() {
  localStorage.setItem("protocol_onboarding_done", "1");
  const ob = $("onboarding");
  if (ob) ob.style.display = "none";
}

function checkOnboarding() {
  if (!localStorage.getItem("protocol_onboarding_done")) {
    showOnboarding();
  }
}

/* ===== STATE ===== */
let state = JSON.parse(localStorage.getItem("protocol_state") || "{}");
let monthly = state.monthly || 0;
let contributions = state.contributions || [];

function saveState() {
  localStorage.setItem("protocol_state", JSON.stringify({
    monthly,
    contributions
  }));
}

/* ===== TABS ===== */
const screens = document.querySelectorAll(".screen");
const tabs = document.querySelectorAll(".tg-tabs button");

function openScreen(name) {
  screens.forEach(s => s.classList.toggle("active", s.id === "screen-" + name));
  tabs.forEach(b => b.classList.toggle("active", b.dataset.screen === name));
}

tabs.forEach(btn => {
  btn.onclick = () => openScreen(btn.dataset.screen);
});

/* ===== INPUT FORMAT ===== */
["income","expenses"].forEach(id => {
  const el = $(id);
  el.oninput = e => e.target.value = format(e.target.value);
});

/* ===== GRAPH ===== */
function drawChart() {
  const canvas = $("progressChart");
  if (!canvas || !monthly) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.offsetWidth;
  const h = canvas.height = canvas.offsetHeight;

  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle = "#4f7cffcff";
  ctx.beginPath();
  ctx.moveTo(0,h);

  let sum = 0;
  contributions.forEach((c,i) => {
    sum += c;
    const x = (i+1) * (w / 10);
    const y = h - sum / monthly * h;
    ctx.lineTo(x,y);
  });

  ctx.stroke();
}

/* ===== CALC ===== */
$("calculate").onclick = () => {
  const income = parse($("income").value);
  const expenses = parse($("expenses").value);
  if (!income || !expenses || income <= expenses) return;

  monthly = Math.round((income - expenses) * 0.5);
  saveState();
  openScreen("progress");
  drawChart();
};

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  checkOnboarding();
  openScreen("calc");
  drawChart();
});