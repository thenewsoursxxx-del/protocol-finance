/* ============================================================================
 * CLOUD STORAGE SYNC
 * ----------------------------------------------------------------------------
 * Тонкая обёртка над Telegram.WebApp.CloudStorage с chunking'ом полного
 * appState. CloudStorage даёт кросс-устройственный sync без бэкенда —
 * Telegram сам хранит данные на своих серверах, привязанные к user_id.
 *
 * Лимиты CloudStorage (Bot API 6.9+):
 *   • до 1024 ключей на пользователя
 *   • value ≤ 4096 символов
 *   • key: a-zA-Z0-9_- (1-128 символов)
 *
 * Стратегия:
 *   appState сериализуется в JSON и нарезается на чанки по 3800 символов
 *   (с запасом под escape-символы UTF-8 в base64-подобных полях).
 *   Хранится так:
 *     pf_state_meta             → JSON { chunks: N, lastSavedAt, version }
 *     pf_state_chunk_0..N-1     → строки-чанки
 *
 *   Запись: сначала чанки, потом META (атомарность чтения через META).
 *   Если запись прервалась — старый META указывает на старые чанки,
 *   часть из них уже перезатёрта новыми → JSON.parse не пройдёт → возврат
 *   null. Это безопасно: cloud просто считается "пустым" до следующего push.
 *
 * Резолвинг конфликтов:
 *   На старте → pullFromCloud(). Если cloud.lastSavedAt > local.lastSavedAt
 *   → применяем cloud-версию (applyState → saveState → loadFullState).
 *   Иначе — оставляем local и push'им local в cloud в фоне.
 *
 * Триггеры push:
 *   saveFullState() → CloudSync.scheduleSync() (debounce 2500мс).
 *   premium-апгрейд → CloudSync.pushToCloud() (немедленно, не debounce).
 *
 * Все ошибки CloudStorage (нет API, не залогинен, лимит) гасятся try/catch
 * и логируются warning'ом — приложение продолжает работать на localStorage.
 * ============================================================================ */

(function (window) {
  "use strict";

  // CLOUD STORAGE SYNC: configuration
  var CHUNK_SIZE = 3800;
  var META_KEY = "pf_state_meta";
  var CHUNK_PREFIX = "pf_state_chunk_";
  var SYNC_DEBOUNCE_MS = 2500;

  function tg() { return window.Telegram && window.Telegram.WebApp; }
  function getCS() {
    var w = tg();
    return (w && w.CloudStorage) || null;
  }

  function available() {
    var cs = getCS();
    if (!cs || typeof cs.setItem !== "function") return false;
    var w = tg();
    if (w && typeof w.isVersionAtLeast === "function") {
      try { return w.isVersionAtLeast("6.9"); } catch (_e) { /* ignore */ }
    }
    // Если WebApp не сообщает версию, но CloudStorage есть — пробуем.
    return true;
  }

  // ── Promise-обёртки над callback-API ─────────────────────────────────────

  function csGet(key) {
    return new Promise(function (resolve) {
      var cs = getCS();
      if (!cs) return resolve(null);
      try {
        cs.getItem(key, function (err, value) {
          if (err) {
            console.warn("[CloudSync] getItem error key=" + key + ":", err);
            return resolve(null);
          }
          resolve(value || null);
        });
      } catch (e) {
        console.warn("[CloudSync] getItem exception:", e && e.message);
        resolve(null);
      }
    });
  }

  function csSet(key, value) {
    return new Promise(function (resolve) {
      var cs = getCS();
      if (!cs) return resolve(false);
      try {
        cs.setItem(key, value, function (err, ok) {
          if (err) {
            console.warn("[CloudSync] setItem error key=" + key + ":", err);
            return resolve(false);
          }
          resolve(!!ok);
        });
      } catch (e) {
        console.warn("[CloudSync] setItem exception:", e && e.message);
        resolve(false);
      }
    });
  }

  function csGetKeys() {
    return new Promise(function (resolve) {
      var cs = getCS();
      if (!cs || typeof cs.getKeys !== "function") return resolve([]);
      try {
        cs.getKeys(function (err, keys) {
          if (err) return resolve([]);
          resolve(Array.isArray(keys) ? keys : []);
        });
      } catch (_e) { resolve([]); }
    });
  }

  function csRemove(keys) {
    return new Promise(function (resolve) {
      var cs = getCS();
      if (!cs || !keys || !keys.length) return resolve(true);
      try {
        if (typeof cs.removeItems === "function") {
          cs.removeItems(keys, function (err, ok) { resolve(!err && !!ok); });
        } else if (typeof cs.removeItem === "function") {
          // fallback: по одному
          var idx = 0;
          var step = function () {
            if (idx >= keys.length) return resolve(true);
            cs.removeItem(keys[idx++], function () { step(); });
          };
          step();
        } else {
          resolve(false);
        }
      } catch (_e) { resolve(false); }
    });
  }

  // ── Read full state from cloud ──────────────────────────────────────────

  async function readCloudState() {
    var metaJson = await csGet(META_KEY);
    if (!metaJson) return null;
    var meta;
    try { meta = JSON.parse(metaJson); }
    catch (_e) { return null; }
    if (!meta || typeof meta.chunks !== "number" || meta.chunks < 1) return null;

    var chunks = [];
    for (var i = 0; i < meta.chunks; i++) {
      var c = await csGet(CHUNK_PREFIX + i);
      if (c === null) {
        console.warn("[CloudSync] missing chunk " + i + " of " + meta.chunks);
        return null;
      }
      chunks.push(c);
    }
    var full = chunks.join("");
    var state;
    try { state = JSON.parse(full); }
    catch (e) {
      console.warn("[CloudSync] state JSON parse failed (corrupted cloud state):", e.message);
      return null;
    }
    return { state: state, lastSavedAt: meta.lastSavedAt || null };
  }

  // ── Write full state to cloud ───────────────────────────────────────────

  async function writeCloudState(state) {
    try {
      var json = JSON.stringify(state);
      var chunks = [];
      for (var i = 0; i < json.length; i += CHUNK_SIZE) {
        chunks.push(json.slice(i, i + CHUNK_SIZE));
      }

      // 1. Удаляем лишние старые чанки (если новая версия короче).
      var existingKeys = await csGetKeys();
      var staleChunkKeys = existingKeys.filter(function (k) {
        if (typeof k !== "string" || k.indexOf(CHUNK_PREFIX) !== 0) return false;
        var idxStr = k.substring(CHUNK_PREFIX.length);
        var idx = parseInt(idxStr, 10);
        return !isNaN(idx) && idx >= chunks.length;
      });
      if (staleChunkKeys.length) await csRemove(staleChunkKeys);

      // 2. Пишем все чанки.
      for (var j = 0; j < chunks.length; j++) {
        var ok = await csSet(CHUNK_PREFIX + j, chunks[j]);
        if (!ok) {
          console.warn("[CloudSync] failed to write chunk " + j);
          return false;
        }
      }

      // 3. Пишем мету ПОСЛЕДНЕЙ — пока её нет, читатель видит "no cloud state".
      var meta = {
        chunks: chunks.length,
        lastSavedAt: state.lastSavedAt || new Date().toISOString(),
        version: state.stateVersion || 1
      };
      var metaOk = await csSet(META_KEY, JSON.stringify(meta));
      if (!metaOk) {
        console.warn("[CloudSync] failed to write meta");
        return false;
      }
      return true;
    } catch (e) {
      console.warn("[CloudSync] writeCloudState exception:", e && e.message);
      return false;
    }
  }

  // ── Pull from cloud: applies if newer than local ────────────────────────

  async function pullFromCloud() {
    if (!available()) return false;
    try {
      var cloud = await readCloudState();
      if (!cloud || !cloud.state) {
        console.log("[CloudSync] no cloud state");
        return false;
      }

      var localState = window.appState
        || (typeof window.getState === "function" ? window.getState() : null);
      var localTs = localState ? localState.lastSavedAt : null;
      var cloudTs = cloud.lastSavedAt;

      if (!cloudTs) {
        console.log("[CloudSync] cloud has no timestamp; skipping pull");
        return false;
      }

      var cloudDate = new Date(cloudTs).getTime();
      var localDate = localTs ? new Date(localTs).getTime() : 0;

      if (localDate && cloudDate <= localDate) {
        console.log("[CloudSync] local is newer or equal, skipping pull",
          { local: localTs, cloud: cloudTs });
        return false;
      }

      console.log("[CloudSync] applying cloud state (newer)",
        { local: localTs, cloud: cloudTs });

      if (typeof window.applyState === "function") {
        window.applyState(cloud.state);
        if (typeof window.saveState === "function") window.saveState();
        // UI reload — пересинхронизируем глобальные переменные.
        if (typeof window.loadFullState === "function") {
          try { window.loadFullState(); } catch (e) { console.warn("[CloudSync] loadFullState:", e); }
        }
      } else if (window.appState) {
        Object.assign(window.appState, cloud.state);
      }
      return true;
    } catch (e) {
      console.warn("[CloudSync] pullFromCloud exception:", e && e.message);
      return false;
    }
  }

  // ── Push to cloud ───────────────────────────────────────────────────────

  async function pushToCloud() {
    if (!available()) return false;
    try {
      var snapshot;
      if (typeof window.saveState === "function") {
        // Сериализуем через saveState — он stamp'ит lastSavedAt и
        // правильно обрабатывает factHistory / financialEvents.
        snapshot = window.saveState();
      } else {
        snapshot = window.appState || null;
      }
      if (!snapshot) return false;

      var ok = await writeCloudState(snapshot);
      if (ok) {
        console.log("[CloudSync] push OK, lastSavedAt=" + (snapshot.lastSavedAt || "?"));
      }
      return ok;
    } catch (e) {
      console.warn("[CloudSync] pushToCloud exception:", e && e.message);
      return false;
    }
  }

  // ── Debounced scheduler ─────────────────────────────────────────────────

  var _syncTimer = null;
  function scheduleSync() {
    if (!available()) return;
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(function () {
      _syncTimer = null;
      pushToCloud();
    }, SYNC_DEBOUNCE_MS);
  }

  // ── Public API ──────────────────────────────────────────────────────────
  window.CloudSync = {
    available: available,
    pullFromCloud: pullFromCloud,
    pushToCloud: pushToCloud,
    scheduleSync: scheduleSync
  };

  console.log("[CloudSync] module loaded. CloudStorage available:", available());
})(window);
