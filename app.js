const tg = window.Telegram?.WebApp;
tg?.expand();

/* ===== HELPERS ===== */
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const parse = v => Number(v.replace(/\./g,""));

/* ===== STATE ===== */
let state = JSON.parse(localStorage.getItem("protocol_state") || "{}");

let monthly = state.monthly || 0;
let contributions = state.contributions || [];
let autoMode = state.autoMode || null;

function saveState() {
  localStorage.setItem("protocol_state", JSON.stringify({
    monthly,
    contributions,
    autoMode
  }));
}

/* ===== AUTO MODE (STRICT) ===== */
function decideAutoMode(income, expenses) {
  const free = income - expenses;
  const ratio = free / income;

  if (ratio < 0.25) return "conservative";
  if (ratio < 0.45) return "balance";
  return "aggressive";
}

function modeText(mode) {
  if (mode === "conservative")
    return "Режим: КОНСЕРВАТИВНЫЙ. Снижаю риск.";
  if (mode === "aggressive")
    return "Режим: АГРЕССИВНЫЙ. Давлю на цель.";
  return "Режим: БАЛАНС. Оптимальное решение.";
}

/* ===== TABS ===== */
const screens = document.querySelectorAll(".screen");
const tabs = document.querySelectorAll(".tg-tabs button");

function openScreen(name) {
  screens.forEach(s =>
    s.classList.toggle("active", s.id === "screen-" + name)
  );
  tabs.forEach(b =>
    b.classList.toggle("active", b.dataset.screen === name)
  );
}

tabs.forEach(btn => {
  btn.onclick = () => openScreen(btn.dataset.screen);
});

/* ===== INPUT FORMAT ===== */
["income","expenses"].forEach(id => {
  const el = $(id);
  el.oninput = e => e.target.value = format(e.target.value);
});

/* ===== GRAPH (PLAN vs FACT) ===== */
function drawChart() {
  const canvas = $("progressChart");
  if (!canvas || !monthly) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.offsetWidth;
  const h = canvas.height = canvas.offsetHeight;

  ctx.clearRect(0,0,w,h);

  const pad = 24;
  const maxMonths = Math.max(contributions.length + 2, 6);

  // axes
  ctx.strokeStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(pad,pad);
  ctx.lineTo(pad,h-pad);
  ctx.lineTo(w-pad,h-pad);
  ctx.stroke();

  // PLAN
  ctx.strokeStyle = "#4f7cff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  let planSum = 0;
  for (let i = 0; i < maxMonths; i++) {
    const x = pad + (i / (maxMonths-1)) * (w - pad*2);
    const y = h - pad - (planSum / (monthly * maxMonths)) * (h - pad*2);
    i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    planSum += monthly;
  }
  ctx.stroke();

  // FACT
  if (contributions.length) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let factSum = 0;
    contributions.forEach((c,i) => {
      factSum += c;
      const x = pad + (i / (maxMonths-1)) * (w - pad*2);
      const y = h - pad - (factSum / (monthly * maxMonths)) * (h - pad*2);
      i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      ctx.beginPath();
      ctx.arc(x,y,4,0,Math.PI*2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    });
    ctx.stroke();
  }

  $("progressInfo").innerHTML =
    `${modeText(autoMode)}
` +
    `Взносов: <b>${contributions.length}</b>`;
}

/* ===== CALC ===== */
$("calculate").onclick = () => {
  const income = parse($("income").value);
  const expenses = parse($("expenses").value);
  if (!income || !expenses || income <= expenses) return;

  monthly = Math.round((income - expenses) * 0.5);
  autoMode = decideAutoMode(income, expenses);
  saveState();

  openScreen("progress");
  drawChart();
};

/* ===== INIT ===== */
openScreen("calc");
drawChart();
