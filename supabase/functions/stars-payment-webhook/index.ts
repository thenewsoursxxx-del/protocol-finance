// TELEGRAM STARS — Edge Function: webhook от Telegram для обработки оплаты
// подписки Protocol Premium (150 ⭐ / 30 дней).
//
// FLOW:
//   1. pre_checkout_query — отвечаем answerPreCheckoutQuery(ok=true) в 10s.
//   2. successful_payment — парсим payload, активируем подписку:
//        UPDATE users SET
//          is_premium = true,
//          premium_until = now() + interval '30 days',
//          auto_renew = <parsed from payload>,
//          renewal_reminder_at = NULL    -- сбрасываем reminder-дедуп при новой оплате
//        WHERE telegram_id = <from.id>
//      И шлём DM пользователю через sendMessage с благодарностью и точными
//      датами начала/окончания подписки.
//
// PAYLOAD FORMAT (создаётся в create-stars-invoice):
//   premium_<telegram_id>_<unix_ms>_<autoRenewFlag>
//   где autoRenewFlag = "1" или "0".
//
// DEPLOY:
//   supabase secrets set TELEGRAM_BOT_TOKEN=xxx:yyy
//   supabase secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
//   supabase functions deploy stars-payment-webhook --no-verify-jwt
//   curl -F "url=https://<project>.supabase.co/functions/v1/stars-payment-webhook" \
//        -F "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
//        -F "allowed_updates=[\"pre_checkout_query\",\"message\"]" \
//        https://api.telegram.org/bot<TOKEN>/setWebhook
//
// SECURITY:
//   • X-Telegram-Bot-Api-Secret-Token проверяется в начале — защита от
//     несанкционированных вызовов.
//   • is_premium ставится ТОЛЬКО если currency === "XTR" И
//     payload.startsWith(`premium_${from.id}_`) — защита от подмены tg_id.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN       = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const WEBHOOK_SECRET  = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
const SUPABASE_URL    = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE)
  : null;

// SUBSCRIPTION MODEL: длительность одной покупки в днях.
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
        pre_checkout_query_id: queryId,
        ok,
        ...(errMsg ? { error_message: errMsg } : {}),
      }),
    });
  } catch (e) {
    console.error("[stars-webhook] answerPreCheckoutQuery failed:", e);
  }
}

async function sendDM(chatId: number, text: string): Promise<void> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn("[stars-webhook] sendDM failed:", res.status, errText);
    }
  } catch (e) {
    console.warn("[stars-webhook] sendDM exception:", e);
  }
}

function formatRuDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

// Парсит payload вида `premium_<tg_id>_<ts>_<autoRenewFlag>`.
// Возвращает null если формат не совпал.
function parsePayload(payload: string, expectedTgId: number): {
  ts: number;
  autoRenew: boolean;
} | null {
  if (typeof payload !== "string") return null;
  const expectedPrefix = `premium_${expectedTgId}_`;
  if (!payload.startsWith(expectedPrefix)) return null;
  const rest = payload.slice(expectedPrefix.length); // <ts>_<flag>
  const parts = rest.split("_");
  if (parts.length < 1) return null;
  const ts = Number(parts[0]);
  if (!ts) return null;
  // autoRenewFlag опционален — старые payload'ы без него считаются как false.
  const autoRenew = parts.length >= 2 ? (parts[1] === "1") : false;
  return { ts, autoRenew };
}

// SUBSCRIPTION ACTIVATION — централизованная логика обновления users.
async function activateSubscription(
  telegramId: number,
  autoRenew: boolean,
): Promise<{ ok: boolean; startsAt: Date; endsAt: Date }> {
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + PREMIUM_DAYS * 24 * 60 * 60 * 1000);

  if (!supabase) {
    console.error("[stars-webhook] supabase not configured");
    return { ok: false, startsAt, endsAt };
  }

  const { error } = await supabase
    .from("users")
    .update({
      is_premium: true,
      premium_until: endsAt.toISOString(),
      auto_renew: autoRenew,
      // Сбрасываем reminder — новая подписка, можно слать reminder за 3 дня
      // до её нового окончания.
      renewal_reminder_at: null,
    })
    .eq("telegram_id", telegramId);

  if (error) {
    console.error("[stars-webhook] activateSubscription update failed:", error);
    return { ok: false, startsAt, endsAt };
  }
  console.log(`[stars-webhook] subscription activated for tg=${telegramId}, until=${endsAt.toISOString()}, auto_renew=${autoRenew}`);
  return { ok: true, startsAt, endsAt };
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  // Verify Telegram webhook secret_token.
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
    // ── 1. pre_checkout_query ─────────────────────────────────────────────
    if (update.pre_checkout_query) {
      const q = update.pre_checkout_query;
      const isStars = q?.currency === "XTR";
      const payload: string = q?.invoice_payload || "";
      const validPayload = payload.startsWith("premium_");
      if (isStars && validPayload) {
        await answerPreCheckoutQuery(q.id, true);
        console.log(`[stars-webhook] pre_checkout_query OK, payload=${payload}`);
      } else {
        await answerPreCheckoutQuery(q.id, false, "Invalid invoice");
        console.warn(`[stars-webhook] pre_checkout_query REJECTED, currency=${q?.currency}, payload=${payload}`);
      }
      return new Response("OK");
    }

    // ── 2. successful_payment ─────────────────────────────────────────────
    const sp = update.message?.successful_payment;
    if (sp) {
      if (sp.currency !== "XTR") {
        console.warn("[stars-webhook] non-XTR payment ignored");
        return new Response("OK");
      }

      const fromId = Number(update.message?.from?.id);
      if (!fromId) {
        console.warn("[stars-webhook] missing from.id");
        return new Response("OK");
      }

      const parsed = parsePayload(sp.invoice_payload || "", fromId);
      if (!parsed) {
        console.warn("[stars-webhook] payload mismatch:", sp.invoice_payload, "for tg=", fromId);
        return new Response("OK");
      }

      // SUBSCRIPTION ACTIVATION: задаём is_premium=true, premium_until, auto_renew.
      const result = await activateSubscription(fromId, parsed.autoRenew);
      if (!result.ok) {
        // Telegram сам сделает retry — возвращаем 500.
        return new Response("db_error", { status: 500 });
      }

      // ── DM пользователю с благодарностью и датами ──────────────────────
      const startsStr = formatRuDate(result.startsAt);
      const endsStr   = formatRuDate(result.endsAt);
      const renewLine = parsed.autoRenew
        ? `\n🔁 <i>Автопродление включено — подписка продлится автоматически.</i>`
        : `\n💡 <i>Автопродление выключено. Мы напомним за 3 дня до окончания.</i>`;
      const text = [
        `🎉 <b>Спасибо за покупку Protocol Premium!</b>`,
        ``,
        `✨ Все премиум-функции теперь доступны.`,
        ``,
        `📅 <b>Подписка активна:</b>`,
        `с <b>${startsStr}</b> по <b>${endsStr}</b>`,
        renewLine,
      ].join("\n");
      await sendDM(fromId, text);

      return new Response("OK");
    }

    return new Response("OK");
  } catch (e) {
    console.error("[stars-webhook] unhandled error:", e);
    return new Response("error", { status: 500 });
  }
});
