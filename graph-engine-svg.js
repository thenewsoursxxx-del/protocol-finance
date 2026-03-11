/* ============================================================
 *  Protocol Finance — SVG Graph Engine
 *  Replaces Canvas graph with a pure SVG implementation.
 *  Uses computeGraphState() data, does NOT modify engine logic.
 * ============================================================ */

var ProtocolGraph = (function () {

  var SVG_NS = "http://www.w3.org/2000/svg";
  var GRAPH_H = 260;
  var PAD_X = 36;
  var PAD_TOP = 14;
  var PAD_BOT = 36;

  var _tooltipTimer = null;
  var _tooltipShowTimer = null;
  var _tooltipHideTimer = null;

  function el(tag, attrs, parent) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  function renderGraph(container, gs, factHistory, plannedMonthly) {
    if (!container || !gs) return;

    var W = 400;
    var H = GRAPH_H;
    var drawW = W - PAD_X * 2;
    var drawH = H - PAD_TOP - PAD_BOT;

    var goalMonths = gs.goalMonths || 0;
    var vMonths = gs.visibleMonths || goalMonths || 3;
    var monthly = gs.plannedMonthly || plannedMonthly || 0;
    var goalValue = monthly * goalMonths;
    var hasFact = gs.hasFact;
    var factBalance = gs.factBalance || 0;
    var actualMonths = gs.actualMonths || 0;

    var maxValue = Math.max(goalValue, factBalance, 1);

    var existingWrap = container.querySelector(".protocol-graph-wrap");
    if (existingWrap) {
      var existingSvg = existingWrap.querySelector(".protocol-graph");
      if (existingSvg) {
        var storedMax = parseFloat(existingSvg.getAttribute("data-max-value")) || maxValue;
        if (maxValue > storedMax) {
          storedMax = maxValue;
          existingSvg.setAttribute("data-max-value", storedMax);
        }
        updateFactLine(existingSvg, W, H, drawW, drawH, goalMonths, storedMax, factBalance, actualMonths, hasFact, existingWrap);
        return;
      }
    }

    var wrap = document.createElement("div");
    wrap.className = "protocol-graph-wrap";

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "protocol-graph");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("data-max-value", maxValue);

    var defs = el("defs", null, svg);
    var filter = el("filter", { id: "factGlow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
    el("feGaussianBlur", { stdDeviation: "3", result: "glow" }, filter);
    var feMerge = el("feMerge", null, filter);
    el("feMergeNode", { "in": "glow" }, feMerge);
    el("feMergeNode", { "in": "SourceGraphic" }, feMerge);

    renderGrid(svg, W, H, drawW, drawH);
    renderWatermark(svg, W, H);

    if (goalMonths > 0 && monthly > 0 && !svg.querySelector(".plan-line")) {
      renderPlanLine(svg, defs, W, H, drawW, drawH, goalMonths, monthly, maxValue);
    }

    if (hasFact && goalMonths > 0 && actualMonths > 0) {
      renderFactLine(svg, W, H, drawW, drawH, goalMonths, maxValue, factBalance, actualMonths, true);
    }

    renderMonthLabels(svg, W, H, drawW, vMonths);

    wrap.appendChild(svg);

    bindTooltipEvents(wrap, svg);

    var graphBlock = container.querySelector(".graph-block");
    if (graphBlock) {
      var chartCard = graphBlock.querySelector(".chart-card");
      if (chartCard) {
        chartCard.innerHTML = "";
        chartCard.appendChild(wrap);
      }
    }
  }

  function updateFactLine(svg, W, H, drawW, drawH, goalMonths, maxValue, factBalance, actualMonths, hasFact, wrap) {
    var oldLine = svg.querySelector(".fact-line");
    if (oldLine) oldLine.remove();
    var oldPoint = svg.querySelector(".fact-point");
    if (oldPoint) oldPoint.remove();

    if (!hasFact || goalMonths <= 0 || actualMonths <= 0) return;

    renderFactLine(svg, W, H, drawW, drawH, goalMonths, maxValue, factBalance, actualMonths, true);
  }

  function bindTooltipEvents(wrap, svg) {
    wrap.addEventListener("click", function (e) {
      var tooltip = document.getElementById("factTooltipContainer");
      if (!tooltip) return;
      var dot = svg.querySelector(".fact-point");
      if (!dot) return;

      var rect = svg.getBoundingClientRect();
      var scaleX = rect.width / 400;
      var scaleY = rect.height / GRAPH_H;
      var dotCx = parseFloat(dot.getAttribute("cx"));
      var dotCy = parseFloat(dot.getAttribute("cy"));
      var absX = dotCx * scaleX + rect.left;
      var absY = dotCy * scaleY + rect.top;
      var pointerX = e.clientX;
      var pointerY = e.clientY;
      var dist = Math.sqrt(Math.pow(pointerX - absX, 2) + Math.pow(pointerY - absY, 2));

      if (dist < 40) {
        var balance = parseFloat(dot.getAttribute("data-fact-balance")) || 0;
        var month = parseFloat(dot.getAttribute("data-fact-month")) || 0;
        showTooltipBottom(tooltip, balance, month);
      } else {
        hideTooltip();
      }
    });
  }

  function hideTooltip() {
    if (_tooltipTimer) clearTimeout(_tooltipTimer);
    if (_tooltipShowTimer) { clearTimeout(_tooltipShowTimer); _tooltipShowTimer = null; }
    if (_tooltipHideTimer) { clearTimeout(_tooltipHideTimer); _tooltipHideTimer = null; }
    var t = document.getElementById("factTooltipContainer");
    if (t) {
      t.classList.remove("visible");
    }
  }

  function renderGrid(svg, W, H, drawW, drawH) {
    var g = el("g", { "class": "graph-grid" }, svg);
    var gridCount = 4;
    for (var i = 1; i <= gridCount; i++) {
      var y = PAD_TOP + (i / (gridCount + 1)) * drawH;
      el("line", {
        x1: PAD_X, y1: y, x2: W - PAD_X, y2: y,
        stroke: "rgba(255,255,255,0.06)", "stroke-width": "0.5"
      }, g);
    }

    el("line", {
      x1: PAD_X, y1: PAD_TOP, x2: PAD_X, y2: H - PAD_BOT,
      stroke: "#333", "stroke-width": "0.5"
    }, g);
    el("line", {
      x1: PAD_X, y1: H - PAD_BOT, x2: W - PAD_X, y2: H - PAD_BOT,
      stroke: "#333", "stroke-width": "0.5"
    }, g);
  }

  function renderPlanLine(svg, defs, W, H, drawW, drawH, goalMonths, monthly, maxValue) {
    var points = [];
    var total = 0;
    for (var i = 0; i <= goalMonths; i++) {
      var x = PAD_X + (i / goalMonths) * drawW;
      var val = Math.max(0, total);
      var y = (H - PAD_BOT) - (val / maxValue) * drawH;
      y = Math.max(PAD_TOP, Math.min(y, H - PAD_BOT));
      points.push(x.toFixed(1) + "," + y.toFixed(1));
      total += monthly;
    }

    var gradId = "planGrad_" + Date.now();
    var grad = el("linearGradient", { id: gradId, x1: "0%", y1: "0%", x2: "100%", y2: "0%" }, defs);
    el("stop", { offset: "0%", "stop-color": "#3a7bfd" }, grad);
    el("stop", { offset: "100%", "stop-color": "#60a5fa" }, grad);

    var d = "M" + points.join(" L");
    var totalLen = estimatePolylineLength(points);

    var line = el("path", {
      d: d,
      fill: "none",
      stroke: "url(#" + gradId + ")",
      "stroke-width": "2.4",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "class": "plan-line",
      "stroke-dasharray": totalLen,
      "stroke-dashoffset": totalLen,
      filter: "drop-shadow(0 0 6px rgba(58,123,253,0.35))"
    }, svg);

    requestAnimationFrame(function () {
      line.style.transition = "stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)";
      line.setAttribute("stroke-dashoffset", "0");
    });
  }

  function renderFactLine(svg, W, H, drawW, drawH, goalMonths, maxValue, factBalance, actualMonths, animate) {
    var startX = PAD_X;
    var startY = H - PAD_BOT;
    var endX = PAD_X + (actualMonths / goalMonths) * drawW;
    var endY = (H - PAD_BOT) - (factBalance / maxValue) * drawH;
    endY = Math.max(PAD_TOP, Math.min(endY, H - PAD_BOT));

    var d = "M" + startX + "," + startY + " L" + endX.toFixed(1) + "," + endY.toFixed(1);
    var len = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

    var lineAttrs = {
      d: d,
      fill: "none",
      stroke: "#ffffff",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "class": "fact-line",
      filter: "drop-shadow(0 0 6px rgba(255,255,255,0.3))"
    };

    if (animate) {
      lineAttrs["stroke-dasharray"] = len.toFixed(0);
      lineAttrs["stroke-dashoffset"] = len.toFixed(0);
    }

    var line = el("path", lineAttrs, svg);

    var dot = el("circle", {
      cx: endX.toFixed(1),
      cy: endY.toFixed(1),
      r: animate ? "0" : "5",
      fill: "#ffffff",
      "class": "fact-point",
      filter: "url(#factGlow)"
    }, svg);

    dot.setAttribute("data-fact-balance", factBalance);
    dot.setAttribute("data-fact-month", actualMonths);

    if (animate) {
      requestAnimationFrame(function () {
        line.style.transition = "stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)";
        line.setAttribute("stroke-dashoffset", "0");

        setTimeout(function () {
          dot.style.transition = "r 0.3s ease";
          dot.setAttribute("r", "5");
        }, 750);
      });
    }

    dot.addEventListener("click", function (e) {
      e.stopPropagation();
      var tooltip = document.getElementById("factTooltipContainer");
      if (tooltip) {
        showTooltipBottom(tooltip, factBalance, actualMonths);
      }
    });
  }

  function showTooltipBottom(tooltip, balance, month) {
    if (_tooltipTimer) clearTimeout(_tooltipTimer);
    if (_tooltipHideTimer) { clearTimeout(_tooltipHideTimer); _tooltipHideTimer = null; }

    tooltip.innerHTML =
      '<div class="graph-tooltip-value">Факт: ' + Math.max(0, Math.round(balance)).toLocaleString() + ' ₽</div>' +
      '<div class="graph-tooltip-month">Месяц: ' + month + '</div>';

    tooltip.classList.remove("visible");
    requestAnimationFrame(function () { tooltip.classList.add("visible"); });

    _tooltipHideTimer = setTimeout(function () {
      tooltip.classList.remove("visible");
    }, 3000);
  }

  function renderWatermark(svg, W, H) {
    var g = el("g", { "class": "graph-watermark", opacity: "0.12" }, svg);

    var centerX = W / 2;
    var drawH = H - PAD_TOP - PAD_BOT;
    var centerY = PAD_TOP + drawH * 0.44;
    var logoSize = 280;

    var imgEl = document.createElementNS(SVG_NS, "image");
    imgEl.setAttribute("x", (centerX - logoSize / 2).toFixed(0));
    imgEl.setAttribute("y", (centerY - logoSize / 2).toFixed(0));
    imgEl.setAttribute("width", logoSize);
    imgEl.setAttribute("height", logoSize);
    imgEl.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "logo.svg");
    imgEl.setAttribute("href", "logo.svg");
    g.appendChild(imgEl);

    el("text", {
      x: centerX.toFixed(0),
      y: (H - PAD_BOT - 12).toFixed(0),
      "text-anchor": "middle",
      "font-size": "11",
      "font-weight": "600",
      "font-family": "Inter, system-ui, sans-serif",
      fill: "#ffffff"
    }, g).textContent = "Protocol\u2122";
  }

  function renderMonthLabels(svg, W, H, drawW, vMonths) {
    var g = el("g", { "class": "graph-month-labels" }, svg);
    var monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
    var base = new Date();
    base.setDate(1);

    var minGap = 60;
    var maxLabels = Math.max(2, Math.floor(drawW / minGap));
    var step = Math.max(1, Math.ceil(vMonths / maxLabels));
    var lastX = -Infinity;

    for (var i = 0; i <= vMonths; i++) {
      if (i % step !== 0 && i !== 0) continue;
      var x = PAD_X + (i / vMonths) * drawW;
      if (x - lastX < minGap - 5 && i !== 0) continue;

      var d = new Date(base);
      d.setMonth(d.getMonth() + i);
      var label = monthNames[d.getMonth()] + " " + String(d.getFullYear()).slice(2);

      el("text", {
        x: x.toFixed(1),
        y: (H - PAD_BOT + 16).toFixed(0),
        "text-anchor": "middle",
        "font-size": "10",
        "font-family": "Inter, system-ui, sans-serif",
        fill: "rgba(255,255,255,0.35)"
      }, g).textContent = label;

      lastX = x;
    }
  }

  function estimatePolylineLength(pointStrings) {
    var total = 0;
    for (var i = 1; i < pointStrings.length; i++) {
      var a = pointStrings[i - 1].split(",");
      var b = pointStrings[i].split(",");
      var dx = parseFloat(b[0]) - parseFloat(a[0]);
      var dy = parseFloat(b[1]) - parseFloat(a[1]);
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return Math.ceil(total);
  }

  return {
    render: renderGraph
  };

})();
