/* UAE Media Permit badge (Sam Surya). Add <script src="/assets/permit.js" defer></script> to a page:
   it shows the permit with its QR and a "Verify" link to the National Media Authority, at the end of the page
   (inside an element with id="permit" if there is one, else before the footer / at the end of the main wrapper). */
(function () {
  var URL = 'https://eservices.nma.gov.ae/#/page/verify?flag=1&id=haLCT91-3Ic';
  if (document.getElementById('mpb')) return;
  var css = '#mpb{display:flex;align-items:center;gap:14px;max-width:560px;margin:18px auto;padding:12px 14px;background:#fff;border:1px solid #E6E1D6;border-radius:16px;font-family:inherit;color:#1B2433;text-align:left;box-shadow:0 4px 14px rgba(11,31,58,.06)}' +
    '#mpb img{width:84px;height:84px;flex:none;border-radius:8px;border:1px solid #E6E1D6;background:#fff}' +
    '#mpb b{display:block;color:#0B1F3A;font-size:15px}#mpb span{display:block;font-size:13px;color:#5B6678;line-height:1.45;margin-top:2px}' +
    '#mpb a{display:inline-block;margin-top:6px;font-size:13px;font-weight:800;color:#0B1F3A;background:linear-gradient(135deg,#C9A24A,#F6E7BE 55%,#C9A24A);border-radius:20px;padding:5px 12px;text-decoration:none}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var d = document.createElement('div'); d.id = 'mpb';
  d.innerHTML = '<a href="' + URL + '" target="_blank" rel="noopener" style="padding:0;background:none;margin:0" aria-label="Scan or tap to verify the UAE Media Permit"><img src="/assets/brand/media-permit-qr.svg" alt="QR code: verify Sam Surya\'s UAE Media Permit" loading="lazy"></a>' +
    '<div><b>🇦🇪 UAE Media Permit holder</b><span>Sam Surya Tamang holds a media permit from the UAE National Media Authority for his property content on Instagram @SamtheRealRealtor. Scan the code or tap below to check it on the official register.</span>' +
    '<a href="' + URL + '" target="_blank" rel="noopener">✔ Verify on NMA ›</a></div>';
  function place() {
    var host = document.getElementById('permit') || document.querySelector('footer') || document.querySelector('.foot');
    if (host && host.id === 'permit') host.appendChild(d);
    else if (host) host.parentNode.insertBefore(d, host);
    else (document.querySelector('.wrap') || document.body).appendChild(d);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place); else place();
})();
// Also load the buyer site kit on the same pages (assets/site.js): Explore menu, share card, call-me-back form.
(function () { if (document.getElementById('ssjs')) return; var s = document.createElement('script'); s.id = 'ssjs'; s.src = '/assets/site.js?v=1'; document.head.appendChild(s); })();
