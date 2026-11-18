// DealPro Agent: upcoming property supply (units handing over per year, by area and type)
// Data: checklist/data/supply.json (DLD project registry; type estimated, see tools/fetch_supply.py)
(function () {
  var D = null, root = null, ST = { area: "", type: "", year: "" };
  var TY = [["apartment", "🏢 Apartments", "#E8CF8E"], ["townhouse", "🏘️ Townhouses", "#7FB4F0"], ["villa", "🏡 Villas", "#7fd6a5"]];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function n(v) { return Math.round(v || 0).toLocaleString("en-US"); }
  function fm(m) { var p = m.split("-"); return MON[+p[1] - 1] + " " + p[0]; }
  function rows(area, type, year) {
    return D.p.filter(function (p) { return (!area || p[2] === area) && (!type || p[5] === type) && (!year || p[3].slice(0, 4) === year); });
  }
  function years() { var y = {}; D.p.forEach(function (p) { y[p[3].slice(0, 4)] = 1; }); return Object.keys(y).sort(); }
  function sum(r) { return r.reduce(function (s, p) { return s + p[4]; }, 0); }

  function chart(area) {
    var Y = years(), W = 420, H = 220, L = 46, R = 8, T = 12, B = 26, iw = W - L - R, ih = H - T - B, bw = iw / Y.length;
    var tot = Y.map(function (y) { return TY.map(function (t) { return sum(rows(area, t[0], y)); }); });
    var mx = Math.max.apply(null, tot.map(function (a) { return a[0] + a[1] + a[2]; })) || 1;
    var g = '<svg viewBox="0 0 ' + W + " " + H + '" class="mx-svg">', q;
    for (q = 0; q <= 4; q++) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ih * q / 4) + '" y2="' + (T + ih * q / 4) + '" stroke="rgba(255,255,255,.08)"/><text x="' + (L - 6) + '" y="' + (T + ih * q / 4 + 4) + '" fill="rgba(255,255,255,.6)" font-size="13" text-anchor="end">' + (mx - mx * q / 4 >= 1000 ? ((mx - mx * q / 4) / 1000).toFixed(1) + "K" : Math.round(mx - mx * q / 4)) + "</text>";
    Y.forEach(function (y, i) {
      var x = L + bw * i + bw * .18, w = bw * .64, base = T + ih, on = !ST.year || ST.year === y;
      TY.forEach(function (t, k) {
        if (ST.type && ST.type !== t[0]) return;
        var h = tot[i][k] / mx * ih; if (h <= 0) return; base -= h;
        g += '<rect x="' + x.toFixed(1) + '" y="' + base.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3" fill="' + t[2] + '" opacity="' + (on ? 1 : .35) + '"><title>' + y + " · " + t[1].slice(3) + ": " + n(tot[i][k]) + " units</title></rect>";
      });
      g += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 8) + '" fill="rgba(255,255,255,.75)" font-size="13" text-anchor="middle">' + y + "</text>";
    });
    return g + "</svg>";
  }

  function draw() {
    if (!root || !D) return;
    var Y = years(), yr = ST.year, area = ST.area;
    var tiles = TY.map(function (t) {
      var r = rows(area, t[0], yr), u = sum(r), on = ST.type === t[0];
      return '<button class="sp-tile' + (on ? " on" : "") + '" data-t="' + t[0] + '" style="--c:' + t[2] + '"><span>' + t[1] + '</span><b>' + n(u) + '</b><small>units handing over' + (yr ? " in " + yr : " (all years)") + " · " + r.length + " project" + (r.length === 1 ? "" : "s") + "</small></button>";
    }).join("");
    // year × type table
    var tbl = '<div style="overflow-x:auto"><table class="mx-t"><tr><th style="text-align:left">Handover</th>' + TY.map(function (t) { return "<th>" + t[1] + "</th>"; }).join("") + "<th>Total</th></tr>" +
      Y.map(function (y) { var a = TY.map(function (t) { return sum(rows(area, t[0], y)); }); return '<tr' + (y === yr ? ' style="background:rgba(201,162,74,.18)"' : "") + '><td style="text-align:left"><b>' + y + "</b></td>" + a.map(function (v) { return "<td>" + (v ? n(v) : "–") + "</td>"; }).join("") + "<td><b>" + n(a[0] + a[1] + a[2]) + "</b></td></tr>"; }).join("") + "</table></div>";
    // busiest areas (when looking at all Dubai)
    var top = "";
    if (!area) {
      var by = {}; rows("", ST.type, yr).forEach(function (p) { by[p[2]] = (by[p[2]] || 0) + p[4]; });
      var L = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).slice(0, 5), mx = L.length ? by[L[0]] : 1;
      top = '<div class="mx-c"><div class="mx-h">📍 Most supply ' + (yr ? "in " + yr : "coming") + (ST.type ? " · " + TY.filter(function (t) { return t[0] === ST.type; })[0][1].slice(3).toLowerCase() : "") + '</div><div class="mx-k">Tap an area to see its projects.</div>' +
        L.map(function (a) { return '<div class="mx-b sp-a" data-a="' + esc(a) + '" style="cursor:pointer"><span>' + esc(a) + '</span><div style="display:flex;align-items:center;gap:8px"><div style="height:12px;border-radius:6px;background:#C9A24A;width:' + Math.max(4, by[a] / mx * 100).toFixed(0) + '%"></div><b>' + n(by[a]) + "</b></div></div>"; }).join("") + "</div>";
    }
    // project list
    var P = rows(area, ST.type, yr).sort(function (a, b) { return a[3].localeCompare(b[3]) || b[4] - a[4]; });
    var list = '<div class="mx-c"><div class="mx-h">🏗️ Projects handing over' + (yr ? " in " + yr : "") + (area ? " · " + esc(area) : " · all Dubai") + " (" + P.length + ")</div>" +
      (P.length ? '<div style="overflow-x:auto"><table class="mx-t"><tr><th style="text-align:left">Project</th><th>Type</th><th>Handover</th><th>Units</th><th>Built</th></tr>' +
        P.slice(0, area ? 200 : 20).map(function (p) { return '<tr><td style="text-align:left"><b>' + esc(p[0]) + '</b><br><span style="opacity:.65;font-size:12px">' + esc(p[1].replace(/\s*(l\.?l\.?c\.?|fze|fzco|p\.?j\.?s\.?c\.?)\.?$/i, "")) + (area ? "" : " · " + esc(p[2])) + "</span></td><td>" + ({ apartment: "Apt", townhouse: "TH", villa: "Villa" })[p[5]] + "</td><td>" + fm(p[3]) + "</td><td>" + n(p[4]) + "</td><td>" + p[6] + "%</td></tr>"; }).join("") + "</table></div>" +
        (!area && P.length > 20 ? '<div class="mx-k" style="margin-top:6px">Showing the first 20. Pick an area to see them all.</div>' : "")
        : '<div class="mx-nodata">No registered projects handing over here' + (yr ? " in " + yr : "") + ".</div>") + "</div>";
    var out = root.querySelector(".sp-out");
    out.innerHTML = '<div class="mx-title">' + (area ? esc(area) : "All Dubai") + (yr ? " · " + yr : " · all years") + '</div><div class="sp-tiles">' + tiles + "</div>" +
      '<div class="mx-c"><div class="mx-h">Units handing over by year</div>' + chart(area) + '<div class="sp-leg">' + TY.map(function (t) { return '<span><i style="background:' + t[2] + '"></i>' + t[1].slice(3) + "</span>"; }).join("") + "</div>" + tbl + "</div>" + top + list +
      '<div class="mx-k" style="margin-top:8px">' + esc(D.note) + " Developers often hand over later than the registered date. Source: " + esc(D.source) + ", updated " + esc(D.updated) + ".</div>";
    out.querySelectorAll(".sp-tile").forEach(function (b) { b.onclick = function () { ST.type = ST.type === b.dataset.t ? "" : b.dataset.t; draw(); }; });
    out.querySelectorAll(".sp-a").forEach(function (b) { b.onclick = function () { ST.area = b.dataset.a; root.querySelector("#spq").value = ST.area; draw(); root.scrollIntoView({ behavior: "smooth", block: "start" }); }; });
    root.querySelectorAll(".sp-y button").forEach(function (b) { b.classList.toggle("on", b.dataset.y === ST.year); });
  }

  function mount(el, base) {
    root = el; el.innerHTML = '<div class="mx"><div class="mx-ctl"><input id="spq" list="spareas" placeholder="📍 All Dubai: type an area, e.g. JVC, Dubai South" autocomplete="off"><datalist id="spareas"></datalist><div class="mx-per sp-y"></div></div><div class="sp-out"><div class="mx-nodata">Loading supply…</div></div></div>';
    fetch(base + "supply.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (j) {
      D = j; var Y = years(), now = String(new Date().getFullYear() + 1); ST.year = Y.indexOf(now) >= 0 ? now : Y[0];
      var A = {}; D.p.forEach(function (p) { A[p[2]] = (A[p[2]] || 0) + p[4]; });
      el.querySelector("#spareas").innerHTML = Object.keys(A).sort().map(function (a) { return '<option value="' + esc(a) + '">'; }).join("");
      el.querySelector(".sp-y").innerHTML = '<button data-y="">All</button>' + Y.map(function (y) { return '<button data-y="' + y + '">' + y + "</button>"; }).join("");
      el.querySelectorAll(".sp-y button").forEach(function (b) { b.onclick = function () { ST.year = b.dataset.y; draw(); }; });
      var q = el.querySelector("#spq");
      function pick() { var v = q.value.trim().toLowerCase(); if (!v) { ST.area = ""; return draw(); }
        var k = Object.keys(A).filter(function (a) { return a.toLowerCase() === v; })[0] || Object.keys(A).filter(function (a) { return a.toLowerCase().indexOf(v) >= 0; })[0];
        if (!k && /^jvc$/.test(v)) k = "Jumeirah Village Circle"; if (!k && /^jvt$/.test(v)) k = "Jumeirah Village Triangle";
        if (k) { ST.area = k; q.value = k; draw(); } }
      q.addEventListener("change", pick); q.addEventListener("keydown", function (ev) { if (ev.key === "Enter") pick(); });
      q.addEventListener("input", function () { if (!q.value.trim()) { ST.area = ""; draw(); } });
      draw();
    }).catch(function () { el.querySelector(".sp-out").innerHTML = '<div class="mx-nodata">Couldn\'t load the supply data. Try again in a minute.</div>'; });
  }
  window.DPSupply = { mount: mount };
})();
