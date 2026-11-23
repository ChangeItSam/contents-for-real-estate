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
        return env.ASSETS.fetch(new Request(url.toString(), request));
      }
    } else if (hosts.length && (p === "/agent" || p.startsWith("/agent/"))) {
      url.hostname = hosts[0];
      url.pathname = "/";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  }
};
