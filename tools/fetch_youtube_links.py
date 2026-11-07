"""Daily: point /go/full to Sam's newest long YouTube video and /go/series to the newest
Sir Purrperty series video, using the channel's public RSS feed. Keeps old links if anything fails."""
import json, re, urllib.request, xml.etree.ElementTree as ET, datetime
CHANNEL_ID = "UCqzHM5IKM_xEO-vexLv5Ygw"
SERIES_PAT = re.compile(r"🐾|season|purrperty|purrpertyverse|investment club", re.I)
P = "assets/links.json"
cur = json.load(open(P))
def get(u):
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=40) as r: return r.read(), r.geturl()
def is_short(vid):
    try:
        _, final = get(f"https://www.youtube.com/shorts/{vid}")
        return "/shorts/" in final
    except Exception:
        return False
try:
    xml, _ = get(f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}")
    ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
    entries = [(e.find("yt:videoId", ns).text, e.find("a:title", ns).text, e.find("a:published", ns).text)
               for e in ET.fromstring(xml).findall("a:entry", ns)]
    full = series = None
    for vid, title, pub in entries:  # newest first
        if "#shorts" in title.lower(): continue
        if SERIES_PAT.search(title):
            if not series and not is_short(vid): series = (vid, title)
        elif not full and not is_short(vid): full = (vid, title)
        if full and series: break
    if full: cur["full"] = {"url": f"https://youtu.be/{full[0]}", "title": full[1]}
    if series: cur["series"] = {"url": f"https://youtu.be/{series[0]}", "title": series[1]}
    cur["updated"] = datetime.date.today().isoformat()
    cur.pop("error", None)
except Exception as e:
    cur["error"] = f"{datetime.date.today()}: {e}"
json.dump(cur, open(P, "w"), indent=1, ensure_ascii=False)
print(json.dumps(cur, indent=1, ensure_ascii=False))
