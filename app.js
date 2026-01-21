const tg = window.Telegram?.WebApp;
tg?.expand();

/* ================= HELPERS ================= */
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const parse = v => Number(v.replace(/\./g,""));

/* ================= STORAGE ================= */
let goals = JSON.parse(localStorage.getItem("goals") || "null");
let bufferBalance = Number(localStorage.getItem("buffer_balance") || 0);
let contributions = JSON.parse(localStorage.getItem("contributions") || "[]");

if (!goals) {
goals = [
{ id: 1, name: "Основная цель", target: 300000, balance: 0, priority: 1, active: true }
];
saveAll();
}

function saveAll(){
localStorage.setItem("goals", JSON.stringify(goals));
localStorage.setItem("buffer_balance", bufferBalance);
localStorage.setItem("contributions", JSON.stringify(contributions));
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
["income","expenses","targetAmount"].forEach(id=>{
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
function drawChart(monthly){
const mainGoal = goals.find(g => g.active);
if(!mainGoal) return;

const target = mainGoal.target;
const canvas = $("progressChart");
const ctx = prepareCanvas(canvas);

const w = canvas.getBoundingClientRect().width;
const h = canvas.getBoundingClientRect().height;
ctx.clearRect(0,0,w,h);

const pad = 32;
const months = Math.ceil(target / monthly);
const gw = w - pad*2;
const gh = h - pad*2;

ctx.strokeStyle="#333";
ctx.beginPath();
ctx.moveTo(pad,pad);
ctx.lineTo(pad,h-pad);
ctx.lineTo(w-pad,h-pad);
ctx.stroke();

ctx.strokeStyle="#4f7cff";
ctx.lineWidth=3;
ctx.beginPath();

let sum=0;
for(let i=0;i<=months;i++){
const x = pad + (i/months)*gw;
const y = h-pad-(sum/target)*gh;
i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
sum+=monthly;
}
ctx.stroke();

$("progressInfo").innerHTML =
goals.map(g =>
`🎯 ${g.name}: <b>${g.balance}</b> / ${g.target}`
).join("<br>") +
`<br>🛡 Подушка: <b>${bufferBalance}</b>`;
}

/* ================= CONTRIBUTIONS ================= */
function injectContributionUI(){
if($("contributionInput")) return;

const box=document.createElement("div");
box.innerHTML=`
<label>Внёс</label>
<input id="contributionInput" placeholder="20.000">
<button id="addContribution">Распределить</button>
`;
$("screen-progress").prepend(box);

$("contributionInput").oninput=e=>e.target.value=format(e.target.value);

$("addContribution").onclick=()=>{
let amount = parse($("contributionInput").value);
if(!amount) return;

let bufferPart = Math.round(amount * 0.1);
bufferBalance += bufferPart;
amount -= bufferPart;

goals
.filter(g => g.active)
.sort((a,b)=>a.priority-b.priority)
.forEach(goal=>{
if(amount <= 0) return;
const need = goal.target - goal.balance;
const add = Math.min(need, amount);
goal.balance += add;
amount -= add;
if(goal.balance >= goal.target) goal.active = false;
});

contributions.push({ date: Date.now() });
saveAll();
$("contributionInput").value="";
drawChart(window._monthly);
renderGoals();
};
}

/* ================= GOALS UI ================= */
function renderGoals(){
const box = $("screen-goals");
if(!box) return;

box.innerHTML = `
<h3>Цели</h3>
${goals.map(g=>`
<div class="goal-card">
<b>${g.name}</b><br>
${g.balance} / ${g.target}<br>
<button onclick="moveGoal(${g.id},-1)">↑</button>
<button onclick="moveGoal(${g.id},1)">↓</button>
<button onclick="removeGoal(${g.id})">✕</button>
</div>
`).join("")}
<hr>
<input id="newGoalName" placeholder="Новая цель">
<input id="newGoalTarget" placeholder="Сумма">
<button onclick="addGoal()">Добавить цель</button>
`;

$("newGoalTarget").oninput=e=>e.target.value=format(e.target.value);
}

window.addGoal = () => {
const name = $("newGoalName").value;
const target = parse($("newGoalTarget").value);
if(!name || !target) return;

goals.push({
id: Date.now(),
name,
target,
balance: 0,
priority: goals.length + 1,
active: true
});

saveAll();
renderGoals();
};

window.removeGoal = id => {
goals = goals.filter(g => g.id !== id);
saveAll();
renderGoals();
};

window.moveGoal = (id,dir) => {
const i = goals.findIndex(g=>g.id===id);
const j = i + dir;
if(j<0 || j>=goals.length) return;
[goals[i],goals[j]] = [goals[j],goals[i]];
goals.forEach((g,i)=>g.priority=i+1);
saveAll();
renderGoals();
};

/* ================= CALC ================= */
$("calculate").onclick=()=>{
const income=parse($("income").value);
const expenses=parse($("expenses").value);
if(!income||!expenses||income<=expenses) return;

window._monthly=Math.round((income-expenses)*0.5);

openScreen("progress");

requestAnimationFrame(()=>{
injectContributionUI();
drawChart(window._monthly);
renderGoals();
});
};

openScreen("calc");
