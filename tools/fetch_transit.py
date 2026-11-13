"""Monthly refresh of transport facts for the Stress Test detailed report. Runs on GitHub Actions.
Sources: OpenStreetMap (c) OpenStreetMap contributors, ODbL: metro stations, bus stops and bus routes (Overpass API),
area centre points (Nominatim). Blue Line stations: RTA's announced route, placed approximately.
Output: checklist/data/transit.json (one entry per DLD community / area: nearest metro, nearest planned Blue Line
station, bus stops and routes near the area centre). Distances are straight-line from the centre of the area.
A log of what was found or missed goes to checklist/data/transit_log.txt."""
import atexit, json, math, os, time, urllib.parse, urllib.request

OUT = "checklist/data"
UA = "SamSurya-StressTest/1.0 (+https://changeitsam.github.io/contents-for-real-estate/)"
BBOX = (24.70, 54.85, 25.40, 55.65)  # south, west, north, east: Dubai emirate
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
LOG = []
atexit.register(lambda: open(f"{OUT}/transit_log.txt", "w").write(time.strftime("%Y-%m-%d %H:%M UTC\n") + "\n".join(LOG) + "\n"))

def log(*a):
    s = " ".join(str(x) for x in a); print(s); LOG.append(s)

def http(url, data=None, timeout=180):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8")

def overpass(q):
    body = urllib.parse.urlencode({"data": q}).encode()
    for ep in OVERPASS:
        for attempt in range(2):
            try:
                return json.loads(http(ep, body))["elements"]
            except Exception as e:
                log("overpass fail", ep, attempt, repr(e)[:120]); time.sleep(20)
    raise SystemExit("Overpass unavailable")

def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))

def inside(p):
    return BBOX[0] <= p[0] <= BBOX[2] and BBOX[1] <= p[1] <= BBOX[3]

bb = "%s,%s,%s,%s" % BBOX

# ---------- metro stations and their lines
els = overpass(f"""[out:json][timeout:180];
(rel["route"="subway"]({bb}););out body;
(node["railway"="station"]["station"="subway"]({bb});node["railway"="station"]["subway"="yes"]({bb});
 node["public_transport"="station"]["subway"="yes"]({bb}););out;""")
rels = [e for e in els if e["type"] == "relation"]
stations = [e for e in els if e["type"] == "node" and e.get("tags", {}).get("name")]
member_ids = {m["ref"] for r in rels for m in r.get("members", []) if m["type"] == "node"}
mem = {}
if member_ids:
    ids = ",".join(str(i) for i in member_ids)
    for n in overpass(f"[out:json][timeout:180];node(id:{ids});out;"):
        mem[n["id"]] = (n["lat"], n["lon"])
line_pts = []
for r in rels:
    t = r.get("tags", {})
    nm = t.get("name:en") or t.get("name") or t.get("ref") or ""
    line = "Red Line" if "red" in nm.lower() or t.get("colour", "").lower() in ("red", "#ff0000", "#e21836") else \
           "Green Line" if "green" in nm.lower() or t.get("colour", "").lower() in ("green", "#00ff00", "#00a651") else nm
    for m in r.get("members", []):
        if m["type"] == "node" and m["ref"] in mem:
            line_pts.append((mem[m["ref"]], line))
metro, seen = [], set()
for s in stations:
    t = s["tags"]; name = (t.get("name:en") or t.get("name")).strip()
    if name in seen: continue
    seen.add(name); p = (s["lat"], s["lon"])
    lines = sorted({ln for q, ln in line_pts if km(p, q) < 0.4 and ln})
    metro.append([name, round(p[0], 5), round(p[1], 5), " / ".join(lines)])
log("metro stations:", len(metro))
if len(metro) < 40:
    raise SystemExit("too few metro stations, keeping the old file")

# ---------- bus stops and routes
els = overpass(f"""[out:json][timeout:180];
(rel["route"="bus"]({bb}););out body;
(node["highway"="bus_stop"]({bb});node["public_transport"="platform"]["bus"="yes"]({bb}););out;""")
stop_routes = {}
for r in (e for e in els if e["type"] == "relation"):
    ref = r.get("tags", {}).get("ref") or r.get("tags", {}).get("name") or str(r["id"])
    for m in r.get("members", []):
        if m["type"] == "node":
            stop_routes.setdefault(m["ref"], set()).add(ref)
stops = [(e["lat"], e["lon"], e["id"], e.get("tags", {}).get("name:en") or e.get("tags", {}).get("name") or "")
         for e in els if e["type"] == "node"]
log("bus stops:", len(stops), "bus routes:", len({x for v in stop_routes.values() for x in v}))

# ---------- area centre points (cached; overrides win)
cache_f, over_f = f"{OUT}/place_points.json", f"{OUT}/place_overrides.json"
cache = json.load(open(cache_f)) if os.path.exists(cache_f) else {}
over = json.load(open(over_f)) if os.path.exists(over_f) else {}
over = {k: v for k, v in over.items() if not k.startswith("_")}

def geocode(q):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"q": q, "format": "json", "limit": 1, "countrycodes": "ae",
         "viewbox": f"{BBOX[1]},{BBOX[2]},{BBOX[3]},{BBOX[0]}", "bounded": 1})
    time.sleep(1.2)
    try:
        r = json.loads(http(url, timeout=60))
        if r:
            p = (float(r[0]["lat"]), float(r[0]["lon"]))
            if inside(p): return [round(p[0], 5), round(p[1], 5), r[0].get("display_name", "")[:80]]
    except Exception as e:
        log("nominatim fail", q, repr(e)[:100])
    return None

ins = json.load(open(f"{OUT}/insights.json"))
names = set()
for v in ins["p"].values():
    if v[9]: names.add(v[9])
    if v[10]: names.add(v[10])
names |= set(ins.get("t", {}).keys())
points, missed = {}, []
for n in sorted(names):
    o = over.get(n)
    if isinstance(o, list) and len(o) >= 2:
        points[n] = [o[0], o[1], "override"]; continue
    if n in cache and not o:
        points[n] = cache[n]; continue
    p = geocode(o if isinstance(o, str) else f"{n}, Dubai")
    if p: points[n] = cache[n] = p
    else: missed.append(n)
json.dump(cache, open(cache_f, "w"), indent=0, ensure_ascii=False)
log("area points:", len(points), "missed:", len(missed), "|", "; ".join(missed[:60]))

# ---------- Blue Line (announced by RTA, opening 2029): placed at the landmark each station serves
BLUE = [("Creek (interchange, Al Jaddaf)", "Creek Metro Station, Al Jaddaf, Dubai"),
        ("Dubai Festival City", "Dubai Festival City Mall, Dubai"),
        ("Dubai Creek Harbour (Emaar Properties Station)", "Dubai Creek Harbour, Dubai"),
        ("Ras Al Khor", "Ras Al Khor Industrial Area 1, Dubai"),
        ("International City 1 (interchange)", "International City, Dubai"),
        ("International City 2", "Warsan 1, Dubai"),
        ("International City 3", "International City Phase 3, Dubai"),
        ("Dubai Silicon Oasis", "Fakeeh University Hospital, Dubai"),
        ("Academic City", "Dubai International Academic City, Dubai"),
        ("Centrepoint (interchange)", "Centrepoint Metro Station, Dubai"),
        ("Mirdif", "City Centre Mirdif, Dubai"),
        ("Al Warqa", "Al Warqa 1, Dubai")]
bover = over.get("_blue", {}) if isinstance(over.get("_blue"), dict) else {}
blue = []
for name, q in BLUE:
    o = bover.get(name)
    p = [o[0], o[1]] if isinstance(o, list) else (cache.get("blue:" + name) or geocode(q))
    if p:
        cache["blue:" + name] = p; blue.append([name, p[0], p[1]])
    else:
        log("blue miss", name)
json.dump(cache, open(cache_f, "w"), indent=0, ensure_ascii=False)
log("blue line stations placed:", len(blue))

# ---------- per area summary
res = {}
for n, p in points.items():
    c = (p[0], p[1])
    m = min(metro, key=lambda s: km(c, (s[1], s[2])))
    b = min(blue, key=lambda s: km(c, (s[1], s[2]))) if blue else None
    near = [s for s in stops if km(c, (s[0], s[1])) <= 0.8]
    routes = {x for s in near for x in stop_routes.get(s[2], ())}
    ns = min(stops, key=lambda s: km(c, (s[0], s[1]))) if stops else None
    res[n] = {"m": [m[0], m[3], round(km(c, (m[1], m[2])), 1)],
              "b": [b[0], round(km(c, (b[1], b[2])), 1)] if b else None,
              "bus": [len(near), len(routes), round(km(c, (ns[0], ns[1])), 2) if ns else None, ns[3] if ns else ""]}

json.dump({"updated": time.strftime("%Y-%m-%d"),
           "source": "(c) OpenStreetMap contributors (ODbL); Blue Line route as announced by RTA, station spots approximate",
           "metro": metro, "blue": blue, "a": res},
          open(f"{OUT}/transit.json", "w"), separators=(",", ":"), ensure_ascii=False)
log("transit.json written for", len(res), "areas")
