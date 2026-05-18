// === Eruda — консоль для iOS и Android (ОТКЛЮЧЕНА) ===
// Скрыта по запросу: пользователь не должен видеть dev-консоль в production-сборке.
// Чтобы временно включить для отладки — раскомментируй блок ниже.
//
// (function() {
//   var script = document.createElement('script');
//   script.src = 'https://cdn.jsdelivr.net/npm/eruda';
//   script.onload = function() {
//     eruda.init();
//     console.log('[Eruda] Загружена.');
//   };
//   document.head.appendChild(script);
// })();

/**
 * Supabase для Protocol Mini App (vanilla JS + CDN, без npm).
 *
 * CDN-скрипт в index.html:
 *   https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js
 * Он создаёт глобальный объект window.supabase с методом createClient.
 *
 * ── SECURITY MODE: CLIENT-TRUST (DEVELOPMENT / INTERNAL BETA) ──
 *
 * Current implementation trusts the Telegram user identity provided by
 * window.Telegram.WebApp.initDataUnsafe on the client side.
 * This is acceptable for local testing and internal beta, but NOT
 * suitable for public production because a malicious client can spoof
 * the telegram_id and read/write another user's data.
 *
 * For production, the secure path is:
 *   1. Client sends raw Telegram initData string to a backend
 *      (Supabase Edge Function, Cloudflare Worker, own server, etc.)
 *   2. Backend validates initData with the bot secret (HMAC-SHA-256)
 *      per https://core.telegram.org/bots/webapps#validating-data
 *   3. Backend resolves the verified telegram_id and either:
 *      a) returns a signed JWT / session token to the client, or
 *      b) performs the DB operation itself on behalf of the user
 *   4. Supabase RLS policies restrict rows to the verified identity
 *
 * The single future upgrade point is getVerifiedUserIdentity().
 * When a verification backend is ready, only that function needs
 * to change — all save/load functions already depend on it.
 *
 * ── RLS PREPARATION (NEXT PRODUCTION STEP) ──
 *
 * Tables used: `users`, `user_state`
 * Both are currently accessed with the anon key and NO RLS.
 *
 * Recommended steps before going fully public:
 *   - Enable RLS on `users` and `user_state`
 *   - Create policies that restrict SELECT/INSERT/UPDATE to rows
 *     matching the authenticated user's telegram_id
 *   - Move writes behind a verified server-side identity
 *     (Edge Function that validates initData → performs DB ops)
 *   - Do NOT rely permanently on unrestricted client writes
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

/* ── Centralized Telegram identity extraction ── */

function getTelegramIdentity() {
  if (!window.Telegram || !window.Telegram.WebApp) {
    console.warn("[Identity] Telegram WebApp не доступен.");
    return null;
  }
  var ud = window.Telegram.WebApp.initDataUnsafe;
  if (!ud || !ud.user || ud.user.id == null) {
    console.warn("[Identity] initDataUnsafe.user отсутствует (браузер без Telegram).");
    return null;
  }

  var rawId = ud.user.id;
  var numId = Number(rawId);
  if (!Number.isFinite(numId) || numId <= 0 || Math.floor(numId) !== numId) {
    console.warn("[Identity] telegram_id не является валидным целым числом:", rawId);
    return null;
  }

  return {
    telegram_id: numId,
    username:    ud.user.username   || null,
    first_name:  ud.user.first_name || null,
    last_name:   ud.user.last_name  || null
  };
}

/**
 * Single future upgrade point for verified user identity.
 *
 * Currently returns the client-side Telegram identity directly.
 * When a verification backend is ready (Edge Function / own server),
 * this function should:
 *   1. Send window.Telegram.WebApp.initData to the backend
 *   2. Backend validates HMAC-SHA-256 with bot secret
 *   3. Backend returns verified { telegram_id, ... }
 *   4. This function returns that verified identity
 *
 * All save/load functions depend on this single entry point,
 * so upgrading to server verification requires changing only here.
 */
async function getVerifiedUserIdentity() {
  // TODO: replace with server-side initData verification
  return getTelegramIdentity();
}

/* ── Backward-compatible alias (used by app.js for UI-only access) ── */
function getTelegramUser() {
  var identity = getTelegramIdentity();
  if (!identity) return null;
  return {
    id:         identity.telegram_id,
    username:   identity.username,
    first_name: identity.first_name,
    last_name:  identity.last_name
  };
}

async function saveCurrentUser() {
  console.log("[Supabase] saveCurrentUser() — старт");

  if (!initSupabaseClient()) return;

  var identity = await getVerifiedUserIdentity();
  if (!identity) return;

  var row = {
    telegram_id: identity.telegram_id,
    username:    identity.username,
    first_name:  identity.first_name,
    last_name:   identity.last_name
  };

  console.log("[Supabase] save row:", JSON.stringify(row));

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

  var identity = await getVerifiedUserIdentity();
  if (!identity) return null;

  try {
    var result = await supabaseClient
      .from("users")
      .select("*")
      .eq("telegram_id", identity.telegram_id)
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

    var identity = await getVerifiedUserIdentity();
    if (!identity) {
      console.warn("[Supabase] saveAppState: нет пользователя, пропускаем.");
      return;
    }

    var tid = identity.telegram_id;
    var payload = {
      telegram_id: tid,
      data: state,
      updated_at: new Date().toISOString()
    };

    var existing = await supabaseClient
      .from("user_state")
      .select("telegram_id")
      .eq("telegram_id", tid)
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
        .eq("telegram_id", tid);
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

    console.log("[Supabase] saveAppState: состояние сохранено для telegram_id=" + tid);

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

    var identity = await getVerifiedUserIdentity();
    if (!identity) {
      console.warn("[Supabase] loadAppState: нет пользователя.");
      return null;
    }

    var tid = identity.telegram_id;
    var result = await supabaseClient
      .from("user_state")
      .select("data, updated_at")
      .eq("telegram_id", tid)
      .maybeSingle();

    if (result.error) {
      console.error("[Supabase] loadAppState ошибка:", result.error.message,
        result.error.code, result.error.hint || "");
      return null;
    }

    if (result.data && result.data.data) {
      console.log("[Supabase] loadAppState: состояние загружено для telegram_id=" + tid);
      return {
        data: result.data.data,
        updated_at: result.data.updated_at || null
      };
    }

    console.log("[Supabase] loadAppState: нет сохранённого состояния для telegram_id=" + tid);
    return null;

  } catch (e) {
    console.error("[Supabase] loadAppState exception:", e.name, e.message);
    return null;
  }
}

window.getTelegramIdentity = getTelegramIdentity;
window.getVerifiedUserIdentity = getVerifiedUserIdentity;
window.saveAppState = saveAppState;
window.loadAppState = loadAppState;
window.saveCurrentUser = saveCurrentUser;
window.getMyData = getMyData;

/* ============================================================================
 * DYNAMIC INFLATION RATES (public.inflation_rates)
 * ----------------------------------------------------------------------------
 * Заменяет статический STATS_COUNTRY_MAP[code].inflation на реальные данные
 * из Supabase. Кэширование на уровне модуля (in-memory, без TTL для одиночных
 * вызовов; TTL=1ч для батч-загрузки списка).
 *
 *   getInflationRate(country) → Promise<number>
 *     country = строка точно как в БД (например, "Россия"). Возвращает rate
 *     (десятичный процент, e.g. 7.8) либо 5.0 на любую ошибку.
 *
 *   loadInflationRates({ force }) → Promise<Array<{country, currency, inflation_rate, last_updated}>>
 *     Батч-загрузка всех стран. Используется для построения дропдауна стран
 *     в "Статистике счёта" и для прогрева кэша. Возвращает [] при ошибке.
 *
 * Fallback: INFLATION_FALLBACK = 5.0 (соответствует UX-спеке).
 * ============================================================================ */

var _inflationCache = new Map();       // country (db name) → number
var _inflationListCache = null;        // { ts: number, rows: Array }
var INFLATION_FALLBACK = 5.0;
var INFLATION_LIST_TTL_MS = 60 * 60 * 1000; // 1 час

async function getInflationRate(country) {
  try {
    if (!country) return INFLATION_FALLBACK;
    if (_inflationCache.has(country)) return _inflationCache.get(country);
    if (!initSupabaseClient()) return INFLATION_FALLBACK;

    var res = await supabaseClient
      .from("inflation_rates")
      .select("inflation_rate")
      .eq("country", country)
      .single();

    if (res.error || !res.data) {
      console.warn("[Inflation] Не удалось получить ставку для:", country,
        res.error && (res.error.code || res.error.message));
      return INFLATION_FALLBACK;
    }
    var rate = Number(res.data.inflation_rate);
    if (!isFinite(rate)) return INFLATION_FALLBACK;
    _inflationCache.set(country, rate);
    return rate;
  } catch (e) {
    console.error("[Inflation] Ошибка getInflationRate:", e);
    return INFLATION_FALLBACK;
  }
}

async function loadInflationRates(opts) {
  var force = !!(opts && opts.force);
  try {
    var now = Date.now();
    if (!force && _inflationListCache &&
        (now - _inflationListCache.ts < INFLATION_LIST_TTL_MS)) {
      return _inflationListCache.rows;
    }
    if (!initSupabaseClient()) return [];

    var res = await supabaseClient
      .from("inflation_rates")
      .select("country, currency, inflation_rate, last_updated")
      .order("country", { ascending: true });

    if (res.error || !res.data) {
      console.warn("[Inflation] Не удалось загрузить список:",
        res.error && (res.error.code || res.error.message));
      return [];
    }
    var rows = res.data;
    _inflationListCache = { ts: now, rows: rows };
    rows.forEach(function (row) {
      if (row && row.country != null && row.inflation_rate != null) {
        _inflationCache.set(row.country, Number(row.inflation_rate));
      }
    });
    console.log("[Inflation] Загружено стран:", rows.length);
    return rows;
  } catch (e) {
    console.error("[Inflation] Ошибка loadInflationRates:", e);
    return [];
  }
}

window.getInflationRate = getInflationRate;
window.loadInflationRates = loadInflationRates;

window.addEventListener("load", function () {
  console.log("[Supabase] window.load — запускаем saveCurrentUser через 500 мс");

  setTimeout(function () {
    saveCurrentUser().catch(function (err) {
      console.error("[Supabase] saveCurrentUser финальная ошибка:", err);
    });
  }, 500);
});

// NEW: Media attachment in reports
// Bucket `report-media` должен существовать в Supabase Storage с публичным доступом
// (см. инструкцию в финальном ответе ассистента — INSERT policy + read-anon policy).
//
// Имена файлов санитизируются: только [A-Za-z0-9._-], всё остальное → `_`.
// Путь: reports/{telegramId}/{Date.now()}/{idx}_{safeName}
// .upload() с upsert:false — конфликтов имён не будет благодаря timestamp в пути.
function _sanitizeFileName(name) {
  var s = String(name || "file").replace(/[^\w.\-]+/g, "_");
  // ограничим длину, чтобы не упереться в лимиты Storage path
  if (s.length > 80) s = s.slice(0, 80);
  return s || "file";
}

// PREMIUM PROGRESS ANIMATION (real progress) — XHR-обёртка для аплоада в Storage.
// Supabase JS клиент использует fetch, у которого нет upload progress на стандарте.
// Чтобы получить байтовый прогресс, идём напрямую через XHR в REST endpoint:
//   POST {SUPABASE_URL}/storage/v1/object/{bucket}/{path}
// с anon-ключом в Authorization + apikey + Content-Type + x-upsert: false.
//
// Возвращает Promise<{ data, statusCode? }>. На !2xx — reject с err{statusCode, body, message}.
// onProgress(loaded, total) — частые вызовы (~50–150ms на медленной сети).

// FIX: cancel button during upload — список активных XHR для abort().
// Когда пользователь жмёт "Отмена" во время аплоада, window.cancelReportUpload()
// проходит по списку и вызывает xhr.abort() на каждом → onabort → reject Promise.
var _activeReportXhrs = [];

function _uploadFileViaXHR(url, file, headers, onProgress) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    Object.keys(headers || {}).forEach(function (k) {
      xhr.setRequestHeader(k, headers[k]);
    });

    // Регистрируем XHR в активном списке для возможного abort'а.
    _activeReportXhrs.push(xhr);
    function _unregister() {
      var idx = _activeReportXhrs.indexOf(xhr);
      if (idx >= 0) _activeReportXhrs.splice(idx, 1);
    }

    if (xhr.upload && typeof onProgress === "function") {
      xhr.upload.onprogress = function (evt) {
        if (evt && evt.lengthComputable) {
          try { onProgress(evt.loaded, evt.total); } catch (e) { /* swallow */ }
        }
      };
    }

    xhr.onload = function () {
      _unregister();
      if (xhr.status >= 200 && xhr.status < 300) {
        var parsed;
        try { parsed = JSON.parse(xhr.responseText || "{}"); } catch (e) { parsed = {}; }
        resolve({ data: parsed, statusCode: xhr.status });
      } else {
        var bodyText = xhr.responseText || "";
        var bodyParsed;
        try { bodyParsed = JSON.parse(bodyText); } catch (e) { bodyParsed = bodyText; }
        var msg = (bodyParsed && bodyParsed.message)
          ? bodyParsed.message
          : "upload failed: HTTP " + xhr.status;
        var err = new Error(msg);
        err.statusCode = xhr.status;
        err.body = bodyParsed;
        reject(err);
      }
    };
    xhr.onerror   = function () { _unregister(); reject(new Error("upload network error")); };
    xhr.ontimeout = function () { _unregister(); reject(new Error("upload timeout")); };
    // FIX: cancel button during upload — обработчик abort, без него Promise виснет
    // после xhr.abort(), и Promise.all/await никогда не резолвится.
    xhr.onabort   = function () {
      _unregister();
      var ae = new Error("upload aborted");
      ae.aborted = true;
      reject(ae);
    };
    xhr.timeout = 60000; // 60s per file (25MB на 3G ≈ 60s)

    xhr.send(file);
  });
}

// FIX: cancel button during upload — публичный API для UI слоя (app.js).
// Прерывает все активные XHR-аплоады в текущем `saveReport`. Идемпотентно.
window.cancelReportUpload = function () {
  if (!_activeReportXhrs.length) return;
  console.log('%c[Report] Отмена аплоада, активных XHR:', 'color: #f59e0b', _activeReportXhrs.length);
  // Снапшот, потому что abort() триггерит _unregister() который мутирует массив.
  var snapshot = _activeReportXhrs.slice();
  for (var i = 0; i < snapshot.length; i++) {
    try { snapshot[i].abort(); } catch (e) { /* swallow */ }
  }
  _activeReportXhrs.length = 0;
};

// UPDATED: saveReport — поддерживает media-аплоад с REAL XHR-прогрессом.
// Сигнатура: saveReport(telegramId, message, files, onProgress)
//   • files       — Array<File|Blob>, может быть пустым/undefined
//   • onProgress  — function(p: 0..1), вызывается во время аплоада с агрегированным
//                   значением (cumulative_loaded / total_bytes) по всем файлам.
//                   После окончания всех аплоадов гарантирует p=1.
//                   Если файлов нет — onProgress НЕ вызывается (UI использует fake-progress).
window.saveReport = async (telegramId, message, files, onProgress) => {
  if (!telegramId || !message || message.trim().length < 5) {
    return { ok: false, error: "Недостаточно данных" };
  }

  if (!initSupabaseClient()) {
    return { ok: false, error: "Supabase-клиент не инициализирован" };
  }

  // NEW: Media attachment in reports — нормализация массива файлов
  var mediaFiles = Array.isArray(files) ? files.filter(Boolean) : [];

  try {
    // Подтягиваем chat_id из таблицы users.
    const { data: userData } = await supabaseClient
      .from('users')
      .select('chat_id')
      .eq('telegram_id', telegramId)
      .single();

    const chatId = userData?.chat_id || telegramId; // fallback

    // PREMIUM PROGRESS ANIMATION (real) — аплоад с агрегированным прогрессом.
    // Сначала считаем totalBytes по всем файлам, потом per-file XHR с onprogress.
    // Каллбэк наружу получает чистый p ∈ [0..1].
    var mediaUrls = [];
    if (mediaFiles.length > 0) {
      var totalBytes = 0;
      for (var ti = 0; ti < mediaFiles.length; ti++) {
        totalBytes += (mediaFiles[ti].size || 0);
      }
      var completedBytes = 0;
      var ts = Date.now();

      var headers = {
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "apikey":        SUPABASE_ANON_KEY,
        "x-upsert":      "false",
        "Cache-Control": "3600"
      };

      for (var i = 0; i < mediaFiles.length; i++) {
        var f = mediaFiles[i];
        var safeName = _sanitizeFileName(f.name);
        var path = "reports/" + telegramId + "/" + ts + "/" + i + "_" + safeName;
        var contentType = f.type || "application/octet-stream";

        var uploadUrl = SUPABASE_URL.replace(/\/$/, "") +
                        "/storage/v1/object/report-media/" + path;

        var perFileHeaders = Object.assign({ "Content-Type": contentType }, headers);

        try {
          await _uploadFileViaXHR(uploadUrl, f, perFileHeaders, function (loaded /*, total */) {
            if (typeof onProgress === "function" && totalBytes > 0) {
              var cumulative = completedBytes + loaded;
              onProgress(Math.min(1, cumulative / totalBytes));
            }
          });
        } catch (upErr) {
          console.error('[saveReport] upload ошибка для', safeName, upErr);
          var ue = new Error(upErr.message || 'upload failed');
          ue.code = upErr.statusCode || upErr.code;
          ue.details = '[upload:' + safeName + ']';
          ue.hint = (upErr.body && upErr.body.error) || '';
          ue._fileName = safeName;
          throw ue;
        }

        completedBytes += (f.size || 0);

        // Гарантируем, что после каждого файла прогресс отражает суммарную долю
        // (некоторые браузеры могут не дать финальный onprogress перед onload).
        if (typeof onProgress === "function" && totalBytes > 0) {
          onProgress(Math.min(1, completedBytes / totalBytes));
        }

        // Public URL — строим вручную (то же, что вернул бы getPublicUrl
        // на public bucket'е). Дёшево, без сетевого вызова.
        var publicUrl = SUPABASE_URL.replace(/\/$/, "") +
                        "/storage/v1/object/public/report-media/" + path;

        mediaUrls.push(publicUrl);
        console.log('%c[Report] Загружен файл:', 'color: #10b981', safeName, '→', publicUrl);
      }

      // Финальный пуш прогресса до 1.0 после всех файлов.
      if (typeof onProgress === "function") {
        onProgress(1);
      }
    }

    const { data, error } = await supabaseClient
      .from('reports')
      .insert({
        telegram_id: telegramId,
        chat_id: chatId,
        message: message.trim(),
        status: 'new',
        resolved: false,
        notification_sent: false,
        media_urls: mediaUrls
      })
      .select('id')
      .single();

    if (error) throw error;

    console.log(
      '%c[Report] Отчёт сохранён с chat_id:',
      'color: #10b981',
      chatId,
      '| id:', data.id,
      '| media:', mediaUrls.length
    );
    return { ok: true, id: data.id, mediaCount: mediaUrls.length };
  } catch (err) {
    console.error('[saveReport] Полная ошибка Supabase:', err);
    if (err && (err.code || err.details || err.hint)) {
      console.error(
        '[saveReport] code=' + err.code,
        'details=' + (err.details || ''),
        'hint=' + (err.hint || '')
      );
    }
    return {
      ok: false,
      error: err.message || 'Не удалось отправить',
      failedFile: err && err._fileName
    };
  }
};

// =============================================
// Report system ready (reports table + saveReport)
// =============================================

// AUTO: chat_id saving for bot notifications
// Сохраняем chat_id в таблицу users, чтобы backend мог отправлять push
// «твоё сообщение помогло — мы починили» после resolved=true в reports.
//
// Замечания по сравнению с исходным snippet'ом:
//   • supabase.from(...) → supabaseClient.from(...)
//     (window.supabase — это CDN-namespace c .createClient(), у него нет .from()).
//   • tg?.initDataUnsafe... → window.Telegram?.WebApp?.initDataUnsafe...
//     (в этом файле переменная tg не объявлена, был бы ReferenceError).
//   • initSupabaseClient() — идемпотентная защита от вызова до инициализации клиента.
window.saveUserChatId = async (chatId) => {
  const telegramId =
    window.tgUserId ||
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  // AUTO: chat_id saving for bot notifications — entry log для диагностики
  console.log(
    '%c[saveUserChatId] Вызвана с chatId:',
    'color: #10b981; font-weight: bold',
    chatId,
    'telegram_id:',
    telegramId
  );

  if (!telegramId || !chatId) {
    console.warn('[saveUserChatId] Прерывание: telegramId или chatId пустой',
      { telegramId: telegramId, chatId: chatId });
    return;
  }

  if (!initSupabaseClient()) {
    console.warn('[saveUserChatId] Supabase-клиент не инициализирован');
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .upsert({
        telegram_id: telegramId,
        chat_id: chatId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'telegram_id' })
      .select('telegram_id, chat_id');

    if (error) {
      console.error('[ChatID] Ошибка сохранения:', error);
      if (error.code || error.details || error.hint) {
        console.error(
          '[ChatID] code=' + error.code,
          'details=' + (error.details || ''),
          'hint=' + (error.hint || '')
        );
      }
    } else {
      console.log('%c[ChatID] chat_id сохранён:', 'color: #10b981', chatId, '→ DB:', data);
    }
  } catch (e) {
    console.error('[ChatID] Ошибка:', e);
  }
};
