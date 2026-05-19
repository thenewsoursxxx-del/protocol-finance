// TELEGRAM STARS — Edge Function: напоминание о скором окончании Premium.
//
// FLOW (client-triggered):
//   1. Клиент на старте приложения проверяет: premium_until - now() < 3 days?
//   2. Если да — POST { telegram_id, init_data } сюда.
//   3. Функция верифицирует init_data (анти-spoofing).
//   4. Перечитывает users-запись СВОИМ select'ом (не доверяет клиенту):
//        a) is_premium = true
//        b) premium_until между now() и now()+3 days
//        c) renewal_reminder_at IS NULL ИЛИ < (premium_until - 7 days)
//      Только при всех trueах отсылает DM.
//   5. После успешной отправки фиксирует renewal_reminder_at = now() —
//      исключает повторные напоминания в рамках одной подписки.
//
// SECURITY:
//   • init_data верифицируется HMAC-SHA256(WebAppData ⊕ BOT_TOKEN).
//   • Все условия отправки проверяются на бекенде — клиент не может
//     заставить функцию слать спам.
//
// DEPLOY:
//   supabase functions deploy send-renewal-reminder --no-verify-jwt
//
// АЛЬТЕРНАТИВА: можно настроить pg_cron, который раз в день вызывает
// эту же функцию для всех eligible-юзеров (без client trigger'а). См.
// миграцию 20260519_premium_subscription.sql.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN     = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE)
  : null;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// ── HMAC-SHA256 верификация init_data (идентична create-stars-invoice) ───────
async function verifyInitData(initData: string): Promise<{ ok: boolean; userId?: number }> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { ok: false };
    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const enc = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      "raw", enc.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const secret = await crypto.subtle.sign("HMAC", secretKey, enc.encode(BOT_TOKEN));
    const calcKey = await crypto.subtle.importKey(
      "raw", secret,
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sigBuf = await crypto.subtle.sign("HMAC", calcKey, enc.encode(dataCheckString));
    const sigHex = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    if (sigHex !== hash) return { ok: false };
    const userRaw = params.get("user");
    let userId: number | undefined;
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u && typeof u.id === "number") userId = u.id;
      } catch { /* ignore */ }
    }
    return { ok: true, userId };
  } catch { return { ok: false }; }
}

function formatRuDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!BOT_TOKEN || !supabase) return json({ error: "not_configured" }, 500);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400); }

  const tgId = Number(body?.telegram_id);
  if (!tgId) return json({ error: "telegram_id_required" }, 400);

  // Верификация init_data.
  if (typeof body?.init_data === "string" && body.init_data.length > 0) {
    const v = await verifyInitData(body.init_data);
    if (!v.ok) return json({ error: "init_data_invalid" }, 401);
    if (v.userId && v.userId !== tgId) {
      return json({ error: "telegram_id_mismatch" }, 401);
    }
  } else {
    return json({ error: "init_data_required" }, 401);
  }

  // ── Перечитываем users со своей стороны — клиенту не доверяем ──
  const { data: user, error } = await supabase
    .from("users")
    .select("telegram_id, is_premium, premium_until, auto_renew, renewal_reminder_at")
    .eq("telegram_id", tgId)
    .maybeSingle();

  if (error) {
    console.error("[renewal-reminder] users.select failed:", error);
    return json({ error: "db_error" }, 500);
  }
  if (!user) return json({ error: "user_not_found" }, 404);
  if (!user.is_premium || !user.premium_until) {
    return json({ skip: "not_active_subscription" });
  }

  const now = Date.now();
  const endsAt = new Date(user.premium_until).getTime();
  const msToExpiry = endsAt - now;
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  // Должно быть: подписка ещё не истекла, но осталось <= 3 дней.
  if (msToExpiry <= 0 || msToExpiry > THREE_DAYS) {
    return json({ skip: "out_of_window", msToExpiry });
  }

  // Не отправляем дубликат: reminder уже отсылался для этой подписки,
  // если renewal_reminder_at заполнен в последние 7 дней.
  if (user.renewal_reminder_at) {
    const lastReminderTs = new Date(user.renewal_reminder_at).getTime();
    if (now - lastReminderTs < SEVEN_DAYS) {
      return json({ skip: "already_sent", renewal_reminder_at: user.renewal_reminder_at });
    }
  }

  // ── Отправляем DM с inline-кнопкой «Продлить подписку» ──
  const endsStr = formatRuDate(new Date(user.premium_until));
  const daysLeft = Math.ceil(msToExpiry / (24 * 60 * 60 * 1000));
  const dayWord = daysLeft === 1 ? "день" : (daysLeft >= 2 && daysLeft <= 4 ? "дня" : "дней");

  const text = [
    `⏳ <b>Premium заканчивается через ${daysLeft} ${dayWord}</b>`,
    ``,
    `Твоя подписка действует до <b>${endsStr}</b>.`,
    ``,
    user.auto_renew
      ? `🔁 Автопродление включено — мы продлим автоматически.`
      : `Продли сейчас, чтобы не потерять доступ к премиум-функциям.`,
  ].join("\n");

  const reply_markup = {
    inline_keyboard: [[
      { text: "🚀 Продлить подписку", web_app: { url: req.headers.get("Origin") || "https://t.me" } },
    ]],
  };

  const sendRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: tgId,
      text,
      parse_mode: "HTML",
      reply_markup,
      disable_web_page_preview: true,
    }),
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text();
    console.warn("[renewal-reminder] sendMessage failed:", sendRes.status, errText);
    return json({ error: "send_failed", details: errText }, 502);
  }

  // Фиксируем факт отправки, чтобы не дублировать.
  await supabase
    .from("users")
    .update({ renewal_reminder_at: new Date(now).toISOString() })
    .eq("telegram_id", tgId);

  return json({ sent: true, ends_at: user.premium_until, days_left: daysLeft });
});
