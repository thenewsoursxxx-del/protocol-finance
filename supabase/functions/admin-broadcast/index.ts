// ADMIN BROADCAST — массовая рассылка сообщений всем (или отфильтрованным)
// пользователям бота с поддержкой inline-кнопок (включая web_app для открытия
// Mini App).
//
// Защищена админ-токеном (env BROADCAST_ADMIN_TOKEN) — это НЕ initData
// проверка, потому что админ может вообще не открывать Mini App. Токен
// нужно держать только у себя, в репозиторий не пушить.
//
// ── Архитектура ─────────────────────────────────────────────────────────────
//   POST /admin-broadcast
//   Headers:
//     Content-Type: application/json
//     X-Admin-Token: <BROADCAST_ADMIN_TOKEN>
//   Body:
//     {
//       text: "Привет 👋",
//       parse_mode: "HTML" | "Markdown" | undefined,
//       buttons: [                    // опционально, inline_keyboard
//         [{ text: "Открыть Protocol", web_app: { url: "<MINI_APP_URL>" } }],
//         [{ text: "Сайт", url: "https://example.com" }]
//       ],
//       filter: {                      // опционально
//         premium: true | false,       // только премиум / только бесплатные
//         language: "ru" | "en",       // по языку
//         telegram_ids: [123, 456]     // конкретный список (override фильтров)
//       },
//       disable_notification: false,
//       disable_web_page_preview: true,
//       dry_run: false                 // если true — не шлёт, только посчитает получателей
//     }
//
// ── Rate limit ──────────────────────────────────────────────────────────────
// Telegram Bot API: ~30 msg/sec global. Идём с safety margin 25/sec → 40ms
// между сообщениями. Для одного и того же chat_id предел жёстче (~1/sec),
// но в массовой рассылке мы шлём в РАЗНЫЕ чаты, так что limit ~30/sec работает.
//
// ── Edge Function timeout ───────────────────────────────────────────────────
// Supabase Edge Functions: ~150 сек CPU + ~400 сек wall-clock на хобби-плане.
// При 25 msg/sec влезает ~10 000 сообщений за одну инвокацию. Если база
// больше — раскомментируй блок про continuation token (cursor pagination).
//
// DEPLOY:
//   supabase functions deploy admin-broadcast --no-verify-jwt
//
//   supabase secrets set BROADCAST_ADMIN_TOKEN=$(openssl rand -hex 32)
//   # Подсмотри значение: supabase secrets list

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN          = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const SUPABASE_URL       = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ADMIN_TOKEN        = Deno.env.get("BROADCAST_ADMIN_TOKEN") || "";

const supabase = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE)
  : null;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
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

// Безопасное сравнение токенов (защита от timing-attack).
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

// Валидация одной кнопки. Принимаем web_app, url, callback_data.
function isValidButton(b: any): boolean {
  if (!b || typeof b.text !== "string" || !b.text.trim()) return false;
  if (b.web_app && typeof b.web_app.url === "string") return true;
  if (typeof b.url === "string") return true;
  if (typeof b.callback_data === "string") return true;
  return false;
}

function buildReplyMarkup(buttons: any): any | undefined {
  if (!Array.isArray(buttons) || buttons.length === 0) return undefined;
  const rows: any[] = [];
  for (const row of buttons) {
    if (!Array.isArray(row)) continue;
    const validRow = row.filter(isValidButton);
    if (validRow.length) rows.push(validRow);
  }
  if (!rows.length) return undefined;
  return { inline_keyboard: rows };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!BOT_TOKEN || !supabase || !ADMIN_TOKEN) {
    return json({ error: "not_configured", hint: "Need TELEGRAM_BOT_TOKEN, SUPABASE_SERVICE_ROLE_KEY, BROADCAST_ADMIN_TOKEN" }, 500);
  }

  // ── 1. Админ-аутентификация ───────────────────────────────────────────────
  const headerToken = req.headers.get("x-admin-token") || "";
  if (!headerToken || !timingSafeEqual(headerToken, ADMIN_TOKEN)) {
    return json({ error: "unauthorized" }, 401);
  }

  // ── 2. Парсим тело ────────────────────────────────────────────────────────
  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400); }

  const text = typeof body?.text === "string" ? body.text : "";
  if (!text || text.length > 4096) {
    return json({ error: "text_required", hint: "1..4096 chars" }, 400);
  }

  const parseMode = (body?.parse_mode === "HTML" || body?.parse_mode === "Markdown" || body?.parse_mode === "MarkdownV2")
    ? body.parse_mode : undefined;

  const reply_markup = buildReplyMarkup(body?.buttons);

  const filter = body?.filter || {};
  const dryRun = body?.dry_run === true;
  const disableNotification = body?.disable_notification === true;
  const disableWebPagePreview = body?.disable_web_page_preview !== false; // default true

  // ── 3. Получаем список получателей ────────────────────────────────────────
  let query = supabase
    .from("users")
    .select("telegram_id, chat_id")
    .eq("notifications_opt_out", false);

  if (Array.isArray(filter.telegram_ids) && filter.telegram_ids.length) {
    // Точечная рассылка по списку (фильтры premium/language игнорируются).
    query = supabase
      .from("users")
      .select("telegram_id, chat_id")
      .in("telegram_id", filter.telegram_ids.map((x: any) => Number(x)).filter(Boolean));
  } else {
    if (typeof filter.premium === "boolean") {
      query = query.eq("is_premium", filter.premium);
    }
    if (typeof filter.language === "string") {
      query = query.eq("language", filter.language);
    }
  }

  const { data: users, error: usersErr } = await query;
  if (usersErr) {
    console.error("[broadcast] users query failed:", usersErr);
    return json({ error: "db_query_failed", details: usersErr.message }, 500);
  }

  const recipients = (users || [])
    .map((u: any) => Number(u.chat_id || u.telegram_id))
    .filter((id: number) => Number.isFinite(id) && id > 0);

  // ── 4. Регистрируем broadcast в БД (для аудита) ───────────────────────────
  const { data: bcRow, error: bcErr } = await supabase
    .from("broadcasts")
    .insert({
      text, parse_mode: parseMode, buttons: reply_markup?.inline_keyboard || null,
      filter, target_count: recipients.length,
      status: dryRun ? "dry_run" : "running",
    })
    .select("id")
    .single();
  if (bcErr) {
    console.error("[broadcast] insert broadcast row failed:", bcErr);
    return json({ error: "db_insert_failed", details: bcErr.message }, 500);
  }
  const broadcastId = bcRow.id;

  if (dryRun) {
    return json({
      dry_run: true,
      broadcast_id: broadcastId,
      target_count: recipients.length,
      preview: { text, parse_mode: parseMode, reply_markup },
    });
  }

  // ── 5. Шлём с rate limit 25 msg/sec ──────────────────────────────────────
  const SEND_DELAY_MS = 40;       // ~25 msg/sec, safety margin под 30/sec лимит Telegram
  const RETRY_429_MS  = 1100;     // если поймали 429 retry_after — ждём чуть больше секунды

  let sent = 0;
  let failed = 0;
  let blocked = 0;
  const errors: Array<{ chat_id: number; status: number; description?: string }> = [];

  for (let i = 0; i < recipients.length; i++) {
    const chatId = recipients[i];

    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      disable_notification: disableNotification,
      disable_web_page_preview: disableWebPagePreview,
    };
    if (parseMode)    payload.parse_mode = parseMode;
    if (reply_markup) payload.reply_markup = reply_markup;

    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        sent++;
      } else if (res.status === 429) {
        // Rate-limited: ждём, потом повторяем эту же отправку 1 раз.
        const errText = await res.text();
        let retryAfter = RETRY_429_MS;
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.parameters?.retry_after) {
            retryAfter = Math.max(retryAfter, Number(parsed.parameters.retry_after) * 1000);
          }
        } catch { /* ignore */ }
        await sleep(retryAfter);
        const retry = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (retry.ok) sent++;
        else {
          failed++;
          errors.push({ chat_id: chatId, status: retry.status, description: (await retry.text()).slice(0, 200) });
        }
      } else if (res.status === 403) {
        // Пользователь заблокировал бота или удалил аккаунт.
        blocked++;
      } else if (res.status === 400) {
        // chat_id не найден / неверный (например юзер давно удалил чат).
        // Не считаем "критичной ошибкой" — относим к blocked.
        blocked++;
      } else {
        failed++;
        const errText = await res.text();
        errors.push({ chat_id: chatId, status: res.status, description: errText.slice(0, 200) });
      }
    } catch (e: any) {
      failed++;
      errors.push({ chat_id: chatId, status: 0, description: String(e?.message || e).slice(0, 200) });
    }

    if (i < recipients.length - 1) await sleep(SEND_DELAY_MS);
  }

  // ── 6. Финальный апдейт строки broadcasts ─────────────────────────────────
  await supabase
    .from("broadcasts")
    .update({
      sent_count: sent,
      failed_count: failed,
      blocked_count: blocked,
      status: "done",
      finished_at: new Date().toISOString(),
      error: errors.length ? JSON.stringify(errors.slice(0, 50)) : null,
    })
    .eq("id", broadcastId);

  return json({
    broadcast_id: broadcastId,
    target_count: recipients.length,
    sent, failed, blocked,
    sample_errors: errors.slice(0, 10),
  });
});
