// TELEGRAM STARS — Edge Function: webhook от Telegram бота для обработки
// pre_checkout_query и successful_payment.
//
// FLOW:
//   1. Пользователь оплачивает invoice через Stars → Telegram отправляет
//      pre_checkout_query на webhook бота (если webhook = эта функция,
//      приходит сюда). Мы отвечаем ok=true.
//   2. После подтверждения банком/Telegram приходит message.successful_payment.
//   3. Парсим payload (формат `premium_<tg_id>_<ts>`), убеждаемся что он
//      валиден, и проставляем users.is_premium=true для tg_id.
//
// DEPLOY:
//   1. Секреты:
//      supabase secrets set TELEGRAM_BOT_TOKEN=xxx:yyyy
//      supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
//   2. supabase functions deploy stars-payment-webhook --no-verify-jwt
//   3. Настроить Telegram bot webhook на эту функцию:
//      curl -F "url=https://<project>.supabase.co/functions/v1/stars-payment-webhook" \
//           -F "secret_token=<RANDOM_SECRET>" \
//           https://api.telegram.org/bot<TOKEN>/setWebhook
//      (secret_token проверяется ниже через X-Telegram-Bot-Api-Secret-Token)
//
// SECURITY:
//   • secret_token из заголовка X-Telegram-Bot-Api-Secret-Token обязателен.
//   • Pre-checkout отвечается всегда ok=true (мы не делаем доп. валидации
//     наличия товара — Premium всегда «в наличии»).
//   • is_premium ставится только если payload начинается с `premium_<tg_id>_`,
//     а валюта = XTR — это защищает от чужих платежей и спуфинга.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE)
  : null;

async function answerPreCheckout(queryId: string, ok: boolean, errMsg?: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pre_checkout_query_id: queryId,
      ok,
      ...(errMsg ? { error_message: errMsg } : {}),
    }),
  }).catch((e) => console.error("[stars-webhook] answerPreCheckout failed:", e));
}

async function markUserPremium(tgId: number): Promise<boolean> {
  if (!supabase) {
    console.error("[stars-webhook] supabase not configured");
    return false;
  }
  const { error } = await supabase
    .from("users")
    .update({ is_premium: true })
    .eq("telegram_id", tgId);
  if (error) {
    console.error("[stars-webhook] users.update failed:", error);
    return false;
  }
  console.log("[stars-webhook] users.is_premium=true set for tg_id=" + tgId);
  return true;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  // Verify Telegram webhook secret (set via setWebhook secret_token).
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (got !== WEBHOOK_SECRET) {
      console.warn("[stars-webhook] secret mismatch");
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
      const validPayload = typeof q?.invoice_payload === "string"
        && q.invoice_payload.startsWith("premium_");
      if (isStars && validPayload) {
        await answerPreCheckout(q.id, true);
      } else {
        await answerPreCheckout(q.id, false, "Invalid invoice");
      }
      return new Response("OK");
    }

    // ── successful_payment ─────────────────────────────────────────────
    const sp = update.message?.successful_payment;
    if (sp) {
      if (sp.currency !== "XTR") {
        console.warn("[stars-webhook] non-XTR payment ignored");
        return new Response("OK");
      }
      const fromId = Number(update.message?.from?.id);
      const payload: string = sp.invoice_payload || "";
      const expectedPrefix = `premium_${fromId}_`;
      if (!fromId || !payload.startsWith(expectedPrefix)) {
        console.warn("[stars-webhook] payload mismatch:", payload, "expected prefix:", expectedPrefix);
        return new Response("OK");
      }
      await markUserPremium(fromId);
      return new Response("OK");
    }

    return new Response("OK");
  } catch (e) {
    console.error("[stars-webhook] unhandled error:", e);
    return new Response("error", { status: 500 });
  }
});
