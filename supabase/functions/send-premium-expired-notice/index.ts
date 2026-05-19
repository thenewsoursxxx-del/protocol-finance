// TELEGRAM STARS — Edge Function: грустное сообщение при окончании Premium.
//
// Триггерится клиентом (см. syncUserAccessFlagsFromDB в app.js), когда
// он обнаруживает что premium_until уже прошёл, а notice ещё не отправлен.
// Все условия отправки + дедупликация — на бэкенде (через
// premium_expired_notice_at).
//
// Сообщение тёплое, не агрессивное — "мы сохранили твои данные, возвращайся
// когда удобно". С кнопкой «Вернуть Premium», которая открывает Mini App
// и сразу премиум-модалку (через ?premium=open).
//
// DEPLOY:
//   supabase functions deploy send-premium-expired-notice --no-verify-jwt

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN     = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MINI_APP_URL  = Deno.env.get("MINI_APP_URL") || "";

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

async function verifyInitData(initData: string): Promise<{ ok: boolean; userId?: number }> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { ok: false };
    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`).join("\n");
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

function pickLang(code: unknown): "ru" | "en" {
  if (typeof code !== "string") return "en";
  const c = code.toLowerCase();
  if (c === "ru" || c.startsWith("ru-")) return "ru";
  return "en";
}

// ── ЭМОЦИОНАЛЬНЫЕ ТЕКСТЫ ─────────────────────────────────────────────────────
//
// Различаем два сценария:
//   A. previousAutoRenew=true → пользователь отменил подписку в настройках
//      Telegram (auto-renew был, но платёж не прошёл) → мягкое сообщение
//      «автопродление отключено» с кнопкой «Продлить вручную».
//   B. previousAutoRenew=false → одноразовая подписка просто истекла по сроку
//      → обычное «Premium закончился» с кнопкой «Вернуть Premium».

function buildExpiredText(lang: "ru" | "en", previousAutoRenew: boolean): string {
  if (lang === "ru") {
    if (previousAutoRenew) {
      // Сценарий A: подписка с автопродлением, но списание не прошло
      // (= пользователь отменил подписку в настройках Telegram).
      return [
        `🌙 <b>Автопродление отключено</b>`,
        ``,
        `Похоже, ты решил приостановить подписку Premium — это полностью твой выбор, без обид.`,
        ``,
        `<b>Все твои данные остались на месте</b>: цели, события, кредиты, настройки. Ничего не потеряно.`,
        ``,
        `Часть возможностей Protocol теперь скрыта:`,
        `   • Темп накоплений вернулся к стандартному`,
        `   • Кредиты и долги не учитываются в плане`,
        `   • Гибкая модель временно на паузе`,
        ``,
        `Если захочешь вернуться — продлить можно вручную в один тап.`,
      ].join("\n");
    }
    // Сценарий B: одноразовая подписка истекла естественно.
    return [
      `💔 <b>Premium закончился</b>`,
      ``,
      `Твоя подписка истекла. Но не переживай — <b>мы сохранили все твои данные</b>: цели, события, кредиты, настройки. Ничего не потеряно.`,
      ``,
      `Просто часть силы Protocol теперь скрыта:`,
      `   • Темп накоплений вернулся к стандартному`,
      `   • Кредиты и долги не учитываются в плане`,
      `   • Гибкая модель временно на паузе`,
      ``,
      `Если захочешь вернуть полный контроль — это всегда в одном касании.`,
    ].join("\n");
  }
  // EN
  if (previousAutoRenew) {
    return [
      `🌙 <b>Auto-renewal turned off</b>`,
      ``,
      `It looks like you decided to pause your Premium subscription — that's entirely your choice, no hard feelings.`,
      ``,
      `<b>All your data is safe</b>: goals, events, debts, settings. Nothing is lost.`,
      ``,
      `Some of Protocol's power is now hidden:`,
      `   • Saving pace reset to default`,
      `   • Loans and debts no longer in the plan`,
      `   • Flexible model is on pause`,
      ``,
      `Want to come back? You can renew manually in one tap.`,
    ].join("\n");
  }
  return [
    `💔 <b>Premium has ended</b>`,
    ``,
    `Your subscription has expired. But don't worry — <b>we kept all your data safe</b>: goals, events, debts, settings. Nothing is lost.`,
    ``,
    `Some of Protocol's power is just hidden right now:`,
    `   • Saving pace reset to default`,
    `   • Loans and debts no longer in the plan`,
    `   • Flexible model is on pause`,
    ``,
    `Whenever you want full control back — it's always one tap away.`,
  ].join("\n");
}

function buildExpiredKeyboard(lang: "ru" | "en", previousAutoRenew: boolean) {
  if (!MINI_APP_URL) return undefined;
  // Текст кнопки чуть-чуть разный по тону:
  //   • После отмены auto-renew: «Продлить вручную» (нейтрально-практично).
  //   • После естественного истечения: «Вернуть Premium» (тёплое возвращение).
  let text: string;
  if (lang === "ru") {
    text = previousAutoRenew ? "🔄 Продлить вручную" : "✨ Вернуть Premium";
  } else {
    text = previousAutoRenew ? "🔄 Renew manually" : "✨ Get Premium back";
  }
  const url = MINI_APP_URL + (MINI_APP_URL.includes("?") ? "&" : "?") + "premium=open";
  return { inline_keyboard: [[{ text, web_app: { url } }]] };
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!BOT_TOKEN || !supabase) return json({ error: "not_configured" }, 500);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400); }

  const tgId = Number(body?.telegram_id);
  if (!tgId) return json({ error: "telegram_id_required" }, 400);

  if (typeof body?.init_data !== "string" || !body.init_data) {
    return json({ error: "init_data_required" }, 401);
  }
  const v = await verifyInitData(body.init_data);
  if (!v.ok) return json({ error: "init_data_invalid" }, 401);
  if (v.userId && v.userId !== tgId) {
    return json({ error: "telegram_id_mismatch" }, 401);
  }

  // Достаём текущее состояние из БД. Поле auto_renew нужно для определения
  // тона сообщения: была подписка с автопродлением (отменена) или одноразовая
  // (естественно истекла).
  const { data: user, error } = await supabase
    .from("users")
    .select("telegram_id, premium_until, premium_expired_notice_at, auto_renew")
    .eq("telegram_id", tgId)
    .maybeSingle();

  if (error) return json({ error: "db_error" }, 500);
  if (!user) return json({ error: "user_not_found" }, 404);

  // Условия отправки:
  //   1. premium_until должен быть задан (подписка вообще была).
  //   2. premium_until должен быть в прошлом (она именно ИСТЕКЛА, а не активна).
  //   3. premium_until не старше 30 дней (если истекла давно — спам).
  //   4. premium_expired_notice_at должен быть null (или сильно старше).
  if (!user.premium_until) {
    return json({ skip: "no_subscription_history" });
  }
  const now = Date.now();
  const expiredAt = new Date(user.premium_until).getTime();
  if (expiredAt > now) {
    return json({ skip: "still_active" });
  }
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  if (now - expiredAt > THIRTY_DAYS) {
    return json({ skip: "expired_too_long_ago" });
  }
  // Дедуп: уже слали expired notice для этой подписки.
  if (user.premium_expired_notice_at) {
    const lastTs = new Date(user.premium_expired_notice_at).getTime();
    if (lastTs > expiredAt) {
      return json({ skip: "already_sent" });
    }
  }

  const lang = pickLang(body?.language);
  const previousAutoRenew = user.auto_renew === true;
  const text = buildExpiredText(lang, previousAutoRenew);
  const reply_markup = buildExpiredKeyboard(lang, previousAutoRenew);

  const sendRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: tgId, text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(reply_markup ? { reply_markup } : {}),
    }),
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text();
    console.warn("[expired-notice] sendMessage failed:", sendRes.status, errText);
    return json({ error: "send_failed", details: errText }, 502);
  }

  await supabase
    .from("users")
    .update({
      premium_expired_notice_at: new Date(now).toISOString(),
      // На всякий случай чиним is_premium=false в БД (self-healing на стороне сервера).
      is_premium: false,
      // Если был auto_renew=true и подписка не продлилась — значит юзер
      // отменил её в настройках Telegram. Сбрасываем флаг в БД, чтобы UI
      // отображал корректное состояние (без автопродления).
      auto_renew: false,
    })
    .eq("telegram_id", tgId);

  return json({ sent: true });
});
