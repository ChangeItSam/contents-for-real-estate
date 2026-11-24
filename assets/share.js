/* "Do me a favour: share" card (Sam Surya, 25 Nov 2026). Loaded automatically by /assets/permit.js on every
   samsuryarealty.com page that shows the Media Permit (so new topic pages get it too). Asks visitors to share the
   site / the reel with friends so Sam can keep adding free guides and tools. Placed just above the Media Permit badge. */
(function () {
  if (document.getElementById('shfav')) return;
  if (/^\/legal\//.test(location.pathname) || /\/ad\.html$/.test(location.pathname)) return;
  if (/[?&](agent|pm)=1/.test(location.search)) return;            // agent-branded reports: not Sam's own visitors
  var url = location.origin + location.pathname;
  var title = document.title || 'SamSurya Realty';
  var msg = 'Free Dubai off-plan tools I found: Stress Test, projects that passed 20 checks, Golden Visa finder, mortgage calculator and market data. Have a look: ';
  var css = '#shfav{max-width:560px;margin:22px auto 6px;padding:16px 16px 14px;border-radius:18px;background:linear-gradient(160deg,#0B1F3A,#132E52);color:#D5DDEA;font-family:inherit;text-align:left;box-shadow:0 6px 20px rgba(11,31,58,.12)}' +
    '#shfav b.h{display:block;color:#fff;font-size:18px;line-height:1.3}#shfav b.h em{font-style:normal;color:#ffd23f}' +
    '#shfav p{font-size:14.5px;line-height:1.55;margin:7px 0 0}' +
    '#shfav .r{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}' +
    '#shfav button,#shfav a.b{flex:1 1 96px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:26px;padding:11px 14px;font:inherit;font-weight:800;font-size:14.5px;cursor:pointer;text-decoration:none}' +
    '#shfav .s{background:linear-gradient(135deg,#ffd23f,#d4af37);color:#0B1F3A}#shfav .w{background:#25D366;color:#fff}#shfav .c{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.25)!important}' +
    '#shfav small{display:block;margin-top:10px;font-size:12.5px;color:#AFC0D8}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var d = document.createElement('div'); d.id = 'shfav';
  d.innerHTML = '<b class="h">🙏 Can you do me a small favour?</b>' +
    '<p>Everything here is <b style="color:#fff">free for buyers</b>, and I keep adding new guides, tools and data. If it helped you, <b style="color:#ffd23f">share it with a friend</b> who is buying or investing in Dubai. Came from my Instagram reel? Share that reel too. The more people use it, the more useful details I can add for you.</p>' +
    '<div class="r"><button type="button" class="s" id="shgo">📲 Share</button>' +
    '<a class="b w" id="shwa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(msg + url) + '">💬 WhatsApp</a>' +
    '<button type="button" class="c" id="shcp">🔗 Copy link</button></div>' +
    '<small>Thank you! · Sam Surya, @SamtheRealRealtor</small>';
  function wire() {
    var go = document.getElementById('shgo'), cp = document.getElementById('shcp');
    go.onclick = function () {
      if (navigator.share) navigator.share({ title: title, text: msg, url: url }).catch(function () {});
      else window.open(document.getElementById('shwa').href, '_blank');
    };
    cp.onclick = function () {
      var done = function () { cp.textContent = '✅ Link copied'; setTimeout(function () { cp.textContent = '🔗 Copy link'; }, 2200); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link:', url); });
      else prompt('Copy this link:', url);
    };
  }
  function place() {
    if (document.body.classList.contains('agm')) return;
    var host = document.getElementById('mpb') || document.querySelector('footer') || document.querySelector('.foot');
    if (host) host.parentNode.insertBefore(d, host); else (document.querySelector('.wrap') || document.body).appendChild(d);
    wire();
  }
  // wait a moment so the Media Permit badge (and agent mode, on the Stress Test) is in place first
  function later() { setTimeout(place, 600); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();
})();
