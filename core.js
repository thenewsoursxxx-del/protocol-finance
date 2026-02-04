const ProtocolCore = (() => {

  /**
   * 1. Чистый расчёт
   */
  function calculateBase({ income, expenses, goal, saved = 0, mode }) {
    const free = income - expenses;

    if (free <= 0) {
      return {
        ok: false,
        reason: "negative_cashflow",
        message: "Расходы превышают доходы"
      };
    }

    let pace = 0.6;
    if (mode === "calm") pace = 0.4;
    if (mode === "normal") pace = 0.6;
    if (mode === "aggressive") pace = 0.8;

    const effectiveGoal = Math.max(goal - saved, 0);
    const monthlySave = Math.round(free * pace);
    const months = monthlySave > 0
      ? Math.ceil(effectiveGoal / monthlySave)
      : Infinity;

    return {
      ok: true,
      free,
      pace,
      monthlySave,
      months,
      effectiveGoal
    };
  }

  /**
   * 2. Сценарии (ВЫБОР, НЕ ПРИКАЗ)
   */
function buildScenarios({ income, expenses, goal, saved = 0 }) {
  const modes = [
    { mode: "calm", title: "Спокойный", pace: 0.4 },
    { mode: "normal", title: "Умеренный", pace: 0.6 },
    { mode: "aggressive", title: "Агрессивный", pace: 0.8 } // или 0.9
  ];

  return modes.map(m => {
    const free = income - expenses;
    const monthlySave = Math.round(free * m.pace);
    const effectiveGoal = Math.max(goal - saved, 0);
    const months = monthlySave > 0
      ? Math.ceil(effectiveGoal / monthlySave)
      : Infinity;

    return {
      mode: m.mode,
      title: m.title,
      monthlySave,
      months,
      risk:
        m.pace >= 0.8
          ? "Очень высокая нагрузка"
          : m.pace >= 0.6
          ? "Повышенная нагрузка"
          : "Минимальный риск"
    };
  });
}

  /**
   * 3. Рекомендации
   */
  function buildAdvice(baseResult) {
    if (!baseResult.ok) {
      return {
        tone: "warning",
        text: "Сначала нужно привести расходы и доходы в баланс."
      };
    }

    const advice = [];

    if (baseResult.months > 36) {
      advice.push("Цель долгосрочная — подумайте, готовы ли вы ждать так долго.");
    }

    if (baseResult.pace >= 0.8) {
      advice.push("Агрессивный режим требует дисциплины и стабильного дохода.");
    }

    if (baseResult.monthlySave < 0.15 * baseResult.free) {
      advice.push("Вы откладываете слишком мало — цель будет достигаться медленно.");
    }

    if (advice.length === 0) {
      advice.push("План выглядит устойчивым и реалистичным.");
    }

    return {
      tone: "neutral",
      text: advice.join(" ")
    };
  }

  /**
   * 4. Объяснение «почему так»
   */
  function explain(baseResult) {
    if (!baseResult.ok) {
      return "Когда расходы больше доходов, любой план будет нестабильным.";
    }

    return `
Свободно в месяц: ${baseResult.free.toLocaleString()} ₽
Откладываете: ${baseResult.monthlySave.toLocaleString()} ₽
Это ~${Math.round(baseResult.pace * 100)}% от свободных средств
Цель будет достигнута примерно за ${baseResult.months} мес
`;
  }

  return {
    calculateBase,
    buildScenarios,
    buildAdvice,
    explain
  };

})();