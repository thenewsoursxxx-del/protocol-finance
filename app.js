const tg = window.Telegram?.WebApp;
tg?.expand();

/* ===== FORMAT HELPERS ===== */
function formatNumber(value) {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseNumber(value) {
  return Number(value.replace(/\./g, ""));
}

/* ===== INPUT FORMAT (MOBILE FIRST) ===== */
["income", "expenses", "saving"].forEach(id => {
  const input = document.getElementById(id);

  input.addEventListener("input", e => {
    const cursor = e.target.selectionStart;
    const before = e.target.value.length;

    e.target.value = formatNumber(e.target.value);

    const after = e.target.value.length;
    e.target.selectionEnd = cursor + (after - before);
  });
});

/* ===== CALC ===== */
document.getElementById("calculate").onclick = () => {
  const income = parseNumber(income.value);
  const expenses = parseNumber(expenses.value);
  const saving = parseNumber(saving.value);

  if (!income || !saving) {
    tg?.HapticFeedback?.notificationOccurred("error");
    return;
  }

  if (income - expenses < saving) {
    tg?.HapticFeedback?.notificationOccurred("warning");
    alert("Сумма накоплений превышает доступный доход");
    return;
  }

  tg?.HapticFeedback?.impactOccurred("medium");

  // пока просто лог — дальше подключим сценарии
  console.log({ income, expenses, saving });
};