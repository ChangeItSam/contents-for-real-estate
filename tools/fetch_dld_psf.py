"""Daily refresh of price-per-sq-ft comparables for the Deal Test (questions 19-20). Runs on GitHub Actions.
Source: Dubai Land Department open data, cleaned by Dubai Data (datadubai.ae, CC BY 4.0), GitHub mirror.
Output: checklist/data/psf.json
 - p: off-plan projects (DLD status Active = not handed over) with their median sale price per sq ft
 - c / a: median price per sq ft of each master community / DLD area (last 12 complete months, all sales)
The page averages the comparable projects itself, in this order:
 1) same location + same developer grade, 2) any other off-plan project in the location, 3) location median."""
import csv, io, json, re, os, datetime, urllib.request
BASES = ["https://huggingface.co/datasets/datadubai/dubai-real-estate-dld/resolve/main/", "https://raw.githubusercontent.com/datadubai/dubai-real-estate-dld/main/"]  # Hugging Face gets new weeks first; GitHub mirror as fallback
OUT = "checklist/data"
CREDIT = "Dubai Land Department open data via Dubai Data (datadubai.ae), CC BY 4.0"

def get(path):
    last = None
    for base in BASES:
        try:
            req = urllib.request.Request(base + path, headers={"User-Agent": "Mozilla/5.0 (DealTest PSF refresh)"})
            with urllib.request.urlopen(req, timeout=90) as r:
                txt = r.read().decode("utf-8-sig", "replace")
            if txt.lstrip()[:15].lower().startswith(("<!doctype", "<html")): raise ValueError("HTML, not data")
            return txt
        except Exception as e:
            last = e; print("source failed:", base, path, repr(e)[:80])
    raise last

def rows(path):
    return list(csv.DictReader(io.StringIO(get(path))))

def num(x):
    try: return round(float(x))
    except Exception: return None

grades = json.load(open(f"{OUT}/developer_grades.json"))
def grade(dev):
    d = (dev or "").lower()
    return "A" if any(m in d for g in grades["A"] for m in g["match"]) else "B"

through = ""
try:
    m = re.search(r"Data through:\*\*\s*([0-9-]+)", get("README.md"))
    through = m.group(1) if m else ""
except Exception:
    pass

projects = []
for r in rows("data/projects.csv"):
    psf = num(r.get("psf_median"))
    if r.get("status", "").strip().lower() != "active" or not psf: continue
    if (r.get("quality") or "ok") != "ok": continue
    try:
        if float(r.get("completion") or 0) >= 100: continue
    except ValueError:
        pass
    street = r.get("street") or ""
    area = (r.get("area_name") or "").strip() or (street.rsplit(",", 1)[-1].strip() if "," in street else "")
    projects.append([r["pn"], r["name"].strip(), r.get("developer", "").strip(), grade(r.get("developer")),
                     (r.get("community") or "").strip(), area, psf, int(float(r.get("n") or 0))])
projects.sort(key=lambda x: x[1].lower())
if len(projects) < 100:
    raise SystemExit(f"only {len(projects)} off-plan projects with PSF, keeping the old file")

comm = {r["name"]: num(r["psf_median"]) for r in rows("data/communities.csv") if num(r.get("psf_median"))}
areas = {r["name"]: num(r["psf_median"]) for r in rows("data/areas.csv") if num(r.get("psf_median"))}

json.dump({"updated": datetime.date.today().isoformat(), "data_through": through, "source": CREDIT,
           "f": ["no", "name", "dev", "grade", "community", "area", "psf", "sales"],
           "p": projects, "c": comm, "a": areas},
          open(f"{OUT}/psf.json", "w"), separators=(",", ":"), ensure_ascii=False)
print(f"psf.json: {len(projects)} off-plan projects, {len(comm)} communities, {len(areas)} areas, data through {through}")
