"""Build checklist/data/dxb_map.json: the agent price map (every master community with its centre point,
price per sq ft, year-on-year change, sales, off-plan share, Ejari rent and gross yield, plus the bedroom mix).
Source: Dubai Land Department open data, cleaned and aggregated by Dubai Data (datadubai.ae, CC BY 4.0), GitHub mirror.
Centre points: checklist/data/place_points.json (OpenStreetMap Nominatim, made by fetch_transit.py)."""
import csv, io, json, os, re, urllib.request, datetime

BASES = ["https://raw.githubusercontent.com/datadubai/dubai-real-estate-dld/main/", "https://huggingface.co/datasets/datadubai/dubai-real-estate-dld/resolve/main/"]
OUT = os.path.join(os.path.dirname(__file__), "..", "checklist", "data")

def get(path):
    last = None
    for b in BASES:
        try:
            with urllib.request.urlopen(urllib.request.Request(b + path, headers={"User-Agent": "samsuryarealty-map"}), timeout=60) as r:
                return r.read().decode("utf-8-sig")
        except Exception as e:
            last = e
    raise last

def rows(path): return list(csv.DictReader(io.StringIO(get(path))))
def num(v, d=0):
    try:
        x = float(v); return round(x, d) if d else int(round(x))
    except Exception:
        return None

pts = json.load(open(os.path.join(OUT, "place_points.json")))
through = ""
try:
    m = re.search(r"Data through:\*\*\s*([0-9-]{10})", get("README.md")); through = m.group(1) if m else ""
except Exception:
    pass

comms = []
for r in rows("data/communities.csv"):
    p = pts.get(r["name"]) or pts.get(r.get("top_area") or "")
    if not p or not num(r.get("n")): continue
    comms.append([r["name"], p[0], p[1], num(r["n"]), num(r["price_median"]), num(r["psf_median"]), num(r["psf_yoy"], 1), num(r["price_yoy"], 1),
                  num(r["n_yoy"], 1), num(r["offplan_share"], 1), num(r["yield_pct"], 2), num(r["rent_median"]), num(r["n_rents"]), r.get("top_area") or "", r.get("quality") or ""])

bed = {}
for r in rows("data/community_bedrooms.csv"):
    bed.setdefault(r["community"], []).append([r["code"], r["label"], num(r["n"]), num(r["price_median"]), num(r["psf_median"]), num(r["sqft_median"]),
                                               num(r["rent_median"]), num(r["n_rents"]), num(r["yield_pct"], 2)])
dub = [[r["code"], r["label"], num(r["n"]), num(r["price_median"]), num(r["psf_median"]), num(r["sqft_median"]), num(r["rent_median"]), num(r["n_rents"]), num(r["yield_pct"], 2)]
       for r in rows("data/market_bedrooms.csv")]

out = {"updated": datetime.date.today().isoformat(), "data_through": through,
       "source": "Dubai Land Department open data via Dubai Data (datadubai.ae), CC BY 4.0; centre points (c) OpenStreetMap contributors",
       "f": ["name", "lat", "lng", "sales_12m", "price_median", "psf", "psf_yoy", "price_yoy", "sales_yoy", "offplan_share", "yield", "rent_median", "rents_12m", "top_area", "quality"],
       "bf": ["code", "label", "sales_12m", "price_median", "psf", "sqft", "rent_median", "rents_12m", "yield"],
       "c": sorted(comms, key=lambda x: -x[3]), "b": bed, "d": dub}
json.dump(out, open(os.path.join(OUT, "dxb_map.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print(f"dxb_map.json: {len(comms)} communities on the map, {len(bed)} with bedroom data, through {through}")
