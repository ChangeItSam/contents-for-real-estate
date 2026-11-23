/* DealPro Agent: "Leads to Deals Formula" (Sam's Academy). Content in checklist/data/academy.json.
   Each lesson: summary, copy-ready template, YouTube video (Unlisted link in "yt"; empty = coming soon), "I tried this" tick. */
(function () {
  var CSS = '.dpac .mod{border:1px solid #E6E1D6;border-radius:18px;padding:16px;margin-top:14px;background:#FFFDF7}.dpac .mh{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.dpac .mh b{font-size:18px;color:#081830}.dpac .mh span{font-size:12px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;color:#9A7A2E}' +
    '.dpac .idea{margin:4px 0 4px;color:#5B6678;font-size:14px}.dpac .prog{height:8px;background:#EEE7D6;border-radius:8px;overflow:hidden;margin:10px 0 4px}.dpac .prog i{display:block;height:100%;background:linear-gradient(90deg,#C9A24A,#E8CF8E);width:0}' +
    '.dpac details{background:#fff;border:1px solid #E6E1D6;border-radius:14px;margin-top:10px}.dpac summary{cursor:pointer;list-style:none;padding:13px 14px;display:flex;gap:10px;align-items:center;font-weight:800;color:#081830;font-size:15px}.dpac summary::-webkit-details-marker{display:none}' +
    '.dpac summary .no{flex:0 0 30px;height:30px;border-radius:50%;background:#081830;color:#E8CF8E;display:flex;align-items:center;justify-content:center;font-size:13px}.dpac summary .done{background:#167A45;color:#fff}.dpac summary small{margin-left:auto;color:#8A93A3;font-weight:700;white-space:nowrap}' +
    '.dpac .body{padding:0 14px 14px}.dpac .vid{position:relative;padding-top:56.25%;border-radius:12px;overflow:hidden;background:#081830}.dpac .vid iframe{position:absolute;inset:0;width:100%;height:100%;border:0}' +
    '.dpac .soon{border-radius:12px;background:linear-gradient(135deg,#081830,#18406F);color:#E8CF8E;padding:26px 16px;text-align:center;font-weight:800}.dpac .soon small{display:block;color:#B9C4D6;font-weight:600;margin-top:4px}' +
    '.dpac ul{margin:12px 0 0;padding-left:20px;color:#1B2433;line-height:1.55}.dpac li{margin:4px 0}.dpac .tpl{margin-top:12px;background:#FFF9EA;border:1px dashed #C9A24A;border-radius:12px;padding:10px 12px;font-size:14px;color:#3D3220}.dpac .tpl b{display:block;font-size:11.5px;letter-spacing:.6px;text-transform:uppercase;color:#9A7A2E;margin-bottom:3px}' +
    '.dpac .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.dpac .row button{border:0;border-radius:20px;padding:8px 13px;font:inherit;font-size:13.5px;font-weight:800;cursor:pointer;background:#081830;color:#fff}.dpac .row button.cp{background:#F1ECE0;color:#081830}.dpac .row button.ok{background:#167A45}' +
    '.dpac .cases{margin-top:12px;font-size:14px;color:#5B6678}.dpac .cases b{color:#081830}';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ytId(u) { var m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : ''; }
  function st(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || '{}'); localStorage.setItem(k, JSON.stringify(v)); } catch (x) { return {}; } }
  window.DPAcademy = { mount: function (el, base) {
    if (!document.getElementById('dpac-css')) { var s = document.createElement('style'); s.id = 'dpac-css'; s.textContent = CSS; document.head.appendChild(s); }
    el.classList.add('dpac'); el.innerHTML = '<p class="muted">Loading…</p>';
    fetch((base || '/checklist/data/') + 'academy.json?v=' + Math.floor(Date.now() / 36e5)).then(function (r) { return r.json(); }).then(function (d) {
      var T = st('sam-agent-acad');
      function draw() {
        el.innerHTML = (d.modules || []).map(function (m) {
          var L = m.lessons || [], done = L.filter(function (l) { return T[l.id]; }).length;
          return '<div class="mod"><div class="mh"><span>Module ' + m.n + '</span><b>' + esc(m.title) + '</b></div><p class="idea">' + esc(m.idea || '') + '</p>' +
            '<div class="prog"><i style="width:' + Math.round(100 * done / Math.max(1, L.length)) + '%"></i></div><small class="muted">' + done + ' of ' + L.length + ' lessons tried</small>' +
            L.map(function (l, i) { var id = ytId(l.yt);
              return '<details data-l="' + l.id + '"><summary><span class="no' + (T[l.id] ? ' done' : '') + '">' + (T[l.id] ? '✓' : i) + '</span>' + esc(l.title) + '<small>' + (l.min ? l.min + ' min' : '') + '</small></summary><div class="body">' +
                (id ? '<div class="vid" data-y="' + id + '"></div>' : '<div class="soon">🎬 Video coming soon<small>Read the summary below and try it on your next call</small></div>') +
                '<ul>' + (l.sum || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
                (l.tpl ? '<div class="tpl"><b>Copy and use</b>' + esc(l.tpl) + '</div>' : '') +
                '<div class="row">' + (l.tpl ? '<button type="button" class="cp">📋 Copy template</button>' : '') + '<button type="button" class="tk' + (T[l.id] ? ' ok' : '') + '">' + (T[l.id] ? '✅ I tried this on a call' : '☐ I tried this on a call') + '</button></div></div></details>';
            }).join('') +
            (m.cases && m.cases.length ? '<p class="cases"><b>Case studies coming next:</b> ' + m.cases.map(esc).join(' · ') + '</p>' : '') + '</div>';
        }).join('');
        Array.prototype.forEach.call(el.querySelectorAll('details'), function (dt) {
          var lid = dt.dataset.l, l = null; d.modules.forEach(function (m) { m.lessons.forEach(function (x) { if (x.id === lid) l = x; }); });
          dt.addEventListener('toggle', function () { var v = dt.querySelector('.vid'); if (dt.open && v && !v.firstChild) v.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + v.dataset.y + '?rel=0&modestbranding=1" title="' + esc(l.title) + '" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>'; });
          var cp = dt.querySelector('.cp'); if (cp) cp.onclick = function () { try { navigator.clipboard.writeText(l.tpl); cp.textContent = '✓ Copied'; } catch (x) {} };
          dt.querySelector('.tk').onclick = function () { if (T[lid]) delete T[lid]; else T[lid] = Date.now(); st('sam-agent-acad', T); var open = lid; draw(); var n = el.querySelector('details[data-l="' + open + '"]'); if (n) n.open = true; };
        });
      }
      draw();
    }).catch(function () { el.innerHTML = '<p class="muted">Couldn\'t load the lessons. Please refresh.</p>'; });
  } };
})();
