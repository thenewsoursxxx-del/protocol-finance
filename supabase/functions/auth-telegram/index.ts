// ============================================================================
// AUTH-TELEGRAM v2 — Supabase Auth integration
//
// FLOW:
//   1. Client (mini-app) собирает Telegram.WebApp.initData и шлёт сюда POST.
//   2. Функция верифицирует initData по HMAC-SHA256 c TELEGRAM_BOT_TOKEN.
//   3. Через SUPABASE_SERVICE_ROLE_KEY (auto-injected env) обращается к
//      Supabase Auth admin API:
//        - admin.createUser({ email: "tg-{tid}@telegram.local",
//                             email_confirm: true,
//                             user_metadata: { telegram_id, ... } })
//          (если юзер уже есть — игнорируем 422 и обновляем metadata)
//        - admin.generateLink({ type: "magiclink", email })
//          → возвращает properties.hashed_token (одноразовый токен).
//   4. Отдаёт клиенту { email, token_hash }.
//   5. Клиент вызывает supabaseClient.auth.verifyOtp({ email, token, type })
//      и получает НАСТОЯЩУЮ Supabase-сессию, подписанную текущим
//      JWT Signing Key проекта (ES256). С этого момента supabase-js
//      управляет сессией нативно (setSession, getSession, autoRefresh).
//
// CUSTOM ACCESS TOKEN HOOK (см. 20260523_custom_access_token_hook.sql)
// читает telegram_id из user_metadata и кладёт его в top-level claim JWT,
// поэтому существующие RLS-политики вида
//   (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint
// продолжают работать БЕЗ изменений.
//
// SECRETS REQUIRED (всё уже есть в проекте):
//   • TELEGRAM_BOT_TOKEN          — для HMAC-верификации initData
//   • SUPABASE_URL                — auto-injected
//   • SUPABASE_SERVICE_ROLE_KEY   — auto-injected, для admin API
//
// Старый секрет APP_JWT_SECRET больше НЕ нужен (но можно не удалять —
// просто не используется).
//
// DEPLOY:
//   supabase functions deploy auth-telegram --no-verify-jwt
//   (флаг обязателен: эта функция инициирует аутентификацию,
//    JWT для её вызова ещё нет.)
// ============================================================================

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const BOT_TOKEN        = Deno.env.get("TELEGRAM_BOT_TOKEN")        || "";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")              || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Telegram initData verification (HMAC-SHA256) ─────────────────────────────
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
async function verifyInitData(initData: string) {
  try {
    const params = new URLSearchParams(initData);
    const hash   = params.get("hash");
    if (!hash) return { ok: false as const };
    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const secret = await crypto.subtle.sign(
      "HMAC", secretKey, new TextEncoder().encode(BOT_TOKEN),
    );

    const dataKey = await crypto.subtle.importKey(
      "raw", new Uint8Array(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign(
      "HMAC", dataKey, new TextEncoder().encode(dataCheckString),
    );

    const calcHash = [...new Uint8Array(sig)]
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (calcHash !== hash) return { ok: false as const };

    const userRaw = params.get("user");
    if (!userRaw) return { ok: false as const };
    const u = JSON.parse(userRaw);
    if (typeof u?.id !== "number") return { ok: false as const };

    return {
      ok: true as const,
      userId:        u.id as number,
      username:      (u.username      as string | undefined) ?? null,
      first_name:    (u.first_name    as string | undefined) ?? null,
      last_name:     (u.last_name     as string | undefined) ?? null,
      language_code: (u.language_code as string | undefined) ?? null,
      is_premium_tg: Boolean(u.is_premium),
    };
  } catch {
    return { ok: false as const };
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST")    return json({ error: "method_not_allowed" }, 405);
  if (!BOT_TOKEN)               return json({ error: "bot_token_not_configured"   }, 500);
  if (!SERVICE_ROLE_KEY)        return json({ error: "service_role_not_configured" }, 500);
  if (!SUPABASE_URL)            return json({ error: "supabase_url_not_configured" }, 500);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400); }

  const initData = body?.init_data;
  if (typeof initData !== "string" || !initData) {
    return json({ error: "init_data_required" }, 400);
  }

  const v = await verifyInitData(initData);
  if (!v.ok || !v.userId) {
    console.warn("[auth-telegram] init_data verification failed");
    return json({ error: "init_data_invalid" }, 401);
  }

  const tid   = v.userId;
  const email = `tg-${tid}@telegram.local`;

  // ── Supabase admin client (service_role) ──────────────────────────────────
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Метаданные читает Custom Access Token Hook (Postgres-функция),
  // которая кладёт telegram_id в top-level claim JWT.
  const userMetadata = {
    telegram_id:   tid,
    username:      v.username,
    first_name:    v.first_name,
    last_name:     v.last_name,
    language_code: v.language_code,
    is_premium_tg: v.is_premium_tg,
  };

  // ── 1. Create or update user ──────────────────────────────────────────────
  // createUser с email_confirm:true сразу делает юзера активным
  // (без email-подтверждения). Идемпотентность: при 422 (already registered)
  // подтягиваем существующего юзера через raw admin API и обновляем metadata.
  const { error: createErr } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (createErr) {
    const msg = (createErr.message || "").toLowerCase();
    const alreadyExists =
      msg.includes("already") ||
      msg.includes("registered") ||
      (createErr as any).status === 422;

    if (!alreadyExists) {
      console.error("[auth-telegram] createUser error:", createErr.message);
      return json({ error: "create_user_failed", detail: createErr.message }, 500);
    }

    // Юзер уже есть — освежаем metadata, чтобы JWT был с актуальными
    // username / first_name (юзер мог поменять их в Telegram).
    // supabase-js не отдаёт getUserByEmail, поэтому идём в raw admin API.
    try {
      const lookupRes = await fetch(
        `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
        {
          headers: {
            "apikey":        SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          },
        },
      );
      const lookupData = await lookupRes.json();
      const existing = Array.isArray(lookupData?.users) ? lookupData.users[0] : null;
      if (existing?.id) {
        const upd = await supabase.auth.admin.updateUserById(existing.id, {
          user_metadata: userMetadata,
        });
        if (upd.error) {
          console.warn("[auth-telegram] updateUserById warn:", upd.error.message);
        }
      }
    } catch (e) {
      // Не фатально: даже если metadata не обновится, JWT получится
      // со старыми данными — telegram_id всё равно будет правильный.
      console.warn("[auth-telegram] metadata refresh failed:", (e as any)?.message);
    }
  }

  // ── 2. Generate magic link (admin API — email не отправляется) ────────────
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type:  "magiclink",
    email,
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error("[auth-telegram] generateLink error:", linkErr?.message);
    return json({
      error:  "generate_link_failed",
      detail: linkErr?.message || "no hashed_token in response",
    }, 500);
  }

  return json({
    email,
    token_hash: linkData.properties.hashed_token,
  });
});
