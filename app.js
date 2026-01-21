const tg = window.Telegram?.WebApp;
if (tg) {
tg.expand();
tg.MainButton.hide();
}

// ---------- helpers ----------
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const parse = v => Number(v.replace(/\./g,""));
const money = v => v.toLocaleString("de-DE")+" ₽";

function haptic(type="light"){ tg?.HapticFeedback.impactOccurred(type); }

// ---------- tabs ----------
const tabs = document.querySelectorAll(".tabs button");
const sections = document.querySelectorAll(".tab");

function openTab(name){
tabs.forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
sections.forEach(s=>s.classList.toggle("active",s.id==="tab-"+name));

tg?.MainButton.hide();
}
tabs.forEach(b=>b.onclick=()=>openTab(b.dataset.tab));

// ---------- inputs ----------
const incomeI=$("income"),expensesI=$("expenses"),targetI=$("targetAmount");
[incomeI,expensesI,targetI].forEach(i=>i.oninput=()=>i.value=format(i.value));

// ---------- slider ----------
const aggression=$("aggression"),aggrLabel=$("aggressionLabel");
function updateAgg(){
const v=+aggression.value;
aggrLabel.textContent=v<=40?"Комфортно":v<=60?"Умеренно":"Агрессивно";
}
aggression.oninput=updateAgg;updateAgg();

// ---------- calculate ----------
function calculate(){
const income=parse(incomeI.value);
const expenses=parse(expensesI.value);
const target=parse(targetI.value);
const percent=+aggression.value/100;
if(!income||!expenses||!target||income<=expenses)return null;

const free=income-expenses;
const total=Math.round(free*percent);

return{
income,expenses,target,percent,total,
no:{monthly:total,months:Math.ceil(target/total)},
safe:{monthly:Math.round(total*0.95),safety:Math.round(total*0.05),months:Math.ceil(target/(total*0.95))}
};
}

// ---------- save ----------
function savePlan(mode,data){
localStorage.setItem("protocol",JSON.stringify({mode,...data}));
haptic("medium");
openTab("plan");
renderPlan();
tg?.MainButton.setText("Готово");
tg?.MainButton.show();
tg?.MainButton.onClick(()=>tg.close());
}

// ---------- render ----------
$("calculate").onclick=()=>{
const d=calculate();
if(!d)return alert("Проверь данные");

$("planResult").innerHTML=`
<div>
<h3>Без подушки</h3>
${money(d.no.monthly)} / мес<br>${d.no.months} мес
<button onclick='savePlan("no",${JSON.stringify(d)})'>Выбрать</button>
</div>
<div>
<h3>С подушкой</h3>
${money(d.safe.monthly)} + ${money(d.safe.safety)}<br>${d.safe.months} мес
<button onclick='savePlan("safe",${JSON.stringify(d)})'>Выбрать</button>
</div>
`;
openTab("plan");
};

function renderPlan(){
const p=JSON.parse(localStorage.getItem("protocol")||"null");
if(!p)return;
$("planResult").innerHTML=`
Режим: ${p.mode==="safe"?"С подушкой":"Без подушки"}<br>
Доход: ${money(p.income)}<br>
Траты: ${money(p.expenses)}<br>
Цель: ${money(p.target)}
`;
}

function renderProgress(){
const p=JSON.parse(localStorage.getItem("protocol")||"null");
if(!p)return;
let sum=0,rows="";
const m=p.mode==="safe"?Math.round(p.total*0.95):p.total;
for(let i=1;i<=6;i++){sum+=m;rows+=`Месяц ${i}: ${money(sum)}<br>`;}
$("progressResult").innerHTML=rows;
}

function renderRisk(){
const d=calculate();
if(!d)return;
$("riskResult").innerHTML=`
Доход -10% → ${money(d.income*0.9)}<br>
Траты +20% → ${money(d.expenses*1.2)}<br>
Protocol адаптируется автоматически
`;
}

// hooks
tabs[1].onclick=()=>{openTab("plan");renderPlan();}
tabs[2].onclick=()=>{openTab("progress");renderProgress();}
tabs[3].onclick=()=>{openTab("risk");renderRisk();}
