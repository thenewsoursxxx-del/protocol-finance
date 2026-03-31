/**
 * Supabase для Protocol Mini App (vanilla JS + CDN, без npm).
 *
 * Перед использованием:
 * 1) Вставьте свой Publishable (anon) ключ из Supabase Dashboard → Project Settings → API.
 * 2) В SQL создайте таблицу users с уникальным telegram_id (см. комментарий внизу файла).
 * 3) Настройте RLS-политики для anon-ключа (insert/update/select для своей строки или временно для теста).
 */

// ---------------------------------------------------------------------------
// Замените на ваш anon (public) ключ. Не публикуйте service_role в клиенте.
// ---------------------------------------------------------------------------
var SUPABASE_ANON_KEY = "ВСТАВЬТЕ_СЮДА_ВАШ_ANON_KEY";

var SUPABASE_URL = "https://cztfcseyzeincbwotvt.supabase.co";

// Инициализация клиента (глобаль из CDN: window.supabase.createClient)
var _sb = window.supabase;
if (!_sb || typeof _sb.createClient !== "function") {
  console.error(
    "[Supabase] Не загружен скрипт @supabase/supabase-js. Проверьте <script> в index.html."
  );
}

var supabaseClient = null;
try {
  if (_sb && typeof _sb.createClient === "function") {
    supabaseClient = _sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error("[Supabase] createClient:", e);
}

/**
 * Сохраняет или обновляет пользователя Telegram в таблице users (upsert по telegram_id).
 * Данные берутся из window.Telegram.WebApp.initDataUnsafe.user
 */
async function saveCurrentUser() {
  if (!supabaseClient) return;

  if (!window.Telegram || !window.Telegram.WebApp) {
    console.warn("[Supabase] Telegram WebApp недоступен (откройте мини-апп внутри Telegram).");
    return;
  }

  var user = window.Telegram.WebApp.initDataUnsafe &&
    window.Telegram.WebApp.initDataUnsafe.user;

  if (!user || user.id == null) {
    console.warn("[Supabase] Нет user в initDataUnsafe (режим браузера без Telegram).");
    return;
  }

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.indexOf("ВСТАВЬТЕ") !== -1) {
    console.warn("[Supabase] Укажите SUPABASE_ANON_KEY в supabase.js");
    return;
  }

  var row = {
    telegram_id: user.id,
    username: user.username != null ? user.username : null,
    first_name: user.first_name != null ? user.first_name : null,
    last_name: user.last_name != null ? user.last_name : null,
  };

  var result = await supabaseClient
    .from("users")
    .upsert(row, { onConflict: "telegram_id" });

  if (result.error) {
    console.error("[Supabase] Ошибка upsert users:", result.error.message, result.error);
    return;
  }

  console.log("[Supabase] Пользователь записан в users:", row.telegram_id);
}

/**
 * Пример: загрузить свою строку из users по telegram_id из текущего WebApp.
 * @returns {Promise<object|null>}
 */
async function getMyData() {
  if (!supabaseClient) return null;

  if (!window.Telegram || !window.Telegram.WebApp) return null;

  var user = window.Telegram.WebApp.initDataUnsafe &&
    window.Telegram.WebApp.initDataUnsafe.user;

  if (!user || user.id == null) return null;

  var result = await supabaseClient
    .from("users")
    .select("*")
    .eq("telegram_id", user.id)
    .maybeSingle();

  if (result.error) {
    console.error("[Supabase] Ошибка getMyData:", result.error.message);
    return null;
  }

  return result.data;
}

// Экспорт в глобальную область (для вызова из консоли или из app.js)
window.supabaseClient = supabaseClient;
window.saveCurrentUser = saveCurrentUser;
window.getMyData = getMyData;

/**
 * Запуск синхронизации пользователя при старте мини-приложения.
 * Вызов после загрузки DOM: если скрипт в конце <body>, document уже готов —
 * тогда запускаем сразу.
 */
function runSaveCurrentUserOnStartup() {
  saveCurrentUser().catch(function (err) {
    console.error("[Supabase] saveCurrentUser:", err);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runSaveCurrentUserOnStartup);
} else {
  runSaveCurrentUserOnStartup();
}

/*
  --- Пример SQL в Supabase (SQL Editor) ---

  create table if not exists public.users (
    telegram_id bigint primary key,
    username text,
    first_name text,
    last_name text,
    updated_at timestamptz default now()
  );

  alter table public.users enable row level security;

  -- Для production обычно проверяют JWT/initData; для быстрого теста с anon:
  -- create policy "allow anon all" on public.users for all using (true) with check (true);

  После теста замените политики на безопасные под вашу модель.
*/
