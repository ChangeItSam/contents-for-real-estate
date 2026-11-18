"""Daily refresh of the extra facts in the Stress Test detailed report. Runs on GitHub Actions.
Source: Dubai Land Department open data, cleaned by Dubai Data (datadubai.ae, CC BY 4.0), GitHub mirror.
Output: checklist/data/insights.json
 - d:  developer track record in DLD's current project registry (finished, active, past DLD completion date, cancelled)
 - p:  per project: DLD developer number, status, construction %, DLD completion date, units, registered sales,
       median price and middle price range, community, DLD area
 - t:  per community: monthly median price per sq ft for the last 12 complete months
 - y:  per community: median price per sq ft and its year-on-year change (last 12 months vs the year before)
 - g:  per community: 3-year annual growth in median price per sq ft (sales-weighted) and recent sales count
 - r:  per community: median annual Ejari rent, contracts and gross yield, overall and by bedroom type"""
import csv, io, json, re, datetime, urllib.request
BASES = ["https://huggingface.co/datasets/datadubai/dubai-real-estate-dld/resolve/main/", "https://raw.githubusercontent.com/datadubai/dubai-real-estate-dld/main/"]  # Hugging Face gets new weeks first; GitHub mirror as fallback
OUT = "checklist/data"
CREDIT = "Dubai Land Department open data via Dubai Data (datadubai.ae), CC BY 4.0"

def get(path):
    last = None
    for base in BASES:
        try:
            req = urllib.request.Request(base + path, headers={"User-Agent": "Mozilla/5.0 (StressTest insights refresh)"})
            with urllib.request.urlopen(req, timeout=90) as r:
                txt = r.read().decode("utf-8-sig", "replace")
            if txt.lstrip()[:15].lower().startswith(("<!doctype", "<html")): raise ValueError("HTML, not data")
            return txt
        except Exception as e:
            last = e; print("source failed:", base, path, repr(e)[:80])
    raise last

def rows(path):
    return list(csv.DictReader(io.StringIO(get(path))))

def num(x, nd=0):
    try:
        v = float(x)
        return round(v, nd) if nd else round(v)
    except Exception:
        return None

through = ""
try:
    m = re.search(r"Data through:\*\*\s*([0-9-]+)", get("README.md"))
    through = m.group(1) if m else ""
except Exception:
    pass
today = datetime.date.today().isoformat()

# --- projects and developer track record
devs, proj = {}, {}
for r in rows("data/projects.csv"):
    dn = (r.get("developer_number") or "").strip() or (r.get("developer") or "").strip()
    st = (r.get("status") or "").strip()
    cd = (r.get("completion_date") or "").strip()
    d = devs.setdefault(dn, {"name": (r.get("developer") or "").strip(), "fin": 0, "act": 0, "late": 0, "can": 0})
    if st == "Finished": d["fin"] += 1
    elif st == "Cancelled": d["can"] += 1
    else:
        d["act"] += 1
        if cd and cd < today: d["late"] += 1
    street = r.get("street") or ""
    area = (r.get("area_name") or "").strip() or (street.rsplit(",", 1)[-1].strip() if "," in street else "")
    proj[r["pn"]] = [dn, st, num(r.get("completion"), 1), cd, num(r.get("total_units")),
                     num(r.get("n")) or 0, num(r.get("price_median")), num(r.get("price_q1")), num(r.get("price_q3")),
                     (r.get("community") or "").strip(), area, (r.get("quality") or "").strip(), num(r.get("psf_median"))]
if len(proj) < 300:
    raise SystemExit(f"only {len(proj)} projects, keeping the old file")

# --- price trend: last 12 complete months per community
by = {}
for r in rows("data/community_monthly.csv"):
    v = num(r.get("median"))
    if v: by.setdefault(r["community"], []).append((r["month"], v, num(r.get("n")) or 0))
trend = {}
for c, lst in by.items():
    lst.sort()
    trend[c] = [[m, v, n] for m, v, n in lst[-12:]]

# --- 3-year growth per community: sales-weighted median price per sq ft, last 12 complete months vs the same months 3 years earlier
#     g[community] = [annual % growth (CAGR), sales in the last 12 months]
g3 = {}
allm = sorted({m for lst in by.values() for m, v, n in lst})
if len(allm) >= 40:
    last12 = allm[-12:]
    back = {f"{int(m[:4]) - 3}{m[4:]}" for m in last12}
    for c, lst in by.items():
        a = [(v, n) for m, v, n in lst if m in last12 and n]
        b = [(v, n) for m, v, n in lst if m in back and n]
        na, nb = sum(n for v, n in a), sum(n for v, n in b)
        if na >= 60 and nb >= 30:
            pa, pb = sum(v * n for v, n in a) / na, sum(v * n for v, n in b) / nb
            g3[c] = [round(((pa / pb) ** (1 / 3) - 1) * 100, 1), na]

# --- year-on-year change in median price per sq ft (Dubai Data's published figure, last 12 months vs the year before)
yoy = {}
for r in rows("data/communities.csv"):
    if num(r.get("psf_median")) and r.get("psf_yoy") not in (None, ""):
        yoy[r["name"]] = [num(r.get("psf_median")), num(r.get("psf_yoy"), 1), num(r.get("n"))]

# --- rents and yields
rent = {}
for r in rows("data/rents_by_community.csv"):
    rent.setdefault(r["name"], {})["all"] = [num(r.get("rent_median")), num(r.get("contracts")), num(r.get("yield_pct"), 2)]
for r in rows("data/community_bedrooms.csv"):
    if not num(r.get("rent_median")): continue
    rent.setdefault(r["community"], {})[r["code"]] = [num(r.get("rent_median")), num(r.get("n_rents")), num(r.get("yield_pct"), 2),
                                                      num(r.get("sqft_median"))]

json.dump({"updated": today, "data_through": through, "source": CREDIT,
           "pf": ["dev_no", "status", "construction_pct", "dld_completion", "units", "sales", "price_median",
                  "price_q1", "price_q3", "community", "area", "quality", "psf"],
           "d": devs, "p": proj, "t": trend, "y": yoy, "r": rent, "g": g3},
          open(f"{OUT}/insights.json", "w"), separators=(",", ":"), ensure_ascii=False)
print(f"insights.json: {len(proj)} projects, {len(devs)} developers, {len(trend)} trend series, {len(rent)} rent areas, through {through}")

# --- market statistics for the full report (community vs Dubai): monthly sales, median price, median price per sq ft
#     output: checklist/data/market_stats.json
#       dm: Dubai monthly [month, psf, median price, sales]   (10 years)
#       dy: Dubai yearly  [year, sales, median price, psf]    (since 2010)
#       cm: community -> monthly rows as dm                   (5 years)
#       cy: community -> yearly rows as dy                    (since 2010)
#       op: community -> off-plan share of sales, last 12 months (%)
try:
    def mrow(r):
        return [r["month"], num(r.get("median")), num(r.get("price")), num(r.get("n_sales")) or 0]
    def yrow(r):
        return [int(r["year"]), num(r.get("n")) or 0, num(r.get("price_median")), num(r.get("psf_median"))]
    dm = [mrow(r) for r in rows("data/market_monthly.csv")]
    dy = [yrow(r) for r in rows("data/market_yearly.csv")]
    cm, cy = {}, {}
    for r in rows("data/community_monthly.csv"):
        cm.setdefault(r["community"], []).append(mrow(r))
    for r in rows("data/community_yearly.csv"):
        cy.setdefault(r["community"], []).append(yrow(r))
    op = {r["name"]: num(r.get("offplan_share"), 1) for r in rows("data/communities.csv") if r.get("offplan_share") not in (None, "")}
    for d in (cm, cy):
        for k in d: d[k].sort()
    dm.sort(); dy.sort()
    if len(dm) < 60 or len(cm) < 50:
        raise ValueError("market series too short")
    json.dump({"updated": today, "data_through": through, "source": CREDIT, "dm": dm, "dy": dy, "cm": cm, "cy": cy, "op": op},
              open(f"{OUT}/market_stats.json", "w"), separators=(",", ":"), ensure_ascii=False)
    print(f"market_stats.json: Dubai {len(dm)} months, {len(cm)} communities")
except Exception as e:
    print("market_stats.json not refreshed:", repr(e)[:120])
