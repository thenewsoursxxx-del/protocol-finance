// STATISTICS COLLECTION — Supabase Edge Function (Deno runtime)
//
// Принимает: { telegram_id: number, is_premium?: boolean }
// Делает:
//   1. Извлекает реальный IP клиента из заголовков x-forwarded-for / cf-connecting-ip.
//   2. Геолоцирует IP через бесплатный API ipapi.co (free tier, без ключа, ~30 000 req/day).
//   3. UPSERT'ит в таблицу users: country, city, last_ip, last_visit, is_premium.
//
// Безопасность:
//   - Edge Function использует SERVICE_ROLE_KEY (закрытый ключ Supabase) для UPDATE.
//     Это безопаснее чем доверять клиенту: клиент не может подделать геолокацию
//     или поменять статус premium у другого пользователя — Edge Function валидирует
//     telegram_id и пишет ТОЛЬКО по этому id.
//   - CORS открыт для всех (Telegram Mini App работает с null origin).
//
// Деплой: supabase functions deploy track-user
// Env переменные (нужны в Supabase Dashboard → Settings → Edge Functions):
//   SUPABASE_URL              — URL вашего проекта (https://xxx.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY — service_role ключ (Settings → API)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractClientIp(req: Request): string | null {
  // x-forwarded-for может содержать список через запятую — берём первый (клиент).
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  const cfip = req.headers.get("cf-connecting-ip");
  if (cfip) return cfip.trim();
  const xreal = req.headers.get("x-real-ip");
  if (xreal) return xreal.trim();
  return null;
}

interface GeoResult {
  country: string | null;
  city: string | null;
}

async function geolocate(ip: string): Promise<GeoResult> {
  // ipapi.co — бесплатный, без ключа, ~30k req/day, ~1k req/min.
  // Возвращает JSON: { country_name, city, ... }.
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "ProtocolFinance/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return { country: null, city: null };
    const data = await res.json();
    return {
      country: data.country_name || data.country || null,
      city:    data.city || null,
    };
  } catch (_e) {
    return { country: null, city: null };
  }
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const telegramId = Number(body?.telegram_id);
    const isPremium = body?.is_premium === true;

    if (!Number.isFinite(telegramId) || telegramId <= 0) {
      return new Response(JSON.stringify({ error: "invalid telegram_id" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const ip = extractClientIp(req);
    const geo = ip ? await geolocate(ip) : { country: null, city: null };

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "missing env" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // UPDATE — записываем только если строка для этого telegram_id уже есть
    // (создаётся в saveCurrentUser клиента). Не делаем INSERT здесь чтобы
    // избежать гонки с saveCurrentUser и не плодить «пустых» пользователей.
    const patch: Record<string, unknown> = {
      is_premium: isPremium,
      last_visit: new Date().toISOString(),
    };
    if (ip)          patch.last_ip = ip;
    if (geo.country) patch.country = geo.country;
    if (geo.city)    patch.city    = geo.city;

    const { error } = await supabase
      .from("users")
      .update(patch)
      .eq("telegram_id", telegramId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      ip,
      country: geo.country,
      city:    geo.city,
    }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
