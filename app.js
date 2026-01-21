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
let realContributions =
JSON.parse(localStorage.getItem("real_contributions") || "[]");

let safetyBuffer =
Number(localStorage.getItem("safety_buffer") || 0);

function saveAll(){
localStorage.setItem("real_contributions", JSON.stringify(realContributions));
localStorage.setItem("safety_buffer", safetyBuffer);
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
const graphW = w - pad*2;
const graphH = h - pad*2;

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
const x = pad + (i/months)*graphW;
const y = h-pad-(planSum/target)*graphH;
i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
planSum+=monthly;
}
ctx.stroke();

// REAL
let realSum=0;
if(realContributions.length){
ctx.strokeStyle="#ffffff";
ctx.lineWidth=2;
ctx.beginPath();
realContributions.forEach((v,i)=>{
realSum+=v;
const x = pad + ((i+1)/months)*graphW;
const y = h-pad-(realSum/target)*graphH;
i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);

ctx.beginPath();
ctx.arc(x,y,4,0,Math.PI*2);
ctx.fillStyle="#fff";
ctx.fill();
});
ctx.stroke();
}

showAdaptation(monthly, target, realSum);
}

// ===== ADAPTATION =====
function showAdaptation(monthly, target, realSum){
const box = $("progressInfo");
box.innerHTML = "";

if(!realContributions.length){
box.innerHTML = "Это прогноз. Добавь реальный взнос.";
return;
}

const expected = monthly * realContributions.length;
const diff = realSum - expected;

if(Math.abs(diff) < monthly * 0.05){
box.innerHTML = "Ты идёшь точно по плану 👍";
return;
}

// 🔴 ОТСТАЁТ — логика уже есть (оставляем)
if(diff < 0){
box.innerHTML = `
Ты отстаёшь от плана.<br>
Protocol подстроит стратегию позже.
`;
return;
}

// 🟢 ОПЕРЕЖАЕТ
box.innerHTML = `
Ты опережаешь план на <b>${diff}</b> ₽ 🚀<br><br>
Куда направить излишек?
<br><br>
<button id="toGoal">Ускорить цель</button>
<button id="toBuffer">В подушку</button>
<button id="toBalance">Баланс</button>
`;

$("toGoal").onclick = () => {
window._monthly += Math.round(diff / realContributions.length);
updatePlan("Излишек направлен в цель. Срок сокращён.");
};

$("toBuffer").onclick = () => {
safetyBuffer += diff;
updatePlan("Излишек направлен в подушку безопасности.");
};

$("toBalance").onclick = () => {
safetyBuffer += Math.round(diff * 0.5);
window._monthly += Math.round((diff * 0.5) / realContributions.length);
updatePlan("Излишек распределён между целью и подушкой.");
};
}

function updatePlan(message){
saveAll();
$("planResult").innerHTML =
`${message}<br><br>
Подушка: <b>${safetyBuffer}</b> ₽<br>
Новый взнос: <b>${window._monthly}</b> ₽ / мес`;
drawChart(window._monthly, window._target);
}

// ===== CONTRIBUTIONS UI =====
function injectContributionUI(){
if($("contributionInput")) return;

const box=document.createElement("div");
box.innerHTML=`
<label>Внёс за месяц</label>
<input id="contributionInput" placeholder="10.000">
<button id="addContribution">Добавить взнос</button>
`;
$("screen-progress").prepend(box);

$("contributionInput").oninput=e=>e.target.value=format(e.target.value);

$("addContribution").onclick=()=>{
const v=parse($("contributionInput").value);
if(!v) return;
realContributions.push(v);
saveAll();
$("contributionInput").value="";
drawChart(window._monthly, window._target);
};
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
});
};

openScreen("calc");