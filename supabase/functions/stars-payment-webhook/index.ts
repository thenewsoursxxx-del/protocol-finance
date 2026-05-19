// TELEGRAM STARS — Edge Function: webhook от Telegram для обработки оплаты.
//
// Telegram отправляет в эту функцию два типа update'ов:
//   1. pre_checkout_query — после нажатия "Pay" в нативном Stars-UI.
//      Мы обязаны ответить answerPreCheckoutQuery с ok=true в течение 10 секунд,
//      иначе платёж отменится.
//   2. message.successful_payment — после успешного списания. Здесь мы парсим
//      payload (формат `premium_<telegram_id>_<timestamp>`) и обновляем
//      users.is_premium = true в Supabase.
//
// ───────── DEPLOY (требуется один раз) ─────────
//   1. Секреты:
//        supabase secrets set TELEGRAM_BOT_TOKEN=xxx:yyy
//        supabase secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
//      (SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY доступны автоматически.)
//   2. Деплой:
//        supabase functions deploy stars-payment-webhook --no-verify-jwt
//   3. Привязка webhook'а бота:
//        curl -F "url=https://<project>.supabase.co/functions/v1/stars-payment-webhook" \
//             -F "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
//             -F "allowed_updates=[\"pre_checkout_query\",\"message\"]" \
//             https://api.telegram.org/bot<TOKEN>/setWebhook
//
// ───────── SECURITY ─────────
//   • secret_token проверяется через заголовок X-Telegram-Bot-Api-Secret-Token.
//   • Платёж принимается только если currency === "XTR" и payload начинается
//     с `premium_<from.id>_` — это защищает от подмены telegram_id.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN       = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const WEBHOOK_SECRET  = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
const SUPABASE_URL    = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE)
  : null;

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
        pre_checkout_query_id: queryId,
        ok,
        ...(errMsg ? { error_message: errMsg } : {}),
      }),
    });
  } catch (e) {
    console.error("[stars-webhook] answerPreCheckoutQuery failed:", e);
  }
}

async function markUserPremium(telegramId: number): Promise<boolean> {
  if (!supabase) {
    console.error("[stars-webhook] supabase client not configured");
    return false;
  }
  const { error } = await supabase
    .from("users")
    .update({ is_premium: true })
    .eq("telegram_id", telegramId);
  if (error) {
    console.error("[stars-webhook] UPDATE users.is_premium=true failed:", error);
    return false;
  }
  console.log(`[stars-webhook] users.is_premium=true OK for telegram_id=${telegramId}`);
  return true;
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  // Verify Telegram webhook secret (set via setWebhook ?secret_token=...)
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (got !== WEBHOOK_SECRET) {
      console.warn("[stars-webhook] secret_token mismatch — rejecting");
      return new Response("forbidden", { status: 403 });
    }
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response("invalid_json", { status: 400 });
  }

  try {
    // ── 1. pre_checkout_query ─────────────────────────────────────────────
    if (update.pre_checkout_query) {
      const q = update.pre_checkout_query;
      const isStars = q?.currency === "XTR";
      const payload: string = q?.invoice_payload || "";
      const validPayload = payload.startsWith("premium_");

      if (isStars && validPayload) {
        await answerPreCheckoutQuery(q.id, true);
        console.log(`[stars-webhook] pre_checkout_query OK for payload=${payload}`);
      } else {
        await answerPreCheckoutQuery(q.id, false, "Invalid invoice");
        console.warn(`[stars-webhook] pre_checkout_query rejected: payload=${payload}, currency=${q?.currency}`);
      }
      return new Response("OK");
    }

    // ── 2. successful_payment ─────────────────────────────────────────────
    const sp = update.message?.successful_payment;
    if (sp) {
      if (sp.currency !== "XTR") {
        console.warn("[stars-webhook] non-XTR successful_payment ignored");
        return new Response("OK");
      }

      const fromId = Number(update.message?.from?.id);
      const payload: string = sp.invoice_payload || "";
      const expectedPrefix = `premium_${fromId}_`;

      if (!fromId || !payload.startsWith(expectedPrefix)) {
        console.warn(
          `[stars-webhook] payload mismatch: got="${payload}", expected_prefix="${expectedPrefix}"`,
        );
        return new Response("OK");
      }

      const ok = await markUserPremium(fromId);
      if (!ok) {
        // Возвращаем 500, чтобы Telegram retry'нул (он сам делает несколько попыток).
        return new Response("db_error", { status: 500 });
      }
      return new Response("OK");
    }

    return new Response("OK");
  } catch (e) {
    console.error("[stars-webhook] unhandled error:", e);
    return new Response("error", { status: 500 });
  }
});
