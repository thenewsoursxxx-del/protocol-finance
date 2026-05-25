// SEND-REMINDER — серверная Edge Function, шлёт пользователям Telegram-
// уведомления о необходимости записать пополнение / о приближающемся
// платеже по долгу.
//
// Триггерится Supabase Cron (pg_cron + pg_net), каждый час в :00.
// Внутри сам определяет:
//   • для каких пользователей сейчас локально "час Х" (с учётом tzOffset)
//   • кому положено напоминание по логике (simple / cashflow / debts)
//   • дедуп через reminder_log (UNIQUE constraint)
//
// Авторизация:
//   • Cron шлёт запрос с Authorization: Bearer <service_role_key>.
//   • Функция дополнительно проверяет header X-Reminder-Secret против env
//     REMINDER_CRON_SECRET (можно не использовать - для дополнительной
//     защиты от случайных вызовов).
//
// DEPLOY:
//   1. Supabase Secrets: убедиться что есть TELEGRAM_BOT_TOKEN,
//      SUPABASE_SERVICE_ROLE_KEY (есть автоматически), MINI_APP_URL.
//   2. supabase functions deploy send-reminder --no-verify-jwt
//   3. SQL Editor: настроить pg_cron (см. инструкцию в миграции
//      20260524_reminders.sql).

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN          = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const SUPABASE_URL       = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MINI_APP_URL       = Deno.env.get("MINI_APP_URL") || "";
const CRON_SECRET        = Deno.env.get("REMINDER_CRON_SECRET") || "";

const supabase = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE)
  : null;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-reminder-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function isoWeekKey(d: Date): string {
  // ISO week: год + неделя (1..53). Для cashflow custom nudge раз в неделю.
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / DAY_MS;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Сколько миллисекунд в одном "тике" частоты.
function freqIntervalMs(freq: string): number {
  switch (freq) {
    case "weekly":   return 7  * DAY_MS;
    case "biweekly": return 14 * DAY_MS;
    case "monthly":  return 30 * DAY_MS;   // приближение, достаточно для напоминаний
    default:         return 0;
  }
}

// Возвращает [periodStart, periodEnd] для cashflow-периода, содержащего now.
function currentPeriod(startISO: string, freq: string, nowMs: number): { start: Date; end: Date; idx: number } | null {
  if (!startISO) return null;
  const interval = freqIntervalMs(freq);
  if (interval <= 0) return null;
  const start = new Date(startISO + "T00:00:00Z").getTime();
  if (!Number.isFinite(start) || start > nowMs) return null;
  const idx = Math.floor((nowMs - start) / interval);
  const periodStart = new Date(start + idx * interval);
  const periodEnd   = new Date(start + (idx + 1) * interval);
  return { start: periodStart, end: periodEnd, idx };
}

// Локальное "сейчас" пользователя с учётом tzOffsetMinutes (+180 для UTC+3).
function userLocalHour(nowMs: number, tzOffsetMinutes: number): number {
  const localMs = nowMs + tzOffsetMinutes * 60 * 1000;
  return new Date(localMs).getUTCHours();
}

function parseReminderHour(reminderTime: any): number {
  if (typeof reminderTime !== "string") return 12;
  const m = reminderTime.match(/^(\d{1,2}):/);
  if (!m) return 12;
  const h = Number(m[1]);
  return Number.isFinite(h) && h >= 0 && h < 24 ? h : 12;
}

// ── Тексты ──────────────────────────────────────────────────────────────────

function pickLang(code: unknown): "ru" | "en" {
  if (typeof code !== "string") return "ru";
  const c = code.toLowerCase();
  if (c === "en" || c.startsWith("en-")) return "en";
  return "ru";
}

function textDepositSimple(lang: "ru" | "en"): string {
  if (lang === "en") {
    return [
      `📊 <b>Time to log your monthly deposit</b>`,
      ``,
      `It's been around a month since your last recorded contribution. Open Protocol and add what you saved this month - the plan stays accurate only when it sees real numbers.`,
    ].join("\n");
  }
  return [
    `📊 <b>Пора записать пополнение</b>`,
    ``,
    `Прошёл примерно месяц с последнего отмеченного взноса. Открой Protocol и запиши сколько отложил - план остаётся точным только когда видит реальные цифры.`,
  ].join("\n");
}

function textDepositCashflowPeriod(lang: "ru" | "en", freq: string): string {
  const period = lang === "ru"
    ? (freq === "weekly" ? "недели" : freq === "biweekly" ? "двух недель" : "месяца")
    : (freq === "weekly" ? "week" : freq === "biweekly" ? "two weeks" : "month");
  if (lang === "en") {
    return [
      `📊 <b>End of the ${period} - log your income</b>`,
      ``,
      `Open Protocol and add what came in this period. Without real numbers the plan can't adapt.`,
    ].join("\n");
  }
  return [
    `📊 <b>Подходит конец ${period} - запиши поступления</b>`,
    ``,
    `Открой Protocol и отметь что пришло за этот период. Без реальных цифр план не сможет адаптироваться.`,
  ].join("\n");
}

function textDepositCashflowCustom(lang: "ru" | "en"): string {
  if (lang === "en") {
    return [
      `📝 <b>Weekly reminder</b>`,
      ``,
      `Take a minute to record this week's income and expenses in Protocol. The flexible model only works when it has the real data.`,
    ].join("\n");
  }
  return [
    `📝 <b>Еженедельное напоминание</b>`,
    ``,
    `Удели минуту и запиши доходы и расходы за неделю в Protocol. Гибкая модель работает только когда у неё есть реальные данные.`,
  ].join("\n");
}

function textDebtsDue(lang: "ru" | "en", items: { title: string; amount: string; date: string }[]): string {
  if (lang === "en") {
    const lines = items.map((d) => `   • ${d.title} - ${d.amount} (${d.date})`);
    return [
      `💳 <b>Upcoming debt payments</b>`,
      ``,
      ...lines,
      ``,
      `Open Protocol to make sure money is set aside.`,
    ].join("\n");
  }
  const lines = items.map((d) => `   • ${d.title} - ${d.amount} (${d.date})`);
  return [
    `💳 <b>Скоро платежи по долгам</b>`,
    ``,
    ...lines,
    ``,
    `Открой Protocol, чтобы убедиться что средства зарезервированы.`,
  ].join("\n");
}

function openProtocolButton(lang: "ru" | "en") {
  if (!MINI_APP_URL) return undefined;
  const text = lang === "en" ? "Open Protocol" : "Открыть Protocol";
  return { inline_keyboard: [[{ text, web_app: { url: MINI_APP_URL } }]] };
}

// ── Главный handler ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "method_not_allowed" }, 405);
  }
  if (!BOT_TOKEN || !supabase) return json({ error: "not_configured" }, 500);
  if (!CRON_SECRET) {
    return json({ error: "not_configured", hint: "REMINDER_CRON_SECRET env var is required" }, 500);
  }

  // Защита: только cron-задание / админ с правильным секретом может триггерить.
  const provided = req.headers.get("x-reminder-secret") || "";
  if (provided !== CRON_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  const nowMs = Date.now();

  // Опциональный body: { force_telegram_id?: number, dry_run?: boolean }
  // force_telegram_id - обрабатывает только этого юзера и обходит проверку часа
  //                     (для ручного тестирования). Гейты notificationsEnabled
  //                     и isInitialized остаются.
  // dry_run - всё считает, но не шлёт.
  let body: any = {};
  try { body = await req.json(); } catch { /* GET / пустое тело - ok */ }
  const forceTgId: number | null = Number.isFinite(Number(body?.force_telegram_id))
    ? Number(body.force_telegram_id) : null;
  const dryRun = body?.dry_run === true;

  // ── 1. Достаём пользователей: users (chat_id) + user_state.data ──
  // Language лежит в user_state.data.settings.language - в users его нет.
  let usersQuery = supabase
    .from("users")
    .select("telegram_id, chat_id")
    .not("chat_id", "is", null);
  if (forceTgId) usersQuery = usersQuery.eq("telegram_id", forceTgId);
  const { data: users, error: usersErr } = await usersQuery;

  if (usersErr) {
    console.error("[reminder] users query failed:", usersErr);
    return json({ error: "db_query_failed", details: usersErr.message }, 500);
  }

  let scanned = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ tg: number; reason: string }> = [];

  for (const u of users || []) {
    scanned++;
    const tgId = Number(u.telegram_id);
    const chatId = Number(u.chat_id);
    if (!tgId || !chatId) { skipped++; continue; }

    // Подгружаем state
    const { data: stateRow } = await supabase
      .from("user_state")
      .select("data")
      .eq("telegram_id", tgId)
      .maybeSingle();

    const s: any = stateRow?.data || null;
    if (!s) { skipped++; continue; }

    const settings: any = s.settings || {};
    // Гейт 1: главный тоггл должен быть ON.
    if (settings.notificationsEnabled !== true) { skipped++; continue; }

    // Гейт 2: пользователь прошёл начальную настройку (иначе нет данных).
    if (s.isInitialized !== true) { skipped++; continue; }

    // Гейт 3: opt-out от любых рассылок (broadcast use only, но тоже уважаем).
    if (s.notifications_opt_out === true) { skipped++; continue; }

    const tzOffset = Number(settings.tzOffsetMinutes);
    const tz = Number.isFinite(tzOffset) ? tzOffset : 180; // дефолт UTC+3 (МСК)

    // Гейт 4: попадаем ли в "час напоминаний" пользователя?
    // force_telegram_id обходит эту проверку (для ручного теста).
    if (!forceTgId) {
      const reminderHour = parseReminderHour(settings.reminderTime);
      const localHour = userLocalHour(nowMs, tz);
      if (localHour !== reminderHour) { skipped++; continue; }
    }

    const lang = pickLang(settings.language);
    const reply_markup = openProtocolButton(lang);

    // Соберём список напоминаний для этого пользователя.
    const remindersToSend: Array<{ type: string; period_key: string; text: string }> = [];

    // ── DEPOSIT REMINDERS ─────────────────────────────────────────────────
    if (settings.depositReminderEnabled === true) {
      const fm = s.financialModel || "simple";
      const incomeType  = s.incomeType  || "fixed";
      const expenseType = s.expenseType || "fixed";
      const isVariable  = incomeType === "variable" || expenseType === "variable";
      const isCashflow  = fm === "cashflow" || isVariable;

      const factHistory: any[] = Array.isArray(s.factHistory) ? s.factHistory : [];
      const customEntries: any[] = Array.isArray(s.customScheduleEntries) ? s.customScheduleEntries : [];

      // Last deposit timestamp (ms) - смотрим и в factHistory (main, >0), и в
      // customScheduleEntries (deposited>0).
      let lastDepMs = 0;
      for (const f of factHistory) {
        if (f && f.to === "main" && Number(f.value) > 0) {
          const t = f.timestamp ? Date.parse(f.timestamp) : (f.date ? Date.parse(f.date) : 0);
          if (Number.isFinite(t) && t > lastDepMs) lastDepMs = t;
        }
      }
      for (const e of customEntries) {
        if (e && e.side === "income" && Number(e.deposited) > 0) {
          const t = e.depositedAt ? Date.parse(e.depositedAt) : 0;
          if (Number.isFinite(t) && t > lastDepMs) lastDepMs = t;
        }
      }

      // Якорная дата плана (если депозитов ещё нет): lastSavedAt или створённость user_state.
      const planAnchorMs = lastDepMs || (s.lastSavedAt ? Date.parse(s.lastSavedAt) : 0) || nowMs;

      if (isCashflow) {
        const freq = s.incomeFrequency || "monthly";
        if (freq === "custom") {
          // Custom: еженедельный nudge, чтобы пользователь записал что было.
          const key = `dep_cf_custom:${isoWeekKey(new Date(nowMs))}`;
          remindersToSend.push({
            type: "dep_cf_custom",
            period_key: key,
            text: textDepositCashflowCustom(lang),
          });
        } else if (s.incomeStartDate) {
          const period = currentPeriod(s.incomeStartDate, freq, nowMs);
          if (period) {
            // Триггер: ближе к концу периода (>= 70% пройдено) и нет записанного дохода в нём.
            const elapsed = nowMs - period.start.getTime();
            const total   = period.end.getTime() - period.start.getTime();
            if (total > 0 && elapsed / total >= 0.7) {
              // Есть ли уже запись в этом периоде?
              const hasIncomeInPeriod =
                customEntries.some((e: any) =>
                  e && e.side === "income" && Number(e.amount) > 0 &&
                  e.date && Date.parse(e.date) >= period.start.getTime() &&
                  Date.parse(e.date) < period.end.getTime()
                ) ||
                factHistory.some((f: any) =>
                  f && f.to === "main" && Number(f.value) > 0 &&
                  f.timestamp && Date.parse(f.timestamp) >= period.start.getTime() &&
                  Date.parse(f.timestamp) < period.end.getTime()
                );

              if (!hasIncomeInPeriod) {
                const key = `dep_cf_period:${isoDate(period.start)}:${freq}`;
                remindersToSend.push({
                  type: "dep_cf_period",
                  period_key: key,
                  text: textDepositCashflowPeriod(lang, freq),
                });
              }
            }
          }
        }
      } else {
        // Simple monthly: ~30 дней с anchor.
        const ageMs = nowMs - planAnchorMs;
        if (ageMs >= 30 * DAY_MS) {
          const anchorISO = new Date(planAnchorMs).toISOString().slice(0, 10);
          const key = `dep_simple:${anchorISO}`;
          remindersToSend.push({
            type: "dep_simple",
            period_key: key,
            text: textDepositSimple(lang),
          });
        }
      }
    }

    // ── DEBT REMINDERS ────────────────────────────────────────────────────
    if (settings.debtReminderEnabled === true) {
      const debts: any[] = Array.isArray(s.debts) ? s.debts : [];
      const dueSoon: { title: string; amount: string; date: string }[] = [];

      // Считаем "сегодня" в локальной TZ пользователя, а не в UTC.
      // Иначе для МСК-юзера долг на "завтра" пропадает, когда UTC-полночь
      // уже наступила а локально ещё вчера.
      const userLocalNowMs = nowMs + tz * 60 * 1000;
      const todayDateStr = new Date(userLocalNowMs).toISOString().slice(0, 10);
      const todayLocalMidnightMs = Date.parse(todayDateStr + "T00:00:00Z");

      for (const d of debts) {
        if (!d || d.isActive === false) continue;
        const remaining = Number(d.remainingAmount);
        if (!Number.isFinite(remaining) || remaining <= 0) continue;
        const nextStr = d.nextPaymentDate;
        if (typeof nextStr !== "string" || !nextStr) continue;
        const nextLocalMidnightMs = Date.parse(nextStr + "T00:00:00Z");
        if (!Number.isFinite(nextLocalMidnightMs)) continue;

        // daysUntil: 0 = сегодня, 1 = завтра, ... Считаем в локальных днях.
        const daysUntil = Math.round((nextLocalMidnightMs - todayLocalMidnightMs) / DAY_MS);
        if (daysUntil < 0 || daysUntil > 3) continue;

        const paid = Number(d.paidInCurrentPeriod) || 0;
        const monthly = Number(d.monthlyPayment) || 0;
        if (monthly > 0 && paid >= monthly) continue; // уже оплатил

        const amt = monthly > 0 ? Math.max(0, monthly - paid) : remaining;
        const fmtAmt = lang === "en"
          ? `${Math.round(amt).toLocaleString("en-US")}`
          : `${Math.round(amt).toLocaleString("ru-RU")}`;
        dueSoon.push({
          title: String(d.title || (lang === "en" ? "Loan" : "Кредит")),
          amount: fmtAmt,
          date: nextStr,
        });
      }

      if (dueSoon.length > 0) {
        const aggKey = `debt_agg:${todayDateStr}`;
        remindersToSend.push({
          type: "debt_agg",
          period_key: aggKey,
          text: textDebtsDue(lang, dueSoon),
        });
      }
    }

    // ── Шлём с rate limit и дедупом через UNIQUE ──────────────────────────
    for (const r of remindersToSend) {
      // dry_run - ничего не пишем, ничего не шлём, просто считаем.
      if (dryRun) {
        sent++;
        errors.push({ tg: tgId, reason: `DRY: ${r.type} / ${r.period_key}` });
        continue;
      }

      // Сначала пытаемся атомарно записать в лог (UNIQUE поймает дубль).
      const { error: logErr } = await supabase
        .from("reminder_log")
        .insert({
          telegram_id: tgId,
          type: r.type,
          period_key: r.period_key,
          meta: { lang },
        });

      if (logErr) {
        // 23505 = unique_violation → уже отправляли в этот период, тихо скипаем.
        const code = (logErr as any).code;
        if (code === "23505" || /duplicate/i.test(logErr.message || "")) {
          skipped++;
          continue;
        }
        console.error("[reminder] log insert failed:", logErr);
        failed++;
        errors.push({ tg: tgId, reason: "log_insert_failed" });
        continue;
      }

      // Лог записан → шлём.
      try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: r.text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
            ...(reply_markup ? { reply_markup } : {}),
          }),
        });
        if (res.ok) {
          sent++;
        } else if (res.status === 403 || res.status === 400) {
          // Заблокировал бота / неверный chat - откатываем лог
          // (чтобы при разблокировке снова сработало).
          failed++;
          await supabase.from("reminder_log")
            .delete()
            .eq("telegram_id", tgId)
            .eq("type", r.type)
            .eq("period_key", r.period_key);
          errors.push({ tg: tgId, reason: `tg_${res.status}` });
        } else if (res.status === 429) {
          const errText = await res.text();
          let retryAfter = 1100;
          try {
            const parsed = JSON.parse(errText);
            if (parsed?.parameters?.retry_after) {
              retryAfter = Math.max(retryAfter, Number(parsed.parameters.retry_after) * 1000);
            }
          } catch { /* ignore */ }
          await sleep(retryAfter);
          // Повтор один раз - лог уже стоит, дубля не будет.
          const retry = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: r.text,
              parse_mode: "HTML",
              disable_web_page_preview: true,
              ...(reply_markup ? { reply_markup } : {}),
            }),
          });
          if (retry.ok) sent++;
          else {
            failed++;
            errors.push({ tg: tgId, reason: `tg_${retry.status}_after_retry` });
            await supabase.from("reminder_log")
              .delete()
              .eq("telegram_id", tgId)
              .eq("type", r.type)
              .eq("period_key", r.period_key);
          }
        } else {
          failed++;
          const errText = await res.text();
          errors.push({ tg: tgId, reason: `tg_${res.status}: ${errText.slice(0, 100)}` });
        }
      } catch (e: any) {
        failed++;
        errors.push({ tg: tgId, reason: String(e?.message || e).slice(0, 200) });
      }

      // Pacing: 40ms между отправками = 25 msg/sec под лимит 30.
      await sleep(40);
    }
  }

  return json({
    ok: true,
    scanned, sent, skipped, failed,
    sample_errors: errors.slice(0, 10),
  });
});
