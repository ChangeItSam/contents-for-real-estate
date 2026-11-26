/* Sam's life story in 6 videos ("Beyond the Mountains", the book condensed to video).
   Automatic: /api/story (worker/index.js) finds each part on his YouTube channel by its title ("Part N" + "My Story" /
   "Beyond the Mountains"), so a part appears here as soon as he uploads it. The ids below are pinned copies
   (YouTube's feed only lists the latest 15 uploads), filled in by the daily task; a pinned id always wins. */
(function () {
  var PARTS = [
    { n: 1, title: 'Part 1', id: '' },
    { n: 2, title: 'Part 2', id: '' },
    { n: 3, title: 'Part 3', id: '' },
    { n: 4, title: 'Part 4', id: '' },
    { n: 5, title: 'Part 5', id: '' },
    { n: 6, title: 'Part 6', id: '' }
  ];
  var CH = 'https://www.youtube.com/@SamtheRealRealtor';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ok(id) { return /^[A-Za-z0-9_-]{11}$/.test(id || ''); }

  // Home page: small tiles that link to /about/#part-N
  function strip(el) {
    el.innerHTML = PARTS.map(function (p) {
      var live = ok(p.id);
      return '<a class="sp' + (live ? ' live' : '') + '" href="/about/#part-' + p.n + '">' +
        (live ? '<img src="https://i.ytimg.com/vi/' + p.id + '/mqdefault.jpg" alt="" loading="lazy" width="320" height="180">' : '<span class="soon">Coming soon</span>') +
        '<b>▶ ' + esc(p.title) + '</b></a>';
    }).join('');
  }

  // /about/: full players, loaded only when tapped (keeps the page fast)
  function full(el) {
    el.innerHTML = PARTS.map(function (p) {
      var live = ok(p.id);
      return '<div class="vp" id="part-' + p.n + '">' +
        (live ? '<button type="button" class="ply" data-id="' + p.id + '" aria-label="Play ' + esc(p.title) + '"><img src="https://i.ytimg.com/vi/' + p.id + '/hqdefault.jpg" alt="" loading="lazy"><i>▶</i></button>'
              : '<div class="ply off"><span>Part ' + p.n + '<br><small>Coming soon on YouTube</small></span></div>') +
        '<h3>' + esc(p.title) + '</h3></div>';
    }).join('') + '<p class="chn"><a href="' + CH + '" rel="noopener">Subscribe on YouTube to get each part when it lands →</a></p>';
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button.ply'); if (!b) return;
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-id') + '?autoplay=1&rel=0';
      f.title = 'Sam Surya Tamang, my story'; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
      b.replaceWith(f);
    });
  }
  function draw() {
    document.querySelectorAll('[data-story="strip"]').forEach(strip);
    document.querySelectorAll('[data-story="full"]').forEach(function (el) { var c = el.cloneNode(false); el.replaceWith(c); full(c); });
  }
  function go() {
    draw();
    fetch('/api/story').then(function (r) { return r.json(); }).then(function (d) {
      var ch = false;
      PARTS.forEach(function (p) { var x = d && d.parts && d.parts[p.n]; if (x && !ok(p.id) && ok(x.id)) { p.id = x.id; ch = true; } });
      if (ch) draw();
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
