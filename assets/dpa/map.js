// DealPro Agent: Dubai price map (every master community: price per sq ft, change, yield, rent, sales, off-plan share)
// Data: checklist/data/dxb_map.json (Dubai Land Department open data via Dubai Data, CC BY 4.0; centre points (c) OpenStreetMap)
(function () {
  var D = null, MAP = null, LAYER = null, root = null, M = "psf", SEL = "", SORT = { k: 3, d: -1 }, onStats = null;
  var F = { name: 0, lat: 1, lng: 2, n: 3, price: 4, psf: 5, yoy: 6, pyoy: 7, nyoy: 8, op: 9, yld: 10, rent: 11, nr: 12 };
  var METRICS = {
    psf: { t: "Price / sq ft", i: F.psf, f: function (v) { return "AED " + n(v); }, hi: "pricier" },
    yoy: { t: "1-year change", i: F.yoy, f: function (v) { return (v >= 0 ? "+" : "") + v.toFixed(1) + "%"; }, hi: "rising faster", div: true },
    yld: { t: "Rental yield", i: F.yld, f: function (v) { return v.toFixed(1) + "%"; }, hi: "higher yield" },
    rent: { t: "Annual rent", i: F.rent, f: function (v) { return "AED " + k(v); }, hi: "higher rent" },
    n: { t: "Sales (12 months)", i: F.n, f: function (v) { return n(v); }, hi: "busier" },
    op: { t: "Off-plan share", i: F.op, f: function (v) { return Math.round(v) + "%"; }, hi: "more off-plan" }
  };
  var COLS = ["#2c7bb6", "#00a6ca", "#90eb9d", "#f9d057", "#f29e2e", "#d7191c"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function n(v) { return v == null ? "–" : Math.round(v).toLocaleString("en-US"); }
  function k(v) { return v == null ? "–" : v >= 1e6 ? (v / 1e6).toFixed(2) + "M" : v >= 1e3 ? Math.round(v / 1e3) + "K" : Math.round(v); }
  function val(r) { var x = r[METRICS[M].i]; return x == null ? null : x; }
  function breaks() { var v = D.c.map(val).filter(function (x) { return x != null; }).sort(function (a, b) { return a - b; }), q = []; for (var i = 1; i < COLS.length; i++) q.push(v[Math.floor(v.length * i / COLS.length)]); return q; }
  function colOf(x, q) { if (x == null) return "#8a94a6"; for (var i = 0; i < q.length; i++) if (x < q[i]) return COLS[i]; return COLS[COLS.length - 1]; }

  // ---------- charts ----------
  function donut(parts, title) {
    var tot = parts.reduce(function (a, p) { return a + (p[1] || 0); }, 0); if (!tot) return "";
    var R = 70, r = 44, cx = 90, cy = 90, a0 = -Math.PI / 2, g = '<svg viewBox="0 0 180 180" class="dm-pie">';
    parts.forEach(function (p) { var a1 = a0 + (p[1] / tot) * Math.PI * 2; if (p[1] / tot > 0.9999) a1 = a0 + Math.PI * 2 - 0.0001;
      var big = a1 - a0 > Math.PI ? 1 : 0, P = function (a, rr) { return (cx + rr * Math.cos(a)).toFixed(2) + " " + (cy + rr * Math.sin(a)).toFixed(2); };
      g += '<path d="M' + P(a0, R) + " A" + R + " " + R + " 0 " + big + " 1 " + P(a1, R) + " L" + P(a1, r) + " A" + r + " " + r + " 0 " + big + " 0 " + P(a0, r) + 'Z" fill="' + p[2] + '"><title>' + esc(p[0]) + ": " + n(p[1]) + " (" + Math.round(p[1] / tot * 100) + "%)</title></path>"; a0 = a1; });
    g += '<text x="90" y="86" text-anchor="middle" fill="#fff" font-size="20" font-weight="800">' + k(tot) + '</text><text x="90" y="106" text-anchor="middle" fill="rgba(255,255,255,.7)" font-size="11">total</text></svg>';
    return '<div class="dm-c"><div class="dm-h">' + title + '</div><div class="dm-pw">' + g + '<div class="dm-lg">' + parts.map(function (p) { return '<div><i style="background:' + p[2] + '"></i><span>' + esc(p[0]) + "</span><b>" + Math.round(p[1] / tot * 100) + "%</b></div>"; }).join("") + "</div></div></div>";
  }
  function hbars(list, unit, col) {
    var mx = Math.max.apply(null, list.map(function (x) { return x[1] || 0; })) || 1;
    return list.map(function (x) { return '<div class="dm-b"><span>' + esc(x[0]) + '</span><div><i style="width:' + Math.max(3, Math.round((x[1] || 0) / mx * 100)) + "%;background:" + (col || "#C9A24A") + '"></i><b>' + (x[2] || n(x[1])) + "</b></div></div>"; }).join("") + (unit ? '<div class="dm-u">' + unit + "</div>" : "");
  }
  var PAL = ["#C9A24A", "#7fb0ef", "#3fae7a", "#e07a5f", "#b388eb", "#4fc1c6", "#f2cc8f", "#8a94a6"];

  // ---------- panels ----------
  function rowOf(name) { return D.c.filter(function (r) { return r[0] === name; })[0]; }
  function detail() {
    var el = root.querySelector(".dm-det"); if (!el) return;
    var r = SEL && rowOf(SEL), B = SEL ? (D.b[SEL] || []) : D.d, where = SEL ? esc(SEL) : "Dubai";
    var h = '<div class="dm-title">' + where + (SEL ? ' <button type="button" class="dm-x" data-x="1">✕ Show all Dubai</button>' : "") + "</div>";
    if (r) {
      h += '<div class="dm-tiles">' +
        "<div><small>Price / sq ft</small><b style=\"color:#E8CF8E\">AED " + n(r[F.psf]) + "</b></div>" +
        "<div><small>1-year change</small><b style=\"color:" + ((r[F.yoy] || 0) >= 0 ? "#7fd6a5" : "#f3a59a") + '">' + (r[F.yoy] == null ? "–" : (r[F.yoy] >= 0 ? "+" : "") + r[F.yoy] + "%") + "</b></div>" +
        "<div><small>Median price</small><b>AED " + k(r[F.price]) + "</b></div>" +
        "<div><small>Sales (12 months)</small><b>" + n(r[F.n]) + "</b></div>" +
        "<div><small>Off-plan share</small><b>" + (r[F.op] == null ? "–" : Math.round(r[F.op]) + "%") + "</b></div>" +
        "<div><small>Gross rental yield</small><b style=\"color:#7fd6a5\">" + (r[F.yld] == null ? "–" : r[F.yld] + "%") + "</b></div>" +
        "<div><small>Median annual rent</small><b>" + (r[F.rent] ? "AED " + k(r[F.rent]) : "–") + "</b></div>" +
        "<div><small>Rent contracts (12m)</small><b>" + n(r[F.nr]) + "</b></div></div>";
      if (onStats) h += '<button type="button" class="dm-go" data-st="' + esc(SEL) + '">📊 Open the full statistics for ' + where + " (1M to 10Y) →</button>";
    } else {
      var tot = D.c.reduce(function (a, x) { return a + (x[F.n] || 0); }, 0), op = D.c.reduce(function (a, x) { return a + (x[F.n] || 0) * (x[F.op] || 0) / 100; }, 0);
      var top = D.c.slice(0, 7).map(function (x, i) { return [x[0], x[F.n], PAL[i]]; }); top.push(["All other areas", tot - top.reduce(function (a, x) { return a + x[1]; }, 0), PAL[7]]);
      h += '<div class="dm-g2">' + donut([["Off-plan", Math.round(op), "#3fae7a"], ["Ready (resale)", Math.round(tot - op), "#7fb0ef"]], "Off-plan vs ready sales, last 12 months") + donut(top, "Where Dubai's sales happen (12 months)") + "</div>";
    }
    if (B.length) {
      var bp = B.filter(function (x) { return x[2]; }).map(function (x, i) { return [x[1], x[2], PAL[i % PAL.length]]; });
      h += '<div class="dm-g2">' + donut(bp, "Sales by unit type, last 12 months") +
        '<div class="dm-c"><div class="dm-h">Price per sq ft by unit type</div>' + hbars(B.filter(function (x) { return x[4]; }).map(function (x) { return [x[1], x[4], "AED " + n(x[4])]; }), "median AED per sq ft", "linear-gradient(90deg,#9c7a2a,#E8CF8E)") + "</div></div>";
      h += '<div class="dm-c" style="overflow-x:auto"><div class="dm-h">Prices, sizes, rents and yields by unit type</div><table class="dm-t"><tr><th>Type</th><th>Sales</th><th>Median price</th><th>Per sq ft</th><th>Size</th><th>Annual rent</th><th>Yield</th></tr>' +
        B.map(function (x) { return "<tr><td>" + esc(x[1]) + "</td><td>" + n(x[2]) + "</td><td>" + (x[3] ? "AED " + k(x[3]) : "–") + "</td><td>" + (x[4] ? "AED " + n(x[4]) : "–") + "</td><td>" + (x[5] ? n(x[5]) + " sq ft" : "–") + "</td><td>" + (x[6] ? "AED " + k(x[6]) : "–") + "</td><td>" + (x[8] ? x[8] + "%" : "–") + "</td></tr>"; }).join("") + "</table></div>";
      var rb = B.filter(function (x) { return x[6]; });
      if (rb.length) h += '<div class="dm-c"><div class="dm-h">Median annual rent by unit type (Ejari)</div>' + hbars(rb.map(function (x) { return [x[1], x[6], "AED " + k(x[6])]; }), "AED a year", "linear-gradient(90deg,#2b4a7a,#7fb0ef)") + "</div>";
    }
    el.innerHTML = h;
    var x = el.querySelector(".dm-x"); if (x) x.addEventListener("click", function () { pick(""); });
    var go = el.querySelector(".dm-go"); if (go) go.addEventListener("click", function () { onStats(go.dataset.st); });
  }
  function table() {
    var el = root.querySelector(".dm-tbl"); if (!el) return;
    var q = (root.querySelector("#dmq").value || "").toLowerCase().trim();
    var L = D.c.filter(function (r) { return !q || r[0].toLowerCase().indexOf(q) >= 0 || (r[13] || "").toLowerCase().indexOf(q) >= 0; }).slice().sort(function (a, b) { var x = a[SORT.k], y = b[SORT.k]; if (x == null) return 1; if (y == null) return -1; return typeof x === "string" ? x.localeCompare(y) * SORT.d : (x - y) * SORT.d; });
    var top = !q; if (top) L = L.slice(0, 3);
    var C = [["Area", 0], ["Price / sq ft", F.psf], ["1Y change", F.yoy], ["Sales 12m", F.n], ["Off-plan", F.op], ["Yield", F.yld], ["Rent", F.rent]];
    el.innerHTML = '<table class="dm-t dm-rank"><tr>' + C.map(function (c) { return '<th data-k="' + c[1] + '">' + c[0] + (SORT.k === c[1] ? (SORT.d > 0 ? " ▲" : " ▼") : "") + "</th>"; }).join("") + "</tr>" +
      L.map(function (r) { return '<tr data-n="' + esc(r[0]) + '"' + (r[0] === SEL ? ' class="on"' : "") + "><td>" + esc(r[0]) + "</td><td>" + n(r[F.psf]) + '</td><td style="color:' + ((r[F.yoy] || 0) >= 0 ? "#7fd6a5" : "#f3a59a") + '">' + (r[F.yoy] == null ? "–" : (r[F.yoy] >= 0 ? "+" : "") + r[F.yoy] + "%") + "</td><td>" + n(r[F.n]) + "</td><td>" + (r[F.op] == null ? "–" : Math.round(r[F.op]) + "%") + "</td><td>" + (r[F.yld] == null ? "–" : r[F.yld] + "%") + "</td><td>" + (r[F.rent] ? k(r[F.rent]) : "–") + "</td></tr>"; }).join("") + "</table>" +
      (top ? '<div class="dm-u" style="text-align:left;margin-top:8px">Showing the top 3 by ' + (C.filter(function (c) { return c[1] === SORT.k; })[0] || C[3])[0] + '. Pick a location above to see any other area.</div>' : (L.length ? "" : '<div class="dm-u" style="text-align:left;margin-top:8px">No area matches. Try another name.</div>'));
    Array.prototype.forEach.call(el.querySelectorAll("th"), function (th) { th.addEventListener("click", function () { var kk = +th.dataset.k; SORT = { k: kk, d: SORT.k === kk ? -SORT.d : (kk === 0 ? 1 : -1) }; table(); }); });
    Array.prototype.forEach.call(el.querySelectorAll("tr[data-n]"), function (tr) { tr.addEventListener("click", function () { pick(tr.dataset.n, true); }); });
  }
  function legend(q) {
    var m = METRICS[M], el = root.querySelector(".dm-leg"); if (!el) return;
    var lab = [M === "yoy" ? "below " + m.f(q[0]) : "under " + m.f(q[0])];
    for (var i = 1; i < q.length; i++) lab.push(m.f(q[i - 1]) + " to " + m.f(q[i]));
    lab.push(m.f(q[q.length - 1]) + "+");
    el.innerHTML = '<b>' + m.t + ":</b> " + COLS.map(function (c, i) { return '<span><i style="background:' + c + '"></i>' + lab[i] + "</span>"; }).join("") + '<span style="opacity:.75">Bigger circle = more sales</span>';
  }
  function paint() {
    if (!MAP) return; var q = breaks(); legend(q);
    if (LAYER) LAYER.remove(); LAYER = L.layerGroup().addTo(MAP);
    var mx = Math.max.apply(null, D.c.map(function (r) { return r[F.n] || 0; }));
    D.c.forEach(function (r) {
      var v = val(r), rad = 6 + Math.sqrt((r[F.n] || 0) / mx) * 22;
      var c = L.circleMarker([r[F.lat], r[F.lng]], { radius: rad, color: r[0] === SEL ? "#fff" : "rgba(0,0,0,.35)", weight: r[0] === SEL ? 3 : 1, fillColor: colOf(v, q), fillOpacity: .82 }).addTo(LAYER);
      c.bindTooltip("<b>" + esc(r[0]) + "</b><br>" + METRICS[M].t + ": " + (v == null ? "no data" : METRICS[M].f(v)), { direction: "top" });
      c.on("click", function () { pick(r[0]); });
    });
  }
  function pick(name, fly) {
    SEL = name; paint(); detail(); table();
    var r = name && rowOf(name); if (r && fly && MAP) MAP.flyTo([r[F.lat], r[F.lng]], 13, { duration: .6 });
    var det = root.querySelector(".dm-det"); if (det && name && window.innerWidth < 900) det.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function leaflet(cb) {
    if (window.L && window.L.map) return cb();
    var c = document.createElement("link"); c.rel = "stylesheet"; c.href = "/checklist/vendor/leaflet/leaflet.css"; document.head.appendChild(c);
    var s = document.createElement("script"); s.src = "/checklist/vendor/leaflet/leaflet.js"; s.onload = cb; document.head.appendChild(s);
  }
  function ui() {
    root.innerHTML = '<div class="dm">' +
      '<div class="dm-chips">' + Object.keys(METRICS).map(function (m) { return '<button type="button" data-m="' + m + '"' + (m === M ? ' class="on"' : "") + ">" + METRICS[m].t + "</button>"; }).join("") + "</div>" +
      '<div class="dm-map" id="dmmap"></div><div class="dm-leg"></div>' +
      '<div class="dm-det"></div>' +
      '<div class="dm-c"><div class="dm-h">Top areas <small>(tap a column to rank by it, a row to see it on the map)</small></div><input id="dmq" class="dm-q" list="dmareas" placeholder="📍 Choose a location, e.g. Business Bay, JVC, Dubai Hills" autocomplete="off"><datalist id="dmareas">' + D.c.map(function (r) { return '<option value="' + esc(r[0]) + '">'; }).join("") + '</datalist><div class="dm-tbl" style="overflow-x:auto"></div></div>' +
      '<div class="dm-src">Last 12 complete months, data through ' + esc(D.data_through || D.updated) + '. Sales and prices: Dubai Land Department transactions (built homes, outliers trimmed). Rents: Ejari contracts. Yield: median rent over median price within the same unit type. Source: Dubai Land Department open data via Dubai Data (CC BY 4.0). Map points © OpenStreetMap contributors. Updated weekly.</div></div>';
    Array.prototype.forEach.call(root.querySelectorAll(".dm-chips button"), function (b) { b.addEventListener("click", function () { M = b.dataset.m; Array.prototype.forEach.call(root.querySelectorAll(".dm-chips button"), function (x) { x.classList.toggle("on", x === b); }); paint(); }); });
    root.querySelector("#dmq").addEventListener("input", table);
    root.querySelector("#dmq").addEventListener("change", function () { var v = this.value.trim(), r = v && rowOf(v); if (r) pick(r[0], true); });
    detail(); table();
    leaflet(function () {
      MAP = L.map("dmmap", { scrollWheelZoom: false, tap: true }).setView([25.12, 55.25], 10);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(MAP);
      paint();
    });
  }
  window.DPMap = {
    mount: function (el, base, statsCb) {
      root = el; onStats = statsCb || null;
      el.innerHTML = '<div class="dm"><div style="padding:30px;text-align:center;opacity:.75">Loading the Dubai price map…</div></div>';
      fetch((base || "/checklist/data/") + "dxb_map.json").then(function (r) { return r.json(); }).then(function (j) { D = j; ui(); })
        .catch(function () { el.innerHTML = '<div class="dm"><div style="padding:20px">Couldn\'t load the map data. Please try again.</div></div>'; });
    },
    resize: function () { if (MAP) setTimeout(function () { MAP.invalidateSize(); }, 50); }
  };
})();
