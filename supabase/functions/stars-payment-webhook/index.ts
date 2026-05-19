// TELEGRAM STARS — Edge Function: webhook оплаты Premium-подписки.
//
// При успешной оплате:
//   • UPDATE users SET is_premium=true, premium_until=now()+30d,
//                      renewal_reminder_at=NULL, premium_expired_notice_at=NULL
//     (сбрасываем оба notification-флага — новая подписка, можно слать снова).
//   • Отправляет ЭМОЦИОНАЛЬНОЕ welcome-сообщение в DM с inline-кнопкой
//     «Скорее изучить Premium» (открывает Mini App).
//   • Язык сообщения определяется по from.language_code из Telegram update.
//
// AUTO-RENEW: НЕ реализован. У нас одноразовые invoice'ы — Telegram Stars
// поддерживают true subscription через subscription_period в createInvoiceLink,
// но это отдельный refactor. Сейчас — простая 30-дневная активация + DM-
// reminder за 3 дня до окончания (см. send-renewal-reminder).
//
// DEPLOY:
//   supabase secrets set TELEGRAM_BOT_TOKEN=xxx:yyy
//   supabase secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
//   supabase secrets set MINI_APP_URL=https://your-domain.com/
//   supabase functions deploy stars-payment-webhook --no-verify-jwt
//   curl -F "url=https://<project>.supabase.co/functions/v1/stars-payment-webhook" \
//        -F "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
//        -F "allowed_updates=[\"pre_checkout_query\",\"message\"]" \
//        https://api.telegram.org/bot<TOKEN>/setWebhook

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN       = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const WEBHOOK_SECRET  = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
const SUPABASE_URL    = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MINI_APP_URL    = Deno.env.get("MINI_APP_URL") || "";

const supabase = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE)
  : null;

const PREMIUM_DAYS = 30;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function answerPreCheckoutQuery(
  queryId: string,
  ok: boolean,
  errMsg?: string,
): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pre_checkout_query_id: queryId, ok,
        ...(errMsg ? { error_message: errMsg } : {}),
      }),
    });
  } catch (e) { console.error("[stars-webhook] answerPreCheckoutQuery failed:", e); }
}

async function sendDM(
  chatId: number,
  text: string,
  inlineKeyboard?: unknown,
): Promise<void> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(inlineKeyboard ? { reply_markup: inlineKeyboard } : {}),
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn("[stars-webhook] sendDM failed:", res.status, errText);
    }
  } catch (e) { console.warn("[stars-webhook] sendDM exception:", e); }
}

// Определяет язык пользователя. Telegram присылает language_code как BCP-47
// тэг ("ru", "en", "en-US", "uk" и т.д.). Поддерживаем ru/en, всё остальное → en.
function pickLang(code: string | undefined): "ru" | "en" {
  if (!code) return "en";
  const c = code.toLowerCase();
  if (c === "ru" || c.startsWith("ru-")) return "ru";
  return "en";
}

// Форматирует дату в "19 мая" (ru) или "May 19" (en).
function formatDate(d: Date, lang: "ru" | "en"): string {
  const day = d.getDate();
  const m = d.getMonth();
  const monthsRu = [
    "января","февраля","марта","апреля","мая","июня",
    "июля","августа","сентября","октября","ноября","декабря",
  ];
  const monthsEn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (lang === "ru") return `${day} ${monthsRu[m]}`;
  return `${monthsEn[m]} ${day}`;
}

// SUBSCRIPTION ACTIVATION — централизованная логика обновления users.
async function activateSubscription(
  telegramId: number,
): Promise<{ ok: boolean; startsAt: Date; endsAt: Date }> {
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + PREMIUM_DAYS * 24 * 60 * 60 * 1000);
  if (!supabase) return { ok: false, startsAt, endsAt };

  const { error } = await supabase
    .from("users")
    .update({
      is_premium: true,
      premium_until: endsAt.toISOString(),
      // СБРАСЫВАЕМ оба notification-флага — у нас новая подписка,
      // и reminder за 3 дня + expired-notice могут быть отправлены заново.
      renewal_reminder_at: null,
      premium_expired_notice_at: null,
    })
    .eq("telegram_id", telegramId);

  if (error) {
    console.error("[stars-webhook] activateSubscription update failed:", error);
    return { ok: false, startsAt, endsAt };
  }
  console.log(`[stars-webhook] activated for tg=${telegramId}, until=${endsAt.toISOString()}`);
  return { ok: true, startsAt, endsAt };
}

// ── ЭМОЦИОНАЛЬНЫЕ ТЕКСТЫ — purchase confirmation ─────────────────────────────

function buildPurchaseText(lang: "ru" | "en", startsAt: Date, endsAt: Date): string {
  const startsStr = formatDate(startsAt, lang);
  const endsStr   = formatDate(endsAt,   lang);
  if (lang === "ru") {
    return [
      `🎉 <b>Добро пожаловать в Premium!</b>`,
      ``,
      `Спасибо, что доверился Protocol Finance — для нас это правда много значит.`,
      ``,
      `📅 Твоя подписка активна <b>с ${startsStr} по ${endsStr}</b>.`,
      ``,
      `Теперь тебе доступно всё:`,
      `   ✨ Изменение темпа накоплений`,
      `   💳 Кредиты и долги в едином плане`,
      `   🎚 Гибкая финансовая модель`,
      `   ⚙️ Расширенные настройки портфеля`,
      `   📊 Полная статистика счёта`,
      ``,
      `Готов открыть полный потенциал? 👇`,
    ].join("\n");
  }
  return [
    `🎉 <b>Welcome to Premium!</b>`,
    ``,
    `Thank you for trusting Protocol Finance — it really means a lot.`,
    ``,
    `📅 Your subscription is active <b>from ${startsStr} to ${endsStr}</b>.`,
    ``,
    `Everything is now unlocked:`,
    `   ✨ Saving pace control`,
    `   💳 Loans and debts in one plan`,
    `   🎚 Flexible financial model`,
    `   ⚙️ Advanced portfolio settings`,
    `   📊 Full account statistics`,
    ``,
    `Ready to unlock the full potential? 👇`,
  ].join("\n");
}

function buildPurchaseKeyboard(lang: "ru" | "en") {
  if (!MINI_APP_URL) return undefined; // нет MINI_APP_URL — отправим без кнопки
  const text = lang === "ru" ? "🚀 Скорее изучить Premium" : "🚀 Explore Premium now";
  return {
    inline_keyboard: [[{ text, web_app: { url: MINI_APP_URL } }]],
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  if (WEBHOOK_SECRET) {
    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (got !== WEBHOOK_SECRET) {
      console.warn("[stars-webhook] secret_token mismatch");
      return new Response("forbidden", { status: 403 });
    }
  }

  let update: any;
  try { update = await req.json(); }
  catch { return new Response("invalid_json", { status: 400 }); }

  try {
    // ── pre_checkout_query ─────────────────────────────────────────────
    if (update.pre_checkout_query) {
      const q = update.pre_checkout_query;
      const isStars = q?.currency === "XTR";
      const payload: string = q?.invoice_payload || "";
      const validPayload = payload.startsWith("premium_");
      if (isStars && validPayload) {
        await answerPreCheckoutQuery(q.id, true);
      } else {
        await answerPreCheckoutQuery(q.id, false, "Invalid invoice");
      }
      return new Response("OK");
    }

    // ── successful_payment ─────────────────────────────────────────────
    const sp = update.message?.successful_payment;
    if (sp) {
      if (sp.currency !== "XTR") return new Response("OK");

      const from = update.message?.from || {};
      const fromId = Number(from.id);
      if (!fromId) return new Response("OK");

      const payload: string = sp.invoice_payload || "";
      const expectedPrefix = `premium_${fromId}_`;
      if (!payload.startsWith(expectedPrefix)) {
        console.warn("[stars-webhook] payload prefix mismatch:", payload);
        return new Response("OK");
      }

      const result = await activateSubscription(fromId);
      if (!result.ok) return new Response("db_error", { status: 500 });

      // ── DM с эмоциональным текстом + кнопкой «Скорее изучить Premium» ──
      const lang = pickLang(from.language_code);
      await sendDM(
        fromId,
        buildPurchaseText(lang, result.startsAt, result.endsAt),
        buildPurchaseKeyboard(lang),
      );

      return new Response("OK");
    }

    return new Response("OK");
  } catch (e) {
    console.error("[stars-webhook] unhandled error:", e);
    return new Response("error", { status: 500 });
  }
});
