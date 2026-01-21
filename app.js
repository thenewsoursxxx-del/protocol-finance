const tg = window.Telegram?.WebApp;
tg?.expand();

/* ================= HELPERS ================= */
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const parse = v => Number(v.replace(/\./g,""));

/* ================= STATE ================= */
let state = JSON.parse(localStorage.getItem("protocol_state") || "{}");

let goals = state.goals || [
{ id: 1, name: "Основная цель", target: 300000, balance: 0, priority: 1, active: true }
];
let bufferBalance = state.bufferBalance || 0;
let monthly = state.monthly || 0;
let contributions = state.contributions || [];
let autoMode = state.autoMode || null; // conservative | balance | aggressive

function saveState(){
localStorage.setItem("protocol_state", JSON.stringify({
goals, bufferBalance, monthly, contributions, autoMode
}));
}

/* ================= AUTO MODE LOGIC ================= */
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
return "Режим: КОНСЕРВАТИВНЫЙ. Доход ограничен. Риск выше нормы.";
if (mode === "aggressive")
return "Режим: АГРЕССИВНЫЙ. Запас высокий. Давлю на цель.";
return "Режим: БАЛАНС. Оптимальное соотношение риска и скорости.";
}

/* ================= TABS ================= */
const screens = document.querySelectorAll(".screen");
const tabs = document.querySelectorAll(".tg-tabs button");
function openScreen(name){
screens.forEach(s => s.classList.toggle("active", s.id==="screen-"+name));
tabs.forEach(b => b.classList.toggle("active", b.dataset.screen===name));
}
tabs.forEach(b => b.onclick=()=>openScreen(b.dataset.screen));

/* ================= CANVAS ================= */
function prepareCanvas(canvas){
const dpr = window.devicePixelRatio || 1;
const r = canvas.getBoundingClientRect();
canvas.width = r.width*dpr; canvas.height=r.height*dpr;
const ctx = canvas.getContext("2d");
ctx.setTransform(dpr,0,0,dpr,0,0);
return ctx;
}

/* ================= GRAPH ================= */
function drawChart(){
const goal = goals.find(g=>g.active) || goals[0];
if(!goal || !monthly) return;

const canvas = $("progressChart");
const ctx = prepareCanvas(canvas);
const w = canvas.getBoundingClientRect().width;
const h = canvas.getBoundingClientRect().height;
ctx.clearRect(0,0,w,h);

const pad=32, target=goal.target;
const months=Math.ceil(target/monthly);
const gw=w-pad*2, gh=h-pad*2;

// axes
ctx.strokeStyle="#333";
ctx.beginPath();
ctx.moveTo(pad,pad); ctx.lineTo(pad,h-pad); ctx.lineTo(w-pad,h-pad);
ctx.stroke();

// PLAN
ctx.strokeStyle="#4f7cff"; ctx.lineWidth=3; ctx.beginPath();
let ps=0;
for(let i=0;i<=months;i++){
const x=pad+(i/months)*gw;
const y=h-pad-(ps/target)*gh;
i?ctx.lineTo(x,y):ctx.moveTo(x,y);
ps+=monthly;
}
ctx.stroke();

// FACT
if(contributions.length){
ctx.strokeStyle="#fff"; ctx.lineWidth=2; ctx.beginPath();
let fs=0;
contributions.forEach((c,i)=>{
fs+=c.amount;
const x=pad+((i+1)/months)*gw;
const y=h-pad-(fs/target)*gh;
i?ctx.lineTo(x,y):ctx.moveTo(x,y);
ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fillStyle="#fff"; ctx.fill();
});
ctx.stroke();

const expected = monthly*contributions.length;
const diff = fs-expected;
$("progressInfo").innerHTML =
`${modeText(autoMode)}<br>`+
(diff>=0
? `Опережение плана: <b>${diff}</b> ₽`
: `Отставание от плана: <b>${Math.abs(diff)}</b> ₽`);
} else {
$("progressInfo").innerHTML = modeText(autoMode)+"<br>Ожидаю первый взнос.";
}
}

/* ================= CONTRIBUTIONS ================= */
function injectContributionUI(){
if($("contributionInput")) return;
const box=document.createElement("div");
box.innerHTML=`
<label>Внёс</label>
<input id="contributionInput" placeholder="20.000">
<button id="addContribution">Применить</button>
`;
$("screen-progress").prepend(box);
$("contributionInput").oninput=e=>e.target.value=format(e.target.value);

$("addContribution").onclick=()=>{
let amount=parse($("contributionInput").value);
if(!amount) return;

const p = modeParams(autoMode);
const toGoal=Math.round(amount*p.goal);
const toBuffer=amount-toGoal;

bufferBalance+=toBuffer;
goals[0].balance+=toGoal;
contributions.push({amount:toGoal,date:Date.now()});

$("contributionInput").value="";
saveState();
drawChart();
};
}

/* ================= CALC ================= */
$("calculate").onclick=()=>{
const income=parse($("income").value);
const expenses=parse($("expenses").value);
if(!income||!expenses||income<=expenses) return;

monthly=Math.round((income-expenses)*0.5);
autoMode = decideAutoMode(income, expenses);
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
