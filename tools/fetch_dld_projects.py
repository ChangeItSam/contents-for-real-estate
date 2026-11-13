"""Daily refresh of the DLD project register for the Deal Test page (runs on GitHub Actions).
1) Official Dubai Pulse CSV (DLD open data). 2) Fallback: Dubai Data mirror of the DLD project
registry (datadubai.ae, CC BY 4.0). Output: checklist/data/projects.json + status.json."""
import csv, io, json, sys, urllib.request, datetime, os
OUT = "checklist/data"; os.makedirs(OUT, exist_ok=True)
SOURCES = [
  ("dubaipulse", "https://www.dubaipulse.gov.ae/dataset/0b782e64-5950-4507-8f6e-02a0c30c7054/resource/db35b0cd-d291-4dde-b176-9b8d5765c7d9/download/projects.csv",
   "Dubai Land Department open data (Dubai Pulse)"),
  ("datadubai-hf", "https://huggingface.co/datasets/datadubai/dubai-real-estate-dld/resolve/main/data/projects.csv",
   "Dubai Land Department open data via Dubai Data (datadubai.ae), CC BY 4.0"),
  ("datadubai", "https://raw.githubusercontent.com/datadubai/dubai-real-estate-dld/main/data/projects.csv",
   "Dubai Land Department open data via Dubai Data (datadubai.ae), CC BY 4.0"),
]
status = {"checked_at": datetime.datetime.utcnow().isoformat() + "Z", "ok": False, "errors": []}
def get(u):
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (DealTest refresh)"})
    with urllib.request.urlopen(req, timeout=60) as r: return r.read()
def col(cols, *names):
    for n in names:
        for c in cols:
            if c.strip().lower() == n: return c
    return None
def build_featured(out):
    """Newest active project of each priority developer (registered within max_age_days), in priority order."""
    try: cfg = json.load(open(f"{OUT}/developers.json"))
    except Exception as e: return f"no developers.json: {e}"
    cutoff = (datetime.date.today() - datetime.timedelta(days=cfg.get("max_age_days", 365))).isoformat()
    feat = []
    for d in sorted(cfg["developers"], key=lambda x: x["priority"]):
        cands = [r for r in out if "active" in r[3].lower() and r[8] and r[8] >= cutoff and any(m in r[2].lower() for m in d["match"])]
        if not cands: continue
        r = max(cands, key=lambda r: r[8])
        feat.append({"name": r[1], "search": r[1], "developer": d["name"], "priority": d["priority"], "registered": r[8], "no": r[0]})
        if len(feat) >= cfg.get("show", 6): break
    json.dump({"updated": status["checked_at"][:10], "featured": feat}, open(f"{OUT}/featured_auto.json", "w"), indent=1, ensure_ascii=False)
    return [f["developer"] + ": " + f["name"] for f in feat]
for key, url, credit in SOURCES:
    try:
        raw = get(url)
        if raw[:15].lower().startswith((b"<!doctype", b"<html")): raise ValueError("got HTML, not CSV")
        rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig", "replace"))))
        cols = list(rows[0].keys())
        C = {k: col(cols, *v) for k, v in {
            "no": ("project_number", "pn", "project number"), "name": ("project_name", "project_name_en", "name", "project name"),
            "dev": ("developer_name", "developer_name_en", "developer"), "status": ("project_status", "status"),
            "pct": ("percent_completed", "completion", "completed (%)"), "escrow": ("escrow_agent_name", "escrow"),
            "end": ("completion_date", "project_end_date"), "area": ("area_name_en", "community", "area_name"),
            "reg": ("registration_date", "adoption_date", "project_start_date", "start_date")}.items()}
        if not C["name"]: raise ValueError(f"no name column in {cols}")
        out = []
        for r in rows:
            g = lambda k: (r.get(C[k]) or "").strip() if C[k] else ""
            if g("name"): out.append([g("no"), g("name"), g("dev"), g("status"), g("pct"), g("escrow"), g("end"), g("area"), g("reg")[:10]])
        if len(out) < 100: raise ValueError(f"only {len(out)} rows")
        out.sort(key=lambda x: x[1].lower())
        json.dump({"updated": status["checked_at"][:10], "source": credit, "f": ["no", "name", "dev", "status", "pct", "escrow", "end", "area", "reg"], "p": out},
                  open(f"{OUT}/projects.json", "w"), separators=(",", ":"), ensure_ascii=False)
        status.update(ok=True, source=key, rows=len(out), mapped=C)
        status["featured"] = build_featured(out); break
    except Exception as e:
        status["errors"].append(f"{key}: {e}")
json.dump(status, open(f"{OUT}/status.json", "w"), indent=1)
print(json.dumps(status, indent=1))
