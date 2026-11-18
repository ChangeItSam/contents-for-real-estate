"""Weekly refresh of the Premium market dashboard in the Stress Test full report. Runs on GitHub Actions.
Source: Dubai Land Department open data via Dubai Data (datadubai.ae, CC BY 4.0): projects.csv plus one JSON per project.
Output: checklist/data/market_premium.json

Off-plan sales are counted from DLD-registered projects, month by month, up to each project's DLD completion month
(sales after completion are ready resales and are left out). Value, median price and per-sq-ft figures are built
from each project's monthly median, weighted by its sales, so they are close estimates, not deed-level totals.

  dubai / c[community]:
    m:   last 24 months  [month, sales, value AED, median price, median AED/sqft]
    tp:  top 10 projects by off-plan sales (all months in the data, up to completion)   [name, sales]
    ta:  (dubai only) top 10 communities by off-plan sales, last 10 years  [name, sales]
    am:  (dubai only) busiest communities in the latest month              [name, sales]
    ay:  (dubai only) busiest communities this year so far                 [name, sales]
    pm:  best-selling projects in the latest month                         [name, sales]
    pd:  sales by price band, last 6 complete months                       [sales per band]
    sd:  sales by size band (sq ft), last 6 complete months                [sales per band]
    split: latest month [apartments and other units, villas and townhouses]
"""
import csv, io, json, re, time, datetime, urllib.request
from collections import defaultdict

OUT = "checklist/data"
UA = {"User-Agent": "Mozilla/5.0 (StressTest market refresh)"}
PB = [0, 6e5, 7e5, 8e5, 1e6, 1.5e6, 2e6, 3e6, 5e6, 1e7, 2e7, 5e7, 1e8]
PBL = ["0-600K", "600K-700K", "700K-800K", "800K-1M", "1M-1.5M", "1.5M-2M", "2M-3M", "3M-5M", "5M-10M", "10M-20M", "20M-50M", "50M-100M", "100M+"]
SB = [0, 500, 800, 1000, 1300, 1600, 2100, 2700, 3200, 4300, 6000]
SBL = ["0-500", "500-800", "800-1,000", "1,000-1,300", "1,300-1,600", "1,600-2,100", "2,100-2,700", "2,700-3,200", "3,200-4,300", "4,300-6,000", "6,000+"]


def get(url, t=60):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        return r.read().decode("utf-8-sig", "replace")


def band(v, edges):
    i = 0
    while i + 1 < len(edges) and v >= edges[i + 1]:
        i += 1
    return i


def wmedian(pairs):
    pairs = sorted((v, w) for v, w in pairs if v and w)
    tot = sum(w for v, w in pairs)
    if not tot:
        return None
    acc = 0
    for v, w in pairs:
        acc += w
        if acc >= tot / 2:
            return round(v)


src = None
for base in ["https://huggingface.co/datasets/datadubai/dubai-real-estate-dld/resolve/main/",
             "https://raw.githubusercontent.com/datadubai/dubai-real-estate-dld/main/"]:
    try:
        src = list(csv.DictReader(io.StringIO(get(base + "data/projects.csv"))))
        break
    except Exception as e:
        print("projects.csv failed", base, e)
if not src:
    raise SystemExit("no projects.csv")

proj, fail = [], 0
for r in src:
    s = r.get("slug")
    if not s:
        continue
    try:
        j = json.loads(get(f"https://datadubai.ae/projects/{s}.json", 40))
    except Exception as e:
        fail += 1
        if fail <= 3:
            print("fetch failed", s, e)
        continue
    cd = (r.get("completion_date") or "")[:7]
    st = (r.get("status") or "").strip()
    rs = " | ".join((x.get("property") or "") for x in (j.get("recent_sales") or [])).lower()
    beds = j.get("bedrooms") or []
    villa = (rs.count("villa") + rs.count("townhouse") > rs.count("flat") + rs.count("apartment") + rs.count("unit")) or \
        any(re.search(r"villa|town", (b.get("label") or "").lower()) for b in beds)
    mon = []
    for x in j.get("psf_monthly") or []:
        m = x.get("month") or ""
        if st == "Finished" and cd and m > cd:
            continue  # after completion: ready resales, not off-plan
        n = x.get("n_sales") or 0
        if n:
            mon.append([m, n, x.get("price") or 0, x.get("median") or 0])
    proj.append({"name": (r.get("name") or "").strip(), "c": (r.get("community") or "").strip() or (r.get("area_name") or "").strip(),
                 "n": sum(x[1] for x in mon), "villa": villa, "m": mon})
    time.sleep(0.25)
print(f"projects fetched: {len(proj)}, failures: {fail}")
if len(proj) < 300:
    raise SystemExit("too few projects, keeping the old file")

months = sorted({m for p in proj for m, *_ in p["m"]})
today = datetime.date.today().strftime("%Y-%m")
months = [m for m in months if m < today]  # complete months only
last = months[-1]
m24, m6 = months[-24:], set(months[-6:])
y0 = str(int(last[:4]) - 10) + last[4:]


def block(ps, top_areas=False):
    b = {}
    rows = []
    for m in m24:
        cells = [(x[2], x[1], x[3]) for p in ps for x in p["m"] if x[0] == m]
        n = sum(c[1] for c in cells)
        rows.append([m, n, round(sum(c[0] * c[1] for c in cells)), wmedian([(c[0], c[1]) for c in cells]),
                     wmedian([(c[2], c[1]) for c in cells])])
    b["m"] = rows
    b["tp"] = [[p["name"], p["n"]] for p in sorted(ps, key=lambda p: -p["n"])[:10] if p["n"]]
    lm = [(p["name"], sum(x[1] for x in p["m"] if x[0] == last)) for p in ps]
    b["pm"] = [[a, n] for a, n in sorted(lm, key=lambda z: -z[1])[:10] if n]
    pd, sd = [0] * len(PBL), [0] * len(SBL)
    for p in ps:
        for m, n, pr, psf in p["m"]:
            if m in m6 and pr:
                pd[band(pr, PB)] += n
                if psf:
                    sd[band(pr / psf, SB)] += n
    b["pd"], b["sd"] = pd, sd
    v = sum(x[1] for p in ps if p["villa"] for x in p["m"] if x[0] == last)
    b["split"] = [sum(x[1] for p in ps for x in p["m"] if x[0] == last) - v, v]
    if top_areas:
        agg = lambda f: sorted(((c, sum(x[1] for p in ps if p["c"] == c for x in p["m"] if f(x[0]))) for c in {p["c"] for p in ps if p["c"]}), key=lambda z: -z[1])
        b["ta"] = [[c, n] for c, n in agg(lambda m: m > y0)[:10] if n]
        b["am"] = [[c, n] for c, n in agg(lambda m: m == last)[:10] if n]
        b["ay"] = [[c, n] for c, n in agg(lambda m: m[:4] == last[:4])[:10] if n]
    return b


bycomm = defaultdict(list)
for p in proj:
    if p["c"]:
        bycomm[p["c"]].append(p)
out = {"updated": datetime.date.today().isoformat(), "last": last,
       "source": "Dubai Land Department open data via Dubai Data (datadubai.ae), CC BY 4.0",
       "pb": PBL, "sb": SBL, "dubai": block(proj, True),
       "c": {c: block(ps) for c, ps in bycomm.items() if sum(x[1] for p in ps for x in p["m"]) >= 30}}
json.dump(out, open(f"{OUT}/market_premium.json", "w"), separators=(",", ":"), ensure_ascii=False)
print(f"market_premium.json: through {last}, {len(out['c'])} communities")
