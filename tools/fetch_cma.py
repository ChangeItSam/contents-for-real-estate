"""Weekly refresh of like-for-like (apple-to-apple) comparables for the Stress Test report. Runs on GitHub Actions.
Source: Dubai Land Department open data via Dubai Data (datadubai.ae, CC BY 4.0): one JSON per project.
Output: checklist/data/cma.json
  p[project_no] = [class, {bedroom_code: [median AED/sqft, sales, median size sqft]}]
  class: "apt" (flats / apartments), "villa" (DLD records townhouses as villas too), or "th" when the project
  name or its recent sales say townhouse.
Only off-plan projects (those in checklist/data/psf.json) are fetched."""
import csv, io, json, re, time, datetime, urllib.request
OUT = "checklist/data"
UA = {"User-Agent": "Mozilla/5.0 (DealTest CMA refresh)"}


def get(url, t=60):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        return r.read().decode("utf-8-sig", "replace")


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
slug = {r["pn"]: r.get("slug") for r in src if r.get("slug")}
want = [r[0] for r in json.load(open(f"{OUT}/psf.json"))["p"]]
try:
    old = json.load(open(f"{OUT}/cma.json"))["p"]
except Exception:
    old = {}
out, fail = {}, 0
for no in want:
    s = slug.get(no)
    if not s:
        continue
    try:
        j = json.loads(get(f"https://datadubai.ae/projects/{s}.json", 40))
    except Exception as e:
        fail += 1
        if fail <= 3:
            print("fetch failed", s, e)
        if no in old:
            out[no] = old[no]
        continue
    props = " | ".join((x.get("property") or "") for x in (j.get("recent_sales") or [])).lower()
    nv = props.count("villa") + props.count("townhouse")
    nf = props.count("flat") + props.count("apartment") + props.count("unit")
    cls = "villa" if nv > nf else "apt"
    if cls == "villa" and re.search(r"town ?house", props + " " + s.replace("-", " ")):
        cls = "th"
    beds = {}
    for b in j.get("bedrooms") or []:
        if b.get("psf_median") and (b.get("n") or 0) >= 3:
            beds[b["code"]] = [round(b["psf_median"]), b.get("n") or 0, round(b.get("sqft_median") or 0)]
    if beds:
        out[no] = [cls, beds]
    time.sleep(0.3)
print(f"projects: {len(out)} with bedroom data, {fail} fetch failures")
if len(out) < 50:
    raise SystemExit("too few, keeping the old file")
json.dump({"updated": datetime.date.today().isoformat(),
           "source": "Dubai Land Department open data via Dubai Data (datadubai.ae), CC BY 4.0",
           "f": ["class (apt / villa / th)", "bedrooms: code -> [median AED/sqft, sales, median sqft]"], "p": out},
          open(f"{OUT}/cma.json", "w"), separators=(",", ":"), ensure_ascii=False)
