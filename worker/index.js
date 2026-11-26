// Small router in front of the static site.
// agents.samsuryarealty.com  -> the Agent Pro portal lives at its root (the rest of the site works as usual).
// samsuryarealty.com/agent/  -> moves to the agent domain once AGENT_HOST is set in wrangler.jsonc.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Always serve over HTTPS (the browser shows "Not Secure" on http://). Cloudflare's "Always Use HTTPS" setting covers every path;
    // this covers the pages the worker sees first (home, portal, policies) even if that setting is off.
    if (url.protocol === "http:" && !/^(localhost|127\.)/.test(url.hostname)) { url.protocol = "https:"; return Response.redirect(url.toString(), 301); }
    // AGENT_HOST: the agent site's domain(s), comma-separated (e.g. "dataproagent.ae,www.dataproagent.ae"). The first is the main one.
    const hosts = String(env.AGENT_HOST || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    const onAgents = hosts.includes(url.hostname) || url.hostname.startsWith("agents.");
    const p = url.pathname;
    if (p === "/api/story") return story();
    if (onAgents) {
      if (p === "/agent" || p.startsWith("/agent/")) {           // old portal path -> the subdomain root
        url.pathname = "/" + p.replace(/^\/agent\/?/, "");
        return Response.redirect(url.toString(), 301);
      }
      if (p === "/legal" || p.startsWith("/legal/")) {         // DealPro's own policies (no SamSurya Realty wording)
        url.pathname = "/dpa-legal" + p.replace(/^\/legal/, "");
        return env.ASSETS.fetch(new Request(url.toString(), request));
      }
      if (p === "/" || p === "/index.html") {                    // root = the portal
        url.pathname = "/agent/";
        return fresh(await env.ASSETS.fetch(new Request(url.toString(), request)));
      }
    } else if (hosts.length && (p === "/agent" || p.startsWith("/agent/"))) {
      url.hostname = hosts[0];
      url.pathname = "/";
      return Response.redirect(url.toString(), 301);
    }
    return fresh(await env.ASSETS.fetch(request));
  }
};
// Pages (HTML) always revalidate, so a phone never keeps an old copy of the portal after an update.
function fresh(res) {
  if (!/text\/html/.test(res.headers.get("content-type") || "")) return res;
  const r = new Response(res.body, res); r.headers.set("Cache-Control", "no-cache"); return r;
}

// Sam's life-story series: finds "Part 1" to "Part 6" on his YouTube channel by title, so a part shows on the site as soon as he uploads it.
// A title counts when it has "Part N" plus one of STORY_WORDS (e.g. "My Story Part 1", "Beyond the Mountains | Part 2").
const YT_HANDLE = "https://www.youtube.com/@SamtheRealRealtor";
const YT_ID = "UCqzHM5IKM_xEO-vexLv5Ygw";
const STORY_WORDS = /beyond the mountains|my story|my life|biography|autobiography/i;
async function story() {
  const cache = caches.default, key = new Request("https://samsuryarealty.com/api/story?v=1");
  const hit = await cache.match(key); if (hit) return hit;
  const parts = {};
  try {
    let id = YT_ID;
    try { const h = await (await fetch(YT_HANDLE, { headers: { "accept-language": "en" } })).text(); const m = h.match(/rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) || h.match(/"externalId":"(UC[\w-]{22})"/); if (m) id = m[1]; } catch (e) {}
    const x = await (await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + id)).text();
    for (const e of x.split("<entry>").slice(1)) {
      const v = (e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/) || [])[1];
      const t = ((e.match(/<title>([^<]*)<\/title>/) || [])[1] || "").replace(/&amp;/g, "&");
      const n = (t.match(/\bpart\s*([1-6])\b/i) || [])[1];
      if (v && n && STORY_WORDS.test(t) && !parts[n]) parts[n] = { id: v, title: t.slice(0, 120) };
    }
  } catch (e) {}
  const res = new Response(JSON.stringify({ parts }), { headers: { "content-type": "application/json", "cache-control": "public, max-age=900" } });
  await cache.put(key, res.clone()); return res;
}
