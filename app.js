const tg = window.Telegram?.WebApp;
if (tg) {
tg.expand();
tg.MainButton.hide();
}

// helpers
const $ = id => document.getElementById(id);
const format = v => v.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const parse = v => Number(v.replace(/\./g, ""));
const money = v => v.toLocaleString("de-DE") + " ₽";

// screens
const screens = document.querySelectorAll(".screen");
const tabs = document.querySelectorAll(".tg-tabs button");

function openScreen(name) {
screens.forEach(s =>
s.classList.toggle("active", s.id === "screen-" + name)
);
tabs.forEach(b =>
b.classList.toggle("active", b.dataset.screen === name)
);
}

// MOBILE: touchstart вместо click
tabs.forEach(btn => {
btn.addEventListener("touchstart", e => {
e.preventDefault();
openScreen(btn.dataset.screen);
}, { passive: false });
});

// inputs
["income", "expenses", "targetAmount"].forEach(id => {
$(id).addEventListener("input", e => {
e.target.value = format(e.target.value);
});
});

// slider
const aggression = $("aggression");
const aggrLabel = $("aggressionLabel");

function updateAgg() {
const v = +aggression.value;
aggrLabel.textContent =
v <= 40 ? "Комфортно" :
v <= 60 ? "Умеренно" :
"Агрессивно";
}
aggression.addEventListener("input", updateAgg);
updateAgg();

// calc
function calculate() {
const income = parse($("income").value);
const expenses = parse($("expenses").value);
const target = parse($("targetAmount").value);
const percent = +aggression.value / 100;

if (!income || !expenses || !target || income <= expenses) return null;

const free = income - expenses;
const monthly = Math.round(free * percent);

return {
monthly,
months: Math.ceil(target / monthly)
};
}

$("calculate").addEventListener("click", () => {
const d = calculate();
if (!d) return;

openScreen("plan");
$("planResult").innerHTML = `
Откладывать: <b>${money(d.monthly)}</b><br>
Срок: <b>${d.months} мес</b>
`;
});

// default
openScreen("calc");
