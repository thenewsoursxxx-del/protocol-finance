// TELEGRAM STARS — Edge Function: создание invoice link для Premium-подписки.
//
// SUBSCRIPTION MODEL:
//   • Один платёж = 30 дней Premium.
//   • Цена 150 ⭐ (временно; продакшен план — 450 ⭐).
//   • Auto-renew не реализован (Telegram Stars поддерживает recurring через
//     subscription_period: 2592000 в createInvoiceLink, но это другая схема
//     invoice'ов и более сложная webhook-логика — оставлено на будущее).
//     Сейчас работает простой шаблон: одноразовая оплата → 30 дней доступа
//     → DM-напоминание за 3 дня до окончания → grеfully expire.
//
// FLOW:
//   1. Клиент шлёт POST { telegram_id, init_data } сюда.
//   2. Функция верифицирует init_data (HMAC-SHA256 от BOT_TOKEN).
//   3. Дёргает Bot API createInvoiceLink (currency=XTR, amount=150).
//   4. Возвращает { invoice_url, payload }.
//      payload: `premium_<telegram_id>_<unix_ms>` — webhook парсит чтобы
//      определить, кому активировать подписку.
//
// DEPLOY:
//   supabase secrets set TELEGRAM_BOT_TOKEN=xxx:yyy
//   supabase functions deploy create-stars-invoice --no-verify-jwt

// deno-lint-ignore-file no-explicit-any

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

// Цена временно 150 ⭐ (вместо 450 ⭐). Premium на 30 дней.
const STARS_PRICE = 150;

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

// HMAC-SHA256 верификация Telegram WebApp initData.
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
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!BOT_TOKEN) return json({ error: "bot_token_not_configured" }, 500);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400); }

  const tgId = Number(body?.telegram_id);
  if (!tgId) return json({ error: "telegram_id_required" }, 400);

  if (typeof body?.init_data === "string" && body.init_data.length > 0) {
    const v = await verifyInitData(body.init_data);
    if (!v.ok) return json({ error: "init_data_invalid" }, 401);
    if (v.userId && v.userId !== tgId) {
      return json({ error: "telegram_id_mismatch" }, 401);
    }
  } else {
    console.warn("[create-stars-invoice] init_data not provided — dev mode for tg_id=", tgId);
  }

  // Payload: `premium_<telegram_id>_<unix_ms>`.
  // Webhook парсит это чтобы определить кому активировать подписку.
  const payload = `premium_${tgId}_${Date.now()}`;

  const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Protocol Premium",
      description: "Полный доступ ко всем функциям приложения",
      payload,
      currency: "XTR",
      prices: [{ label: "Premium на 30 дней", amount: STARS_PRICE }],
    }),
  });

  const tgJson = await tgRes.json().catch(() => null);
  if (!tgRes.ok || !tgJson?.ok) {
    console.error("[create-stars-invoice] Telegram API error:", tgJson);
    return json({ error: "telegram_api_error", details: tgJson }, 502);
  }

  return json({
    invoice_url: tgJson.result,
    payload,
    amount: STARS_PRICE,
  });
});
