const ProtocolCore = (() => {

  /**
   * Рассчитать финансовое состояние
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

    let pace = 0.5;
    if (mode === "calm") pace = 0.4;
    if (mode === "normal") pace = 0.5;
    if (mode === "aggressive") pace = 0.6;

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
   * Сформировать рекомендации (не приказ!)
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

    if (baseResult.pace >= 0.6) {
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
   * Объяснение «почему так»
   */
  function explain(baseResult) {
    if (!baseResult.ok) {
      return "Когда расходы больше доходов, любой план будет нестабильным.";
    }

    return `
Вы откладываете ${baseResult.monthlySave} ₽ в месяц.
Это примерно ${Math.round(baseResult.pace * 100)}% от свободных средств.
Цель будет достигнута примерно за ${baseResult.months} мес.
`;
  }

  return {
    calculateBase,
    buildAdvice,
    explain
  };
})();