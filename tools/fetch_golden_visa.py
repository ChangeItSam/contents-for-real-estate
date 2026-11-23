"""Daily refresh of the Golden Visa finder data (runs on GitHub Actions, see .github/workflows/dld-projects.yml).

What it builds: checklist/data/golden_visa.json
 - residential sales registered with DLD in the last 12 months where the transaction value is AED 2,000,000 or more
 - grouped per project and unit type: lowest price, number of such sales, latest sale date
 - plus DLD area, developer (joined via projects.json / projects_extra.json) and an off-plan / ready flag
Only real DLD registered sales go in. If no source answers, the old file is kept and the page falls back
to the project medians in insights.json (it never shows a made-up price).

Sources, tried in order (both are Dubai Land Department open data):
 1) DLD open data gateway (the API behind dubailand.gov.ae/en/open-data/real-estate-data), sales, month by month
 2) Dubai Pulse "DLD Transactions" open CSV (dubaipulse.gov.ae/data/dld-transactions/dld_transactions-open), streamed
"""
import csv, io, json, os, re, sys, time, datetime, urllib.request, gzip

OUT = "checklist/data"
MIN_AED = 2_000_000
TODAY = datetime.date.today()
SINCE = TODAY - datetime.timedelta(days=365)
UA = {"User-Agent": "Mozilla/5.0 (GoldenVisa finder refresh; samsuryarealty.com)"}
PULSE_CSV = os.environ.get("DLD_TX_CSV",
    "https://www.dubaipulse.gov.ae/dataset/3b25a6f5-9077-49d7-8a1e-bc6d5dea88fd/resource/a37511b0-ea36-485d-bccd-2d6cb24507e7/download/transactions.csv")
GATEWAY = "https://gateway.dubailand.gov.ae/open-data/transactions"

# Sam's priority developers (order = priority). match = words in the DLD developer legal name.
BRANDS = [
    ("Emaar", ["emaar", "dubai creek harbour", "dubai hills estate", "mina rashid properties"]),
    ("Sobha", ["sobha"]), ("DAMAC", ["damac", "island oasis"]), ("Azizi", ["azizi"]),
    ("Binghatti", ["binghatti"]), ("Danube", ["danube"]), ("Ellington", ["ellington"]),
    ("Nakheel", ["nakheel", "dubai islands l.l.c", "palm jebel ali"]), ("Meraas", ["meraas"]),
    ("Samana", ["samana"]), ("Imtiaz", ["imtiaz"]), ("Object One", ["object one"]), ("Aldar", ["aldar"]),
    ("Majid Al Futtaim", ["majid al futtaim"]), ("Wasl", ["wasl "]), ("Omniyat", ["omniyat"]),
    ("Nshama Properties", ["nshama"]), ("Arada", ["arada"]), ("Expo City Dubai", ["expo city"]),
    ("Dubai South", ["dubai south properties"]),
]

def brand(dev):
    d = (dev or "").lower() + " "
    for name, ms in BRANDS:
        if any(m in d for m in ms): return name
    return ""

def clean_dev(dev):
    d = re.sub(r"\s*\(?(l\.?\s?l\.?\s?c|p\.?\s?j\.?\s?s\.?\s?c|fz[ce]o?|dwc llc|s\.?o\.?c)\.?\)?\.?", "", dev or "", flags=re.I)
    return re.sub(r"\s+", " ", d).strip(" .,-")

# ---- project register (for developer + area)
REG, COMM = {}, {}
def load_register():
    try:  # master community per DLD project number (from fetch_dld_insights.py, runs just before this)
        for no, v in json.load(open(f"{OUT}/insights.json"))["p"].items(): COMM[str(no)] = v[9] or ""
    except Exception: pass
    for f in ("projects.json", "projects_extra.json"):
        try: rows = json.load(open(f"{OUT}/{f}"))["p"]
        except Exception: continue
        for r in rows:
            if len(r) > 2 and r[1]:
                REG.setdefault(r[1].strip().lower(), {"no": r[0], "dev": r[2], "area": r[7] if len(r) > 7 else ""})
                if r[0]: REG.setdefault("#" + str(r[0]).strip(), {"no": r[0], "dev": r[2], "area": r[7] if len(r) > 7 else ""})

# ---- normalise one transaction (both sources use similar column names)
def pick(row, *names):
    for n in names:
        v = row.get(n)
        if v not in (None, ""): return str(v).strip()
    return ""

def parse_date(s):
    s = (s or "").strip()[:19]
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M:%S", "%m/%d/%Y %H:%M:%S"):
        for part in (s, s[:10]):
            try: return datetime.datetime.strptime(part, fmt).date()
            except Exception: pass
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", s)
    return datetime.date(int(m[1]), int(m[2]), int(m[3])) if m else None

def unit_type(row):
    pt = pick(row, "property_type_en", "prop_type_en").lower()
    st = pick(row, "property_sub_type_en", "prop_sb_type_en").lower()
    usage = pick(row, "property_usage_en", "usage_en").lower()
    if usage and "resid" not in usage: return ""
    if "villa" in pt or "villa" in st or "townhouse" in st: return "V"
    if pt not in ("unit", "") or (st and not any(k in st for k in ("flat", "apartment", "residential"))): return ""
    rooms = pick(row, "rooms_en", "rooms").lower()
    if "studio" in rooms: return "S"
    m = re.match(r"(\d+)", rooms)
    if not m: return ""
    n = int(m[1]); return "4" if n >= 4 else str(n)

def is_sale(row):
    grp = pick(row, "trans_group_en", "group_en").lower()
    proc = pick(row, "procedure_name_en", "procedure_en").lower()
    if grp and "sale" not in grp: return False
    return ("sell" in proc or "sale" in proc) and not any(k in proc for k in ("mortgage", "development", "lease", "grant", "gift"))

AGG = {}  # key (project, type) -> [min, n, last, area, offplan, regno]
SEEN = set()
def add(row):
    if not is_sale(row): return
    try: val = float(pick(row, "actual_worth", "trans_value", "amount").replace(",", ""))
    except ValueError: return
    if val < MIN_AED: return
    d = parse_date(pick(row, "instance_date", "transaction_date"))
    if not d or d < SINCE or d > TODAY: return
    tid = pick(row, "transaction_id", "transaction_number")
    if tid:
        if tid in SEEN: return
        SEEN.add(tid)
    t = unit_type(row)
    if not t: return
    proj = pick(row, "project_name_en", "project_en") or pick(row, "building_name_en")
    if not proj: return
    regno = pick(row, "project_number")
    off = 1 if "off" in pick(row, "reg_type_en", "is_offplan_en").lower() else 0
    area = pick(row, "area_name_en", "area_en")
    k = (proj.strip(), t)
    a = AGG.get(k)
    if not a: AGG[k] = [val, 1, d, area, off, regno]
    else:
        a[0] = min(a[0], val); a[1] += 1; a[2] = max(a[2], d); a[4] = a[4] or off; a[5] = a[5] or regno

# ---- source 1: DLD open data gateway (JSON, paged)
def gateway():
    got, start = 0, SINCE
    while start <= TODAY:
        end = min(start + datetime.timedelta(days=13), TODAY)
        skip = 0
        while True:
            body = {"P_FROM_DATE": start.strftime("%m/%d/%Y"), "P_TO_DATE": end.strftime("%m/%d/%Y"), "P_GROUP_ID": "1",
                    "P_IS_OFFPLAN": "", "P_IS_FREE_HOLD": "", "P_AREA_ID": "", "P_USAGE_ID": "", "P_PROP_TYPE_ID": "",
                    "P_TAKE": "1000", "P_SKIP": str(skip), "P_SORT": "TRANSACTION_NUMBER_ASC"}
            req = urllib.request.Request(GATEWAY, data=json.dumps(body).encode(), headers={**UA, "Content-Type": "application/json", "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=90) as r: js = json.loads(r.read().decode("utf-8", "replace"))
            res = find_list(js)
            if res is None: raise ValueError("gateway: no result list in response")
            for x in res: add({k.lower(): v for k, v in x.items()})
            got += len(res)
            if len(res) < 1000: break
            skip += 1000; time.sleep(0.3)
        start = end + datetime.timedelta(days=1)
    if got < 1000: raise ValueError(f"gateway: only {got} sales")
    return got

def find_list(js):
    if isinstance(js, list) and (not js or isinstance(js[0], dict)): return js
    if isinstance(js, dict):
        for k in ("result", "data", "response", "Result", "Data"):
            if k in js:
                r = find_list(js[k])
                if r is not None: return r
    return None

# ---- source 2: Dubai Pulse open CSV (full history; streamed, only last 12 months kept)
def pulse():
    req = urllib.request.Request(PULSE_CSV, headers=UA)
    r = urllib.request.urlopen(req, timeout=180)
    raw = gzip.GzipFile(fileobj=r) if PULSE_CSV.endswith(".gz") else r
    txt = io.TextIOWrapper(raw, encoding="utf-8-sig", errors="replace", newline="")
    head = txt.read(15)
    if head.lower().startswith(("<!doctype", "<html")): raise ValueError("pulse: got HTML, not CSV")
    rd = csv.DictReader(_chain(head, txt))
    n = 0
    for row in rd:
        add({(k or "").strip().lower(): v for k, v in row.items()}); n += 1
    if n < 1000: raise ValueError(f"pulse: only {n} rows")
    return n

def _chain(head, f):
    first = True
    for line in f:
        if first: yield head + line; first = False
        else: yield line

def build(source, credit):
    load_register()
    projects = {}
    for (proj, t), (mn, n, last, area, off, regno) in AGG.items():
        reg = REG.get("#" + regno) if regno else None
        reg = reg or REG.get(proj.lower()) or {}
        p = projects.setdefault(proj, {"dev": reg.get("dev", ""), "area": area or reg.get("area", ""), "comm": COMM.get(str(regno or reg.get("no", "")), ""), "off": 0, "u": {}, "last": ""})
        p["off"] = p["off"] or off
        p["u"][t] = [int(round(mn)), n, last.isoformat()]
        p["last"] = max(p["last"], last.isoformat())
    order = {"S": 0, "1": 1, "2": 2, "3": 3, "4": 4, "V": 5}
    rows = []
    for name, p in projects.items():
        b = brand(p["dev"])
        units = [[t] + v for t, v in sorted(p["u"].items(), key=lambda kv: order[kv[0]])]
        rows.append([name, b or clean_dev(p["dev"]), 1 if b else 0, p["area"], p["comm"], p["off"], units])
    rows.sort(key=lambda r: r[0].lower())
    through = max((p["last"] for p in projects.values()), default="")
    out = {"updated": TODAY.isoformat(), "data_through": through, "since": SINCE.isoformat(), "min_aed": MIN_AED,
           "source": credit, "via": source,
           "f": ["project", "developer", "is_brand", "area", "community", "offplan", "units[type,min_aed,sales,last_sale]"],
           "types": {"S": "Studio", "1": "1-bed", "2": "2-bed", "3": "3-bed", "4": "4-bed+", "V": "Villa / townhouse"},
           "p": rows}
    json.dump(out, open(f"{OUT}/golden_visa.json", "w"), separators=(",", ":"), ensure_ascii=False)
    return len(rows), through

if __name__ == "__main__":
    errors = []
    for key, fn, credit in (("dld-gateway", gateway, "Dubai Land Department open data (dubailand.gov.ae)"),
                            ("dubaipulse", pulse, "Dubai Land Department open data (Dubai Pulse, DLD Transactions)")):
        AGG.clear(); SEEN.clear()
        try:
            n = fn()
            if len(AGG) < 20: raise ValueError(f"{key}: only {len(AGG)} project/unit groups at AED 2M+")
            projects, through = build(key, credit)
            print(f"golden_visa.json: {projects} projects from {n} sales rows via {key}, data through {through}")
            sys.exit(0)
        except Exception as e:
            errors.append(f"{key}: {e!r}"[:300]); print("source failed:", errors[-1])
    print("No DLD transaction source answered; keeping the old golden_visa.json (if any).", errors)
    sys.exit(1)
