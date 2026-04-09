/**
 * Protocol Finance — Global Internationalization Layer
 *
 * Lightweight i18n system supporting Russian (ru) and English (en).
 * Loaded AFTER state-manager.js, BEFORE app.js.
 *
 * Public API:
 *   t(key, vars?)        — translate key, optional interpolation {var}
 *   getCurrentLanguage()  — returns "ru" | "en"
 *   applyLanguageToDOM()  — applies translations to all [data-i18n] elements
 *   getMonthName(idx)     — localized month name (0-based)
 *   getMonthNameShort(idx) — localized short month name
 *   getMonthNameGenitive(idx) — localized genitive month name (for dates)
 *   fmtAmount(n)          — format number with currency using settings
 *   fmtNum(n)             — format number with thousands separator only
 */
(function (global) {
  "use strict";

  var I18N = {
    ru: {
      // ── Navigation ──
      "nav.calc": "Расчёт",
      "nav.protocol": "Protocol",
      "nav.accounts": "Счета",
      "nav.goals": "Цели",
      "nav.expenses": "Расходы",

      // ── Calc screen ──
      "calc.title": "Расчёт",
      "calc.income": "Доход",
      "calc.income.hint": "Укажите ваш ежемесячный доход после налогов",
      "calc.expenses": "Расходы",
      "calc.expenses.hint": "Сумма обязательных ежемесячных расходов",
      "calc.goal": "Цель",
      "calc.goal.hint": "Сумма, которую вы хотите накопить",
      "calc.saved": "Уже накоплено",
      "calc.saved.hint": "Сумма, которую вы уже накопили",
      "calc.mode": "Режим накопления",
      "calc.mode.calm": "Спокойно",
      "calc.mode.normal": "Умеренно",
      "calc.mode.aggressive": "Агрессивно",
      "calc.continue": "Продолжить",
      "calc.resetPlan": "Начать сначала",

      // ── Plan summary ──
      "calc.factPlaceholder": "Сколько вы отложили",
      "plan.current": "Текущий план",
      "plan.perMonth": "/ месяц",
      "plan.approx": "Примерно",
      "plan.months": "месяцев",
      "plan.mode": "Режим",
      "plan.changePace": "Изменить темп накоплений",
      "plan.addDebts": "Добавить кредиты и долги",

      // ── Flexible model ──
      "flex.toggle": "Гибкая финансовая модель",
      "flex.income.title": "Ваш доход",
      "flex.income.subtitle": "Как вы получаете деньги?",
      "flex.income.hint": "Это нужно, чтобы точно понимать, когда у вас появляются деньги",
      "flex.expense.title": "Ваши расходы",
      "flex.expense.subtitle": "Как происходят ваши расходы?",
      "flex.expense.hint": "Это влияет на расчёт свободных средств и срок достижения цели",
      "flex.configured": "Настроено",
      "flex.fixed": "Фиксированный",
      "flex.variable": "Нефиксированный",
      "flex.freq.label.income": "Как часто вы получаете доход?",
      "flex.freq.label.expense": "Как часто вы тратите деньги?",
      "flex.freq.monthly": "Ежемесячно",
      "flex.freq.weekly": "Раз в неделю",
      "flex.freq.biweekly": "Раз в 2 нед.",
      "flex.freq.custom": "Свой график",
      "flex.customDays.income": "Выберите дни месяца, когда приходит доход",
      "flex.customDays.expense": "Выберите дни месяца, когда происходят расходы",
      "flex.model.title": "Ваша модель",
      "flex.events.title": "Финансовые события",
      "flex.events.subtitle": "Добавляйте реальные поступления и расходы",
      "flex.events.hint": "Отслеживайте каждое финансовое событие для точного прогноза",
      "flex.events.add": "+ Добавить событие",
      "flex.incomeAmount.placeholder": "Сумма дохода",
      "flex.expenseAmount.placeholder": "Сумма расхода",

      // ── Lock overlay ──
      "lock.reset": "Начать сначала",

      // ── Protocol / Advice ──
      "advice.title": "Protocol",
      "advice.loading": "Protocol анализирует данные…",
      "advice.loadFailed": "Не удалось загрузить график.",

      // ── Scenario cards ──
      "scenario.direct": "Всё в цель",
      "scenario.buffer": "С резервом",
      "scenario.toGoal": "В цель",
      "scenario.toReserve": "В резерв",
      "scenario.perMonth": "/ мес",
      "scenario.term": "Срок",
      "scenario.months": "мес",
      "scenario.risk": "Риск",
      "scenario.riskHigh": "Выше",
      "scenario.riskLow": "Ниже",
      "scenario.reserveInfo": "Резерв",
      "scenario.reserveDesc": "Это ваша подушка безопасности. Эти средства можно откладывать на отдельный накопительный или инвестиционный счёт.\n\nРезерв защищает от непредвиденных расходов и снижает риск срыва цели.",
      "scenario.sheet.title": "Как копим?",
      "scenario.noBuf": "Без подушки",
      "scenario.noBuf.desc": "Все деньги идут напрямую в цель.",
      "scenario.withBuf": "С подушкой",
      "scenario.withBuf.desc": "Часть средств идёт в резерв — защита от непредвиденных расходов.",

      // ── History ──
      "history.title": "История счёта",
      "history.mainAccount": "История основного счёта",
      "history.initialBalance": "Начальный баланс",
      "history.deposited": "Отложено",

      // ── Accounts ──
      "accounts.title": "Счета",
      "accounts.main": "Основной счёт",
      "accounts.saved": "Накоплено",
      "accounts.reserve": "Резерв",
      "accounts.reserveSub": "Подушка безопасности",
      "accounts.mainHint": "Этот счёт отражает ваши накопления по плану Protocol. Это может быть банковский или инвестиционный счёт либо наличные — главное, чтобы сумма соответствовала расчётам.",
      "accounts.reserveHint": "Резерв — это средства для экстренных ситуаций. Эти деньги не участвуют в достижении цели и используются только при необходимости.",
      "accounts.newAccount": "Новый счёт",
      "accounts.newAccountHint": "Здесь будет создание нового счёта.",
      "accounts.statsTitle": "Статистика счёта",
      "accounts.storageType": "Тип хранения",
      "accounts.cash": "Наличные",
      "accounts.stock": "Фондовый рынок",
      "accounts.deposit": "Вклад / копилка в банке",
      "accounts.metals": "Драгоценные металлы",
      "accounts.addStats": "Добавить статистику",
      "accounts.country": "Страна",
      "accounts.selectCountry": "Выберите страну",
      "accounts.currency": "Валюта",
      "accounts.selectCurrency": "Выберите валюту",
      "accounts.account": "Счёт",

      // ── Monthly status ──
      "monthly.deposited": "Внесено",
      "monthly.complete": "Полностью",
      "monthly.completeValue": "отложено",

      // ── Goals ──
      "goals.title": "Цели",
      "goals.active": "Активная цель",
      "goals.default": "Основная цель",
      "goals.goalLabel": "Цель",
      "goals.savedLabel": "Накоплено",
      "goals.paused": "На паузе",
      "goals.analyzing": "Protocol анализирует цель…",
      "goals.advancedSettings": "Расширенные настройки",
      "goals.goalN": "Цель {n}",
      "goals.reserveHint": "Эти средства не участвуют в достижении цели и используются как подушка безопасности.",

      // ── Goal verdicts ──
      "verdict.paused": "Цель на паузе — средства не начисляются.",
      "verdict.complete": "Цель достигнута. Protocol фиксирует успех.",
      "verdict.almostDone": "Цель близка к завершению. Темп хороший.",
      "verdict.inProgress": "Цель в процессе. Стабильность важнее скорости.",

      // ── Goal editor ──
      "goalEdit.title": "Редактирование цели",
      "goalEdit.name": "Название цели",
      "goalEdit.namePlaceholder": "Например: Квартира",
      "goalEdit.amount": "Сумма цели",
      "goalEdit.save": "Готово",

      // ── Goal history ──
      "goalHistory.title": "История целей",
      "goalHistory.empty": "Завершённых целей пока нет",
      "goalHistory.achieved": "Достигнута за {n} мес.",

      // ── Advanced settings ──
      "advanced.title": "Расширенные настройки",
      "advanced.newGoal": "Новая цель",
      "advanced.newGoalDesc": "Создайте новую цель и управляйте несколькими накоплениями одновременно",
      "advanced.deadlines": "Управление сроками целей",
      "advanced.deadlinesDesc": "Продлите или сократите срок достижения своих целей",
      "advanced.priorities": "Приоритеты накоплений",
      "advanced.prioritiesDesc": "Определите, какая цель важнее — и перераспределите средства",

      // ── Advanced goals ──
      "advGoals.title": "Ваши цели",
      "advGoals.add": "+ Добавить цель",
      "advGoals.sheetTitle": "Новая цель",
      "advGoals.goalName": "Название цели",
      "advGoals.goalNamePlaceholder": "Например: Машина",
      "advGoals.goalAmount": "Сумма цели",
      "advGoals.priority": "Приоритет",
      "advGoals.mainGoal": "Основная цель",
      "advGoals.save": "Сохранить",

      // ── Goal timeline ──
      "timeline.title": "Сроки целей",
      "timeline.manage": "Управление сроками",
      "timeline.hint": "Увеличивайте или сокращайте срок достижения каждой цели. Изменения применяются после сохранения.",

      // ── Goal priority ──
      "priority.title": "Приоритеты",
      "priority.manage": "Приоритеты и порядок",
      "priority.hint": "Определите приоритет каждой цели и порядок распределения средств",

      // ── Expenses ──
      "expenses.title": "Расходы",
      "expenses.spent": "Потрачено",
      "expenses.remaining": "Осталось",
      "expenses.addExpense": "Добавить расход",
      "expenses.addFirst": "Добавьте первый расход, чтобы начать отслеживание бюджета",
      "expenses.limitExceeded": "Лимит превышен на {amount}",
      "expenses.addPrompt": "Добавьте расход",
      "expenses.newExpense": "Новый расход",
      "expenses.category": "Категория",
      "expenses.amount": "Сумма",
      "expenses.date": "Дата",
      "expenses.note": "Заметка (необязательно)",
      "expenses.notePlaceholder": "Комментарий",
      "expenses.saveExpense": "Сохранить расход",
      "expenses.emptyCategory": "Здесь пока нет расходов",
      "expenses.emptyCategorySub": "Добавьте первый расход в этой категории",

      // ── Expense categories ──
      "cat.food": "Продукты",
      "cat.transport": "Транспорт",
      "cat.cafe": "Кафе и рестораны",
      "cat.home": "Дом",
      "cat.subs": "Подписки",
      "cat.fun": "Развлечения",
      "cat.health": "Здоровье",
      "cat.clothes": "Одежда",
      "cat.other": "Прочее",

      // ── Profile ──
      "profile.title": "Профиль",
      "profile.user": "Пользователь",
      "profile.settings": "⚙️ Настройки",
      "profile.goalHistory": "📋 История целей",
      "profile.resetPlan": "🔄 Сбросить план",

      // ── Confirm reset ──
      "reset.text": "Если вы нажмёте «Начать сначала», весь прогресс и накопления будут сброшены.",
      "reset.cancel": "Отменить",
      "reset.confirm": "Начать сначала",

      // ── Unexpected expense ──
      "unexpected.title": "Непредвиденный расход",
      "unexpected.desc": "Этот механизм фиксирует внеплановые расходы. После подтверждения Protocol пересчитает финансовый план, скорректирует срок цели и обновит аналитику.",
      "unexpected.fromGoal": "Потратил из накоплений",
      "unexpected.fromGoalDesc": "Сумма будет вычтена из основного счёта",
      "unexpected.fromReserve": "Потратил из резерва",
      "unexpected.fromReserveDesc": "Сумма будет вычтена из резервного счёта",
      "unexpected.skip": "Пропускаю взнос",
      "unexpected.skipDesc": "Этот месяц будет пропущен в плане",
      "unexpected.amount": "Сумма расхода",
      "unexpected.confirm": "Подтвердить",
      "unexpected.skipConfirm": "Подтвердить пропуск",
      "unexpected.skipInfo": "Месяц будет пропущен. Срок цели увеличится на 1 месяц.",

      // ── Pace ──
      "pace.title": "Темп накоплений",
      "pace.current": "Текущий темп",
      "pace.currentSaving": "Сейчас вы откладываете",
      "pace.perMonth": "/ мес",
      "pace.goalAchieved": "Текущая цель будет достигнута за",
      "pace.months": "мес",
      "pace.selectNew": "Выберите новый темп",
      "pace.save": "Сохранить темп накоплений",
      "pace.increased": "Ваш темп увеличится.\nВы будете откладывать на {amount} больше в месяц.\nСрок достижения цели сократится на {months} мес.",
      "pace.decreased": "Ваш темп уменьшится.\nВы будете откладывать на {amount} меньше в месяц.\nСрок достижения цели увеличится на {months} мес.",
      "pace.newVolume": "Новый объём накоплений",
      "pace.newTerm": "Новый срок",

      // ── Debts ──
      "debts.title": "Кредиты и долги",
      "debts.totalDebt": "Общий долг",
      "debts.remaining": "Осталось выплатить",
      "debts.nextPayment": "Ближайший платёж",
      "debts.planToggle": "Учитывать долги отдельно в расчёте",
      "debts.planHint": "Если включено — ежемесячные платежи по долгам будут уменьшать свободные средства для накоплений",
      "debts.accounted": "Платежи учтены в финансовом плане",
      "debts.tracked": "Долги отслеживаются, но не влияют на расчёт",
      "debts.addDebt": "Добавить кредит или долг",
      "debts.repayLabel": "На сколько вы погасили долг",
      "debts.repayBtn": "Зафиксировать погашение",
      "debts.newDebt": "Новый кредит / долг",
      "debts.type": "Тип",
      "debts.credit": "Кредит",
      "debts.debt": "Долг",
      "debts.installment": "Рассрочка",
      "debts.card": "Карта",
      "debts.creditCard": "Кредитная карта",
      "debts.name": "Название",
      "debts.namePlaceholder": "Например: Ипотека",
      "debts.totalAmount": "Общая сумма",
      "debts.remainingAmount": "Осталось выплатить",
      "debts.monthlyPayment": "Ежемесячный платёж",
      "debts.nextDate": "Дата следующего платежа",
      "debts.endDate": "Дата окончания",
      "debts.creditLimit": "Кредитный лимит",
      "debts.freeLimit": "Свободный лимит",
      "debts.note": "Комментарий (необязательно)",
      "debts.notePlaceholder": "Заметка",
      "debts.save": "Сохранить",
      "debts.entryQuestion": "Учтены ли кредиты и долги в указанной вами сумме расходов?",
      "debts.entryHint": "Это поможет Protocol точнее рассчитать ваш финансовый план",
      "debts.entryNo": "Нет",
      "debts.entryYes": "Да, примерно",
      "debts.paymentHistory": "История платежей пуста",
      "debts.paymentHistorySub": "Погашения появятся здесь",
      "debts.breakdown.from": "Из последних {amount}:",
      "debts.breakdown.toDebt": "→ в долг",
      "debts.breakdown.toSavings": "→ в накопления",

      // ── Event editor ──
      "event.title": "Новое событие",
      "event.type": "Тип",
      "event.income": "Доход",
      "event.expense": "Расход",
      "event.amount": "Сумма",
      "event.date": "Дата",
      "event.add": "Добавить",

      // ── Mode names ──
      "mode.calm": "Спокойный",
      "mode.normal": "Умеренный",
      "mode.aggressive": "Агрессивный",

      // ── Engine advice ──
      "engine.noBalance": "Сначала нужно привести расходы и доходы в баланс.",
      "engine.longTerm": "Цель долгосрочная — подумайте, готовы ли вы ждать так долго.",
      "engine.aggressive": "Агрессивный режим требует дисциплины и стабильного дохода.",
      "engine.tooLow": "Вы откладываете слишком мало — цель будет достигаться медленно.",
      "engine.stable": "План выглядит устойчивым и реалистичным.",

      // ── Months (nominative) ──
      "month.0": "Январь",
      "month.1": "Февраль",
      "month.2": "Март",
      "month.3": "Апрель",
      "month.4": "Май",
      "month.5": "Июнь",
      "month.6": "Июль",
      "month.7": "Август",
      "month.8": "Сентябрь",
      "month.9": "Октябрь",
      "month.10": "Ноябрь",
      "month.11": "Декабрь",

      // ── Months (genitive, for dates) ──
      "monthGen.0": "января",
      "monthGen.1": "февраля",
      "monthGen.2": "марта",
      "monthGen.3": "апреля",
      "monthGen.4": "мая",
      "monthGen.5": "июня",
      "monthGen.6": "июля",
      "monthGen.7": "августа",
      "monthGen.8": "сентября",
      "monthGen.9": "октября",
      "monthGen.10": "ноября",
      "monthGen.11": "декабря",

      // ── Settings (already existed in settings IIFE, now centralized) ──
      "settings.title": "Настройки",
      "settings.section.finance": "Финансы",
      "settings.currency": "Валюта",
      "settings.currency.hint": "Используется для отображения сумм в приложении",
      "settings.section.plan": "План",
      "settings.carryOver": "Автоматически переносить остаток",
      "settings.carryOver.on": "Остаток за месяц будет автоматически переноситься на следующий период",
      "settings.carryOver.off": "Неиспользованный остаток не будет учитываться в следующем периоде",
      "settings.allocation": "Приоритет распределения",
      "settings.allocation.hint": "Определяет, как свободные деньги распределяются внутри плана",
      "settings.allocation.goal": "Всё в цель",
      "settings.allocation.buffer": "С резервом",
      "settings.allowOverpay": "Разрешить перевыполнение плана",
      "settings.allowOverpay.on": "Можно откладывать больше плана — лишняя сумма будет учтена в следующих периодах",
      "settings.allowOverpay.off": "Сумма выше плана не будет переноситься как перевыполнение",
      "settings.section.interface": "Интерфейс",
      "settings.animations": "Анимации",
      "settings.animations.hint": "Управляет плавными анимациями интерфейса",
      "settings.numberFormat": "Формат чисел",
      "settings.numberFormat.hint": "Выберите, как отображать разделители тысяч",
      "settings.section.notifications": "Уведомления",
      "settings.notifications": "Напоминания",
      "settings.notifications.hint": "Напоминания помогут не пропускать взносы и выплаты",
      "settings.depositReminder": "Напоминание о внесении",
      "settings.debtReminder": "Напоминание о долгах",
      "settings.reminderTime": "Время напоминаний",
      "settings.section.language": "Язык",
      "settings.language": "Язык интерфейса",
      "settings.language.hint": "Язык интерфейса приложения",

      // ── Stats / purchasing power ──
      "stats.purchasingPower": "Покупательная способность",
      "stats.extraMonthly": "/ месяц",

      // ── History ──
      "history.reserveTitle": "История резерва",
      "history.mainTitle": "История основного счёта",

      // ── Toasts ──
      "toast.debtRepaid": "Часть суммы направлена на погашение долга",
      "toast.insufficientReserve": "Недостаточно средств в резерве.",

      // ── Monthly Status ──
      "status.onTrack": "Ты идёшь по плану или лучше. Всё под контролем.",
      "status.slightlyBehind": "Есть небольшое отставание. Пока не критично.",
      "status.behind": "Ты заметно отстаёшь от плана. Стоит пересмотреть стратегию.",

      // ── Flexible Model ──
      "flex.noDataTitle": "Заполните гибкую финансовую модель",
      "flex.noDataHint": "Добавьте хотя бы одно событие дохода через «Добавить событие», чтобы Protocol рассчитал прогноз.",
      "flex.addIncomeHint": "Добавьте событие дохода, чтобы построить прогноз",
      "flex.noData": "Гибкий (нет данных)",
      "flex.income": "Доход",
      "flex.expense": "Расход",
      "flex.expenses": "Расходы",

      // ── Frequency Labels ──
      "freq.weekly": "раз в неделю",
      "freq.biweekly": "раз в 2 недели",
      "freq.monthly": "ежемесячно",
      "freq.custom": "свой график",
      "freq.fixed": "фиксированный",
      "freq.variable": "нефиксированный",
      "freq.fixedPlural": "фиксированные",
      "freq.variablePlural": "нефиксированные",

      // ── Goal Edit Warnings ──
      "goalEdit.warn3x": "Цель увеличена более чем в 3 раза. План станет значительно длиннее — убедитесь, что это осознанное решение.",
      "goalEdit.warn2x": "Цель увеличена в 2 раза. Срок и нагрузка изменятся.",
      "goalEdit.warnIncrease": "Цель заметно увеличена. Protocol пересчитает план.",

      // ── Misc ──
      "misc.perWeek": "в неделю",
      "misc.perBiweek": "раз в 2 недели",
      "misc.from": "из",
      "misc.saved": "Накоплено",
      "misc.goalLabel": "Цель",
      "misc.monthShort": "мес",
      "misc.monthFull": "месяц",
      "misc.monthsFull": "месяцев",
      "misc.inSavings": "в накопления",
      "misc.exceeded": "Превышен на",
      "misc.required": "Потребуется откладывать",
      "misc.saving": "Откладывается",
      "misc.noTitle": "Без названия",
      "misc.inflation": "Текущая инфляция",
      "misc.required.field": "Обязательное поле",
      "misc.overview": "Обзор",

      // ── Events ──
      "events.tooManySkips": "Уже {count} пропущенных месяцев. Стоит пересмотреть план или режим.",
      "events.frequentExpenses": "Частые расходы из накоплений замедляют цель. Подумайте о резервном фонде.",
      "events.unexpectedSingle": "Зафиксирован непредвиденный расход. План скорректирован.",
      "events.unexpectedMultiple": "Непредвиденных расходов: {count}. План пересчитан.",

      // ── Flow / Protocol ──
      "flow.analyzing": "Protocol анализирует данные…",
      "flow.bufferChosen": "Часть средств будет направляться в резерв.",
      "flow.directChosen": "Все средства идут напрямую в цель.",
      "flow.done": "Готово."
    },

    en: {
      // ── Navigation ──
      "nav.calc": "Plan",
      "nav.protocol": "Protocol",
      "nav.accounts": "Accounts",
      "nav.goals": "Goals",
      "nav.expenses": "Expenses",

      // ── Calc screen ──
      "calc.title": "Plan",
      "calc.income": "Income",
      "calc.income.hint": "Your monthly income after taxes",
      "calc.expenses": "Expenses",
      "calc.expenses.hint": "Total mandatory monthly expenses",
      "calc.goal": "Goal",
      "calc.goal.hint": "The amount you want to save",
      "calc.saved": "Already saved",
      "calc.saved.hint": "The amount you have already saved",
      "calc.mode": "Saving mode",
      "calc.mode.calm": "Relaxed",
      "calc.mode.normal": "Moderate",
      "calc.mode.aggressive": "Aggressive",
      "calc.continue": "Continue",
      "calc.resetPlan": "Start over",
      "calc.factPlaceholder": "How much did you save",

      // ── Plan summary ──
      "plan.current": "Current plan",
      "plan.perMonth": "/ month",
      "plan.approx": "Approximately",
      "plan.months": "months",
      "plan.mode": "Mode",
      "plan.changePace": "Change saving pace",
      "plan.addDebts": "Add loans and debts",

      // ── Flexible model ──
      "flex.toggle": "Flexible financial model",
      "flex.income.title": "Your income",
      "flex.income.subtitle": "How do you receive money?",
      "flex.income.hint": "This helps us understand when your money arrives",
      "flex.expense.title": "Your expenses",
      "flex.expense.subtitle": "How do your expenses occur?",
      "flex.expense.hint": "This affects free cash calculation and goal timeline",
      "flex.configured": "Configured",
      "flex.fixed": "Fixed",
      "flex.variable": "Variable",
      "flex.freq.label.income": "How often do you receive income?",
      "flex.freq.label.expense": "How often do you spend money?",
      "flex.freq.monthly": "Monthly",
      "flex.freq.weekly": "Weekly",
      "flex.freq.biweekly": "Biweekly",
      "flex.freq.custom": "Custom",
      "flex.customDays.income": "Select the days you receive income",
      "flex.customDays.expense": "Select the days expenses occur",
      "flex.model.title": "Your model",
      "flex.events.title": "Financial events",
      "flex.events.subtitle": "Add real income and expense events",
      "flex.events.hint": "Track every financial event for accurate forecasting",
      "flex.events.add": "+ Add event",
      "flex.incomeAmount.placeholder": "Income amount",
      "flex.expenseAmount.placeholder": "Expense amount",

      // ── Lock overlay ──
      "lock.reset": "Start over",

      // ── Protocol / Advice ──
      "advice.title": "Protocol",
      "advice.loading": "Protocol is analyzing your data…",
      "advice.loadFailed": "Failed to load the chart.",

      // ── Scenario cards ──
      "scenario.direct": "All to goal",
      "scenario.buffer": "With reserve",
      "scenario.toGoal": "To goal",
      "scenario.toReserve": "To reserve",
      "scenario.perMonth": "/ mo",
      "scenario.term": "Term",
      "scenario.months": "mo",
      "scenario.risk": "Risk",
      "scenario.riskHigh": "Higher",
      "scenario.riskLow": "Lower",
      "scenario.reserveInfo": "Reserve",
      "scenario.reserveDesc": "This is your safety cushion. You can keep these funds in a separate savings or investment account.\n\nThe reserve protects against unexpected expenses and reduces the risk of missing your goal.",
      "scenario.sheet.title": "How to save?",
      "scenario.noBuf": "No cushion",
      "scenario.noBuf.desc": "All money goes directly toward the goal.",
      "scenario.withBuf": "With cushion",
      "scenario.withBuf.desc": "Part of the funds goes to a reserve — protection against unexpected expenses.",

      // ── History ──
      "history.title": "Account History",
      "history.mainAccount": "Main Account History",
      "history.initialBalance": "Initial balance",
      "history.deposited": "Deposited",

      // ── Accounts ──
      "accounts.title": "Accounts",
      "accounts.main": "Main Account",
      "accounts.saved": "Saved",
      "accounts.reserve": "Reserve",
      "accounts.reserveSub": "Emergency fund",
      "accounts.mainHint": "This account reflects your savings under the Protocol plan. It can be a bank account, investment account, or cash — as long as the amount matches your calculations.",
      "accounts.reserveHint": "The reserve is for emergencies. These funds are not used toward your goal and are only touched when necessary.",
      "accounts.newAccount": "New Account",
      "accounts.newAccountHint": "New account creation will be here.",
      "accounts.statsTitle": "Account Statistics",
      "accounts.storageType": "Storage type",
      "accounts.cash": "Cash",
      "accounts.stock": "Stock market",
      "accounts.deposit": "Bank deposit / savings",
      "accounts.metals": "Precious metals",
      "accounts.addStats": "Add statistics",
      "accounts.country": "Country",
      "accounts.selectCountry": "Select country",
      "accounts.currency": "Currency",
      "accounts.selectCurrency": "Select currency",
      "accounts.account": "Account",

      // ── Monthly status ──
      "monthly.deposited": "Deposited",
      "monthly.complete": "Fully",
      "monthly.completeValue": "deposited",

      // ── Goals ──
      "goals.title": "Goals",
      "goals.active": "Active goal",
      "goals.default": "Main Goal",
      "goals.goalLabel": "Goal",
      "goals.savedLabel": "Saved",
      "goals.paused": "Paused",
      "goals.analyzing": "Protocol is analyzing the goal…",
      "goals.advancedSettings": "Advanced settings",
      "goals.goalN": "Goal {n}",
      "goals.reserveHint": "These funds are not used toward the goal and serve as an emergency cushion.",

      // ── Goal verdicts ──
      "verdict.paused": "Goal is paused — no funds are being allocated.",
      "verdict.complete": "Goal achieved. Protocol records your success.",
      "verdict.almostDone": "Goal is nearly complete. You're on track.",
      "verdict.inProgress": "Goal in progress. Consistency matters more than speed.",

      // ── Goal editor ──
      "goalEdit.title": "Edit Goal",
      "goalEdit.name": "Goal name",
      "goalEdit.namePlaceholder": "e.g. Apartment",
      "goalEdit.amount": "Goal amount",
      "goalEdit.save": "Done",

      // ── Goal history ──
      "goalHistory.title": "Goal History",
      "goalHistory.empty": "No completed goals yet",
      "goalHistory.achieved": "Achieved in {n} mo.",

      // ── Advanced settings ──
      "advanced.title": "Advanced Settings",
      "advanced.newGoal": "New Goal",
      "advanced.newGoalDesc": "Create a new goal and manage multiple savings targets at once",
      "advanced.deadlines": "Manage goal timelines",
      "advanced.deadlinesDesc": "Extend or shorten the timeline for each goal",
      "advanced.priorities": "Savings priorities",
      "advanced.prioritiesDesc": "Decide which goal matters most and reallocate funds",

      // ── Advanced goals ──
      "advGoals.title": "Your Goals",
      "advGoals.add": "+ Add Goal",
      "advGoals.sheetTitle": "New Goal",
      "advGoals.goalName": "Goal name",
      "advGoals.goalNamePlaceholder": "e.g. Car",
      "advGoals.goalAmount": "Goal amount",
      "advGoals.priority": "Priority",
      "advGoals.mainGoal": "Main Goal",
      "advGoals.save": "Save",

      // ── Goal timeline ──
      "timeline.title": "Goal Timelines",
      "timeline.manage": "Manage timelines",
      "timeline.hint": "Extend or shorten the timeline for each goal. Changes are applied after saving.",

      // ── Goal priority ──
      "priority.title": "Priorities",
      "priority.manage": "Priorities & order",
      "priority.hint": "Set the priority for each goal and the order of fund allocation",

      // ── Expenses ──
      "expenses.title": "Expenses",
      "expenses.spent": "Spent",
      "expenses.remaining": "Remaining",
      "expenses.addExpense": "Add expense",
      "expenses.addFirst": "Add your first expense to start tracking your budget",
      "expenses.limitExceeded": "Limit exceeded by {amount}",
      "expenses.addPrompt": "Add an expense",
      "expenses.newExpense": "New Expense",
      "expenses.category": "Category",
      "expenses.amount": "Amount",
      "expenses.date": "Date",
      "expenses.note": "Note (optional)",
      "expenses.notePlaceholder": "Comment",
      "expenses.saveExpense": "Save expense",
      "expenses.emptyCategory": "No expenses here yet",
      "expenses.emptyCategorySub": "Add the first expense in this category",

      // ── Expense categories ──
      "cat.food": "Groceries",
      "cat.transport": "Transport",
      "cat.cafe": "Dining out",
      "cat.home": "Home",
      "cat.subs": "Subscriptions",
      "cat.fun": "Entertainment",
      "cat.health": "Health",
      "cat.clothes": "Clothing",
      "cat.other": "Other",

      // ── Profile ──
      "profile.title": "Profile",
      "profile.user": "User",
      "profile.settings": "⚙️ Settings",
      "profile.goalHistory": "📋 Goal History",
      "profile.resetPlan": "🔄 Reset Plan",

      // ── Confirm reset ──
      "reset.text": "If you press \"Start over\", all progress and savings will be reset.",
      "reset.cancel": "Cancel",
      "reset.confirm": "Start over",

      // ── Unexpected expense ──
      "unexpected.title": "Unexpected Expense",
      "unexpected.desc": "This records unplanned expenses. After confirmation, Protocol will recalculate your financial plan, adjust the goal timeline, and update analytics.",
      "unexpected.fromGoal": "Spent from savings",
      "unexpected.fromGoalDesc": "The amount will be deducted from the main account",
      "unexpected.fromReserve": "Spent from reserve",
      "unexpected.fromReserveDesc": "The amount will be deducted from the reserve account",
      "unexpected.skip": "Skip this deposit",
      "unexpected.skipDesc": "This month will be skipped in the plan",
      "unexpected.amount": "Expense amount",
      "unexpected.confirm": "Confirm",
      "unexpected.skipConfirm": "Confirm skip",
      "unexpected.skipInfo": "This month will be skipped. Goal timeline extends by 1 month.",

      // ── Pace ──
      "pace.title": "Saving Pace",
      "pace.current": "Current pace",
      "pace.currentSaving": "Currently saving",
      "pace.perMonth": "/ mo",
      "pace.goalAchieved": "Goal will be reached in",
      "pace.months": "mo",
      "pace.selectNew": "Select new pace",
      "pace.save": "Save new pace",
      "pace.increased": "Your pace will increase.\nYou'll save {amount} more per month.\nGoal timeline shortens by {months} mo.",
      "pace.decreased": "Your pace will decrease.\nYou'll save {amount} less per month.\nGoal timeline extends by {months} mo.",
      "pace.newVolume": "New monthly savings",
      "pace.newTerm": "New term",

      // ── Debts ──
      "debts.title": "Loans & Debts",
      "debts.totalDebt": "Total debt",
      "debts.remaining": "Remaining to pay",
      "debts.nextPayment": "Next payment",
      "debts.planToggle": "Track debt payments separately",
      "debts.planHint": "When enabled, monthly debt payments reduce free funds available for savings",
      "debts.accounted": "Payments accounted for in the financial plan",
      "debts.tracked": "Debts are tracked but don't affect calculations",
      "debts.addDebt": "Add loan or debt",
      "debts.repayLabel": "How much did you repay",
      "debts.repayBtn": "Record repayment",
      "debts.newDebt": "New Loan / Debt",
      "debts.type": "Type",
      "debts.credit": "Loan",
      "debts.debt": "Debt",
      "debts.installment": "Installment",
      "debts.card": "Card",
      "debts.creditCard": "Credit card",
      "debts.name": "Name",
      "debts.namePlaceholder": "e.g. Mortgage",
      "debts.totalAmount": "Total amount",
      "debts.remainingAmount": "Remaining balance",
      "debts.monthlyPayment": "Monthly payment",
      "debts.nextDate": "Next payment date",
      "debts.endDate": "End date",
      "debts.creditLimit": "Credit limit",
      "debts.freeLimit": "Available limit",
      "debts.note": "Note (optional)",
      "debts.notePlaceholder": "Note",
      "debts.save": "Save",
      "debts.entryQuestion": "Are loans and debts included in the expenses you entered?",
      "debts.entryHint": "This helps Protocol calculate your financial plan more accurately",
      "debts.entryNo": "No",
      "debts.entryYes": "Yes, roughly",
      "debts.paymentHistory": "No payment history",
      "debts.paymentHistorySub": "Repayments will appear here",
      "debts.breakdown.from": "From the last {amount}:",
      "debts.breakdown.toDebt": "→ to debt",
      "debts.breakdown.toSavings": "→ to savings",

      // ── Event editor ──
      "event.title": "New Event",
      "event.type": "Type",
      "event.income": "Income",
      "event.expense": "Expense",
      "event.amount": "Amount",
      "event.date": "Date",
      "event.add": "Add",

      // ── Mode names ──
      "mode.calm": "Relaxed",
      "mode.normal": "Moderate",
      "mode.aggressive": "Aggressive",

      // ── Engine advice ──
      "engine.noBalance": "First, you need to balance your income and expenses.",
      "engine.longTerm": "This is a long-term goal — consider whether you're ready for the wait.",
      "engine.aggressive": "Aggressive mode requires discipline and stable income.",
      "engine.tooLow": "You're saving too little — goal progress will be very slow.",
      "engine.stable": "The plan looks sustainable and realistic.",

      // ── Months (nominative) ──
      "month.0": "January",
      "month.1": "February",
      "month.2": "March",
      "month.3": "April",
      "month.4": "May",
      "month.5": "June",
      "month.6": "July",
      "month.7": "August",
      "month.8": "September",
      "month.9": "October",
      "month.10": "November",
      "month.11": "December",

      // ── Months (genitive — same in English) ──
      "monthGen.0": "January",
      "monthGen.1": "February",
      "monthGen.2": "March",
      "monthGen.3": "April",
      "monthGen.4": "May",
      "monthGen.5": "June",
      "monthGen.6": "July",
      "monthGen.7": "August",
      "monthGen.8": "September",
      "monthGen.9": "October",
      "monthGen.10": "November",
      "monthGen.11": "December",

      // ── Settings ──
      "settings.title": "Settings",
      "settings.section.finance": "Finance",
      "settings.currency": "Currency",
      "settings.currency.hint": "Used to display amounts in the app",
      "settings.section.plan": "Plan",
      "settings.carryOver": "Carry over balance automatically",
      "settings.carryOver.on": "Monthly balance will carry over to the next period",
      "settings.carryOver.off": "Unused balance will not be carried over",
      "settings.allocation": "Allocation priority",
      "settings.allocation.hint": "Controls how free money is allocated within the plan",
      "settings.allocation.goal": "All to goal",
      "settings.allocation.buffer": "With reserve",
      "settings.allowOverpay": "Allow overpayment",
      "settings.allowOverpay.on": "You can save more than planned — excess will count in future periods",
      "settings.allowOverpay.off": "Amounts above the plan will not carry forward",
      "settings.section.interface": "Interface",
      "settings.animations": "Animations",
      "settings.animations.hint": "Controls smooth UI animations",
      "settings.numberFormat": "Number format",
      "settings.numberFormat.hint": "Choose how to display thousand separators",
      "settings.section.notifications": "Notifications",
      "settings.notifications": "Reminders",
      "settings.notifications.hint": "Reminders help you stay on track with deposits and payments",
      "settings.depositReminder": "Deposit reminder",
      "settings.debtReminder": "Debt reminder",
      "settings.reminderTime": "Reminder time",
      "settings.section.language": "Language",
      "settings.language": "App language",
      "settings.language.hint": "Application interface language",

      // ── Stats / purchasing power ──
      "stats.purchasingPower": "Purchasing power",
      "stats.extraMonthly": "/ month",

      // ── History ──
      "history.reserveTitle": "Reserve History",
      "history.mainTitle": "Main Account History",

      // ── Toasts ──
      "toast.debtRepaid": "A portion has been applied to debt repayment",
      "toast.insufficientReserve": "Insufficient reserve funds.",

      // ── Monthly Status ──
      "status.onTrack": "You're on track or ahead. Everything is under control.",
      "status.slightlyBehind": "Slightly behind schedule. Not critical yet.",
      "status.behind": "You're noticeably behind. Consider revising your strategy.",

      // ── Flexible Model ──
      "flex.noDataTitle": "Set up your financial model",
      "flex.noDataHint": "Add at least one income event via 'Add Event' so Protocol can build a forecast.",
      "flex.addIncomeHint": "Add an income event to build a forecast",
      "flex.noData": "Flexible (no data)",
      "flex.income": "Income",
      "flex.expense": "Expense",
      "flex.expenses": "Expenses",

      // ── Frequency Labels ──
      "freq.weekly": "weekly",
      "freq.biweekly": "biweekly",
      "freq.monthly": "monthly",
      "freq.custom": "custom schedule",
      "freq.fixed": "fixed",
      "freq.variable": "variable",
      "freq.fixedPlural": "fixed",
      "freq.variablePlural": "variable",

      // ── Goal Edit Warnings ──
      "goalEdit.warn3x": "Goal increased by more than 3x. The plan will take significantly longer — make sure this is intentional.",
      "goalEdit.warn2x": "Goal doubled. Timeline and effort will change.",
      "goalEdit.warnIncrease": "Goal increased noticeably. Protocol will recalculate the plan.",

      // ── Misc ──
      "misc.perWeek": "per week",
      "misc.perBiweek": "biweekly",
      "misc.from": "of",
      "misc.saved": "Saved",
      "misc.goalLabel": "Goal",
      "misc.monthShort": "mo",
      "misc.monthFull": "month",
      "misc.monthsFull": "months",
      "misc.inSavings": "to savings",
      "misc.exceeded": "Exceeded by",
      "misc.required": "Monthly deposit needed",
      "misc.saving": "Saving",
      "misc.noTitle": "Untitled",
      "misc.inflation": "Current inflation",
      "misc.required.field": "Required field",
      "misc.overview": "Overview",

      // ── Events ──
      "events.tooManySkips": "{count} months skipped. Consider adjusting your plan or pace.",
      "events.frequentExpenses": "Frequent withdrawals from savings slow your goal. Consider a reserve fund.",
      "events.unexpectedSingle": "An unexpected expense was recorded. Plan adjusted.",
      "events.unexpectedMultiple": "Unexpected expenses: {count}. Plan recalculated.",

      // ── Flow / Protocol ──
      "flow.analyzing": "Protocol is analyzing your data…",
      "flow.bufferChosen": "A portion of funds will be allocated to a reserve.",
      "flow.directChosen": "All funds go directly to your goal.",
      "flow.done": "Done."
    }
  };

  // ── Public API ──────────────────────────────────────────────

  function getCurrentLanguage() {
    if (typeof getState === "function") {
      var s = getState();
      if (s && s.settings && s.settings.language) return s.settings.language;
    }
    return "ru";
  }

  function t(key, vars) {
    var lang = getCurrentLanguage();
    var dict = I18N[lang] || I18N["ru"];
    var text = dict[key] || (I18N["ru"][key]) || key;
    if (vars && typeof vars === "object") {
      Object.keys(vars).forEach(function (k) {
        text = text.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
      });
    }
    return text;
  }

  function getMonthName(idx) {
    return t("month." + idx);
  }

  function getMonthNameGenitive(idx) {
    return t("monthGen." + idx);
  }

  function getMonthNameShort(idx) {
    var full = getMonthName(idx);
    return full.substring(0, 3);
  }

  function applyLanguageToDOM() {
    var els = document.querySelectorAll("[data-i18n]");
    els.forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var text = t(key);
      if (text && text !== key) {
        el.textContent = text;
      }
    });
    var phEls = document.querySelectorAll("[data-i18n-placeholder]");
    phEls.forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      var text = t(key);
      if (text && text !== key) {
        el.placeholder = text;
      }
    });
    var csEls = document.querySelectorAll(".currency-symbol");
    csEls.forEach(function (el) {
      var sym = "₽";
      if (typeof getCurrencySymbol === "function") sym = getCurrencySymbol();
      el.textContent = sym;
    });
    var htmlEl = document.documentElement;
    if (htmlEl) htmlEl.lang = getCurrentLanguage();
  }

  function fmtNum(n) {
    var num = Math.abs(Number(n)) || 0;
    var nf = "spaces";
    if (typeof getState === "function") {
      var s = getState();
      if (s && s.settings && s.settings.numberFormat) nf = s.settings.numberFormat;
    }
    if (typeof window !== "undefined" && window._protocolNumberFormat) nf = window._protocolNumberFormat;
    var sep = (nf === "dots") ? "." : "\u00A0";
    var str = Math.round(num).toString();
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }

  function fmtAmount(n) {
    var num = Number(n) || 0;
    var sym = "₽";
    if (typeof getCurrencySymbol === "function") {
      sym = getCurrencySymbol();
    } else if (typeof window !== "undefined") {
      var c = window._protocolCurrency || "RUB";
      if (c === "USD") sym = "$";
      else if (c === "EUR") sym = "€";
    }
    return (num < 0 ? "−" : "") + fmtNum(num) + " " + sym;
  }

  // ── Expose Globally ──

  global.I18N = I18N;
  global.t = t;
  global.getCurrentLanguage = getCurrentLanguage;
  global.applyLanguageToDOM = applyLanguageToDOM;
  global.getMonthName = getMonthName;
  global.getMonthNameGenitive = getMonthNameGenitive;
  global.getMonthNameShort = getMonthNameShort;
  global.fmtNum = fmtNum;
  global.fmtAmount = fmtAmount;

})(typeof window !== "undefined" ? window : this);
