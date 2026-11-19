// DealPro Agent: property news that moves buying decisions + new developer launches
// Data: checklist/data/news.json (tools/fetch_news.py, every 6 hours) and checklist/data/market.json (launches with a ready report)
(function () {
  var N = null, M = [], root = null, ST = { v: "m", g: "" };
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fd(d) { if (!d) return ""; var p = d.split("-"); if (p.length < 3) return MON[+p[1] - 1] + " " + p[0];
    var days = Math.round((new Date() - new Date(d + "T12:00:00")) / 864e5);
    return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 7 ? days + " days ago" : +p[2] + " " + MON[+p[1] - 1]; }
  function isNew(d) { return d && d.length === 10 && (new Date() - new Date(d + "T00:00:00")) / 864e5 < 3; }
  function item(x, launch) {
    return '<a class="nw-i" href="' + esc(x.u) + '" target="_blank" rel="noopener">' +
      (launch ? '<span class="nw-g" style="background:rgba(127,214,165,.18);color:#7fd6a5">🚀 Launch</span>' : '<span class="nw-g">' + esc(x.g || "📰 Market") + "</span>") +
      (isNew(x.d) ? '<span class="nw-new">NEW</span>' : "") +
      "<b>" + esc(x.t) + "</b><small>" + esc(x.s) + (x.d ? " · " + fd(x.d) : "") + " ↗</small>" +
      (x.w ? '<em>Why it matters: ' + esc(x.w) + "</em>" : "") + "</a>";
  }
  function draw() {
    var out = root.querySelector(".nw-out"), h = "";
    root.querySelectorAll(".nw-v button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === ST.v); });
    if (ST.v === "m") {
      var G = {}; N.m.forEach(function (x) { G[x.g || "📰 Market"] = 1; });
      h += '<div class="nw-chips"><button data-g=""' + (ST.g ? "" : ' class="on"') + ">All</button>" + Object.keys(G).sort().map(function (g) { return '<button data-g="' + esc(g) + '"' + (ST.g === g ? ' class="on"' : "") + ">" + esc(g) + "</button>"; }).join("") + "</div>";
      var L = N.m.filter(function (x) { return !ST.g || (x.g || "📰 Market") === ST.g; });
      h += L.length ? L.map(function (x) { return item(x, false); }).join("") : '<div class="mx-nodata">Nothing in this group yet.</div>';
    } else {
      var R = M.filter(function (p) { return p.added; }).sort(function (a, b) { return String(b.added).localeCompare(String(a.added)); }).slice(0, 8);
      if (R.length) h += '<div class="mx-c"><div class="mx-h">✅ New launches you can report on now</div><div class="mx-k">Already in DealPro: open the full report with your name on it.</div>' +
        R.map(function (p) { return '<a class="nw-r" href="../checklist/?agent=1&proj=' + encodeURIComponent(p.name) + '"><b>' + esc(p.name) + "</b><span>" + esc(p.dev || "") + (p.comm || p.area ? " · " + esc(p.comm || p.area) : "") + "</span><i>Report →</i></a>"; }).join("") + "</div>";
      h += '<div class="mx-h" style="margin:12px 0 6px">📣 Launch announcements in the news</div>' + (N.l.length ? N.l.map(function (x) { return item(x, true); }).join("") : '<div class="mx-nodata">No launch news in the last few weeks.</div>');
    }
    out.innerHTML = h + '<div class="mx-k" style="margin-top:10px">' + esc(N.source) + " Updated every 6 hours. Headlines are the publishers' own; check the article before advising a client.</div>";
    out.querySelectorAll(".nw-chips button").forEach(function (b) { b.onclick = function () { ST.g = b.dataset.g; draw(); }; });
  }
  function mount(el, base) {
    root = el; el.innerHTML = '<div class="mx"><div class="mx-per nw-v" style="margin-bottom:12px"><button data-v="m">⚡ Market-moving news</button><button data-v="l">🚀 New launches</button></div><div class="nw-out"><div class="mx-nodata">Loading news…</div></div></div>';
    el.querySelectorAll(".nw-v button").forEach(function (b) { b.onclick = function () { ST.v = b.dataset.v; draw(); }; });
    Promise.all([fetch(base + "news.json", { cache: "no-cache" }).then(function (r) { return r.json(); }),
      fetch(base + "market.json").then(function (r) { return r.ok ? r.json() : { p: [] }; }).catch(function () { return { p: [] }; })]).then(function (a) {
      N = a[0]; N.m = N.m || []; N.l = N.l || []; M = a[1].p || []; draw();
    }).catch(function () { el.querySelector(".nw-out").innerHTML = '<div class="mx-nodata">Couldn\'t load the news. Try again in a minute.</div>'; });
  }
  window.DPNews = { mount: mount };
})();
