const tg = window.Telegram?.WebApp;
if (tg) {
tg.expand();
tg.MainButton.hide();
}

// helpers
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,".");
const parse = v => Number(v.replace(/\./g,""));
const money = v => v.toLocaleString("de-DE")+" ₽";

function haptic(type="light"){
tg?.HapticFeedback.impactOccurred(type);
}

// tabs
const screens = document.querySelectorAll(".screen");
const tabs = document.querySelectorAll(".tg-tabs button");

function openScreen(name){
screens.forEach(s =>
s.classList.toggle("active", s.id === "screen-" + name)
);
tabs.forEach(b =>
b.classList.toggle("active", b.dataset.screen === name)
);
tg?.MainButton.hide();
}

tabs.forEach(btn => {
btn.onclick = () => {
haptic("light");
openScreen(btn.dataset.screen);
if (btn.dataset.screen === "plan") renderPlan();
if (btn.dataset.screen === "progress") renderProgress();
if (btn.dataset.screen === "risk") renderRisk();
};
});

// inputs
["income","expenses","targetAmount"].forEach(id=>{
$(id).oninput = e => e.target.value = format(e.target.value);
});

// slider
const aggression = $("aggression");
const aggrLabel = $("aggressionLabel");
aggression.oninput = () => {
const v = +aggression.value;
aggrLabel.textContent =
v <= 40 ? "Комфортно" :
v <= 60 ? "Умеренно" :
"Агрессивно";
};
aggression.oninput();

// calc
function calculate(){
const income=parse($("income").value);
const expenses=parse($("expenses").value);
const target=parse($("targetAmount").value);
const percent=+aggression.value/100;
if(!income||!expenses||!target||income<=expenses)return null;
const free=income-expenses;
const total=Math.round(free*percent);
return{
income,expenses,target,total,
no:{m:total,mo:Math.ceil(target/total)},
safe:{m:Math.round(total*0.95),s:Math.round(total*0.05),mo:Math.ceil(target/(total*0.95))}
};
}

$("calculate").onclick = () => {
const d = calculate();
if (!d) return;

haptic("light");
openScreen("plan");

$("planResult").innerHTML = `
<b>Без подушки</b><br>
${money(d.no.m)} / мес · ${d.no.mo} мес
<br><br>
<b>С подушкой</b><br>
${money(d.safe.m)} + ${money(d.safe.s)} · ${d.safe.mo} мес
`;
};

// renders
function renderPlan(){
const p = calculate();
if (!p) $("planResult").innerHTML = "План не выбран";
}

function renderProgress(){
$("progressResult").innerHTML = "Прогресс будет здесь";
}

function renderRisk(){
$("riskResult").innerHTML = "Protocol адаптируется к рискам";
}
