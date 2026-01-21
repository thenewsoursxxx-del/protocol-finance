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
let realContributions = JSON.parse(localStorage.getItem("real_contributions") || "[]");

function saveContributions() {
localStorage.setItem("real_contributions", JSON.stringify(realContributions));
}

// ===== CANVAS (Hi-DPI) =====
function prepareCanvas(canvas){
const dpr = window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();

canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;

const ctx = canvas.getContext("2d");
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
return ctx;
}

// ===== GRAPH =====
function drawChart(monthly, target){
const canvas = $("progressChart");
const ctx = prepareCanvas(canvas);

const w = canvas.getBoundingClientRect().width;
const h = canvas.getBoundingClientRect().height;

ctx.clearRect(0, 0, w, h);

const pad = 32;
const months = Math.ceil(target / monthly);
const graphW = w - pad * 2;
const graphH = h - pad * 2;

// axes
ctx.strokeStyle = "#333";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(pad, pad);
ctx.lineTo(pad, h - pad);
ctx.lineTo(w - pad, h - pad);
ctx.stroke();

// labels Y
ctx.fillStyle = "#888";
ctx.font = "14px system-ui";
ctx.fillText("0%", 6, h - pad);
ctx.fillText("100%", 6, pad + 12);

// labels X
ctx.textAlign = "center";
const marks = [0, Math.floor(months/2), months];
marks.forEach(m => {
const x = pad + (m / months) * graphW;
const label = m === 0 ? "Старт" : m === months ? "Финиш" : `+${m} мес`;
ctx.fillText(label, x, h - 8);
});

// PLAN line
ctx.strokeStyle = "#4f7cff";
ctx.lineWidth = 3;
ctx.beginPath();

let sum = 0;
for (let i = 0; i <= months; i++) {
const x = pad + (i / months) * graphW;
const y = h - pad - (sum / target) * graphH;
if (i === 0) ctx.moveTo(x, y);
else ctx.lineTo(x, y);
sum += monthly;
}
ctx.stroke();

// REAL contributions (points)
ctx.fillStyle = "#ffffff";
let realSum = 0;

realContributions.forEach((value, index) => {
realSum += value;
const x = pad + ((index + 1) / months) * graphW;
const y = h - pad - (realSum / target) * graphH;

ctx.beginPath();
ctx.arc(x, y, 4, 0, Math.PI * 2);
ctx.fill();
});

// info
const percent = Math.min(realSum / target * 100, 100);
$("progressInfo").innerHTML =
`Фактически накоплено: <b>${realSum}</b><br>
Прогресс: <b>${percent.toFixed(1)}%</b>`;
}

// ===== ADD CONTRIBUTION UI =====
function injectContributionUI() {
if ($("contributionInput")) return;

const box = document.createElement("div");
box.innerHTML = `
<label>Внёс за месяц</label>
<input id="contributionInput" type="text" placeholder="10.000">
<button id="addContribution">Добавить взнос</button>
`;
$("screen-progress").prepend(box);

$("contributionInput").oninput = e =>
e.target.value = format(e.target.value);

$("addContribution").onclick = () => {
const val = parse($("contributionInput").value);
if (!val) return;

realContributions.push(val);
saveContributions();
$("contributionInput").value = "";

const monthly = window._monthly;
const target = window._target;
drawChart(monthly, target);
};
}

// ===== CALC =====
$("calculate").onclick = ()=>{
const income = parse($("income").value);
const expenses = parse($("expenses").value);
const target = parse($("targetAmount").value);

if (!income || !expenses || !target || income <= expenses) return;

const monthly = Math.round((income - expenses) * (+aggression.value / 100));
const months = Math.ceil(target / monthly);

window._monthly = monthly;
window._target = target;

$("planResult").innerHTML =
`Откладывать <b>${monthly}</b> ₽ / мес<br>
Срок <b>${months} мес</b>`;

openScreen("progress");

requestAnimationFrame(() => {
injectContributionUI();
drawChart(monthly, target);
});
};

openScreen("calc");
