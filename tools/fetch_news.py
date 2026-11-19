"""Build checklist/data/news.json for the agent portal News tab: Dubai property news that moves buying decisions
(rules, fees, mortgages, visas, prices, supply) and new project launches by developers.
Headlines, source, date and link only (no article text). Source: Google News RSS search. Runs every 6 hours."""
import json, os, re, datetime, html, urllib.request, urllib.parse, xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

OUT = os.path.join(os.path.dirname(__file__), "..", "checklist", "data", "news.json")
DAYS = 45

MARKET_Q = ["Dubai real estate law", "Dubai Land Department new", "Dubai property rules", "Dubai mortgage rules", "UAE Central Bank interest rate",
            "Dubai golden visa property", "Dubai property prices", "Dubai property sales record", "Dubai off-plan escrow RERA", "Dubai housing supply",
            "Dubai rent index", "Dubai property fees DLD"]
LAUNCH_Q = ["Dubai developer launches residential project", "launches new project Dubai", "Emaar launches", "Nakheel launches", "DAMAC launches",
            "Sobha launches Dubai", "Meraas launches", "Dubai Holding launches", "Binghatti launches", "Azizi launches", "Aldar Dubai launch",
            "Ellington launches", "Omniyat launches", "Danube launches", "Dubai South launch residential", "Expo City Dubai launches"]

# why a headline matters to a buyer, from its words (first match wins)
WHY = [(r"interest rate|fed |central bank|\beibor\b", "💳 Mortgage rates", "Changes monthly payments and what buyers can borrow."),
       (r"mortgage|loan|financ|down ?payment|ltv", "💳 Financing", "Changes how much cash a buyer needs and who qualifies."),
       (r"golden visa|visa|residen(cy|ce permit)", "🛂 Visas", "Visa rules drive investor demand, especially at AED 2M+."),
       (r"\bfee|fees|\btax|vat|levy|charge|waiver|discount", "🧾 Costs", "Changes the cost of buying or owning."),
       (r"law|rule|regulat|decree|circular|rera|escrow|ban|crackdown|licen[cs]e|compliance|protect", "⚖️ Rules", "New rules change what buyers and developers must do."),
       (r"supply|handover|completions?|units|homes by|pipeline|oversupply", "🏗️ Supply", "More supply can slow price and rent growth in that area."),
       (r"rent|rental|tenant|ejari|yield", "🔑 Rents", "Rents drive yields and investor demand."),
       (r"price|values?|per sq|appreciat|correct|decline|drop|fall|cool", "📈 Prices", "Price direction affects entry timing and resale profit."),
       (r"sales|transactions|deals|record|billion|bn", "📊 Demand", "Sales volumes show how strong buyer demand is."),
       (r"metro|road|airport|al maktoum|blue line|etihad rail|infrastructure|bridge|tunnel", "🚇 Infrastructure", "New transport usually lifts nearby prices.")]
LAUNCH_RE = r"\blaunch(es|ed|ing)?\b|\bunveil(s|ed)?\b|\bintroduces\b|\bdebuts?\b|\breveals\b|\bopens sales\b|\bsales launch"
PROP_RE = r"propert|real estate|realty|\bhomes?\b|housing|villa|townhouse|apartment|residen|tower|off-plan|offplan|\bunits?\b|mortgage|\brents?\b|rental|tenant|landlord|\bdld\b|rera|escrow|developer|masterplan|master plan|community|plots?\b|golden visa|per sq|handover"
LAUNCH_PROP_RE = r"villa|townhouse|apartment|residen|tower|homes|community|project|development|phase|collection|plots|masterplan|waterfront|beachfront"
JUNK_RE = r"restaurant|dining|food|scooter|bike|traffic|fine for|flight|airline|hotel opening|concert|nye|new year|cirque|festival|ai tool|workspace|office space|school fees|holiday home|football|cricket|weather|recipe|retail at|mall opens|celebrat|danube home|linked to|hemedti|sanction|laundering|arrest"
PLACE_RE = r"dubai|uae|emirates|emaar|nakheel|damac|sobha|meraas|binghatti|azizi|ellington|omniyat|danube|aldar|jvc|palm|marina|downtown|creek|expo|dubai south"
SKIP_RE = r"abu dhabi only|saudi|riyadh|jeddah|qatar|doha|bahrain|oman|muscat|egypt|cairo|india|lucknow|gurugram|gurgaon|noida|mumbai|delhi|pune|bengaluru|hyderabad|london|ras al khaimah|sharjah|ajman|umm al"

def fetch(q):
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": q + " when:30d", "hl": "en-AE", "gl": "AE", "ceid": "AE:en"})
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 dealproagent-news"}), timeout=30) as r:
        root = ET.fromstring(r.read())
    for it in root.iter("item"):
        t = html.unescape(it.findtext("title") or ""); src = it.findtext("source") or ""
        if src and t.endswith(" - " + src): t = t[: -len(src) - 3]
        try: d = parsedate_to_datetime(it.findtext("pubDate")).date().isoformat()
        except Exception: continue
        yield {"t": t.strip(), "s": src.strip(), "d": d, "u": it.findtext("link") or ""}

def words(t): return set(w for w in re.findall(r"[a-z0-9]+", t.lower()) if len(w) > 2 and w not in {"the", "and", "for", "with", "dubai", "its", "new", "from", "into", "aed", "dhs", "dh"})
def same(a, b):
    A, B = words(a), words(b)
    return bool(A and B) and len(A & B) / min(len(A), len(B)) >= 0.5
def keep(t, kind):
    low = t.lower()
    if re.search(JUNK_RE, low) or not re.search(PROP_RE, low): return False
    if "abu dhabi" in low and "dubai" not in low.replace("abu dhabi", ""): return False
    if re.search(SKIP_RE, low) and "dubai" not in low: return False
    if kind == "l" and not re.search(LAUNCH_PROP_RE, low): return False
    return True
def norm(t): return re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()[:70]
def why(t):
    for rx, tag, txt in WHY:
        if re.search(rx, t, re.I): return tag, txt
    return "📰 Market", ""

old = {"m": [], "l": []}
try: old = json.load(open(OUT))
except Exception: pass
cut = (datetime.date.today() - datetime.timedelta(days=DAYS)).isoformat()
got = {"m": {}, "l": {}}
for k in ("m", "l"):
    for x in old.get(k, []):
        if x.get("d", "") >= cut[:len(x.get("d", ""))] and keep(x["t"], k) and (k == "m" or re.search(LAUNCH_RE, x["t"].lower())): got[k][norm(x["t"])] = x
ok = 0
for k, qs in (("m", MARKET_Q), ("l", LAUNCH_Q)):
    for q in qs:
        try:
            for x in fetch(q):
                t = x["t"]; low = t.lower()
                if x["d"] < cut or not re.search(PLACE_RE, low): continue
                is_launch = bool(re.search(LAUNCH_RE, low))
                kk = "l" if is_launch else "m"
                if not keep(t, kk): continue
                if kk == "m" and k == "l": continue          # launch query that isn't about a launch
                key = norm(t)
                if key in got["l"] or key in got["m"] or any(same(t, y["t"]) for y in list(got["l"].values()) + list(got["m"].values())): continue
                if kk == "m": x["g"], x["w"] = why(t)
                got[kk][key] = x; ok += 1
        except Exception as e:
            print("skip", q, e)
for k in ("m", "l"):
    L = []
    for x in sorted(got[k].values(), key=lambda x: x["d"], reverse=True):
        if not any(same(x["t"], y["t"]) for y in L): L.append(x)
    got[k] = {norm(x["t"]): x for x in L}
res = {"updated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "source": "Headlines via Google News; links open the publisher's article.",
       "m": sorted(got["m"].values(), key=lambda x: x["d"], reverse=True)[:40], "l": sorted(got["l"].values(), key=lambda x: x["d"], reverse=True)[:40]}
json.dump(res, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
print("new", ok, "market", len(res["m"]), "launches", len(res["l"]))
