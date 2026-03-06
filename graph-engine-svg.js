/* ============================================================
 *  Protocol Finance — SVG Graph Engine
 *  Replaces Canvas graph with a pure SVG implementation.
 *  Uses computeGraphState() data, does NOT modify engine logic.
 * ============================================================ */

var ProtocolGraph = (function () {

  var SVG_NS = "http://www.w3.org/2000/svg";
  var GRAPH_H = 240;
  var PAD_X = 36;
  var PAD_TOP = 24;
  var PAD_BOT = 28;

  var _tooltipTimer = null;
  var _planAnimId = null;

  function el(tag, attrs, parent) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  function renderGraph(container, gs, factHistory, plannedMonthly) {
    if (!container || !gs) return;

    var existing = container.querySelector(".protocol-graph-wrap");
    if (existing) existing.remove();

    var wrap = document.createElement("div");
    wrap.className = "protocol-graph-wrap";

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "protocol-graph");
    svg.setAttribute("viewBox", "0 0 400 " + GRAPH_H);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

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

    renderGrid(svg, W, H, drawW, drawH);

    if (goalMonths > 0 && monthly > 0) {
      renderPlanLine(svg, W, H, drawW, drawH, goalMonths, monthly, maxValue);
    }

    renderWatermark(svg, W, H);

    if (hasFact && goalMonths > 0 && actualMonths > 0) {
      renderFactLine(svg, W, H, drawW, drawH, goalMonths, maxValue, factBalance, actualMonths);
    }

    renderMonthLabels(svg, W, H, drawW, vMonths);

    wrap.appendChild(svg);

    var tooltipEl = document.createElement("div");
    tooltipEl.className = "graph-tooltip";
    tooltipEl.style.display = "none";
    wrap.appendChild(tooltipEl);

    var graphBlock = container.querySelector(".graph-block");
    if (graphBlock) {
      var chartCard = graphBlock.querySelector(".chart-card");
      if (chartCard) {
        chartCard.innerHTML = "";
        chartCard.appendChild(wrap);
      }
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

  function renderPlanLine(svg, W, H, drawW, drawH, goalMonths, monthly, maxValue) {
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
    var defs = el("defs", null, svg);
    var grad = el("linearGradient", { id: gradId, x1: "0%", y1: "0%", x2: "100%", y2: "0%" }, defs);
    el("stop", { offset: "0%", "stop-color": "#3a7bfd" }, grad);
    el("stop", { offset: "100%", "stop-color": "#60a5fa" }, grad);

    var fillGradId = "planFill_" + Date.now();
    var fillGrad = el("linearGradient", { id: fillGradId, x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
    el("stop", { offset: "0%", "stop-color": "rgba(58,123,253,0.18)" }, fillGrad);
    el("stop", { offset: "100%", "stop-color": "rgba(58,123,253,0)" }, fillGrad);

    var fillD = "M" + points.join(" L") + " L" + (PAD_X + drawW).toFixed(1) + "," + (H - PAD_BOT) + " L" + PAD_X + "," + (H - PAD_BOT) + " Z";
    el("path", {
      d: fillD,
      fill: "url(#" + fillGradId + ")",
      "class": "plan-fill"
    }, svg);

    var d = "M" + points.join(" L");
    var totalLen = estimatePolylineLength(points);

    el("path", {
      d: d,
      fill: "none",
      stroke: "url(#" + gradId + ")",
      "stroke-width": "2.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "class": "plan-line",
      "stroke-dasharray": totalLen,
      "stroke-dashoffset": totalLen,
      filter: "drop-shadow(0 0 6px rgba(58,123,253,0.35))"
    }, svg);

    requestAnimationFrame(function () {
      var line = svg.querySelector(".plan-line");
      if (line) {
        line.style.transition = "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)";
        line.setAttribute("stroke-dashoffset", "0");
      }
    });
  }

  function renderFactLine(svg, W, H, drawW, drawH, goalMonths, maxValue, factBalance, actualMonths) {
    var startX = PAD_X;
    var startY = H - PAD_BOT;
    var endX = PAD_X + (actualMonths / goalMonths) * drawW;
    var endY = (H - PAD_BOT) - (factBalance / maxValue) * drawH;
    endY = Math.max(PAD_TOP, Math.min(endY, H - PAD_BOT));

    var d = "M" + startX + "," + startY + " L" + endX.toFixed(1) + "," + endY.toFixed(1);
    var len = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

    el("path", {
      d: d,
      fill: "none",
      stroke: "#ffffff",
      "stroke-width": "2.2",
      "stroke-linecap": "round",
      "class": "fact-line",
      "stroke-dasharray": len.toFixed(0),
      "stroke-dashoffset": len.toFixed(0),
      filter: "drop-shadow(0 0 6px rgba(255,255,255,0.3))"
    }, svg);

    var dot = el("circle", {
      cx: endX.toFixed(1),
      cy: endY.toFixed(1),
      r: "0",
      fill: "#ffffff",
      "class": "fact-point",
      filter: "drop-shadow(0 0 8px rgba(255,255,255,0.4))"
    }, svg);

    dot.setAttribute("data-fact-balance", factBalance);

    requestAnimationFrame(function () {
      var line = svg.querySelector(".fact-line");
      if (line) {
        line.style.transition = "stroke-dashoffset 0.9s cubic-bezier(.25,.46,.45,.94)";
        line.setAttribute("stroke-dashoffset", "0");
      }

      setTimeout(function () {
        dot.setAttribute("r", "4.5");
      }, 800);
    });

    dot.addEventListener("click", function (e) {
      e.stopPropagation();
      var wrap = svg.closest(".protocol-graph-wrap");
      if (wrap) {
        var tooltip = wrap.querySelector(".graph-tooltip");
        if (tooltip) {
          showTooltipAt(tooltip, svg, parseFloat(dot.getAttribute("cx")), parseFloat(dot.getAttribute("cy")), factBalance);
        }
      }
    });
  }

  function showTooltipAt(tooltip, svg, cx, cy, value) {
    if (_tooltipTimer) clearTimeout(_tooltipTimer);

    var rect = svg.getBoundingClientRect();
    var scaleX = rect.width / 400;
    var scaleY = rect.height / GRAPH_H;
    var absX = cx * scaleX;
    var absY = cy * scaleY;

    var date = new Date().toLocaleDateString("ru-RU");
    tooltip.innerHTML =
      '<div class="graph-tooltip-date">' + date + '</div>' +
      '<div class="graph-tooltip-value">Отложено: ' + Math.max(0, Math.round(value)).toLocaleString() + ' ₽</div>';

    tooltip.style.display = "block";
    tooltip.style.left = Math.max(10, Math.min(absX - 60, rect.width - 140)) + "px";
    tooltip.style.top = Math.max(0, absY - 55) + "px";

    requestAnimationFrame(function () { tooltip.classList.add("visible"); });

    _tooltipTimer = setTimeout(function () {
      tooltip.classList.remove("visible");
      setTimeout(function () { tooltip.style.display = "none"; }, 250);
    }, 3500);
  }

  function renderWatermark(svg, W, H) {
    var g = el("g", { "class": "graph-watermark", opacity: "0.08" }, svg);
    el("text", {
      x: (W / 2).toFixed(0),
      y: (H / 2 + 6).toFixed(0),
      "text-anchor": "middle",
      "font-size": "16",
      "font-weight": "600",
      "font-family": "Inter, system-ui, sans-serif",
      fill: "#ffffff"
    }, g).textContent = "Protocol™";
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
