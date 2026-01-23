const tg = window.Telegram?.WebApp;
tg?.expand();

/* ===== HARD FIX: NO LAYOUT JUMP ===== */
document.documentElement.style.height = "100%";
document.body.style.height = "100%";
document.body.style.overflow = "hidden";

/* ===== TAP ANYWHERE TO CLOSE KEYBOARD ===== */
document.addEventListener("touchstart", e => {
  const tag = e.target.tagName.toLowerCase();
  if (tag !== "input" && tag !== "textarea") {
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
const indicator = document.querySelector(".nav-indicator");
const bottomNav = document.querySelector(".bottom-nav");

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

/* ===== TAB LOCK ===== */
function lockTabs(lock) {
  buttons.forEach((btn, i) => {
    if (i === 2) return; // центральный calc всегда доступен
    btn.style.opacity = lock ? "0.35" : "1";
    btn.style.pointerEvents = lock ? "none" : "auto";
  });
}
lockTabs(true);

/* ===== NAV LOGIC (CENTER FIX — ЕДИНСТВЕННОЕ ИЗМЕНЕНИЕ) ===== */
function moveIndicator(btn) {
  if (!btn) return;

  const x =
    btn.offsetLeft +
    btn.offsetWidth / 2 -
    indicator.offsetWidth / 2;

  indicator.style.transform = `translateX(${x}px)`;
}

function openScreen(name, btn) {
  if (!isInitialized && name !== "calc") return;

  screens.forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + name).classList.add("active");

  buttons.forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  if (btn) moveIndicator(btn);
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
  if (chosenPlan) return;

  const income = parseNumber(incomeInput.value);
  const expenses = parseNumber(expensesInput.value);
  const goal = parseNumber(goalInput.value);
  const pace = Number(paceInput.value) / 100;

  if (!income || !goal || income - expenses <= 0) return;

  lastCalc = { income, expenses, goal, pace };
  openSheet();
};

/* ===== GRAPH ===== */
let canvas, ctx, pad = 40, w, h;

function drawAxes() {
  ctx.strokeStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, canvas.height - pad);
  ctx.lineTo(canvas.width - pad, canvas.height - pad);
  ctx.stroke();
}
function drawPlan() {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, canvas.height - pad);
  ctx.lineTo(canvas.width - pad, pad);
  ctx.stroke();
}
function drawFact(progress) {
  ctx.setLineDash([6,6]);
  ctx.strokeStyle = "#777";
  ctx.beginPath();
  ctx.moveTo(pad, canvas.height - pad);
  ctx.lineTo(pad + w * progress, canvas.height - pad - h * progress);
  ctx.stroke();
  ctx.setLineDash([]);
}
function animateFact(target) {
  let current = 1;
  function step() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawAxes();
    drawPlan();
    drawFact(current);
    current += (target - current) * 0.06;
    if (Math.abs(target - current) > 0.002) requestAnimationFrame(step);
  }
  step();
}

/* ===== STAGED FLOW ===== */
function protocolFlow(mode) {
  chosenPlan = mode;
  isInitialized = true;
  lockTabs(false);

  lockText.innerText =
    `У вас уже выбран план: ${mode === "buffer" ? "с подушкой" : "без подушки"}`;
  calcLock.style.display = "block";

  openScreen("advice", buttons[0]);
  loader.classList.remove("hidden");

  const free = lastCalc.income - lastCalc.expenses;
  plannedMonthly = Math.round(free * lastCalc.pace);
  if (mode === "buffer") plannedMonthly = Math.round(plannedMonthly * 0.9);

  adviceCard.innerText = "Protocol анализирует данные…";

  setTimeout(() => {
    adviceCard.innerText =
      mode === "buffer"
        ? "Часть средств будет направляться в резерв."
        : "Все средства идут напрямую в цель.";
  }, 2000);

  setTimeout(() => {
    adviceCard.innerText = "Готово.";
  }, 4000);

  setTimeout(() => {
    loader.classList.add("hidden");

    adviceCard.innerHTML = `
      <div>План: ${plannedMonthly} ₽ / месяц</div>

      <canvas id="chart" width="360" height="260" style="margin:16px 0"></canvas>

      <div style="display:flex;gap:8px;align-items:center">
        <input id="factInput" inputmode="numeric" placeholder="Фактически отложено" style="flex:1"/>
        <button id="applyFact" style="width:52px;height:52px;border-radius:50%">➜</button>
      </div>
    `;

    canvas = document.getElementById("chart");
    ctx = canvas.getContext("2d");
    w = canvas.width - pad * 2;
    h = canvas.height - pad * 2;

    drawAxes();
    drawPlan();
    drawFact(1);

    const factInput = document.getElementById("factInput");
    const applyBtn = document.getElementById("applyFact");

    factInput.addEventListener("input", e => {
      e.target.value = formatNumber(e.target.value);
    });

    applyBtn.onclick = () => {
      const fact = parseNumber(factInput.value);
      if (!fact) return;
      factInput.blur();
      animateFact(Math.min(fact / plannedMonthly, 1.3));
    };
  }, 6000);
}

/* ===== CHOICES ===== */
noBuffer.onclick = () => { closeSheet(); protocolFlow("direct"); };
withBuffer.onclick = () => { closeSheet(); protocolFlow("buffer"); };

/* ===== RESET ===== */
resetBtn.onclick = () => confirmReset.style.display = "block";
confirmNo.onclick = () => confirmReset.style.display = "none";
confirmYes.onclick = () => {
  chosenPlan = null;
  isInitialized = false;
  lastCalc = {};
  plannedMonthly = 0;

  calcLock.style.display = "none";
  confirmReset.style.display = "none";
  lockTabs(true);

  incomeInput.value = "";
  expensesInput.value = "";
  goalInput.value = "";

  openScreen("calc", buttons[2]);
};

/* ===== INIT INDICATOR ===== */
moveIndicator(document.querySelector('.nav-btn[data-screen="calc"]'));