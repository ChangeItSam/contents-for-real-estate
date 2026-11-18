"""Build checklist/data/supply.json: upcoming handovers for the agent portal (units handing over per year, per area, per type).
Source: Dubai Land Department project registry, via Dubai Data (datadubai.ae, CC BY 4.0) - data/projects.csv.
The registry has no property type, so each project gets an ESTIMATED type: apartment, townhouse or villa, from its name,
its master community and its median price. Fix any wrong one in checklist/data/supply_types.json ({"Project name": "villa"})."""
import csv, io, json, os, re, urllib.request, datetime

BASES = ["https://raw.githubusercontent.com/datadubai/dubai-real-estate-dld/main/", "https://huggingface.co/datasets/datadubai/dubai-real-estate-dld/resolve/main/"]
OUT = os.path.join(os.path.dirname(__file__), "..", "checklist", "data")

def get(path):
    last = None
    for b in BASES:
        try:
            with urllib.request.urlopen(urllib.request.Request(b + path, headers={"User-Agent": "samsuryarealty-supply"}), timeout=60) as r:
                return r.read().decode("utf-8-sig")
        except Exception as e:
            last = e
    raise last

def num(v):
    try: return float(v)
    except Exception: return None

# communities / brands that are (almost) all low-rise homes: villas and townhouses
LOWRISE = r"damac lagoons|damac islands|damac hills ?\(?2|damac riverside|grand polo|the valley|the oasis|mareva|arabian ranches|tilal al ghaf|alaya|haven by aldar|athlon|the acres|nad al sheba gardens|sobha sanctuary|the heights|serro|salva|jumeirah golf estates|villanova|la tilia|mudon|al barari|the cape|eden hills|elwood|ashwood|cedarwood|pinewood|bay villas|expo valley|hayat|waada|rayhan|reportage hills|equiterra|equestra|selvara|vindera|ovelle|lunaya|greenz|solaya|o1ne district|tilal|palm springs|mohammed bin rashid al maktoum city dist|jebel ali hills|the wilds|caya|velora|fairway"
VILLA_WORD = r"\bvillas?\b|mansions?|\bestates?\b(?! tower)|\bmanor\b"
TOWN_WORD = r"town ?houses?|\btownhomes?\b|\bduplex"

over = {}
try: over = {k.lower(): v for k, v in json.load(open(os.path.join(OUT, "supply_types.json"))).items() if not k.startswith("_")}
except Exception: pass
areas = {}
# master communities the registry leaves blank, from the project name
BRAND = [("damac islands", "DAMAC Islands"), ("grand polo", "Grand Polo Club"), ("the oasis", "The Oasis"), ("the heights", "The Heights Country Club"),
         ("sobha sanctuary", "Sobha Sanctuary"), ("haven by aldar", "Haven by Aldar"), ("athlon", "Athlon by Aldar"), ("damac riverside", "DAMAC Riverside"),
         ("nad al sheba gardens", "Nad Al Sheba Gardens"), ("villanova", "Villanova"), ("the acres", "The Acres"), ("reportage", "Reportage Village"), ("eden hills", "Eden Hills"), ("the valley", "The Valley")]
try:
    ins = json.load(open(os.path.join(OUT, "insights.json")))["p"]
    areas.update({k: (v[9] or v[10]) for k, v in ins.items() if (v[9] or v[10])})
except Exception: pass
try:
    pj = json.load(open(os.path.join(OUT, "projects.json")))
    f = pj["f"]
    for p in pj["p"]:
        if p[f.index("area")]: areas.setdefault(p[f.index("no")], p[f.index("area")])
except Exception: pass

def ptype(name, comm, price):
    n = name.lower()
    if n in over: return over[n]
    n = re.sub(r"real estate|wellness estate|empire estates|villa del garda", "", n)
    if n in over: return over[n]
    if re.search(TOWN_WORD, n): return "townhouse"
    if re.search(VILLA_WORD, n): return "villa"
    if re.search(r"tower|residences? tower|heights tower|\bsky\b", n): return "apartment"
    if re.search(LOWRISE, n) or re.search(LOWRISE, (comm or "").lower()):
        return "villa" if (price or 0) >= 5500000 else "townhouse"
    return "apartment"

today = datetime.date.today().isoformat()[:7]
out = []
for r in csv.DictReader(io.StringIO(get("data/projects.csv"))):
    if r.get("status") != "Active": continue
    d = (r.get("completion_date") or "")[:7]
    u = num(r.get("total_units"))
    if not d or not u or d < today: continue
    comm = r.get("community") or next((c for b, c in BRAND if b in r["name"].lower()), "") or areas.get(r["pn"]) or ""
    if not comm: continue
    out.append([r["name"], r.get("developer") or "", comm, d, int(u), ptype(r["name"], comm, num(r.get("price_median"))),
                round(num(r.get("completion")) or 0), int(num(r.get("n")) or 0)])
out.sort(key=lambda x: (x[3], x[2]))
json.dump({"updated": datetime.date.today().isoformat(),
           "source": "Dubai Land Department project registry via Dubai Data (datadubai.ae), CC BY 4.0",
           "note": "Registered off-plan projects still under construction, by DLD completion date. Property type is estimated from the project name, community and price.",
           "f": ["name", "dev", "area", "handover", "units", "type", "built_pct", "sold"], "p": out},
          open(os.path.join(OUT, "supply.json"), "w"), separators=(",", ":"))
print(len(out), "projects,", sum(x[4] for x in out), "units")
