// TELEGRAM STARS — Edge Function: создание invoice link для Premium-оплаты.
//
// FLOW:
//   1. Клиент (mini app) делает POST {telegram_id, init_data?} на эту функцию.
//   2. Функция (через Bot API) дёргает createInvoiceLink с currency=XTR.
//   3. Возвращает invoice_url, который клиент передаёт в tg.openInvoice(url, cb).
//
// DEPLOY:
//   1. Выставить секрет: supabase secrets set TELEGRAM_BOT_TOKEN=xxx:yyyy
//   2. Задеплоить:        supabase functions deploy create-stars-invoice --no-verify-jwt
//      (--no-verify-jwt — invoice создаётся анонимно из mini app; верификация
//       пользователя идёт через initData ниже.)
//   3. Telegram бот должен быть привязан к тому же домену, что и mini app.
//
// SECURITY:
//   Функция верифицирует init_data (HMAC-SHA256 от BOT_TOKEN) — гарантирует,
//   что запрос пришёл из Telegram WebApp текущего пользователя, а не от
//   произвольного клиента. Без init_data функция тоже примет запрос (для
//   тестов / fallback), но логирует warning.

// deno-lint-ignore-file no-explicit-any

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const STARS_PRICE = 450; // 450 Stars — Premium forever

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

// ── Верификация Telegram WebApp initData по официальной спецификации ─────────
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
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
      "raw",
      enc.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const secret = await crypto.subtle.sign("HMAC", secretKey, enc.encode(BOT_TOKEN));
    const calcKey = await crypto.subtle.importKey(
      "raw",
      secret,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
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
      } catch (_e) { /* noop */ }
    }
    return { ok: true, userId };
  } catch (_e) {
    return { ok: false };
  }
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

  let verifiedUserId: number | undefined;
  if (typeof body?.init_data === "string" && body.init_data.length > 0) {
    const v = await verifyInitData(body.init_data);
    if (!v.ok) return json({ error: "init_data_invalid" }, 401);
    verifiedUserId = v.userId;
    if (verifiedUserId && verifiedUserId !== tgId) {
      return json({ error: "telegram_id_mismatch" }, 401);
    }
  } else {
    console.warn("[create-stars-invoice] no init_data, accepting in dev mode for tg_id=", tgId);
  }

  // payload — уникальный идентификатор платежа. Webhook ищет его при
  // обработке successful_payment, чтобы определить, какого пользователя
  // переводить в premium.
  const payload = `premium_${tgId}_${Date.now()}`;

  const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Protocol Premium",
      description: "Доступ ко всем премиум-функциям Protocol Finance навсегда",
      payload,
      currency: "XTR",
      prices: [{ label: "Premium (forever)", amount: STARS_PRICE }],
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
