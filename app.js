/* =====================================================
PROTOCOL — Telegram Mini App (mobile-first)
Auto Mode (strict) + Plan vs Fact + Onboarding + Reset
===================================================== */

const tg = window.Telegram?.WebApp;
tg?.expand();

/* ================= RESET VIA startapp ================= */
if (tg?.initDataUnsafe?.start_param === "reset") {
localStorage.clear();
}

/* ================= HELPERS ================= */
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const parse = v => Number(v.replace(/\./g,""));

/* ================= ONBOARDING ================= */
let onboardingDone = localStorage.getItem("protocol_onboarding_done");

function showOnboarding(){
const ob = $("onboarding");
if (ob) ob.style.display = "flex";
}

function hideOnboarding(){
localStorage.setItem("protocol_onboarding_done", "1");
const ob = $("onboarding");
if (ob) ob.style.display = "none";
}

if (!onboardingDone) {
document.addEventListener("DOMContentLoaded", showOnboarding);
}

/* ================= STATE ================= */
let state = JSON.parse(localStorage.getItem("protocol_state") || "{}");

let goals = state.goals || [
{ id: 1, name: "Основная цель", target: 300000, balance: 0, priority: 1, active: true }
];

let bufferBalance = state.bufferBalance || 0;
let monthly = state.monthly || 0;
let contributions = state.contributions || []; // [{amount, date}]
let autoMode = state.autoMode || null; // conservative | balance | aggressive

function saveState(){
localStorage.setItem("protocol_state", JSON.stringify({
goals,
bufferBalance,
monthly,
contributions,
autoMode
}));
}

/* ================= AUTO MODE ================= */
function decideAutoMode(income, expenses){
const free = income - expenses;
const ratio = free / income;

if (ratio < 0.25) return "conservative";
if (ratio < 0.45) return "balance";
return "aggressive";
}

function modeParams(mode){
if (mode === "conservative") return { goal: 0.6, buffer: 0.4 };
if (mode === "aggressive") return { goal: 0.9, buffer: 0.1 };
return { goal: 0.75, buffer: 0.25 }; // balance
}

function modeText(mode){
if (mode === "conservative")
return "Режим: КОНСЕРВАТИВНЫЙ. Риск высокий, скорость снижена.";
if (mode === "aggressive")
return "Режим: АГРЕССИВНЫЙ. Давлю на цель без компромиссов.";
return "Режим: БАЛАНС. Оптимум между скоростью и устойчивостью.";
}

/* ================= TABS ================= */
const screens = document.querySelectorAll(".screen");
const tabs = document.querySelectorAll(".tg-tabs button");

function openScreen(name){
screens.forEach(s =>
s.classList.toggle("active", s.id === "screen-" + name)
);
tabs.forEach(b =>
b.classList.toggle("active", b.dataset.screen === name)
);
}
tabs.forEach(btn => btn.onclick = () => openScreen(btn.dataset.screen));

/* ================= INPUT FORMAT ================= */
["income","expenses"].forEach(id=>{
const el = $(id);
if (el) el.oninput = e => e.target.value = format(e.target.value);
});

/* ================= CANVAS ================= */
function prepareCanvas(canvas){
const dpr = window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;
const ctx = canvas.getContext("2d");
ctx.setTransform(dpr,0,0,dpr,0,0);
return ctx;
}

/* ================= GRAPH ================= */
function drawChart(){
const goal = goals.find(g => g.active) || goals[0];
if (!goal || !monthly) return;

const canvas = $("progressChart");
const ctx = prepareCanvas(canvas);

const w = canvas.getBoundingClientRect().width;
const h = canvas.getBoundingClientRect().height;
ctx.clearRect(0,0,w,h);

const pad = 28;
const target = goal.target;
const months = Math.ceil(target / monthly);
const gw = w - pad*2;
const gh = h - pad*2;

/* axes */
ctx.strokeStyle="#333";
ctx.lineWidth=1;
ctx.beginPath();
ctx.moveTo(pad,pad);
ctx.lineTo(pad,h-pad);
ctx.lineTo(w-pad,h-pad);
ctx.stroke();

/* PLAN LINE */
ctx.strokeStyle="#4f7cff";
ctx.lineWidth=3;
ctx.beginPath();
let planSum = 0;
for(let i=0;i<=months;i++){
const x = pad + (i/months)*gw;
const y = h-pad-(planSum/target)*gh;
i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
planSum += monthly;
}
ctx.stroke();

/* FACT LINE */
if(contributions.length){
ctx.strokeStyle="#ffffff";
ctx.lineWidth=2;
ctx.beginPath();
let factSum = 0;
contributions.forEach((c,i)=>{
factSum += c.amount;
const x = pad + ((i+1)/months)*gw;
const y = h-pad-(factSum/target)*gh;
i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
ctx.beginPath();
ctx.arc(x,y,4,0,Math.PI*2);
ctx.fillStyle="#fff";
ctx.fill();
});
ctx.stroke();

const expected = monthly * contributions.length;
const diff = factSum - expected;

$("progressInfo").innerHTML =
`${modeText(autoMode)}<br>` +
(diff >= 0
? `Опережение плана: <b>${diff}</b> ₽`
: `Отставание от плана: <b>${Math.abs(diff)}</b> ₽`);
} else {
$("progressInfo").innerHTML =
`${modeText(autoMode)}<br>Ожидаю первый взнос.`;
}
}

/* ================= CONTRIBUTIONS ================= */
function injectContributionUI(){
if ($("contributionInput")) return;

const box = document.createElement("div");
box.innerHTML = `
<label>Внёс</label>
<input id="contributionInput" placeholder="20.000">
<button id="addContribution">Применить</button>
`;
$("screen-progress").prepend(box);

$("contributionInput").oninput = e =>
e.target.value = format(e.target.value);

$("addContribution").onclick = ()=>{
const amount = parse($("contributionInput").value);
if (!amount) return;

const p = modeParams(autoMode);
const toGoal = Math.round(amount * p.goal);
const toBuffer = amount - toGoal;

goals[0].balance += toGoal;
bufferBalance += toBuffer;
contributions.push({ amount: toGoal, date: Date.now() });

$("contributionInput").value="";
saveState();
drawChart();
};
}

/* ================= CALC ================= */
$("calculate").onclick = ()=>{
const income = parse($("income").value);
const expenses = parse($("expenses").value);
if (!income || !expenses || income <= expenses) return;

monthly = Math.round((income - expenses) * 0.5);
autoMode = decideAutoMode(income, expenses);
saveState();

openScreen("progress");
requestAnimationFrame(()=>{
injectContributionUI();
drawChart();
});
};

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", ()=>{
openScreen("calc");
drawChart();
});
