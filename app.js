const tg = window.Telegram?.WebApp;
tg?.expand();

// ===== HELPERS =====
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const parse = v => Number(v.replace(/\./g,""));

// ===== INPUTS =====
["income","expenses","targetAmount"].forEach(id=>{
$(id).oninput = e => e.target.value = format(e.target.value);
});

// ===== SLIDER =====
const aggression = $("aggression");
const aggrLabel = $("aggressionLabel");
const aggrPercent = $("aggressionPercent");

function updateAgg(){
const v = +aggression.value;
aggrPercent.textContent = v + "%";
aggrLabel.textContent =
v <= 40 ? "Комфортно" :
v <= 60 ? "Умеренно" :
"Агрессивно";
}
aggression.oninput = updateAgg;
updateAgg();

// ===== TABS =====
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

// ===== STORAGE =====
let goalBalance = Number(localStorage.getItem("goal_balance") || 0);
let bufferBalance = Number(localStorage.getItem("buffer_balance") || 0);
let contributions = JSON.parse(localStorage.getItem("contributions") || "[]");
let lastReport = Number(localStorage.getItem("last_report") || Date.now());

function saveAll(){
localStorage.setItem("goal_balance", goalBalance);
localStorage.setItem("buffer_balance", bufferBalance);
localStorage.setItem("contributions", JSON.stringify(contributions));
localStorage.setItem("last_report", lastReport);
}

// ===== CANVAS =====
function prepareCanvas(canvas){
const dpr = window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;
const ctx = canvas.getContext("2d");
ctx.setTransform(dpr,0,0,dpr,0,0);
return ctx;
}

// ===== GRAPH =====
function drawChart(monthly, target){
const canvas = $("progressChart");
const ctx = prepareCanvas(canvas);

const w = canvas.getBoundingClientRect().width;
const h = canvas.getBoundingClientRect().height;
ctx.clearRect(0,0,w,h);

const pad = 32;
const months = Math.ceil(target / monthly);
const gw = w - pad*2;
const gh = h - pad*2;

// axes
ctx.strokeStyle="#333";
ctx.beginPath();
ctx.moveTo(pad,pad);
ctx.lineTo(pad,h-pad);
ctx.lineTo(w-pad,h-pad);
ctx.stroke();

// PLAN
ctx.strokeStyle="#4f7cff";
ctx.lineWidth=3;
ctx.beginPath();
let planSum=0;
for(let i=0;i<=months;i++){
const x = pad + (i/months)*gw;
const y = h-pad-(planSum/target)*gh;
i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
planSum+=monthly;
}
ctx.stroke();

// FACT (goal)
if(contributions.length){
ctx.strokeStyle="#ffffff";
ctx.lineWidth=2;
ctx.beginPath();

let sum=0;
contributions.forEach((c,i)=>{
sum+=c.goal;
const x = pad + ((i+1)/months)*gw;
const y = h-pad-(sum/target)*gh;
i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
ctx.beginPath();
ctx.arc(x,y,4,0,Math.PI*2);
ctx.fillStyle="#fff";
ctx.fill();
});
ctx.stroke();
}

$("progressInfo").innerHTML =
`🎯 Цель: <b>${goalBalance}</b> ₽<br>
🛡 Подушка: <b>${bufferBalance}</b> ₽`;
}

// ===== CONTRIBUTIONS =====
function injectContributionUI(){
if($("contributionInput")) return;

const box=document.createElement("div");
box.innerHTML=`
<label>Внёс за период</label>
<input id="contributionInput" placeholder="10.000">
<button id="addContribution">Добавить</button>
`;
$("screen-progress").prepend(box);

$("contributionInput").oninput=e=>e.target.value=format(e.target.value);

$("addContribution").onclick=()=>{
const v=parse($("contributionInput").value);
if(!v) return;

// 70 / 30 по умолчанию
const toGoal = Math.round(v * 0.7);
const toBuffer = v - toGoal;

goalBalance += toGoal;
bufferBalance += toBuffer;

contributions.push({
goal: toGoal,
buffer: toBuffer,
date: Date.now()
});

saveAll();
$("contributionInput").value="";
drawChart(window._monthly, window._target);
checkWeeklyReport();
};
}

// ===== WEEKLY REPORT =====
function checkWeeklyReport(){
const week = 7 * 24 * 60 * 60 * 1000;
if(Date.now() - lastReport < week) return;

const lastWeek = contributions.filter(
c => Date.now() - c.date < week
);

const goalSum = lastWeek.reduce((s,c)=>s+c.goal,0);
const bufferSum = lastWeek.reduce((s,c)=>s+c.buffer,0);

$("progressInfo").innerHTML += `
<hr>
📊 <b>Недельный отчёт</b><br>
В цель: <b>${goalSum}</b> ₽<br>
В подушку: <b>${bufferSum}</b> ₽
`;

lastReport = Date.now();
saveAll();
}

// ===== CALC =====
$("calculate").onclick=()=>{
const income=parse($("income").value);
const expenses=parse($("expenses").value);
const target=parse($("targetAmount").value);
if(!income||!expenses||!target||income<=expenses) return;

window._monthly=Math.round((income-expenses)*(+aggression.value/100));
window._target=target;

$("planResult").innerHTML =
`Базовый взнос: <b>${window._monthly}</b> ₽ / мес`;

openScreen("progress");

requestAnimationFrame(()=>{
injectContributionUI();
drawChart(window._monthly,target);
checkWeeklyReport();
});
};

openScreen("calc");
