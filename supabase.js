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

var SUPABASE_URL = "https://cztfcseyzezincbwotvt.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_Ava2_GYcJBWjcFIL_VFzWQ_-r1DYIiU";

var supabaseClient = null;

/* ── XHR-обёртка, совместимая с fetch-интерфейсом (для iOS WKWebView) ── */
function _xhrFetch(url, opts) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    var method = (opts && opts.method) ? opts.method.toUpperCase() : "GET";
    xhr.open(method, url, true);

    var h = (opts && opts.headers) || {};
    if (h instanceof Headers) {
      h.forEach(function (v, k) { xhr.setRequestHeader(k, v); });
    } else if (typeof h === "object") {
      Object.keys(h).forEach(function (k) { xhr.setRequestHeader(k, h[k]); });
    }

    xhr.onload = function () {
      var rh = {};
      xhr.getAllResponseHeaders().trim().split(/[\r\n]+/).forEach(function (line) {
        var p = line.split(": ");
        var key = p.shift().toLowerCase();
        rh[key] = p.join(": ");
      });

      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: {
          get: function (n) { return rh[n.toLowerCase()] || null; },
          forEach: function (cb) { Object.keys(rh).forEach(function (k) { cb(rh[k], k); }); }
        },
        json: function () {
          try { return Promise.resolve(JSON.parse(xhr.responseText)); }
          catch (e) { return Promise.reject(e); }
        },
        text: function () { return Promise.resolve(xhr.responseText); }
      });
    };

    xhr.onerror = function () { reject(new TypeError("XHR network error")); };
    xhr.ontimeout = function () { reject(new TypeError("XHR timeout")); };
    xhr.timeout = 15000;
    xhr.send(opts && opts.body ? opts.body : null);
  });
}

/* ── iOS-safe fetch: native fetch с безопасными опциями → XHR fallback ── */
function _iosSafeFetch(url, opts) {
  if (typeof fetch !== "function") {
    console.log("[Supabase] fetch() не доступен, используем XHR.");
    return _xhrFetch(url, opts);
  }

  var safeOpts = {};
  if (opts) {
    Object.keys(opts).forEach(function (k) { safeOpts[k] = opts[k]; });
  }
  safeOpts.cache = "no-store";
  safeOpts.credentials = "omit";

  return fetch(url, safeOpts).catch(function (err) {
    console.warn("[Supabase] fetch() упал:", err.message, "— fallback → XHR");
    return _xhrFetch(url, opts);
  });
}

function initSupabaseClient() {
  if (supabaseClient) return true;

  var sb = window.supabase;

  if (!sb) {
    console.error("[Supabase] window.supabase не найден — CDN-скрипт не загрузился.");
    return false;
  }

  if (typeof sb.createClient !== "function") {
    console.error("[Supabase] window.supabase.createClient — не функция.",
      "Ключи:", Object.keys(sb).join(", "));
    return false;
  }

  try {
    supabaseClient = sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          "X-Client-Info": "protocol-mini-app"
        },
        fetch: _iosSafeFetch
      }
    });

    window.supabaseClient = supabaseClient;
    console.log("[Supabase] Клиент создан (iOS-safe). URL:", SUPABASE_URL);
    return true;
  } catch (e) {
    console.error("[Supabase] createClient ошибка:", e.message, e);
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

  console.log("[Supabase] save row:", JSON.stringify(row));

  // Без upsert/onConflict: нужен UNIQUE/PK на telegram_id, иначе 42P10.
  // Делаем «псевдо-upsert»: есть строка → update, нет → insert.
  var maxRetries = 3;
  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      var existing = await supabaseClient
        .from("users")
        .select("telegram_id")
        .eq("telegram_id", row.telegram_id)
        .maybeSingle();

      if (existing.error) {
        console.error("[Supabase] select users (попытка " + attempt + "):",
          existing.error.message, existing.error.code, existing.error);
        if (attempt < maxRetries) {
          var wSel = attempt * 1500;
          console.log("[Supabase] Повтор через " + wSel + " мс...");
          await new Promise(function(r) { setTimeout(r, wSel); });
          continue;
        }
        return;
      }

      var result;
      if (existing.data) {
        result = await supabaseClient
          .from("users")
          .update({
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name
          })
          .eq("telegram_id", row.telegram_id);
      } else {
        result = await supabaseClient.from("users").insert(row);
      }

      if (result.error) {
        console.error("[Supabase] insert/update ошибка (попытка " + attempt + "):",
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

/* ── saveAppState: save full app state to user_state table ── */
async function saveAppState(state) {
  try {
    if (!initSupabaseClient()) {
      console.warn("[Supabase] saveAppState: клиент не инициализирован, пропускаем.");
      return;
    }

    var user = getTelegramUser();
    if (!user) {
      console.warn("[Supabase] saveAppState: нет Telegram-пользователя, пропускаем.");
      return;
    }

    var payload = {
      telegram_id: user.id,
      data: state,
      updated_at: new Date().toISOString()
    };

    var existing = await supabaseClient
      .from("user_state")
      .select("telegram_id")
      .eq("telegram_id", user.id)
      .maybeSingle();

    if (existing.error) {
      console.error("[Supabase] saveAppState select ошибка:", existing.error.message,
        existing.error.code, existing.error.hint || "");
      return;
    }

    var result;
    if (existing.data) {
      result = await supabaseClient
        .from("user_state")
        .update({ data: state, updated_at: payload.updated_at })
        .eq("telegram_id", user.id);
    } else {
      result = await supabaseClient
        .from("user_state")
        .insert(payload);
    }

    if (result.error) {
      console.error("[Supabase] saveAppState insert/update ошибка:", result.error.message,
        result.error.code, result.error.hint || "",
        result.error.details || "");
      return;
    }

    console.log("[Supabase] saveAppState: состояние сохранено для telegram_id=" + user.id);

  } catch (e) {
    console.error("[Supabase] saveAppState exception:", e.name, e.message);
  }
}

/* ── loadAppState: load saved app state from user_state table ── */
async function loadAppState() {
  try {
    if (!initSupabaseClient()) {
      console.warn("[Supabase] loadAppState: клиент не инициализирован.");
      return null;
    }

    var user = getTelegramUser();
    if (!user) {
      console.warn("[Supabase] loadAppState: нет Telegram-пользователя.");
      return null;
    }

    var result = await supabaseClient
      .from("user_state")
      .select("data, updated_at")
      .eq("telegram_id", user.id)
      .maybeSingle();

    if (result.error) {
      console.error("[Supabase] loadAppState ошибка:", result.error.message,
        result.error.code, result.error.hint || "");
      return null;
    }

    if (result.data && result.data.data) {
      console.log("[Supabase] loadAppState: состояние загружено для telegram_id=" + user.id);
      return {
        data: result.data.data,
        updated_at: result.data.updated_at || null
      };
    }

    console.log("[Supabase] loadAppState: нет сохранённого состояния для telegram_id=" + user.id);
    return null;

  } catch (e) {
    console.error("[Supabase] loadAppState exception:", e.name, e.message);
    return null;
  }
}

window.saveAppState = saveAppState;
window.loadAppState = loadAppState;
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
