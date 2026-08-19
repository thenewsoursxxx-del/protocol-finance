/* ============================================================
   INTRO STORIES - вступительные сторис при входе в приложение

   Две фазы в одном оверлее:
   1) пять слайдов о ключевых возможностях - знакомство, план с графиком,
      подушка безопасности, расходы по категориям и Premium «Свой график»;
   2) карточка по центру с персонажем над ней: предложение пройти короткое
      знакомство с функциями. Согласие вызывает window.IntroTour.start(),
      если тур подключён, иначе просто открывает приложение.

   Модуль полностью самодостаточен: сам строит разметку в body, сам
   вешает обработчики и сам за собой убирает. Никакой разметки в
   index.html и никаких зависимостей, кроме необязательных t(),
   getCurrencySymbol(), haptic(), updateState() и saveFullState().
   ============================================================ */
(function () {
  "use strict";

  /* Пока сторис показываются при каждом входе - так удобнее смотреть правки.
     Когда понадобится показывать их только при самом первом заходе, ставим
     false: логика флага introStoriesSeen в state уже готова и работает. */
  var SHOW_ON_EVERY_LAUNCH = true;

  var ROOT_ID = "introStoriesRoot";
  var HERO_SRC = "assets/stories/android.png";

  /* Длительность каждого слайда, мс. Индекс = номер слайда. */
  var DURATIONS = [5200, 6400, 6400, 6800, 7200];

  var shownThisSession = false;
  var root = null;
  var slides = [];
  var fills = [];
  var idx = 0;
  var elapsed = 0;
  var paused = false;
  var finished = false;
  var offering = false;
  var rafId = 0;
  var lastFrame = 0;

  /* ---------- вспомогательные ---------- */

  /* Перевод с фолбэком: модуль остаётся рабочим, даже если ключа нет в i18n. */
  function tr(key, fallback) {
    try {
      if (typeof t === "function") {
        var v = t(key);
        if (v && v !== key) return v;
      }
    } catch (e) { /* noop */ }
    return fallback;
  }

  function lang() {
    try {
      if (typeof getCurrentLanguage === "function") return getCurrentLanguage();
    } catch (e) { /* noop */ }
    return "ru";
  }

  function locale() { return lang() === "en" ? "en-US" : "ru-RU"; }

  function num(n) {
    try { return n.toLocaleString(locale()); } catch (e) { return String(n); }
  }

  function cur() {
    try {
      if (typeof getCurrencySymbol === "function") return getCurrencySymbol() || "\u20BD";
    } catch (e) { /* noop */ }
    return "\u20BD";
  }

  function daysAgo(days) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    try {
      return d.toLocaleDateString(locale(), { day: "numeric", month: "long" });
    } catch (e) { return ""; }
  }

  function buzz(kind) {
    try { if (typeof haptic === "function") haptic(kind || "light"); }
    catch (e) { /* noop */ }
  }

  function seen() {
    try {
      if (typeof getState === "function") return getState().introStoriesSeen === true;
    } catch (e) { /* noop */ }
    return false;
  }

  function markSeen() {
    try {
      if (typeof updateState === "function") updateState({ introStoriesSeen: true });
      if (typeof saveFullState === "function") saveFullState();
      else if (typeof saveState === "function") saveState();
    } catch (e) { /* noop */ }
  }

  /* ---------- разметка ---------- */

  function template() {
    var symbol = cur();

    return '' +
    '<canvas class="ist-fx"></canvas>' +
    '<div class="ist-vignette"></div>' +
    '<div class="ist-bars"></div>' +
    '<button type="button" class="ist-skip">' + tr("stories.skip", "Пропустить") + '</button>' +
    '<div class="ist-pause">' + tr("stories.paused", "пауза") + '</div>' +

    /* 1. Знакомство */
    '<section class="ist-slide">' +
      '<div class="ist-visual">' +
        '<div class="ist-hero-shade"><div></div></div>' +
        '<div class="ist-hero-fx">' +
          '<div class="ist-halo"></div>' +
          '<div class="ist-ring"></div>' +
          '<div class="ist-ring ist-ring--2"></div>' +
        '</div>' +
        '<div class="ist-hero"><img src="' + HERO_SRC + '" alt=""></div>' +
      '</div>' +
      '<div class="ist-copy">' +
        '<span class="ist-tag ist-anim">' + tr("stories.s1.tag", "Protocol") + '</span>' +
        '<h2 class="ist-title ist-anim ist-d1">' + tr("stories.s1.title", "Деньги по плану,<br>а не на ощупь") + '</h2>' +
        '<p class="ist-body ist-anim ist-d2">' + tr("stories.s1.body", "Я посчитаю, сколько откладывать каждый месяц, и покажу, когда вы придёте к цели. Без таблиц и ручных расчётов.") + '</p>' +
      '</div>' +
    '</section>' +

    /* 2. Текущий план */
    '<section class="ist-slide">' +
      '<div class="ist-visual">' +
        '<div class="ist-graph-wrap">' +
          '<svg class="ist-graph" viewBox="0 0 312 190" aria-hidden="true">' +
            '<defs>' +
              '<linearGradient id="istAreaGrad" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="#10b981" stop-opacity="0.34"/>' +
                '<stop offset="100%" stop-color="#10b981" stop-opacity="0"/>' +
              '</linearGradient>' +
            '</defs>' +
            '<g stroke="rgba(255,255,255,0.07)" stroke-width="1">' +
              '<line x1="0" y1="40" x2="312" y2="40"/>' +
              '<line x1="0" y1="90" x2="312" y2="90"/>' +
              '<line x1="0" y1="140" x2="312" y2="140"/>' +
            '</g>' +
            '<path class="ist-garea" fill="url(#istAreaGrad)" d="M0 172 L306 18 L312 15 L312 190 L0 190 Z"/>' +
            '<path class="ist-gline" pathLength="1" stroke="#10b981" d="M0 172 L306 18"/>' +
            '<path class="ist-gline ist-gline--fact" pathLength="1" stroke="rgba(255,255,255,0.62)" d="M0 172 L40 158 L76 142 L112 128 L148 110 L184 84 L220 54"/>' +
            '<circle class="ist-gdot" cx="306" cy="18" r="5" fill="#6ee7b7"/>' +
          '</svg>' +
          '<div class="ist-legend">' +
            '<span><i class="ist-lg-plan"></i>' + tr("stories.s2.plan", "План") + '</span>' +
            '<span><i class="ist-lg-fact"></i>' + tr("stories.s2.fact", "Факт") + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="ist-copy">' +
        '<span class="ist-tag ist-anim">' + tr("stories.s2.tag", "Текущий план") + '</span>' +
        '<h2 class="ist-title ist-anim ist-d1">' + tr("stories.s2.title", "Срок и сумма<br>считаются сами") + '</h2>' +
        '<div class="ist-panel ist-anim ist-d2">' +
          '<div class="ist-metrics">' +
            '<div class="ist-metric">' +
              '<small>' + tr("stories.s2.save", "Откладываете") + '</small>' +
              '<b data-count="24500" data-suffix=" ' + symbol + '">0 ' + symbol + '</b>' +
            '</div>' +
            '<div class="ist-metric">' +
              '<small>' + tr("stories.s2.eta", "Цель через") + '</small>' +
              '<b data-count="11" data-suffix="' + tr("stories.s2.monthsShort", " мес") + '">0</b>' +
            '</div>' +
          '</div>' +
          '<p class="ist-body ist-body--sm">' + tr("stories.s2.body", "Доход, расходы и цель - Protocol строит график плана и факта.") + '</p>' +
          '<div class="ist-chips">' +
            '<span class="ist-chip">' + tr("mode.calm", "Спокойный") + '</span>' +
            '<span class="ist-chip is-sel">' + tr("mode.normal", "Умеренный") + '</span>' +
            '<span class="ist-chip">' + tr("mode.aggressive", "Агрессивный") + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>' +

    /* 3. Подушка безопасности */
    '<section class="ist-slide">' +
      '<div class="ist-visual">' +
        '<div class="ist-reserve">' +
          '<div class="ist-split">' +
            '<div class="ist-sc ist-panel">' +
              '<small>' + tr("stories.s3.direct", "Всё в цель") + '</small>' +
              '<b>100%</b>' +
              '<span>' + tr("stories.s3.directNote", "Максимально быстро") + '</span>' +
            '</div>' +
            '<div class="ist-sc ist-sc--buffer ist-panel">' +
              '<small>' + tr("stories.s3.buffer", "С резервом") + '</small>' +
              '<b>90/10</b>' +
              '<span>' + tr("stories.s3.bufferNote", "Со страховкой") + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="ist-tube">' +
            '<div class="ist-fill"></div>' +
            '<div class="ist-tube-label">' +
              '<small>' + tr("stories.s3.reserve", "Подушка безопасности") + '</small>' +
              '<b data-count="18400" data-suffix=" ' + symbol + '">0 ' + symbol + '</b>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="ist-copy">' +
        '<span class="ist-tag ist-anim">' + tr("stories.s3.tag", "С резервом") + '</span>' +
        '<h2 class="ist-title ist-anim ist-d1">' + tr("stories.s3.title", "Форс-мажор<br>не сорвёт план") + '</h2>' +
        '<p class="ist-body ist-anim ist-d2">' + tr("stories.s3.body", "Каждое отложение делится: большая часть идёт в цель, десятая - в резерв. Сломалась техника - берёте из подушки, а не из цели.") + '</p>' +
      '</div>' +
    '</section>' +

    /* 4. Расходы */
    '<section class="ist-slide">' +
      '<div class="ist-visual">' +
        '<div class="ist-expenses">' +
          '<div class="ist-donut-wrap">' +
            '<svg class="ist-donut" viewBox="0 0 100 100" aria-hidden="true">' +
              '<circle class="ist-track" cx="50" cy="50" r="40"/>' +
              '<circle class="ist-seg" cx="50" cy="50" r="40" stroke="#10b981" data-pct="32"/>' +
              '<circle class="ist-seg" cx="50" cy="50" r="40" stroke="#3b82f6" data-pct="19"/>' +
              '<circle class="ist-seg" cx="50" cy="50" r="40" stroke="#8b5cf6" data-pct="15"/>' +
              '<circle class="ist-seg" cx="50" cy="50" r="40" stroke="#f59e0b" data-pct="13"/>' +
              '<circle class="ist-seg" cx="50" cy="50" r="40" stroke="#f47259" data-pct="21"/>' +
            '</svg>' +
            '<div class="ist-donut-center">' +
              '<small>' + tr("stories.s4.spent", "Потрачено") + '</small>' +
              '<b data-count="62400" data-suffix=" ' + symbol + '">0 ' + symbol + '</b>' +
            '</div>' +
          '</div>' +
          '<div class="ist-cats">' +
            '<span class="ist-cat"><i style="background:#10b981"></i>' + tr("cat.food", "Продукты") + ' <em>32%</em></span>' +
            '<span class="ist-cat"><i style="background:#3b82f6"></i>' + tr("cat.transport", "Транспорт") + ' <em>19%</em></span>' +
            '<span class="ist-cat"><i style="background:#8b5cf6"></i>' + tr("cat.cafe", "Кафе") + ' <em>15%</em></span>' +
            '<span class="ist-cat"><i style="background:#f59e0b"></i>' + tr("cat.home", "Дом") + ' <em>13%</em></span>' +
            '<span class="ist-cat"><i style="background:#f47259"></i>' + tr("cat.other", "Прочее") + ' <em>21%</em></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="ist-copy">' +
        '<span class="ist-tag ist-anim">' + tr("stories.s4.tag", "Расходы") + '</span>' +
        '<h2 class="ist-title ist-anim ist-d1">' + tr("stories.s4.title", "Видно, куда<br>уходят деньги") + '</h2>' +
        '<p class="ist-body ist-anim ist-d2">' + tr("stories.s4.body", "Девять категорий и разбивка по месяцам. Одним переключателем траты начинают учитываться в плане.") + '</p>' +
      '</div>' +
    '</section>' +

    /* 5. Premium: свой график */
    '<section class="ist-slide">' +
      '<div class="ist-visual">' +
        '<div class="ist-flow">' +
          '<div class="ist-rec ist-rec--in">' +
            '<i></i>' +
            '<div><b>' + tr("stories.s5.recIn", "Аванс") + '</b><small>' + daysAgo(7) + '</small></div>' +
            '<em>+' + num(40000) + ' ' + symbol + '</em>' +
          '</div>' +
          '<div class="ist-rec ist-rec--out">' +
            '<i></i>' +
            '<div><b>' + tr("stories.s5.recOut", "Ремонт") + '</b><small>' + daysAgo(1) + '</small></div>' +
            '<em>-' + num(12700) + ' ' + symbol + '</em>' +
          '</div>' +
          '<div class="ist-flow-link"><i></i></div>' +
          '<div class="ist-free">' +
            '<div class="ist-free-row">' +
              '<small>' + tr("stories.s5.free", "Свободно") + '</small>' +
              '<b data-count="27300" data-suffix=" ' + symbol + '" data-count-delay="900">0 ' + symbol + '</b>' +
            '</div>' +
            '<div class="ist-stash">' + tr("stories.s5.stash", "Отложить") + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="ist-copy">' +
        '<span class="ist-tag ist-tag--premium">' + tr("stories.s5.tag", "Premium · Свой график") + '</span>' +
        '<h2 class="ist-title ist-anim ist-d1">' + tr("stories.s5.title", "Доход рывками -<br>план не ломается") + '</h2>' +
        '<p class="ist-body ist-anim ist-d2">' + tr("stories.s5.body", "Записываете приход или трату в тот день, когда они случились. Protocol пересчитывает «Свободно», а в цель деньги уходят только по кнопке «Отложить».") + '</p>' +
        '<button type="button" class="ist-cta ist-anim ist-d3">' + tr("stories.cta", "Начать") + '</button>' +
      '</div>' +
    '</section>' +

    '<div class="ist-zone ist-zone--prev"></div>' +
    '<div class="ist-zone ist-zone--next"></div>' +

    /* Финальная карточка. Лежит после зон тапа, чтобы кнопки были доступны,
       а сами зоны на этой фазе скрываются. */
    '<div class="ist-offer">' +
      '<div class="ist-offer-figure">' +
        '<div class="ist-offer-shade"><div></div></div>' +
        '<div class="ist-offer-glow">' +
          '<div class="ist-offer-halo"></div>' +
          '<div class="ist-offer-ring"></div>' +
        '</div>' +
        '<div class="ist-offer-head"><img src="' + HERO_SRC + '" alt=""></div>' +
      '</div>' +
      '<div class="ist-card">' +
        '<h3>' + tr("stories.offer.title", "Показать, как всё устроено?") + '</h3>' +
        '<p>' + tr("stories.offer.body", "Покажу главное: план, резерв и расходы. Разберётесь за минуту.") + '</p>' +
        '<button type="button" class="ist-yes">' + tr("stories.offer.yes", "Да, покажите") + '</button>' +
        '<button type="button" class="ist-no">' + tr("stories.offer.no", "Пропустить обучение") + '</button>' +
      '</div>' +
    '</div>';
  }

  /* ---------- анимации содержимого ---------- */

  function countUp(el) {
    var target = +el.getAttribute("data-count");
    var suffix = el.getAttribute("data-suffix") || "";
    var delay = +(el.getAttribute("data-count-delay") || 0);
    var dur = 1150;
    var start = performance.now() + delay;

    if (el._raf) cancelAnimationFrame(el._raf);
    el.textContent = num(0) + suffix;

    function step(now) {
      var k = Math.max(0, Math.min(1, (now - start) / dur));
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = num(Math.round(target * eased)) + suffix;
      if (k < 1) el._raf = requestAnimationFrame(step);
      else el._raf = 0;
    }
    el._raf = requestAnimationFrame(step);
  }

  var DONUT_C = 2 * Math.PI * 40;

  function drawDonut(slide) {
    var segs = slide.querySelectorAll(".ist-donut .ist-seg");
    var offset = 0;
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      var len = (DONUT_C * (+s.getAttribute("data-pct"))) / 100;
      /* Зазор в 1.4 единицы, чтобы сегменты читались раздельно. */
      s.style.strokeDasharray = Math.max(0, len - 1.4) + " " + DONUT_C;
      s.style.transition = "none";
      s.style.strokeDashoffset = String(-offset + len);
      s.getBoundingClientRect();
      s.style.transition = "stroke-dashoffset 1s cubic-bezier(0.3,0,0.2,1) " + (0.25 + i * 0.13) + "s";
      s.style.strokeDashoffset = String(-offset);
      offset += len;
    }
  }

  /* ---------- прогресс и переключение ---------- */

  function paintBars() {
    for (var i = 0; i < fills.length; i++) {
      var pct = i < idx ? 100 : i > idx ? 0 : Math.min(100, (elapsed / DURATIONS[idx]) * 100);
      fills[i].style.width = pct + "%";
    }
  }

  function enter(i) {
    idx = i;
    elapsed = 0;

    for (var k = 0; k < slides.length; k++) {
      slides[k].classList.toggle("is-on", k === i);
    }

    var slide = slides[i];
    /* Перезапуск CSS-анимаций: снять класс, форсировать reflow, вернуть. */
    slide.classList.remove("is-on");
    void slide.offsetWidth;
    slide.classList.add("is-on");

    var counters = slide.querySelectorAll("[data-count]");
    for (var c = 0; c < counters.length; c++) countUp(counters[c]);
    drawDonut(slide);

    burst();
    paintBars();
  }

  function next() {
    if (idx < slides.length - 1) {
      enter(idx + 1);
      return;
    }
    /* Дозаполняем последнюю полоску: без этого она замирает на 99.9%. */
    elapsed = DURATIONS[idx];
    paintBars();
    showOffer();
  }

  function prev() {
    enter(idx > 0 ? idx - 1 : 0);
  }

  function setPaused(v) {
    if (paused === v || !root) return;
    paused = v;
    root.classList.toggle("is-paused", v);
    /* Останавливаем CSS-анимации вместе с таймером, иначе эффекты уедут вперёд. */
    var all = slides[idx].querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      all[i].style.animationPlayState = v ? "paused" : "";
    }
  }

  /* ---------- финальная карточка ---------- */

  function showOffer() {
    if (offering || !root) return;
    setPaused(false);
    offering = true;
    root.classList.add("is-offer");
    burst();
  }

  function acceptTour() {
    buzz("medium");
    closeStories("tour");
    /* Точка подключения обучения. Пока тура нет - просто открываем приложение;
       когда появится, достаточно объявить window.IntroTour.start(). */
    setTimeout(function () {
      try {
        if (window.IntroTour && typeof window.IntroTour.start === "function") {
          window.IntroTour.start();
        }
      } catch (e) { /* noop */ }
    }, 380);
  }

  function declineTour() {
    buzz("light");
    closeStories("declineTour");
  }

  function tick(now) {
    /* Ограничиваем кадр: пока приложение свёрнуто, requestAnimationFrame молчит,
       и первый кадр после возврата пришёл бы с dt в несколько секунд - слайд
       проскочил бы, а звёзды прыгнули. */
    var dt = Math.min(50, now - lastFrame);
    lastFrame = now;

    if (!paused && !finished && !offering) {
      elapsed += dt;
      if (elapsed >= DURATIONS[idx]) next();
      else paintBars();
    }
    /* dt = 0 значит пауза: фон не перерисовываем, последний кадр остаётся.
       На финальной карточке созвездия продолжают жить - замирает только таймер. */
    drawFx(paused || finished ? 0 : dt);

    if (!finished) rafId = requestAnimationFrame(tick);
  }

  /* ---------- фон: сеть созвездий ---------- */

  var canvas = null;
  var ctx = null;
  var nodes = [];
  var cw = 0;
  var ch = 0;
  var pulse = 0;

  function sizeCanvas() {
    if (!canvas) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var r = canvas.getBoundingClientRect();
    cw = r.width;
    ch = r.height;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedNodes() {
    nodes = [];
    for (var i = 0; i < 52; i++) {
      nodes.push({
        x: Math.random() * cw,
        y: Math.random() * ch,
        vx: (Math.random() - 0.5) * 0.10,
        vy: (Math.random() - 0.5) * 0.10,
        r: Math.random() * 1.5 + 0.5,
        tw: Math.random() * Math.PI * 2
      });
    }
  }

  function burst() { pulse = 1; }

  function drawFx(dt) {
    if (!dt || !ctx || !cw) return;
    pulse *= 0.965;
    var boost = 1 + pulse * 1.5;

    ctx.clearRect(0, 0, cw, ch);

    var i, n;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      n.x += n.vx * dt * 0.06 * boost;
      n.y += n.vy * dt * 0.06 * boost;
      if (n.x < -10) n.x = cw + 10; else if (n.x > cw + 10) n.x = -10;
      if (n.y < -10) n.y = ch + 10; else if (n.y > ch + 10) n.y = -10;
      n.tw += dt * 0.0016;
    }

    ctx.lineWidth = 0.6;
    for (i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i];
        var b = nodes[j];
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var d2 = dx * dx + dy * dy;
        if (d2 > 9800) continue;
        var alpha = (1 - Math.sqrt(d2) / 99) * 0.3 * boost;
        ctx.strokeStyle = "rgba(16,185,129," + alpha.toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      var g = (0.45 + 0.4 * Math.sin(n.tw)) * boost;
      ctx.fillStyle = "rgba(110,231,183," + Math.min(1, g).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------- ввод ----------
     Работаем на touch-событиях, а не на pointer: глобальный обработчик
     touchmove в app.js вызывает preventDefault на горизонтальном движении,
     из-за чего вместо pointerup приходит pointercancel и тап теряется.
     Мышь обрабатываем отдельно - для проверки в браузере. */

  var pressed = false;
  var downX = 0;
  var downY = 0;
  var held = false;
  var holdTimer = 0;
  var touchRecently = false;

  function isControl(target) {
    return !!(target && target.closest && target.closest(".ist-cta, .ist-skip, .ist-card"));
  }

  function press(x, y) {
    if (offering) return;
    pressed = true;
    downX = x;
    downY = y;
    held = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function () {
      held = true;
      setPaused(true);
    }, 220);
  }

  function release(x, y) {
    if (!pressed) return;
    pressed = false;
    clearTimeout(holdTimer);

    /* На финальной карточке жесты выключены: решение принимают кнопками. */
    if (offering) return;

    if (held) {
      setPaused(false);
      return;
    }

    var dx = x - downX;
    var dy = y - downY;

    if (dy > 70 && Math.abs(dy) > Math.abs(dx)) { closeStories("swipe"); return; }
    if (dx < -50) { next(); return; }
    if (dx > 50) { prev(); return; }

    /* Обычный тап: правая часть - вперёд, левая треть - назад. */
    if (x - root.getBoundingClientRect().left < root.clientWidth * 0.34) prev();
    else next();
  }

  function cancelPress() {
    if (!pressed) return;
    pressed = false;
    clearTimeout(holdTimer);
    if (held) setPaused(false);
  }

  function bindInput() {
    root.addEventListener("touchstart", function (e) {
      touchRecently = true;
      if (isControl(e.target) || !e.touches || !e.touches.length) return;
      press(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    root.addEventListener("touchend", function (e) {
      var t0 = e.changedTouches && e.changedTouches[0];
      release(t0 ? t0.clientX : downX, t0 ? t0.clientY : downY);
      setTimeout(function () { touchRecently = false; }, 700);
    }, { passive: true });

    root.addEventListener("touchcancel", function () {
      cancelPress();
      touchRecently = false;
    }, { passive: true });

    root.addEventListener("mousedown", function (e) {
      if (touchRecently || isControl(e.target)) return;
      press(e.clientX, e.clientY);
    });

    root.addEventListener("mouseup", function (e) {
      if (touchRecently) return;
      release(e.clientX, e.clientY);
    });

    root.addEventListener("mouseleave", function () {
      if (touchRecently) return;
      cancelPress();
    });

    /* «Пропустить» и «Начать» не закрывают интро, а ведут на финальную карточку
       с предложением обучения - выход из неё уже даёт сам пользователь. */
    root.querySelector(".ist-skip").addEventListener("click", function (e) {
      e.stopPropagation();
      buzz("light");
      showOffer();
    });

    root.querySelector(".ist-cta").addEventListener("click", function (e) {
      e.stopPropagation();
      buzz("medium");
      showOffer();
    });

    root.querySelector(".ist-yes").addEventListener("click", function (e) {
      e.stopPropagation();
      acceptTour();
    });

    root.querySelector(".ist-no").addEventListener("click", function (e) {
      e.stopPropagation();
      declineTour();
    });
  }

  /* ---------- жизненный цикл ---------- */

  function onResize() {
    sizeCanvas();
    seedNodes();
  }

  function isOpen() {
    return !!document.getElementById(ROOT_ID);
  }

  function open() {
    if (isOpen()) return;

    root = document.createElement("div");
    root.id = ROOT_ID;
    root.className = "intro-stories";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.innerHTML = template();
    document.body.appendChild(root);

    slides = Array.prototype.slice.call(root.querySelectorAll(".ist-slide"));

    var bars = root.querySelector(".ist-bars");
    var barsHTML = "";
    for (var i = 0; i < slides.length; i++) barsHTML += '<div class="ist-bar"><i></i></div>';
    bars.innerHTML = barsHTML;
    fills = Array.prototype.slice.call(bars.querySelectorAll(".ist-bar > i"));

    canvas = root.querySelector(".ist-fx");
    ctx = canvas.getContext("2d");
    sizeCanvas();
    seedNodes();

    idx = 0;
    elapsed = 0;
    paused = false;
    finished = false;
    offering = false;

    bindInput();
    window.addEventListener("resize", onResize, { passive: true });

    /* Класс на body для показа: даёт точку опоры, если позже понадобится
       что-то приглушить снаружи оверлея. */
    document.body.classList.add("intro-stories-open");

    requestAnimationFrame(function () {
      root.classList.add("is-visible");
      enter(0);
      lastFrame = performance.now();
      rafId = requestAnimationFrame(tick);
    });
  }

  function closeStories(reason) {
    if (!root) return;

    finished = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    clearTimeout(holdTimer);
    window.removeEventListener("resize", onResize);

    markSeen();

    var node = root;
    root = null;
    slides = [];
    fills = [];
    canvas = null;
    ctx = null;

    node.classList.remove("is-visible");
    document.body.classList.remove("intro-stories-open");

    setTimeout(function () {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }, 340);

    return reason;
  }

  function maybeShow() {
    if (shownThisSession || isOpen()) return false;
    if (!SHOW_ON_EVERY_LAUNCH && seen()) return false;

    shownThisSession = true;
    open();
    return true;
  }

  window.IntroStories = {
    maybeShow: maybeShow,
    open: open,
    close: closeStories,
    isOpen: isOpen
  };
})();
