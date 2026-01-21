// ========= УТИЛИТЫ =========
const $ = id => document.getElementById(id);

function formatWithDots(v) {
return v.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function parse(v) {
return Number(v.replace(/\./g, ""));
}
function money(v) {
return v.toLocaleString("de-DE") + " ₽";
}

// ========= ЭЛЕМЕНТЫ =========
const incomeI = $("income");
const expensesI = $("expenses");
const targetI = $("targetAmount");
const aggression = $("aggression");
const result = $("result");

// формат ввода
[incomeI, expensesI, targetI].forEach(i => {
i.addEventListener("input", () => {
i.value = formatWithDots(i.value);
autoUpdate();
});
});

// ========= СЛАЙДЕР =========
function updateAggression() {
const v = Number(aggression.value);
$("aggressionValue").textContent = v + "%";
$("aggressionLabel").textContent =
v <= 40 ? "Комфортно" : v <= 60 ? "Умеренно" : "Агрессивно";
}
aggression.addEventListener("input", () => {
updateAggression();
autoUpdate();
});
updateAggression();

// ========= РАСЧЁТ =========
function calculate() {
const income = parse(incomeI.value);
const expenses = parse(expensesI.value);
const target = parse(targetI.value);
const percent = Number(aggression.value) / 100;

if (!income || !expenses || !target || income <= expenses) return null;

const free = income - expenses;
const total = Math.round(free * percent);

return {
income, expenses, target, percent, total,
noSafety: {
goal: total,
months: Math.ceil(target / total)
},
safety: {
goal: Math.round(total * 0.95),
safety: Math.max(Math.round(total * 0.05), 1),
months: Math.ceil(target / Math.round(total * 0.95))
}
};
}

// ========= СОХРАНЕНИЕ =========
function savePlan(mode, data) {
const plan = {
date: new Date().toISOString(),
mode,
...data
};
localStorage.setItem("protocolCurrent", JSON.stringify(plan));
const h = JSON.parse(localStorage.getItem("protocolHistory") || "[]");
h.push(plan);
localStorage.setItem("protocolHistory", JSON.stringify(h));
renderPlan();
}

// ========= ЭКРАНЫ =========
function renderPlan() {
const p = JSON.parse(localStorage.getItem("protocolCurrent") || "null");
if (!p) {
result.innerHTML = "План не выбран.";
return;
}

result.innerHTML = `
<div class="strategy">
<h3>📌 Текущий план</h3>
Режим: <b>${p.mode === "with_safety" ? "С подушкой" : "Без подушки"}</b><br>
Темп: <b>${Math.round(p.percent * 100)}%</b><br>
Доход: ${money(p.income)}<br>
Траты: ${money(p.expenses)}<br>
Цель: ${money(p.target)}<br>
<div class="note">Protocol автоматически адаптирует план при изменениях.</div>
</div>
`;
}

function renderProgress() {
const p = JSON.parse(localStorage.getItem("protocolCurrent") || "null");
if (!p) {
result.innerHTML = "Нет активного плана.";
return;
}

const monthly =
p.mode === "with_safety" ? Math.round(p.total * 0.95) : p.total;

let sum = 0;
let rows = "";
for (let i = 1; i <= 6; i++) {
sum += monthly;
rows += `Месяц ${i}: ${money(sum)}<br>`;
}

result.innerHTML = `
<div class="strategy">
<h3>📈 Прогресс</h3>
${rows}
<div class="note">Ожидаемый путь при текущих условиях.</div>
</div>
`;
}

function renderRisk() {
const base = calculate();
if (!base) {
result.innerHTML = "Недостаточно данных для анализа.";
return;
}

const incomeDrop = Math.round(base.income * 0.9);
const expensesGrow = Math.round(base.expenses * 1.2);
const free = incomeDrop - expensesGrow;
const possible = free > 0 ? Math.round(free * base.percent) : 0;

result.innerHTML = `
<div class="strategy">
<h3>⚠️ Сценарии риска</h3>
Доход −10%: ${money(incomeDrop)}<br>
Траты +20%: ${money(expensesGrow)}<br><br>
${
possible > 0
? `Protocol пересчитает план: ${money(possible)} / мес`
: `🔴 План временно приостановится`
}
<div class="note">
Protocol не ломает стратегию — он подстраивается под реальность.
</div>
</div>
`;
}

// ========= КНОПКИ =========
$("calculate").onclick = () => {
const d = calculate();
if (!d) {
result.innerHTML = "Проверь введённые данные.";
return;
}

result.innerHTML = `
<div class="strategy">
<h3>⚡ Без подушки</h3>
${money(d.noSafety.goal)} / мес<br>
Срок: ${d.noSafety.months} мес<br>
<button onclick='savePlan("no_safety",${JSON.stringify(d)})'>Выбрать</button>
</div>

<div class="strategy">
<h3>🛡 С подушкой</h3>
${money(d.safety.goal)} + подушка ${money(d.safety.safety)}<br>
Срок: ${d.safety.months} мес<br>
<button onclick='savePlan("with_safety",${JSON.stringify(d)})'>Выбрать</button>
</div>
`;
};

$("viewPlan").onclick = renderPlan;
$("viewProgress").onclick = renderProgress;
$("viewRisk").onclick = renderRisk;

// ========= АВТО-ОБНОВЛЕНИЕ =========
function autoUpdate() {
if (localStorage.getItem("protocolCurrent")) renderPlan();
}
