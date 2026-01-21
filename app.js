const tg = window.Telegram?.WebApp;
tg?.expand();

/* ================= HELPERS ================= */
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const parse = v => Number(v.replace(/\./g,""));

/* ================= STORAGE ================= */
let state = JSON.parse(localStorage.getItem("protocol_state") || "{}");

let goals = state.goals || [
{ id: 1, name: "Основная цель", target: 300000, balance: 0, priority: 1, active: true }
];

let bufferBalance = state.bufferBalance || 0;
let monthly = state.monthly || 0;
let contributions = state.contributions || [];
// [{amount, date}]

function saveState(){
localStorage.setItem("protocol_state", JSON.stringify({
goals,
bufferBalance,
monthly,
contributions
}));
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
if(el) el.oninput = e => e.target.value = format(e.target.value);
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
if(!goal || !monthly) return;

const canvas = $("progressChart");
const ctx = prepareCanvas(canvas);

const w = canvas.getBoundingClientRect().width;
const h = canvas.getBoundingClientRect().height;
ctx.clearRect(0,0,w,h);

const pad = 32;
const target = goal.target;
const months = Math.ceil(target / monthly);
const gw = w - pad*2;
const gh = h - pad*2;

// axes
ctx.strokeStyle = "#333";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(pad,pad);
ctx.lineTo(pad,h-pad);
ctx.lineTo(w-pad,h-pad);
ctx.stroke();

// ===== PLAN LINE =====
ctx.strokeStyle = "#4f7cff";
ctx.lineWidth = 3;
ctx.beginPath();

let planSum = 0;
for(let i=0;i<=months;i++){
const x = pad + (i/months)*gw;
const y = h-pad-(planSum/target)*gh;
i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
planSum += monthly;
}
ctx.stroke();

// ===== FACT LINE =====
if(contributions.length){
ctx.strokeStyle = "#ffffff";
ctx.lineWidth = 2;
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
diff >= 0
? `Ты опережаешь план на <b>${diff}</b> ₽ 🚀`
: `Ты отстаёшь от плана на <b>${Math.abs(diff)}</b> ₽`;
} else {
$("progressInfo").innerHTML = "Это прогноз. Добавь первый взнос.";
}
}

/* ================= CONTRIBUTIONS ================= */
function injectContributionUI(){
if($("contributionInput")) return;

const box = document.createElement("div");
box.innerHTML = `
<label>Внёс</label>
<input id="contributionInput" placeholder="20.000">
<button id="addContribution">Добавить</button>
`;
$("screen-progress").prepend(box);

$("contributionInput").oninput = e =>
e.target.value = format(e.target.value);

$("addContribution").onclick = ()=>{
const v = parse($("contributionInput").value);
if(!v) return;

contributions.push({ amount: v, date: Date.now() });
goal.balance += v;

$("contributionInput").value="";
saveState();
drawChart();
};
}

/* ================= CALC ================= */
$("calculate").onclick = ()=>{
const income = parse($("income").value);
const expenses = parse($("expenses").value);
if(!income || !expenses || income <= expenses) return;

monthly = Math.round((income - expenses) * 0.5);
saveState();

openScreen("progress");

requestAnimationFrame(()=>{
injectContributionUI();
drawChart();
});
};

/* ================= INIT ================= */
openScreen("calc");
drawChart();