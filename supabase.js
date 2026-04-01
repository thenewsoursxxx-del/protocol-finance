// === Eruda — консоль для iOS и Android ===
(function() {
  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/eruda';
  script.onload = function() {
    eruda.init();
    console.log('[Eruda] Загружена.');
  };
  document.head.appendChild(script);
})();

/**
 * Supabase для Protocol Mini App (vanilla JS + CDN, без npm).
 *
 * CDN-скрипт в index.html:
 *   https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js
 * Он создаёт глобальный объект window.supabase с методом createClient.
 */

var SUPABASE_URL = "https://cztfcseyzeincbwotvt.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_Ava2_GYcJBWjcFIL_VFzWQ_-r1DYIiU";

var supabaseClient = null;

function initSupabaseClient() {
  if (supabaseClient) return true;

  var sb = window.supabase;

  if (!sb) {
    console.error("[Supabase] window.supabase не найден — CDN-скрипт не загрузился.");
    return false;
  }

  if (typeof sb.createClient !== "function") {
    console.error("[Supabase] window.supabase.createClient не является функцией.",
      "Ключи объекта:", Object.keys(sb).join(", "));
    return false;
  }

  try {
    supabaseClient = sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
    console.log("[Supabase] Клиент создан. URL:", SUPABASE_URL);
    return true;
  } catch (e) {
    console.error("[Supabase] Ошибка createClient:", e.message, e);
    return false;
  }
}

function getTelegramUser() {
  if (!window.Telegram || !window.Telegram.WebApp) {
    console.warn("[Supabase] Telegram WebApp не доступен.");
    return null;
  }
  var ud = window.Telegram.WebApp.initDataUnsafe;
  if (!ud || !ud.user || ud.user.id == null) {
    console.warn("[Supabase] initDataUnsafe.user отсутствует (браузер без Telegram).");
    return null;
  }
  return ud.user;
}

async function saveCurrentUser() {
  console.log("[Supabase] saveCurrentUser() — старт");

  if (!initSupabaseClient()) return;

  var user = getTelegramUser();
  if (!user) return;

  var row = {
    telegram_id: user.id,
    username:    user.username   || null,
    first_name:  user.first_name || null,
    last_name:   user.last_name  || null
  };

  console.log("[Supabase] upsert row:", JSON.stringify(row));

  var maxRetries = 3;
  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      var result = await supabaseClient
        .from("users")
        .upsert(row, { onConflict: "telegram_id" });

      if (result.error) {
        console.error("[Supabase] upsert ошибка (попытка " + attempt + "):",
          result.error.message, result.error.code, result.error);
        if (attempt < maxRetries) {
          var wait = attempt * 1500;
          console.log("[Supabase] Повтор через " + wait + " мс...");
          await new Promise(function(r) { setTimeout(r, wait); });
          continue;
        }
        return;
      }

      console.log("[Supabase] Пользователь сохранён: telegram_id=" + row.telegram_id);
      return;

    } catch (e) {
      console.error("[Supabase] fetch exception (попытка " + attempt + "):",
        e.name, e.message);
      if (attempt < maxRetries) {
        var w = attempt * 2000;
        console.log("[Supabase] Повтор через " + w + " мс...");
        await new Promise(function(r) { setTimeout(r, w); });
      }
    }
  }
}

async function getMyData() {
  console.log("[Supabase] getMyData() — старт");

  if (!initSupabaseClient()) return null;

  var user = getTelegramUser();
  if (!user) return null;

  try {
    var result = await supabaseClient
      .from("users")
      .select("*")
      .eq("telegram_id", user.id)
      .maybeSingle();

    if (result.error) {
      console.error("[Supabase] getMyData ошибка:", result.error.message, result.error);
      return null;
    }

    console.log("[Supabase] getMyData результат:", JSON.stringify(result.data));
    return result.data;

  } catch (e) {
    console.error("[Supabase] getMyData exception:", e.name, e.message);
    return null;
  }
}

window.saveCurrentUser = saveCurrentUser;
window.getMyData = getMyData;

window.addEventListener("load", function () {
  console.log("[Supabase] window.load — запускаем saveCurrentUser через 500 мс");

  setTimeout(function () {
    saveCurrentUser().catch(function (err) {
      console.error("[Supabase] saveCurrentUser финальная ошибка:", err);
    });
  }, 500);
});
