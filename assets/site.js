/* Buyer site kit for samsuryarealty.com (Sam Surya, 25 Nov 2026). Loaded by /assets/permit.js on every buyer page, so
   new topic pages get it automatically. It adds:
   1. an "Explore" bar at the top of the page with Sam's other pages (add new pages to PAGES below);
   2. a big "Do me a favour: share" card in the middle of the page, with follow / call / WhatsApp buttons;
   3. a "Call me back" form (#callback): name, WhatsApp, email, interest, when they'll be ready, callback date + time;
   4. a one-time "before you go" box (exit intent / after a while) asking for WhatsApp or email.
   Form entries go to the Apps Script web app (action "callback", tab "Callbacks") and Sam gets an email.
   If that fails, the visitor is offered WhatsApp with the details filled in. */
(function () {
  if (window.__ssKit) return; window.__ssKit = 1;
  var P = location.pathname;
  if (/^\/legal\//.test(P) || /\/ad\.html$/.test(P) || /^\/agent\//.test(P)) return;
  if (/[?&](agent|pm)=1/.test(location.search)) return;          // agent-branded reports: not Sam's own visitors
  var API = 'https://script.google.com/macros/s/AKfycbzL_iF14unTfwziL1wRoB7uFWhXynmWX99ffPtOLHN6qG9yRkqJ-NZNSq9sX7feOTvH/exec';
  var WA = '971528728248', TEL = '+971528728248', IG = 'https://www.instagram.com/samtherealrealtor/';
  // Sam's pages, in menu order. New topic pages: add a line here.
  var PAGES = [
    ['/', '🏠 Home'],
    ['/checklist/', '🎯 Off-Plan Stress Test'],
    ['/picks/', '🏆 Projects that passed'],
    ['/golden-visa/', '🇦🇪 Golden Visa finder'],
    ['/off-plan-mortgage/', '🏦 Mortgage calculator'],
    ['/build-your-deposit/', '💰 Build your deposit'],
    ['/data/', '📊 Data Room'],
    ['#callback', '📞 Call me back']
  ];
  var url = location.origin + P, LS = 'ss-cb';
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function wa(text) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text); }

  var css = [
    '#ssnav{background:#0B1F3A;border-bottom:2px solid #d4af37;position:relative;z-index:30;font-family:Montserrat,system-ui,-apple-system,sans-serif}',
    '#ssnav .in{max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:8px;overflow-x:auto;padding:8px 12px;scrollbar-width:none}#ssnav .in::-webkit-scrollbar{display:none}',
    '#ssnav b{color:#d4af37;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;white-space:nowrap}',
    '#ssnav a{flex:none;white-space:nowrap;color:#fff;text-decoration:none;font-size:13px;font-weight:700;border:1px solid rgba(255,255,255,.22);border-radius:20px;padding:6px 11px;background:rgba(255,255,255,.06)}',
    '#ssnav a.on{background:#ffd23f;color:#0B1F3A;border-color:#ffd23f}#ssnav a.cb{background:#25D366;border-color:#25D366}',
    '.sskit{font-family:Montserrat,system-ui,-apple-system,sans-serif;max-width:640px;margin:24px auto;padding:0 14px;text-align:left}',
    '.sskit .card{border-radius:22px;padding:20px 18px 16px;box-shadow:0 8px 26px rgba(11,31,58,.14)}',
    '#ssshare .card{background:linear-gradient(160deg,#0B1F3A,#163A68);color:#D5DDEA;border:2px solid #d4af37}',
    '.sskit h3{color:#fff;font-size:21px;line-height:1.25;font-weight:800;margin:0}.sskit h3 em{font-style:normal;color:#ffd23f}',
    '.sskit p{font-size:15px;line-height:1.55;margin:8px 0 0}',
    '.sskit .r,#ssbye .r{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}',
    '.sskit .b,#ssbye .b{flex:1 1 120px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:28px;padding:13px 14px;font:inherit;font-weight:800;font-size:15px;cursor:pointer;text-decoration:none;text-align:center}',
    '.sskit .b.big,#ssbye .b.big{flex-basis:100%;font-size:17px;padding:15px}',
    '.sskit .y,#ssbye .y{background:linear-gradient(135deg,#ffd23f,#d4af37);color:#0B1F3A}.sskit .g{background:#25D366;color:#fff}.sskit .o{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.28)}',
    '.sskit .ig{background:linear-gradient(135deg,#f58529,#dd2a7b 55%,#8134af);color:#fff}.sskit .n{background:#1e5bd8;color:#fff}',
    '.sskit .sep{height:1px;background:rgba(255,255,255,.15);margin:16px 0 4px}',
    '.sskit small{display:block;margin-top:10px;font-size:12.5px;color:#AFC0D8}',
    '#callback .card{background:#fff;border:2px solid #EBD58A;color:#14161B}',
    '#callback h3{color:#0B1F3A}#callback p{color:#3A3F4A}',
    '.ssf label{display:block;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:800;color:#5B6678;margin:12px 0 6px}',
    '.ssf input,.ssf textarea{width:100%;box-sizing:border-box;font:inherit;font-size:16px;font-weight:600;border:2px solid #0B1F3A;border-radius:14px;padding:11px 13px;outline:none;background:#fff;color:#14161B}',
    '.ssf input:focus,.ssf textarea:focus{border-color:#1e5bd8;box-shadow:0 0 0 4px rgba(30,91,216,.14)}',
    '.ssf .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.ssf .sschips{display:flex;flex-wrap:wrap;gap:6px}',
    '.ssf .sschips button{border:2px solid #E6E1D6;background:#fff;color:#0B1F3A;font:inherit;font-weight:700;font-size:14px;border-radius:22px;padding:8px 12px;cursor:pointer}',
    '.ssf .sschips button.on{background:#0B1F3A;border-color:#0B1F3A;color:#ffd23f}',
    '.ssf .ok{font-size:13px;color:#5B6678;display:block;padding-left:26px;position:relative;margin-top:12px;text-transform:none;letter-spacing:0;font-weight:600}',
    '.ssf .ok input{width:auto;position:absolute;left:0;top:1px}',
    '.ssf .hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}',
    '.ssf .msg{margin-top:12px;border-radius:12px;padding:11px 13px;font-size:14.5px;font-weight:700}',
    '.ssf .msg.e{background:#FDECEC;color:#8A1C1C}.ssf .msg.s{background:#E8F8EE;color:#14532D}',
    '#ssbye{position:fixed;inset:0;z-index:9999;background:rgba(6,14,28,.62);display:flex;align-items:flex-end;justify-content:center;font-family:Montserrat,system-ui,-apple-system,sans-serif}',
    '#ssbye .bx{background:#fff;width:100%;max-width:460px;border-radius:24px 24px 0 0;padding:20px 18px 18px;position:relative;box-shadow:0 -10px 40px rgba(0,0,0,.3);max-height:92vh;overflow:auto}',
    '@media(min-width:600px){#ssbye{align-items:center}#ssbye .bx{border-radius:24px}}',
    '#ssbye h3{color:#0B1F3A;font-size:21px;line-height:1.25;margin:0;padding-right:28px}#ssbye h3 em{font-style:normal;color:#1e5bd8}',
    '#ssbye p{font-size:14.5px;color:#3A3F4A;margin:8px 0 0;line-height:1.5}',
    '#ssbye .x{position:absolute;right:12px;top:10px;border:0;background:#F2F0EA;color:#0B1F3A;width:34px;height:34px;border-radius:50%;font-size:18px;font-weight:800;cursor:pointer}',
    '#ssbye .alt{display:block;text-align:center;margin-top:10px;font-size:13.5px;color:#1e5bd8;font-weight:700}'
  ].join('');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* 1. Explore bar. New topic pages that the daily posting adds to sitemap.xml show up here automatically. */
  var SKIP = /^\/(legal|dpa-legal|pricing|projects|agent|go|assets|checklist\/.)/;
  function more() {
    fetch('/sitemap.xml').then(function (r) { return r.text(); }).then(function (x) {
      var have = PAGES.map(function (p) { return p[0]; }), add = [];
      (x.match(/<loc>[^<]+<\/loc>/g) || []).forEach(function (l) {
        var u; try { u = new URL(l.replace(/<\/?loc>/g, '')).pathname; } catch (e) { return; }
        if (!/^\/[a-z0-9-]+\/$/.test(u) || SKIP.test(u) || have.indexOf(u) >= 0) return;
        var name = u.replace(/\//g, '').replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }).replace(/\bOff Plan\b/, 'Off-Plan');
        add.push([u, '📘 ' + name]); have.push(u);
      });
      if (!add.length) return;
      PAGES.splice(PAGES.length - 1, 0, add[0]); for (var i = 1; i < add.length; i++) PAGES.splice(PAGES.length - 1, 0, add[i]);
      var n = document.getElementById('ssnav'); if (n) { n.remove(); nav(); }
    }).catch(function () {});
  }
  function nav() {
    if (document.getElementById('ssnav')) return;
    var n = document.createElement('nav'); n.id = 'ssnav'; n.setAttribute('aria-label', "Sam Surya's pages");
    n.innerHTML = '<div class="in"><b>Explore</b>' + PAGES.map(function (p) {
      var on = p[0] === P || (p[0] !== '/' && P.indexOf(p[0]) === 0);
      return '<a href="' + p[0] + '"' + (on ? ' class="on" aria-current="page"' : p[0] === '#callback' ? ' class="cb"' : '') + '>' + p[1] + '</a>';
    }).join('') + '</div>';
    document.body.insertBefore(n, document.body.firstChild);
  }

  /* 2. Share card (middle of the page) */
  function share() {
    var d = document.createElement('div'); d.id = 'ssshare'; d.className = 'sskit';
    var msg = 'Found this free Dubai off-plan guide, worth a look: ';
    d.innerHTML = '<div class="card"><h3>🙏 Liking this? <em>Do me a small favour.</em></h3>' +
      '<p>Share this page, or the reel that brought you here, with <b style="color:#fff">one friend</b> who is buying or investing in Dubai, or put it in your story. They benefit too, and it helps me keep bringing you free guides, tools and data like this.</p>' +
      '<div class="r"><button type="button" class="b y big" data-sh>📲 Share with a friend</button>' +
      '<a class="b g" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(msg + url) + '">💬 WhatsApp it</a>' +
      '<button type="button" class="b o" data-cp>🔗 Copy link</button></div>' +
      '<div class="r"><a class="b ig" href="' + IG + '" target="_blank" rel="noopener">📸 Follow @SamtheRealRealtor</a></div>' +
      '<div class="sep"></div>' +
      '<p style="color:#fff;font-weight:700">Buying off-plan, investing or reselling in Dubai? Talk to me directly:</p>' +
      '<div class="r"><a class="b g" target="_blank" rel="noopener" href="' + wa('Hi Sam, I found your website (' + document.title + ') and want to talk about property in Dubai') + '">💬 WhatsApp Sam</a>' +
      '<a class="b n" href="tel:' + TEL + '">📞 Call Sam</a>' +
      '<a class="b o" href="#callback">🗓 Call me back later</a></div>' +
      '<small>Sam Surya · Dubai broker BRN 58987 · +971 52 872 8248</small></div>';
    d.querySelector('[data-sh]').onclick = function () {
      if (navigator.share) navigator.share({ title: document.title, text: msg, url: url }).catch(function () {});
      else window.open('https://wa.me/?text=' + encodeURIComponent(msg + url), '_blank');
    };
    var cp = d.querySelector('[data-cp]');
    cp.onclick = function () {
      var done = function () { cp.textContent = '✅ Copied'; setTimeout(function () { cp.textContent = '🔗 Copy link'; }, 2200); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link:', url); }); else prompt('Copy this link:', url);
    };
    // after the first or second content section, so people have seen something they like
    var secs = [].filter.call(document.querySelectorAll('main section, .wrap > section, body > section, .wrap > main > section'), function (s) { return s.offsetHeight > 120 && !s.closest('#ssshare,#callback'); });
    var at = secs[2] || secs[1] || secs[0];
    if (at && at.parentNode) at.parentNode.insertBefore(d, at.nextSibling);
    else place(d);
  }

  /* 3. Call-me-back form */
  function form(id, compact) {
    var today = new Date(); var iso = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
    var t2 = new Date(today.getTime() + 864e5);
    var h = '<form class="ssf" novalidate>' +
      '<input class="hp" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="two"><div><label>Your name</label><input name="name" autocomplete="name" required></div>' +
      '<div><label>WhatsApp / phone</label><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+971 5x xxx xxxx"></div></div>' +
      '<label>Email <span style="text-transform:none;letter-spacing:0">(optional if you gave WhatsApp)</span></label><input name="email" type="email" autocomplete="email" placeholder="you@email.com">' +
      '<label>When will you be ready to buy?</label><div class="sschips" data-k="ready">' + ['Now', 'Within 1 month', 'In 3 months', 'In 6 months or more', 'Just exploring'].map(function (v, i) { return '<button type="button">' + v + '</button>'; }).join('') + '</div>';
    if (!compact) h +=
      '<label>I\'m interested in</label><div class="sschips" data-k="interest" data-multi="1">' + ['Off-plan to live in', 'Off-plan investment', 'Reselling my property', 'Golden Visa', 'Mortgage', 'Other'].map(function (v) { return '<button type="button">' + v + '</button>'; }).join('') + '</div>' +
      '<div class="two"><div><label>Call me on</label><input name="date" type="date" min="' + iso(today) + '" value="' + iso(t2) + '"></div>' +
      '<div><label>Best time (Dubai)</label><div class="sschips" data-k="time" style="gap:5px"><button type="button">10-12</button><button type="button">12-4</button><button type="button">4-8 pm</button></div></div></div>' +
      '<label>Anything else? <span style="text-transform:none;letter-spacing:0">(optional)</span></label><textarea name="msg" rows="2" maxlength="800" placeholder="Budget, area, project, questions..."></textarea>';
    h += '<label class="ok"><input type="checkbox" name="ok" checked> I agree that Sam Surya\'s team may contact me by WhatsApp, phone or email about Dubai property. <a href="/legal/privacy/" target="_blank">Privacy</a></label>' +
      '<div class="r"><button class="b y big" type="submit">' + (compact ? '✅ Keep me posted' : '📞 Request my callback') + '</button></div><div class="msg" hidden></div></form>';
    var w = document.createElement('div'); w.innerHTML = h; var f = w.firstChild; f.id = id;
    [].forEach.call(f.querySelectorAll('.sschips'), function (g) {
      var bs = g.querySelectorAll('button');
      [].forEach.call(bs, function (b) { b.onclick = function () { if (!g.getAttribute('data-multi')) [].forEach.call(bs, function (x) { x.classList.remove('on'); }); b.classList.toggle('on'); }; });
    });
    f.onsubmit = function (e) { e.preventDefault(); send(f, compact ? 'popup' : 'form'); };
    return f;
  }
  function pick(f, k) { var g = f.querySelector('.sschips[data-k="' + k + '"]'); return g ? [].map.call(g.querySelectorAll('button.on'), function (b) { return b.textContent; }).join(', ') : ''; }
  function send(f, src) {
    var m = f.querySelector('.msg'), btn = f.querySelector('button[type=submit]');
    function say(t, ok) { m.hidden = false; m.className = 'msg ' + (ok ? 's' : 'e'); m.innerHTML = t; }
    var d = { a: 'callback', name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), ready: pick(f, 'ready'), interest: pick(f, 'interest'),
      date: f.date ? f.date.value : '', time: pick(f, 'time'), msg: f.msg ? f.msg.value.trim() : '', page: url, title: document.title, src: src, hp: f.hp.value };
    var digits = d.phone.replace(/[^0-9]/g, '');
    if (d.name.length < 2) return say('Please add your name.');
    if (digits.length < 8 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return say('Please add your WhatsApp number or email so we can reach you.');
    if (!f.ok.checked) return say('Please tick the box so we may contact you.');
    btn.disabled = true; btn.textContent = 'Sending...';
    var summary = 'Hi Sam, please call me back.\nName: ' + d.name + (d.phone ? '\nWhatsApp: ' + d.phone : '') + (d.email ? '\nEmail: ' + d.email : '') +
      (d.ready ? '\nReady to buy: ' + d.ready : '') + (d.interest ? '\nInterested in: ' + d.interest : '') + (d.date ? '\nCall me on: ' + d.date + (d.time ? ', ' + d.time : '') : '') + (d.msg ? '\n' + d.msg : '');
    var fallback = function () {
      btn.disabled = false; btn.textContent = '💬 Send on WhatsApp instead';
      say('We couldn\'t send the form just now. <a href="' + wa(summary) + '" target="_blank" rel="noopener">Tap here to send it to Sam on WhatsApp</a>, it\'s all filled in.');
      btn.onclick = function (e) { e.preventDefault(); window.open(wa(summary), '_blank'); };
    };
    fetch(API, { method: 'POST', body: new URLSearchParams(d) }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok || !/^CB/.test(j.ref || '')) return fallback();   // only the callback action answers with a CB ref
      ls(LS, { t: Date.now(), ref: j.ref || '' });
      f.innerHTML = '<div class="msg s">✅ Thank you, ' + esc(d.name.split(' ')[0]) + '! ' + (src === 'popup' ? 'You\'re on my list: I\'ll send you new launches and guides.' : 'Sam\'s team will contact you' + (d.date ? ' on ' + esc(d.date) + (d.time ? ' (' + esc(d.time) + ' Dubai)' : '') : '') + '.') +
        (j.ref ? ' Ref ' + esc(j.ref) + '.' : '') + ' Need something sooner? <a href="' + wa('Hi Sam, I just sent the callback form (' + (j.ref || '') + ')') + '" target="_blank" rel="noopener">WhatsApp Sam now</a>.</div>';
      if (src === 'popup') setTimeout(close, 3500);
    }).catch(fallback);
  }
  function callback() {
    if (document.getElementById('callback')) return;
    var d = document.createElement('div'); d.id = 'callback'; d.className = 'sskit';
    var done = ls(LS);
    d.innerHTML = '<div class="card"><h3>📞 Not ready yet? <em style="color:#1e5bd8">I\'ll call you when you are.</em></h3>' +
      '<p>Maybe you\'ll buy in 3 months, maybe in a year. Leave your details and pick a day and time: Sam or his team will call you back, with no pressure. ' + (done ? '<b>You already sent a request, thank you!</b> Send another if anything changed.' : '') + '</p></div>';
    d.firstChild.appendChild(form('ssfcb', false));
    place(d);
  }
  function place(el) {
    var host = document.getElementById('mpb') || document.getElementById('permit') || document.querySelector('footer') || document.querySelector('.foot');
    if (host && host.parentNode) host.parentNode.insertBefore(el, host); else (document.querySelector('.wrap') || document.body).appendChild(el);
  }

  /* 4. "Before you go" box: once every 5 days, never after they've left details */
  var shown = false;
  function close() { var b = document.getElementById('ssbye'); if (b) b.remove(); }
  function bye() {
    if (shown || ls(LS) || document.getElementById('ssbye')) return;
    var last = ls('ss-bye') || 0; if (Date.now() - last < 5 * 864e5) return;
    if (/^\/checklist\//.test(P)) return;                          // the Stress Test already asks for WhatsApp
    var a = document.activeElement; if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;   // don't interrupt typing
    shown = true; ls('ss-bye', Date.now());
    var o = document.createElement('div'); o.id = 'ssbye'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.innerHTML = '<div class="bx"><button class="x" type="button" aria-label="Close">×</button>' +
      '<h3>Before you go 👋 <em>want me to keep you posted?</em></h3>' +
      '<p>Leave your WhatsApp or email: I\'ll send you new Dubai off-plan launches, price data and guides like this one, and call you when you\'re ready. Free, and you can say STOP any time.</p></div>';
    o.firstChild.appendChild(form('ssfpop', true));
    var alt = document.createElement('a'); alt.className = 'alt'; alt.href = wa('Hi Sam, I was on your website (' + document.title + ') and have a question'); alt.target = '_blank'; alt.rel = 'noopener'; alt.textContent = '💬 Or just WhatsApp Sam now';
    o.firstChild.appendChild(alt);
    o.onclick = function (e) { if (e.target === o) close(); };
    o.querySelector('.x').onclick = close;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    document.body.appendChild(o);
  }
  function arm() {
    document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY < 8) bye(); });   // desktop: mouse leaves towards the tabs / close
    setTimeout(bye, 50000);                                                                                 // phones: after ~50 s on the page
    var lastY = window.scrollY, fast = 0;
    window.addEventListener('scroll', function () {                                                         // phones: scrolled most of the page, or flicks back up to leave
      var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
      if (h > 400 && y / h > 0.75) setTimeout(bye, 1500);
      if (lastY - y > 260 && y < lastY && y > 300) { fast++; if (fast > 1) bye(); }
      lastY = y;
    }, { passive: true });
  }

  function go() {
    if (document.body.classList.contains('agm')) return;
    nav(); share(); callback(); arm();
    if (location.hash === '#callback') setTimeout(function () { var c = document.getElementById('callback'); if (c) c.scrollIntoView(); }, 50);
  }
  function later() { nav(); more(); setTimeout(go, 500); }   // menu right away (no jump); the rest once the page has settled
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();
})();
