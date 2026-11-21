/* DealPro Agent: "Ask DealPro AI" box. Agents type a technical Dubai off-plan question, the Apps Script
   (action agent_ask) answers through the OpenAI API with the key kept in Script Properties, never here. */
(function () {
  var CSS = '.dpask{margin-top:18px;background:linear-gradient(160deg,#081830,#0F2748);color:#fff;border-radius:24px;padding:22px;box-shadow:0 20px 50px rgba(8,24,48,.18)}' +
    '.dpask h2{margin:0 0 4px;font-size:20px;color:#fff}.dpask h2 span{color:#E8CF8E}.dpask p.m{margin:0 0 14px;color:#B9C4D6;font-size:14px;line-height:1.5}' +
    '.dpask form{display:flex;gap:8px;background:#fff;border-radius:16px;padding:6px;border:2px solid #C9A24A}' +
    '.dpask input{flex:1;min-width:0;border:0;outline:0;font:inherit;font-size:16px;padding:10px 10px;color:#1B2433;background:transparent}' +
    '.dpask button.go{border:0;border-radius:12px;padding:0 16px;font:inherit;font-weight:900;color:#081830;background:linear-gradient(135deg,#C9A24A,#F6E7BE 55%,#C9A24A);cursor:pointer;white-space:nowrap}' +
    '.dpask button.go:disabled{opacity:.6;cursor:wait}' +
    '.dpask .ch[hidden]{display:none}.dpask .ch{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.dpask .ch button{border:1px solid rgba(232,207,142,.45);background:rgba(255,255,255,.06);color:#F6E7BE;border-radius:30px;padding:7px 12px;font:inherit;font-size:13px;cursor:pointer}' +
    '.dpask .log{margin-top:14px;display:flex;flex-direction:column;gap:10px}.dpask .q{align-self:flex-end;max-width:88%;background:#C9A24A;color:#081830;font-weight:700;border-radius:16px 16px 4px 16px;padding:10px 14px;font-size:15px}' +
    '.dpask .a{background:#fff;color:#1B2433;border-radius:16px 16px 16px 4px;padding:14px 16px;font-size:15px;line-height:1.55}.dpask .a p{margin:0 0 8px}.dpask .a p:last-child{margin:0}.dpask .a ul{margin:4px 0 8px;padding-left:20px}.dpask .a li{margin:3px 0}' +
    '.dpask .a.err{background:#FDECEA;color:#8A1C14}.dpask .ft{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:12px;font-size:12px;color:#8FA0B8}.dpask .ft a{color:#E8CF8E;cursor:pointer;text-decoration:underline}' +
    '.dpask .dots:after{content:"…";animation:dpd 1s steps(3) infinite}@keyframes dpd{0%{content:"."}33%{content:".."}66%{content:"..."}}';
  var CHIPS = ['How does an off-plan resale (assignment) work before handover?', 'What fees does a buyer pay on an off-plan purchase?', 'How do I check a project\'s escrow account?', 'Can an off-plan buyer get a golden visa?', 'How do I answer "I\'ll wait for prices to drop"?'];
  var ERR = { login: 'Please log in again to ask a question.', plan: 'Ask DealPro AI is part of an active DealPro plan.', setup: 'Ask DealPro AI is being switched on. Please try again a little later.',
    limit: 'You\'ve used today\'s questions. Your limit resets at midnight Dubai time.', empty: 'Type a question first.', ai: 'The AI didn\'t answer this time. Please try again in a minute.' };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function md(t) {   // tiny markdown: **bold**, bullets, numbered lists, paragraphs (escaped first)
    var out = [], list = null;
    esc(t).split(/\n/).forEach(function (l) {
      l = l.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^#{1,4}\s*(.+)$/, '<b>$1</b>');
      var m = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (m) { if (!list) { list = []; } list.push('<li>' + m[1] + '</li>'); return; }
      if (list) { out.push('<ul>' + list.join('') + '</ul>'); list = null; }
      if (l.trim()) out.push('<p>' + l + '</p>');
    });
    if (list) out.push('<ul>' + list.join('') + '</ul>');
    return out.join('');
  }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (x) { return null; } }
  window.DPAsk = { mount: function (el, api, token) {
    if (!document.getElementById('dpask-css')) { var st = document.createElement('style'); st.id = 'dpask-css'; st.textContent = CSS; document.head.appendChild(st); }
    var KEY = 'sam-agent-ask', H = store(KEY) || [];
    el.className = 'dpask';
    el.innerHTML = '<h2>🤖 Ask <span>AI Expert Broker</span></h2><p class="m">Any technical question on Dubai off-plan: DLD and RERA rules, fees, Oqood, escrow, payment plans, resale before handover, mortgages, golden visa, handover, objections. Answers in seconds.</p>' +
      '<form><input id="dpq" maxlength="600" placeholder="Ask an off-plan question…" autocomplete="off" enterkeyhint="send"><button class="go" type="submit">Ask</button></form>' +
      '<div class="ch"></div><div class="log" aria-live="polite"></div>' +
      '<div class="ft"><span>AI answers are general guidance, not legal or financial advice. Confirm fees and rules on dubailand.gov.ae.</span><span class="lf"></span></div>';
    var f = el.querySelector('form'), q = el.querySelector('input'), b = el.querySelector('.go'), log = el.querySelector('.log'), ch = el.querySelector('.ch'), lf = el.querySelector('.lf');
    CHIPS.forEach(function (c) { var x = document.createElement('button'); x.type = 'button'; x.textContent = c; x.onclick = function () { q.value = c; ask(); }; ch.appendChild(x); });
    function bubble(cls, html) { var d = document.createElement('div'); d.className = cls; d.innerHTML = html; log.appendChild(d); return d; }
    function draw() { log.innerHTML = ''; H.slice(-10).forEach(function (m) { bubble(m.r === 'user' ? 'q' : 'a', m.r === 'user' ? esc(m.c) : md(m.c)); });
      ch.hidden = H.length > 0; lf.innerHTML = H.length ? '<a>Clear chat</a>' : ''; var a = lf.querySelector('a'); if (a) a.onclick = function () { H = []; store(KEY, H); draw(); }; }
    function ask() {
      var t = q.value.trim(); if (t.length < 3 || b.disabled) return;
      var hist = H.slice(-6); q.value = ''; b.disabled = true; ch.hidden = true;
      bubble('q', esc(t)); var w = bubble('a', '<span class="dots">Thinking</span>'); w.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      fetch(api, { method: 'POST', body: new URLSearchParams({ a: 'agent_ask', t: token, q: t, h: JSON.stringify(hist) }) }).then(function (r) { return r.json(); }).then(function (d) {
        b.disabled = false;
        if (!d || !d.ok) { w.className = 'a err'; w.textContent = ERR[(d && d.err) || 'ai'] || ERR.ai; q.value = t; return; }
        H.push({ r: 'user', c: t }, { r: 'assistant', c: d.a }); H = H.slice(-20); store(KEY, H);
        w.innerHTML = md(d.a); lf.innerHTML = (typeof d.left === 'number' ? d.left + ' question' + (d.left === 1 ? '' : 's') + ' left today · ' : '') + '<a>Clear chat</a>';
        lf.querySelector('a').onclick = function () { H = []; store(KEY, H); draw(); };
      }).catch(function () { b.disabled = false; w.className = 'a err'; w.textContent = 'No connection. Please try again.'; q.value = t; });
    }
    f.addEventListener('submit', function (ev) { ev.preventDefault(); ask(); });
    draw();
  } };
})();
