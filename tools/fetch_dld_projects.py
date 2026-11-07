"""Download the Dubai Land Department project register (open data, Dubai Pulse) and save a compact
JSON for the Deal Test page. Runs on GitHub Actions weekly. Source: DLD open data, CC BY 4.0."""
import csv, io, json, sys, urllib.request, datetime, os
URLS = [
  "https://www.dubaipulse.gov.ae/dataset/0b782e64-5950-4507-8f6e-02a0c30c7054/resource/db35b0cd-d291-4dde-b176-9b8d5765c7d9/download/projects.csv",
]
OUT = "checklist/data"
os.makedirs(OUT, exist_ok=True)
status = {"checked_at": datetime.datetime.utcnow().isoformat() + "Z", "ok": False}
raw = None
for u in URLS:
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (DealTest; contact WhatsApp +971528728248)"})
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read(); status["source"] = u; status["http"] = r.status; status["content_type"] = r.headers.get("Content-Type")
        break
    except Exception as e:
        status.setdefault("errors", []).append(f"{u}: {e}")
if raw is None or raw[:15].lower().startswith((b"<!doctype", b"<html")):
    if raw is not None: status.setdefault("errors", []).append("got HTML, not CSV: " + raw[:300].decode("utf8", "replace"))
    json.dump(status, open(f"{OUT}/status.json", "w"), indent=1); print(status); sys.exit(0)
text = raw.decode("utf-8-sig", "replace")
rows = list(csv.DictReader(io.StringIO(text)))
cols = list(rows[0].keys()) if rows else []
status.update(ok=True, rows=len(rows), columns=cols)
def pick(*names):
    for n in names:
        for c in cols:
            if c.strip().lower() == n: return c
    return None
C = {k: pick(*v) for k, v in {
    "no": ("project_number", "project number"), "name": ("project_name", "project_name_en", "project name"),
    "dev": ("developer_name", "developer_name_en", "developer name"), "mdev": ("master_developer_name", "master_developer_name_en"),
    "status": ("project_status", "project status"), "pct": ("percent_completed", "completed (%)", "percent_complete"),
    "escrow_bank": ("escrow_agent_name", "escrow_agent_name_en"), "escrow_no": ("escrow_account_number", "escrow account number"),
    "start": ("project_start_date", "start date"), "end": ("project_end_date", "end date", "completion_date"),
    "area": ("area_name_en", "area_name", "area"), "master": ("master_project_en", "master_project")}.items()}
status["mapped"] = C
out = []
for r in rows:
    g = lambda k: (r.get(C[k]) or "").strip() if C[k] else ""
    if not g("name"): continue
    out.append([g("no"), g("name"), g("dev") or g("mdev"), g("status"), g("pct"), g("escrow_bank"), g("escrow_no"), g("end"), g("area"), g("master")])
json.dump({"updated": status["checked_at"][:10], "fields": ["no", "name", "dev", "status", "pct", "escrow_bank", "escrow_no", "end", "area", "master"], "p": out},
          open(f"{OUT}/projects.json", "w"), separators=(",", ":"), ensure_ascii=False)
status["kept"] = len(out); status["sample"] = rows[:2]
json.dump(status, open(f"{OUT}/status.json", "w"), indent=1, ensure_ascii=False)
print(json.dumps({k: status[k] for k in ("rows", "kept", "mapped")}, indent=1))
