const tg = window.Telegram?.WebApp;
tg?.expand();

/* ===== TAP ANYWHERE TO CLOSE KEYBOARD ===== */
document.addEventListener("click", e => {
  if (
    e.target.closest("button") ||
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA"
  ) {
    return;
  }

  document.activeElement?.blur();
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
const calculateBtn = document.getElementById("calculate");

let selectedMode = "calm"; // calm | medium | aggressive

const modeButtons = document.querySelectorAll(".mode-btn");

modeButtons.forEach(btn => {
  btn.onclick = () => {
    // снять активность со всех
    modeButtons.forEach(b => b.classList.remove("active"));

    // активировать текущую
    btn.classList.add("active");

    // сохранить режим
    selectedMode = btn.dataset.mode;
    saveMode = btn.dataset.mode;
  };
});

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

/* ===== NAV INDICATOR ===== */
function moveIndicator(btn) {
  if (!btn) return;

  const navRect = bottomNav.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();

  const x =
    btnRect.left -
    navRect.left +
    btnRect.width / 2 -
    indicator.offsetWidth / 2; // ← ВАЖНО

  indicator.style.transform = `translateX(${x}px)`;
}

/* ===== NAV NEVER MOVES ===== */
bottomNav.style.position = "fixed";
bottomNav.style.bottom = "26px";
bottomNav.style.left = "20px";
bottomNav.style.right = "20px";

/* ===== STATE ===== */
let lastCalc = {};
let chosenPlan = null;
let plannedMonthly = 0;
let isInitialized = false;
let saveMode = "calm";

/* ===== PACE SELECT ===== */


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


/* ===== TAB LOCK ===== */
function lockTabs(lock) {
buttons.forEach((btn, i) => {
if (i === 0) return;
btn.style.opacity = lock ? "0.35" : "1";
btn.style.pointerEvents = lock ? "none" : "auto";
});
}
lockTabs(true);
calcLock.style.display = "none";
  moveIndicator(buttons[0]);
});

/* ===== OPEN SCREEN ===== */
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
if (!saveMode) return;

let pace = 0.5;

if (saveMode === "calm") pace = 0.4;
if (saveMode === "normal") pace = 0.5;
if (saveMode === "aggressive") pace = 0.6;

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

openScreen("advice", buttons[1]);
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

openScreen("calc", buttons[0]);
};

/* ===== HIDE BOTTOM NAV WHEN KEYBOARD OPEN ===== */
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    const keyboardOpen =
      window.visualViewport.height < window.innerHeight - 100;

    if (keyboardOpen) {
      bottomNav.style.transform = "translateY(140%)";
      bottomNav.style.opacity = "0";
      bottomNav.style.pointerEvents = "none";
    } else {
      bottomNav.style.transform = "translateY(0)";
      bottomNav.style.opacity = "1";
      bottomNav.style.pointerEvents = "auto";
    }
  });
}

/* ===== PROFILE ===== */
const profileBtn = document.getElementById("profileBtn");

if (profileBtn) {
  profileBtn.onclick = () => {
    console.log("Profile clicked");
    // позже: открыть профиль / настройки
moveIndicator(document.querySelector(".nav-btn.active"));
  };
}
window.addEventListener("load", () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      moveIndicator(document.querySelector(".nav-btn.active"));
    });
  });
});