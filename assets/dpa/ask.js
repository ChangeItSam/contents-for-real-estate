/* DealPro Agent: "Ask AI Expert Broker".
   1. Agent asks -> matched against the verified Q&A library (checklist/data/faq.json) -> instant answer.
   2. Not in the library -> AI quick answer (Apps Script agent_ask, OpenAI key in Script Properties, never here)
      + the question is logged as "New" with a Question ID; a verified answer is added to the library within a week.
   3. When faq.json gets an item whose "qids" holds that ID, the agent sees "Your question has been answered". */
(function () {
  var CSS = '.dpask{margin-top:18px;background:linear-gradient(160deg,#081830,#0F2748);color:#fff;border-radius:24px;padding:22px;box-shadow:0 20px 50px rgba(8,24,48,.18);scroll-margin-top:90px}' +
    '.dpask h2{margin:0 0 4px;font-size:20px;color:#fff}.dpask h2 span{color:#E8CF8E}.dpask p.m{margin:0 0 14px;color:#B9C4D6;font-size:14px;line-height:1.5}' +
    '.dpask form{display:flex;gap:8px;background:#fff;border-radius:16px;padding:6px;border:2px solid #C9A24A}' +
    '.dpask input{flex:1;min-width:0;border:0;outline:0;font:inherit;font-size:16px;padding:10px;color:#1B2433;background:transparent}' +
    '.dpask button.go{border:0;border-radius:12px;padding:0 16px;font:inherit;font-weight:900;color:#081830;background:linear-gradient(135deg,#C9A24A,#F6E7BE 55%,#C9A24A);cursor:pointer;white-space:nowrap}.dpask button.go:disabled{opacity:.6;cursor:wait}' +
    '.dpask .ch[hidden],.dpask .lib[hidden],.dpask .sug[hidden]{display:none}.dpask .ch{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.dpask .ch button,.dpask .cats button{border:1px solid rgba(232,207,142,.45);background:rgba(255,255,255,.06);color:#F6E7BE;border-radius:30px;padding:7px 12px;font:inherit;font-size:13px;cursor:pointer}' +
    '.dpask .cats button.on{background:#C9A24A;color:#081830;border-color:#C9A24A;font-weight:800}' +
    '.dpask .sug{background:#fff;border-radius:12px;margin-top:6px;overflow:hidden}.dpask .sug button{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #EEE;background:#fff;color:#1B2433;padding:10px 12px;font:inherit;font-size:14px;cursor:pointer}.dpask .sug button:hover{background:#FFF9EA}' +
    '.dpask .log{margin-top:14px;display:flex;flex-direction:column;gap:10px}.dpask .q{align-self:flex-end;max-width:88%;background:#C9A24A;color:#081830;font-weight:700;border-radius:16px 16px 4px 16px;padding:10px 14px;font-size:15px}' +
    '.dpask .a{background:#fff;color:#1B2433;border-radius:16px 16px 16px 4px;padding:14px 16px;font-size:15px;line-height:1.55}.dpask .a p{margin:0 0 8px}.dpask .a p:last-child{margin:0}.dpask .a ul,.dpask .a ol{margin:4px 0 8px;padding-left:20px}.dpask .a li{margin:3px 0}' +
    '.dpask .a .src{display:inline-block;font-size:11.5px;font-weight:900;letter-spacing:.6px;text-transform:uppercase;border-radius:20px;padding:3px 9px;margin-bottom:8px;background:#E8F4EC;color:#167A45}.dpask .a .src.ai{background:#EAF0FA;color:#18406F}' +
    '.dpask .a .refs{margin-top:8px;font-size:12px;color:#5B6678}.dpask .a .refs a{color:#18406F}.dpask .a .more{margin-top:10px;display:flex;flex-wrap:wrap;gap:8px}.dpask .a .more button{border:1px solid #E6E1D6;background:#FAF7F0;border-radius:20px;padding:6px 11px;font:inherit;font-size:13px;color:#081830;cursor:pointer;text-align:left}' +
    '.dpask .a .pend{margin-top:10px;background:#FFF9EA;border:1px solid #E8CF8E;border-radius:12px;padding:10px 12px;font-size:13.5px;color:#5B4A1A}' +
    '.dpask .a.err{background:#FDECEA;color:#8A1C14}.dpask .ok{background:linear-gradient(135deg,#E8F4EC,#fff);color:#1B2433;border:2px solid #167A45;border-radius:16px;padding:14px 16px;margin-top:12px;font-size:15px;line-height:1.5}.dpask .ok b.t{color:#167A45;display:block;margin-bottom:4px}' +
    '.dpask .ok button{margin-top:8px;border:0;background:#167A45;color:#fff;border-radius:20px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}' +
    '.dpask .lib{margin-top:14px;background:rgba(255,255,255,.05);border:1px solid rgba(232,207,142,.25);border-radius:16px;padding:14px}.dpask .cats{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}' +
    '.dpask details{background:#fff;color:#1B2433;border-radius:12px;margin-top:6px}.dpask summary{cursor:pointer;padding:11px 14px;font-weight:800;font-size:14.5px;list-style:none}.dpask summary::-webkit-details-marker{display:none}.dpask summary:before{content:"+ ";color:#C9A24A}.dpask details[open] summary:before{content:"– "}' +
    '.dpask details .a{border-radius:0 0 12px 12px;padding-top:0}.dpask .dpft{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:12px;font-size:12px;color:#8FA0B8}.dpask .dpft a{color:#E8CF8E;cursor:pointer;text-decoration:underline}' +
    '.dpask .dots:after{content:"…";animation:dpd 1s steps(3) infinite}@keyframes dpd{0%{content:"."}33%{content:".."}66%{content:"..."}}';
  var CHIPS = ['How does an off-plan resale work before handover?', 'What fees does a buyer pay on off-plan?', 'Can off-plan get a golden visa?', 'What happens if a buyer misses instalments?', 'How do I answer "I\'ll wait for prices to drop"?'];
  var ERR = { login: 'Please log in again to ask a question.', plan: 'Ask AI Expert Broker is part of an active DealPro plan.',
    limit: 'You\'ve used today\'s new questions. Your limit resets at midnight Dubai time. The Q&A library still answers instantly.', empty: 'Type a question first.' };
  var STOP = ' a an the is are was were be been do does did i me my we our you your he she it they them their this that these those what which who whom how why when where can could should would will shall may might must of to in on at for from by with about as into than then so if or and but not no any some there here have has had get gets got its just also only very more most much many off plan offplan dubai uae property properties unit units client clients buyer buyers ';
  var SYN = { sqm: 'metre meter m2', sqft: 'foot feet', dld: 'dubai land department', fee: 'fees cost costs charge charges', fees: 'fee cost costs charge charges', cost: 'fees fee charges', sell: 'resale resell assignment flip', resell: 'resale sell assignment flip', flip: 'resale sell assignment',
    resale: 'sell resell assignment flip', loan: 'mortgage finance bank', mortgage: 'loan finance bank', finance: 'mortgage loan', visa: 'golden residency', residency: 'visa golden', late: 'missed default delay',
    missed: 'default late', default: 'missed late', cancel: 'cancellation refund', refund: 'cancel cancellation', airbnb: 'holiday short rent', rent: 'rental tenant ejari', rental: 'rent tenant', tax: 'vat taxes',
    commission: 'brokerage', safe: 'risky risk escrow', risk: 'risky safe escrow', escrow: 'safe protection', delay: 'delayed late', foreigner: 'foreigners expat non resident', instalments: 'installments payments missed',
    installments: 'instalments payments', payment: 'payments plan instalments', defects: 'snagging warranty defect', snagging: 'defects snag' };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function md(t) {   // tiny markdown, escaped first: **bold**, bullets, numbered lists, paragraphs
    var out = [], list = null, ord = false;
    function flush() { if (list) { out.push(ord ? '<ol>' + list.join('') + '</ol>' : '<ul>' + list.join('') + '</ul>'); list = null; } }
    esc(t).split(/\n/).forEach(function (l) {
      l = l.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^#{1,4}\s*(.+)$/, '<b>$1</b>');
      var m = l.match(/^\s*([-*•]|\d+[.)])\s+(.*)$/);
      if (m) { var o = /\d/.test(m[1]); if (list && o !== ord) flush(); if (!list) { list = []; ord = o; } list.push('<li>' + m[2] + '</li>'); return; }
      flush(); if (l.trim()) out.push('<p>' + l + '</p>');
    });
    flush(); return out.join('');
  }
  function nums(s) {   // "1.5m", "1.5 million", "750k", "1,500,000" -> one token "n1500000" so amounts match exactly
    return s.replace(/(\d+(?:\.\d+)?)\s*(million|mn|m)\b/g, function (x, n) { return ' n' + Math.round(parseFloat(n) * 1e6) + ' '; })
      .replace(/(\d+(?:\.\d+)?)\s*k\b/g, function (x, n) { return ' n' + Math.round(parseFloat(n) * 1e3) + ' '; })
      .replace(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{3,}(?:\.\d+)?/g, function (x) { return ' n' + Math.round(parseFloat(x.replace(/,/g, ''))) + ' '; });
  }
  function toks(s) { return nums(String(s).toLowerCase()).replace(/\bform\s+([a-z])\b/g, 'form$1').replace(/[^a-z0-9%]+/g, ' ').split(' ').filter(function (w) { return (w.length > 1 || /^\d$/.test(w)) && STOP.indexOf(' ' + w + ' ') < 0; }); }
  function stem(w) { return /^n\d+$/.test(w) || w.length <= 4 ? w : w.replace(/(ings|ing|ies|es|s|ed)$/, ''); }
  function index(items) { items.forEach(function (it) { var b = {}, qq = {}; toks(it.q).forEach(function (w) { qq[stem(w)] = 1; }); it._q = qq; it._qn = Object.keys(qq).length || 1; toks(it.q + ' ' + it.kw).forEach(function (w) { b[stem(w)] = 2; }); toks(it.a).forEach(function (w) { w = stem(w); if (!b[w]) b[w] = 0.35; }); it._b = b; }); }
  function search(items, s) {
    var qt = toks(s); if (!qt.length) qt = String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(function (w) { return w.length > 2 && ['what','how','the','does','can'].indexOf(w) < 0; }); if (!qt.length) return []; var hasNum = qt.some(function (w) { return /^n?\d+$/.test(w); });
    return items.map(function (it) {
      var hit = 0, strong = 0, inq = 0;
      qt.forEach(function (w) { var alts = [w].concat((SYN[w] || '').split(' ').filter(Boolean)), best = 0, q1 = 0;
        alts.forEach(function (x) { var v = it._b[stem(x)] || 0; if (v > best) best = v; if (it._q[stem(x)]) q1 = 1; }); hit += best; inq += q1; if (best >= 2) strong++; });
      var sc = hit / (2 * qt.length) + 0.15 * inq / it._qn + 0.05 * inq / qt.length;
      if (!hasNum && it.cat === 'Worked examples') sc *= 0.75;   // a general question should get the general answer, not a numeric example
      return { it: it, sc: sc, cov: strong / qt.length };
    }).filter(function (r) { return r.sc > 0.15; }).sort(function (a, b) { return b.sc - a.sc; });
  }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (x) { return null; } }
  function srcs(it) { return it.src && it.src.length ? '<div class="refs">Source: ' + it.src.slice(0, 2).map(function (u) { var h = u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]; return '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(h) + '</a>'; }).join(' · ') + ' · updated ' + esc(it.upd || '') + '</div>' : ''; }
  window.DPAsk = { mount: function (el, api, token, base) {
    if (!document.getElementById('dpask-css')) { var st = document.createElement('style'); st.id = 'dpask-css'; st.textContent = CSS; document.head.appendChild(st); }
    var KEY = 'sam-agent-ask', PK = 'sam-agent-askq-' + String(token || '').slice(0, 6), H = (store(KEY) || []).filter(function (m) { return m && (m.r === 'user' || m.r === 'assistant') && typeof m.c === 'string' && m.c && m.c !== 'undefined'; }), P = store(PK) || [], LIB = [], CAT = null;
    el.className = 'dpask';
    el.innerHTML = '<h2>🤖 Ask <span>AI Expert Broker</span></h2><p class="m">Any technical question on Dubai off-plan: DLD and RERA rules, fees, Oqood, escrow, payment plans, resale before handover, mortgages, golden visa, handover, objections. Library answers are instant; new questions get a verified answer within a week.</p>' +
      '<form><input id="dpq" maxlength="600" placeholder="Ask an off-plan question…" autocomplete="off" enterkeyhint="send"><button class="go" type="submit">Ask</button></form><div class="sug" hidden></div>' +
      '<div class="okb"></div><div class="ch"></div><div class="log" aria-live="polite"></div><div class="lib" hidden></div>' +
      '<div class="dpft"><span>General guidance, not legal or financial advice. Confirm fees and rules on dubailand.gov.ae.</span><span><a class="bl">📚 Browse the Q&amp;A library</a><span class="lf"></span></span></div>';
    var f = el.querySelector('form'), q = el.querySelector('input'), b = el.querySelector('.go'), log = el.querySelector('.log'), ch = el.querySelector('.ch'), lf = el.querySelector('.lf'),
      sug = el.querySelector('.sug'), lib = el.querySelector('.lib'), bl = el.querySelector('.bl'), okb = el.querySelector('.okb');
    CHIPS.forEach(function (c) { var x = document.createElement('button'); x.type = 'button'; x.textContent = c; x.onclick = function () { q.value = c; ask(); }; ch.appendChild(x); });
    function bubble(cls, html) { var d = document.createElement('div'); d.className = cls; d.innerHTML = html; log.appendChild(d); return d; }
    function libHtml(it) { return '<span class="src">📚 DealPro library</span><p><b>' + esc(it.q) + '</b></p>' + md(it.a) + srcs(it); }
    function clearLink() { lf.innerHTML = H.length ? ' · <a>Clear chat</a>' : ''; var a = lf.querySelector('a'); if (a) a.onclick = function () { H = []; store(KEY, H); draw(); }; }
    function draw() { log.innerHTML = ''; H.slice(-10).forEach(function (m) {
        if (m.r === 'user') bubble('q', esc(m.c));
        else { var d = bubble('a', (m.lib ? '<span class="src">📚 DealPro library</span>' : '<span class="src ai">🤖 AI quick answer</span>') + md(m.c)); if (m.qid) d.insertAdjacentHTML('beforeend', '<div class="pend">⏳ Logged for the library. A verified answer arrives here within 7 days.</div>'); } });
      ch.hidden = H.length > 0; clearLink(); }
    function remember(user, ans) { H.push({ r: 'user', c: user }, ans); H = H.slice(-20); store(KEY, H); clearLink(); }
    function post(p, cb) { fetch(api, { method: 'POST', body: new URLSearchParams(p) }).then(function (r) { return r.json(); }).then(function (d) { cb && cb(d); }).catch(function () { cb && cb(null); }); }
    function libBtn(box, it) { var x = document.createElement('button'); x.type = 'button'; x.textContent = '📚 ' + it.q; x.onclick = function () { bubble('q', esc(it.q)); showLib(it, it.q); }; box.appendChild(x); }
    function answered() {   // this agent's pending questions that now have a verified library answer
      if (!P.length || !LIB.length) return; okb.innerHTML = '';
      P.forEach(function (p) { var it = LIB.filter(function (x) { return (x.qids || []).indexOf(p.qid) >= 0; })[0]; if (!it || p.seen) return;
        var d = document.createElement('div'); d.className = 'ok'; d.innerHTML = '<b class="t">✅ Your question has been answered</b><i>"' + esc(p.q) + '"</i><div class="a" style="margin-top:8px;padding:12px">' + libHtml(it) + '</div><button type="button">Got it</button>';
        d.querySelector('button').onclick = function () { p.seen = 1; store(PK, P); d.remove(); }; okb.appendChild(d); });
    }
    function showLib(it, t) {
      var d = bubble('a', libHtml(it) + '<div class="more"><button type="button" class="ai">Not quite my question → ask AI</button></div>'), m = d.querySelector('.more');
      search(LIB, t).filter(function (r) { return r.it !== it && r.sc > 0.3; }).slice(0, 2).forEach(function (r) { libBtn(m, r.it); });
      d.querySelector('.ai').onclick = function () { this.disabled = true; toAI(t, true); };
      remember(t, { r: 'assistant', c: '**' + it.q + '**\n\n' + it.a, lib: it.id });
      d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function toAI(t, again) {
      var hist = H.slice(-6).map(function (m) { return { r: m.r, c: m.c }; }), top = search(LIB, t).slice(0, 3);
      if (again) bubble('q', esc(t));
      b.disabled = true; var w = bubble('a', '<span class="dots">Thinking</span>'); w.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      post({ a: 'agent_ask', t: token, q: t, h: JSON.stringify(hist), ctx: top.map(function (r) { return 'Q: ' + r.it.q + '\nA: ' + r.it.a; }).join('\n\n') }, function (d) {
        b.disabled = false;
        if (!d || !d.ok) { w.className = 'a err'; w.textContent = d ? (ERR[d.err] || 'Something went wrong. Please try again.') : 'No connection. Please try again.'; if (!again) q.value = t; return; }
        var pend = '<div class="pend">⏳ <b>Logged for the library.</b> A verified answer arrives here within 7 days' + (typeof d.left === 'number' ? ' · ' + d.left + ' new question' + (d.left === 1 ? '' : 's') + ' left today' : '') + '.</div>';
        if (d.qid) { P.push({ qid: d.qid, q: t, at: Date.now() }); P = P.slice(-50); store(PK, P); }
        if (typeof d.a === 'string' && d.a.trim() && d.a !== 'undefined') { w.innerHTML = '<span class="src ai">🤖 AI quick answer</span>' + md(d.a) + pend; remember(t, { r: 'assistant', c: d.a, qid: d.qid }); }
        else { w.innerHTML = '<p><b>This one isn\'t in the library yet.</b></p>' + (top.length ? '<p>Closest answers we have:</p><div class="more"></div>' : '') + pend;
          top.forEach(function (r) { libBtn(w.querySelector('.more'), r.it); }); }
      });
    }
    function ask() {
      var t = q.value.trim(); if (t.length < 3 || b.disabled) return;
      if (!LIB.length) { b.disabled = true; loadLib().then(function () { b.disabled = false; answerNow(t); }); return; }   // library still loading: wait, then answer
      answerNow(t);
    }
    function answerNow(t) {
      if (!t) return;
      q.value = ''; sug.hidden = true; ch.hidden = true; bubble('q', esc(t));
      var r = search(LIB, t)[0];
      if (r && r.sc >= 0.55 && r.cov >= 0.5) { showLib(r.it, t); post({ a: 'agent_ask', t: token, q: t, lib: r.it.id }); return; }
      toAI(t, false);
    }
    q.addEventListener('input', function () { var v = q.value.trim(); if (v.length < 3 || !LIB.length) { sug.hidden = true; return; }
      var rs = search(LIB, v).slice(0, 4); sug.innerHTML = rs.map(function (r, i) { return '<button type="button" data-i="' + i + '">📚 ' + esc(r.it.q) + '</button>'; }).join(''); sug.hidden = !rs.length;
      Array.prototype.forEach.call(sug.querySelectorAll('button'), function (x) { x.onclick = function () { var it = rs[+x.dataset.i].it; q.value = ''; sug.hidden = true; ch.hidden = true; bubble('q', esc(it.q)); showLib(it, it.q); post({ a: 'agent_ask', t: token, q: it.q, lib: it.id }); }; }); });
    function browse() {
      var cats = []; LIB.forEach(function (it) { if (cats.indexOf(it.cat) < 0) cats.push(it.cat); });
      cats.sort(function (a, b) { return (a === 'Worked examples') - (b === 'Worked examples'); }); if (CAT === null) CAT = cats[0];
      lib.innerHTML = '<div class="cats"><button type="button" data-c=""' + (CAT ? '' : ' class="on"') + '>All (' + LIB.length + ')</button>' + cats.map(function (c) { return '<button type="button" data-c="' + esc(c) + '"' + (CAT === c ? ' class="on"' : '') + '>' + esc(c) + ' (' + LIB.filter(function (it) { return it.cat === c; }).length + ')</button>'; }).join('') + '</div>' +
        LIB.filter(function (it) { return !CAT || it.cat === CAT; }).map(function (it) { return '<details><summary>' + esc(it.q) + '</summary><div class="a">' + md(it.a) + srcs(it) + '</div></details>'; }).join('');
      Array.prototype.forEach.call(lib.querySelectorAll('.cats button'), function (x) { x.onclick = function () { CAT = x.dataset.c; browse(); }; });
    }
    bl.onclick = function () { lib.hidden = !lib.hidden; if (!lib.hidden) { browse(); lib.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } bl.textContent = lib.hidden ? '📚 Browse the Q&A library (' + LIB.length + ')' : '✕ Close the library'; };
    f.addEventListener('submit', function (ev) { ev.preventDefault(); ask(); });
    draw();
    // The library (~55 KB zipped) loads only when the Ask box comes near the screen, gets focus, or the agent has questions waiting, so the dashboard opens fast.
    var LP = null;
    function loadLib() { if (!LP) LP = fetch((base || '/checklist/data/') + 'faq.json?v=' + Math.floor(Date.now() / 36e5)).then(function (r) { return r.json(); }).then(function (d) {
      LIB = (d && d.items) || []; index(LIB); bl.textContent = '📚 Browse the Q&A library (' + LIB.length + ')'; answered(); }).catch(function () { LP = null; }); return LP || Promise.resolve(); }
    q.addEventListener('focus', loadLib, { once: true });
    if (P.some(function (p) { return !p.seen; }) || !('IntersectionObserver' in window)) loadLib();
    else { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); loadLib(); } }, { rootMargin: '600px' }); io.observe(el); }
  } };
})();
