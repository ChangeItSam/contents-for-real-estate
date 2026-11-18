// DealPro Agent: market explorer (all Dubai areas, any period, monthly reports)
// Data: checklist/data/market_stats.json (all registered sales, monthly since 2016) and
//       checklist/data/market_premium.json (off-plan sales, last 24 months, top projects and distributions)
(function () {
  var MS = null, MP = null, ST = { sc: "Dubai", per: 12, mon: "" }, root = null;
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fm(m) { var p = m.split("-"); return MON[+p[1] - 1] + " " + p[0]; }
  function fml(m) { var p = m.split("-"); return MONL[+p[1] - 1] + " " + p[0]; }
  function n(v) { return Math.round(v || 0).toLocaleString("en-US"); }
  function aedK(v) { var a = Math.abs(v); return a >= 1e6 ? (a / 1e6).toFixed(2) + "M" : a >= 1e3 ? Math.round(a / 1e3) + "K" : Math.round(a); }
  function aedB(v) { return v >= 1e9 ? "AED " + (v / 1e9).toFixed(1) + "B" : v >= 1e6 ? "AED " + (v / 1e6).toFixed(1) + "M" : "AED " + n(v); }
  function pct(v) { return v == null || !isFinite(v) ? '<b style="opacity:.6">N/A</b>' : '<b style="color:' + (v >= 0 ? "#7fd6a5" : "#f3a59a") + '">' + (v >= 0 ? "+" : "") + v.toFixed(1) + "% " + (v >= 0 ? "↗" : "↘") + "</b>"; }
  function wavg(rows) { var s = 0, c = 0; rows.forEach(function (r) { if (r[1] && r[3]) { s += r[1] * r[3]; c += r[3]; } }); return c ? s / c : 0; }

  // ---------- charts ----------
  function chart(rows, which) {
    var r = rows.filter(function (x) { return which === "psf" ? x[1] : true; }); if (r.length < 2) return '<div class="mx-nodata">Not enough sales to draw this.</div>';
    var W = 420, H = 230, L = 50, R = which === "psf" ? 10 : 52, T = 12, B = 28, iw = W - L - R, ih = H - T - B, N = r.length, bw = iw / N;
    var k = function (v) { return v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(v >= 1e4 ? 0 : 1) + "K" : Math.round(v) + ""; };
    var lab = function (m) { return /^\d{4}$/.test(m) ? m : fm(m).replace(/^(\w{3}) 20(\d\d)$/, "$1 '$2"); };
    var g = '<svg viewBox="0 0 ' + W + " " + H + '" class="mx-svg">', q;
    for (q = 0; q <= 4; q++) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ih * q / 4) + '" y2="' + (T + ih * q / 4) + '" stroke="rgba(255,255,255,.08)"/>';
    if (which === "psf") {
      var v = r.map(function (x) { return x[1]; }), mn = Math.min.apply(null, v) * 0.97, mx = Math.max.apply(null, v) * 1.02, y = function (z) { return T + ih - (z - mn) / (mx - mn || 1) * ih; }, x = function (i) { return L + bw * (i + .5); };
      var pts = r.map(function (z, i) { return x(i).toFixed(1) + "," + y(z[1]).toFixed(1); });
      g += '<polygon points="' + x(0).toFixed(1) + "," + (T + ih) + " " + pts.join(" ") + " " + x(N - 1).toFixed(1) + "," + (T + ih) + '" fill="rgba(232,207,142,.14)"/><polyline points="' + pts.join(" ") + '" fill="none" stroke="#E8CF8E" stroke-width="3" stroke-linejoin="round"/>';
      for (q = 0; q <= 4; q++) g += '<text x="' + (L - 6) + '" y="' + (T + ih * q / 4 + 4) + '" fill="rgba(255,255,255,.6)" font-size="14" text-anchor="end">' + n(mx - (mx - mn) * q / 4) + "</text>";
    } else {
      var cnt = which === "op" ? 1 : 3, med = which === "op" ? 3 : 2;
      var sv = r.map(function (x) { return x[cnt] || 0; }), smx = Math.max.apply(null, sv) || 1, pv = r.map(function (x) { return x[med]; }).filter(Boolean), pmn = Math.min.apply(null, pv) * 0.9, pmx = Math.max.apply(null, pv) * 1.05;
      r.forEach(function (z, i) { var hh = (z[cnt] || 0) / smx * ih; g += '<rect x="' + (L + bw * i + bw * 0.15).toFixed(1) + '" y="' + (T + ih - hh).toFixed(1) + '" width="' + Math.max(1.5, bw * 0.7).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="2" fill="' + (which === "op" ? "#3fae7a" : "#C9A24A") + '" opacity=".8"><title>' + lab(z[0]) + ": " + n(z[cnt]) + " sales</title></rect>"; });
      var pp = []; r.forEach(function (z, i) { if (z[med]) pp.push((L + bw * (i + .5)).toFixed(1) + "," + (T + ih - (z[med] - pmn) / (pmx - pmn || 1) * ih).toFixed(1)); });
      if (pp.length > 1) g += '<polyline points="' + pp.join(" ") + '" fill="none" stroke="#7fb0ef" stroke-width="3" stroke-linejoin="round"/>';
      for (q = 0; q <= 4; q++) { g += '<text x="' + (L - 6) + '" y="' + (T + ih * q / 4 + 4) + '" fill="' + (which === "op" ? "#7fd6a5" : "#E8CF8E") + '" font-size="14" text-anchor="end">' + k(smx * (1 - q / 4)) + '</text>' + (pv.length ? '<text x="' + (W - R + 6) + '" y="' + (T + ih * q / 4 + 4) + '" fill="#7fb0ef" font-size="14">' + k(pmx - (pmx - pmn) * q / 4) + "</text>" : ""); }
    }
    (N > 2 ? [0, Math.floor((N - 1) / 2), N - 1] : [0, N - 1]).forEach(function (i, j, a) { g += '<text x="' + (L + bw * (i + .5)) + '" y="' + (H - 8) + '" fill="rgba(255,255,255,.65)" font-size="14" text-anchor="' + (j === 0 ? "start" : j === a.length - 1 ? "end" : "middle") + '">' + lab(r[i][0]) + "</text>"; });
    return g + "</svg>";
  }
  function bars(list, col, unit) {
    if (!list || !list.length) return '<div class="mx-nodata">No sales recorded.</div>'; var mx = list[0][1] || 1;
    return list.map(function (x) { return '<div class="mx-b"><span>' + esc(x[0]) + '</span><div><i style="width:' + Math.max(3, Math.round(x[1] / mx * 100)) + "%;background:" + col + '"></i><b>' + n(x[1]) + "</b></div></div>"; }).join("") + '<div class="mx-u">' + unit + "</div>";
  }
  function cols(vals, labs, col) {
    var mx = Math.max.apply(null, vals) || 1, W = 420, H = 240, L = 40, B = 80, T = 12, iw = W - L - 6, ih = H - T - B, bw = iw / vals.length, g = '<svg viewBox="0 0 ' + W + " " + H + '" class="mx-svg">';
    for (var q = 0; q <= 4; q++) { var yy = T + ih * q / 4; g += '<line x1="' + L + '" x2="' + (W - 6) + '" y1="' + yy + '" y2="' + yy + '" stroke="rgba(255,255,255,.08)"/><text x="' + (L - 5) + '" y="' + (yy + 4) + '" fill="rgba(255,255,255,.6)" font-size="12" text-anchor="end">' + n(mx * (1 - q / 4)) + "</text>"; }
    vals.forEach(function (v, i) { var hh = v / mx * ih, x = L + bw * i; g += '<rect x="' + (x + bw * .14).toFixed(1) + '" y="' + (T + ih - hh).toFixed(1) + '" width="' + (bw * .72).toFixed(1) + '" height="' + Math.max(hh, v ? 1.5 : 0).toFixed(1) + '" rx="3" fill="' + col + '"><title>' + labs[i] + ": " + n(v) + "</title></rect>" + (v ? '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (T + ih - hh - 3).toFixed(1) + '" fill="#fff" font-size="10.5" text-anchor="middle">' + (v >= 1000 ? (v / 1000).toFixed(1) + "K" : v) + "</text>" : "") + '<text transform="translate(' + (x + bw / 2 + 4).toFixed(1) + "," + (T + ih + 6) + ') rotate(-60)" fill="rgba(255,255,255,.7)" font-size="11.5" text-anchor="end">' + labs[i] + "</text>"; });
    return g + "</svg>";
  }
  function rank(t, list) { return '<div class="mx-c"><div class="mx-h">' + t + "</div>" + (list && list.length ? list.slice(0, 10).map(function (x, i) { return '<div class="mx-r"><span><small>' + (i + 1) + "</small>" + esc(x[0]) + "</span><b>" + n(x[1]) + "</b></div>"; }).join("") : '<div class="mx-nodata">No sales recorded.</div>') + "</div>"; }

  // ---------- data helpers ----------
  function allM(sc) { return sc === "Dubai" ? MS.dm : (MS.cm[sc] || []); }
  function allY(sc) { return sc === "Dubai" ? MS.dy : (MS.cy[sc] || []); }
  function opD(sc) { return sc === "Dubai" ? MP.dubai : (MP.c[sc] || null); }
  function lastM(sc) { var M = allM(sc); return M.length ? M[M.length - 1][0] : ""; }
  function minusM(m, k) { var p = m.split("-"), t = +p[0] * 12 + (+p[1] - 1) - k; return Math.floor(t / 12) + "-" + ("0" + (t % 12 + 1)).slice(-2); }
  function between(rows, a, b) { return rows.filter(function (r) { return r[0] >= a && r[0] <= b; }); }

  // ---------- render ----------
  function areas() {
    var K = Object.keys(MS.cm || {}), tot = function (k) { return (MS.cm[k] || []).slice(-12).reduce(function (a, r) { return a + (r[3] || 0); }, 0); };
    return K.sort(function (a, b) { return tot(b) - tot(a); });
  }
  function draw() {
    if (!root) return;
    var sc = ST.sc, per = ST.per, M = allM(sc), end = ST.mon && per === 1 ? ST.mon : lastM(sc);
    if (!M.length) { root.querySelector(".mx-out").innerHTML = '<div class="mx-nodata">No sales data for this area yet.</div>'; return; }
    var start = minusM(end, per - 1), cur = between(M, start, end), prev = between(M, minusM(start, per), minusM(start, 1)), yago = between(M, minusM(start, 12), minusM(end, 12));
    var sales = cur.reduce(function (a, r) { return a + (r[3] || 0); }, 0), psf = wavg(cur), pPrev = wavg(prev), pY = wavg(yago);
    var lm = cur[cur.length - 1] || M[M.length - 1], where = sc === "Dubai" ? "Dubai" : esc(sc);
    var D = opD(sc), OPM = D ? D.m : [], ocur = between(OPM, start, end), osales = ocur.reduce(function (a, r) { return a + r[1]; }, 0), oval = ocur.reduce(function (a, r) { return a + r[2]; }, 0);
    var opOK = ocur.length && OPM.length && start >= OPM[0][0], share = opOK && sales ? osales / sales * 100 : null;
    var title = per === 1 ? fml(end) : (per >= 12 ? (per / 12) + "-year" : per + "-month") + " view · " + fm(start) + " to " + fm(end);
    var h = '<div class="mx-title">' + where + ": " + title + "</div>";
    h += '<div class="mx-tiles">' +
      '<div><small>Registered sales<br>(off-plan + ready)</small><b>' + n(sales) + "</b></div>" +
      '<div><small>Off-plan sales</small><b style="color:#7fd6a5">' + (opOK ? n(osales) : "–") + "</b></div>" +
      '<div><small>Off-plan share</small><b>' + (share != null ? share.toFixed(0) + "%" : (MS.op && MS.op[sc] != null ? MS.op[sc] + "%*" : "–")) + "</b></div>" +
      '<div><small>Off-plan value</small><b>' + (opOK ? aedB(oval) : "–") + "</b></div>" +
      '<div><small>Avg price / sq ft</small><b style="color:#E8CF8E">' + (psf ? "AED " + n(psf) : "–") + "</b></div>" +
      '<div><small>Median price<br>' + fm(lm[0]) + '</small><b style="color:#a9c6ec">' + (lm[2] ? "AED " + aedK(lm[2]) : "–") + "</b></div>" +
      '<div><small>Price / sq ft vs<br>previous ' + (per === 1 ? "month" : "period") + "</small>" + pct(psf && pPrev ? (psf / pPrev - 1) * 100 : null) + "</div>" +
      '<div><small>Price / sq ft vs<br>a year earlier</small>' + pct(psf && pY ? (psf / pY - 1) * 100 : null) + "</div></div>";
    if (!opOK && per > 1) h += '<div class="mx-note">Off-plan figures cover the last 24 months (' + (OPM.length ? fm(OPM[0][0]) : "") + " onwards). Pick 2Y or shorter for off-plan totals." + (MS.op && MS.op[sc] != null ? " *Off-plan share of the last 12 months." : "") + "</div>";
    // charts
    var yearly = per > 36, series = yearly ? allY(sc).filter(function (y) { return y[0] > +end.slice(0, 4) - per / 12; }).map(function (y) { return [String(y[0]), y[3], y[2], y[1]]; }) : (per === 1 ? between(M, minusM(end, 11), end) : cur);
    h += '<div class="mx-g2"><div class="mx-c"><div class="mx-h">' + (yearly ? "Yearly" : "Monthly") + ' sales &amp; median price' + (per === 1 ? " <small>(12 months to " + fm(end) + ")</small>" : "") + '</div><div class="mx-k"><span style="color:#E8CF8E">■ sales</span> · <span style="color:#7fb0ef">― median price (AED)</span></div>' + chart(series, "tx") + "</div>" +
      '<div class="mx-c"><div class="mx-h">Average price per sq ft</div><div class="mx-k">What buyers paid per sq ft, so unit sizes don\'t skew the trend</div>' + chart(series, "psf") + "</div></div>";
    if (OPM.length) {
      var oser = per === 1 ? between(OPM, minusM(end, 11), end) : (opOK ? ocur : OPM);
      h += '<div class="mx-c"><div class="mx-h">Off-plan sales by month</div><div class="mx-k"><span style="color:#3fae7a">■ off-plan sales</span> · <span style="color:#7fb0ef">― median off-plan price (AED)</span></div>' + chart(oser, "op") + "</div>";
    }
    if (D) {
      var lastOp = (per === 1 ? between(OPM, end, end)[0] : null) || OPM[OPM.length - 1];
      h += '<div class="mx-g2">' + (sc === "Dubai" ? rank("Busiest areas, " + fm(MP.last), MP.dubai.am) + rank("Busiest areas in " + MP.last.slice(0, 4) + " so far", MP.dubai.ay) : "") +
        rank("Best-selling off-plan projects, " + fm(MP.last), D.pm) + '<div class="mx-c"><div class="mx-h">Top projects by units sold</div>' + bars(D.tp, "linear-gradient(90deg,#2b4a7a,#7fb0ef)", "off-plan units sold") + "</div>" +
        (sc === "Dubai" ? '<div class="mx-c"><div class="mx-h">Top areas by off-plan sales</div>' + bars(MP.dubai.ta, "linear-gradient(90deg,#9c7a2a,#E8CF8E)", "units sold") + "</div>" : "") + "</div>";
      h += '<div class="mx-g2"><div class="mx-c"><div class="mx-h">Price ranges sold (last 6 months)</div>' + cols(D.pd, MP.pb, "#3fae7a") + '</div><div class="mx-c"><div class="mx-h">Unit sizes sold, sq ft (last 6 months)</div>' + cols(D.sd, MP.sb, "#4f86e0") + "</div></div>";
      var sp = D.split || [0, 0];
      if (sp[0] + sp[1]) h += '<div class="mx-c"><div class="mx-h">Apartments vs villas & townhouses, ' + fm(MP.last) + '</div><div class="mx-split"><i style="width:' + (sp[0] / (sp[0] + sp[1]) * 100).toFixed(1) + '%"></i></div><div class="mx-k">🏢 ' + n(sp[0]) + " apartments and other units · 🏡 " + n(sp[1]) + " villas and townhouses</div></div>";
      h += '<div class="mx-c" style="overflow-x:auto"><div class="mx-h">Off-plan sales in ' + where + ', month by month</div><table class="mx-t"><tr><th>Month</th><th>Sales</th><th>Total value</th><th>Median price</th><th>Per sq ft</th></tr>' +
        OPM.slice(-24).reverse().map(function (r) { return '<tr' + (r[0] >= start && r[0] <= end ? ' class="on"' : "") + "><td>" + fm(r[0]) + "</td><td>" + n(r[1]) + "</td><td>" + aedB(r[2]) + "</td><td>" + (r[3] ? "AED " + n(r[3]) : "–") + "</td><td>" + (r[4] ? "AED " + n(r[4]) : "–") + "</td></tr>"; }).join("") + "</table></div>";
    } else h += '<div class="mx-note">Detailed off-plan breakdowns (top projects, price ranges, sizes) are available for Dubai and the 60+ busiest off-plan areas.</div>';
    h += '<div class="mx-src">Source: Dubai Land Department open data via Dubai Data (CC BY 4.0). All registered sales through ' + esc(MS.data_through || MS.updated) + "; off-plan breakdowns through " + fm(MP.last) + ". Updated weekly. Price per sq ft is the sales-weighted average of monthly medians.</div>";
    root.querySelector(".mx-out").innerHTML = h;
  }
  function ui() {
    var A = areas(), months = (MP && MP.dubai ? MP.dubai.m : []).map(function (r) { return r[0]; }).reverse();
    var P = [[1, "1M"], [3, "3M"], [6, "6M"], [12, "1Y"], [24, "2Y"], [36, "3Y"], [60, "5Y"], [120, "10Y"]];
    root.innerHTML = '<div class="mx">' +
      '<div class="mx-ctl"><label>📍 Area<input list="mxareas" id="mxa" placeholder="Dubai (all areas)" autocomplete="off"><datalist id="mxareas"><option value="Dubai (all areas)">' + A.map(function (k) { return '<option value="' + esc(k) + '">'; }).join("") + "</datalist></label>" +
      '<div class="mx-per">' + P.map(function (p) { return '<button type="button" data-p="' + p[0] + '"' + (p[0] === ST.per ? ' class="on"' : "") + ">" + p[1] + "</button>"; }).join("") + "</div>" +
      '<label class="mx-mon" id="mxmw"' + (ST.per === 1 ? "" : " hidden") + '>🗓️ Month<select id="mxm">' + months.map(function (m) { return '<option value="' + m + '">' + fml(m) + "</option>"; }).join("") + "</select></label></div>" +
      '<div class="mx-out"></div></div>';
    var ai = root.querySelector("#mxa");
    function setArea() { var v = ai.value.trim(); if (!v || /^dubai( \(all areas\))?$/i.test(v)) { ST.sc = "Dubai"; draw(); return; } var hit = A.filter(function (k) { return k.toLowerCase() === v.toLowerCase(); })[0] || A.filter(function (k) { return k.toLowerCase().indexOf(v.toLowerCase()) >= 0; })[0]; if (hit) { ST.sc = hit; ai.value = hit; ai.blur(); draw(); } }
    ai.addEventListener("change", setArea); ai.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); setArea(); } });
    ai.addEventListener("focus", function () { if (/^dubai \(all areas\)$/i.test(ai.value)) ai.value = ""; });
    Array.prototype.forEach.call(root.querySelectorAll(".mx-per button"), function (b) { b.addEventListener("click", function () { ST.per = +b.dataset.p; Array.prototype.forEach.call(root.querySelectorAll(".mx-per button"), function (x) { x.classList.toggle("on", x === b); }); root.querySelector("#mxmw").hidden = ST.per !== 1; if (ST.per !== 1) ST.mon = ""; else ST.mon = root.querySelector("#mxm").value; draw(); }); });
    root.querySelector("#mxm").addEventListener("change", function () { ST.mon = this.value; draw(); });
    if (ST.sc !== "Dubai") ai.value = ST.sc;
    draw();
  }
  window.DPMarket = {
    mount: function (el, base) {
      root = el; el.innerHTML = '<div class="mx"><div class="mx-nodata" style="padding:30px;text-align:center">Loading Dubai Land Department data…</div></div>';
      base = base || "../checklist/data/";
      Promise.all([fetch(base + "market_stats.json").then(function (r) { return r.json(); }), fetch(base + "market_premium.json").then(function (r) { return r.json(); })])
        .then(function (a) { MS = a[0]; MP = a[1]; ui(); })
        .catch(function () { el.innerHTML = '<div class="mx"><div class="mx-nodata">Couldn\'t load the market data. Please try again.</div></div>'; });
    }
  };
})();
