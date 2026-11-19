"""Build checklist/ad.html (the Abu Dhabi Off-Plan Deal Stress Test) from checklist/index.html (Dubai).

Run after every change to checklist/index.html:   python3 tools/make_ad_checklist.py
The Abu Dhabi copy keeps the same 20 checks, scoring, report and agent mode, but:
  - reads its data from checklist/data/ad/ (Abu Dhabi files) instead of the Dubai DLD files,
  - uses Abu Dhabi's rules and wording (ADREC, DARI, Interim Real Estate Register, Madhmoun, Tawtheeq, 2% registration fee),
  - has no automatic DLD-style project / developer lookup (ADREC's project register is not open data): the buyer checks
    lines 1-7 on DARI, and the project list comes from checklist/data/ad/projects_ad.json.
"""
import os, re, sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "checklist", "index.html")
OUT = os.path.join(ROOT, "checklist", "ad.html")
s = open(SRC, encoding="utf-8").read()
miss = []

def rep(a, b, n=None, must=True):
    """replace a -> b; n = expected count (None = any >= 1)."""
    global s
    c = s.count(a)
    if (must and c == 0) or (n is not None and c != n):
        miss.append((a[:80], c)); return
    s = s.replace(a, b)

def rx(p, b, must=True, flags=0):
    global s
    s2, k = re.subn(p, b, s, flags=flags)
    if must and not k: miss.append((p[:80], 0))
    s = s2

# ---------- 1. data: Abu Dhabi files (missing files fall back to empty data) ----------
DUBAI_DATA = ["projects.json", "projects_extra.json", "psf.json", "insights.json", "market_premium.json", "market_stats.json", "outlook.json",
              "transit.json", "places.json", "resale.json", "service_charges.json", "cma.json", "place_points.json", "status.json",
              "market.json", "exit_overrides.json", "featured.json", "featured_auto.json"]
for f in DUBAI_DATA:
    s = s.replace('"data/' + f + '"', '"data/ad/' + f + '"')

# ---------- 2. emirate tabs: Abu Dhabi is the active one ----------
rep('<a href="index.html" class="on" data-em="dxb">', '<a href="index.html" data-em="dxb">', 1)
rep('<a href="ad.html" data-em="auh">', '<a href="ad.html" class="on" data-em="auh">', 1)

# ---------- 3. fees: Abu Dhabi registration fee is 2% (Dubai DLD fee 4%) ----------
rep("var dld=P*0.04,", "var dld=P*0.02,", 1)
rep("var dld=PX*0.04,", "var dld=PX*0.02,", 1)
rep("DLD fee 4% ", "Registration fee 2% ")
rep("Includes DLD 4%", "Includes the 2% registration fee")
rep("plus DLD 4%", "plus the 2% registration fee")
rep("DLD ~4%", "Registration ~2%")
rep("plus about 4% DLD fee", "plus about 2% registration fee")

# ---------- 4. no DLD-style developer lookup / EOI box in Abu Dhabi ----------
rep("function devBoxShow(){ devBox.hidden=!(EOI && !DLDFOUND);", "function devBoxShow(){ devBox.hidden=true; return; devBox.hidden=!(EOI && !DLDFOUND);", 1)
rep('id="eoiwrap"', 'id="eoiwrap" hidden style="display:none"', 1)
rep("var EOI_IDX=[2,3,4,5,6,14], EOI=false; try{ EOI=", "var EOI_IDX=[2,3,4,5,6,14], EOI=false; try{ EOI=false&&", 1)

# Abu Dhabi project search: replaces the DLD search (same input, same suggestion box)
AD_JS = r'''
  // ---------- Abu Dhabi: project list (data/ad/projects_ad.json) + DARI guidance, no automatic registry lookup ----------
  var ADP=null;
  function adLoad(cb){ if(ADP) return cb(); fetch("data/ad/projects_ad.json",{cache:"no-cache"}).then(function(r){ return r.ok?r.json():{p:[]}; }).catch(function(){ return {p:[]}; }).then(function(j){ ADP=j.p||[]; cb(); }); }
  function adPick(n,d,dev){ sg.hidden=true; pin.value=n; PROJROW=null;
    var pl=document.getElementById("ploc"); if(pl&&d&&!pl.value.trim()) pl.value=d;
    var m="Hi Sam, I'm checking "+n+" in Abu Dhabi on your Off-Plan Deal Stress Test. Can you check its ADREC registration and escrow on DARI for me?";
    card.className="dld warn";
    card.innerHTML='<b class="t">🌴 '+esc(n)+(d?' · '+esc(d):'')+'</b>'+(dev?'Developer: <b>'+esc(dev)+'</b><br>':'')+
      'ADREC doesn\'t publish its project register as open data, so please check lines 1 to 7 yourself on <b>DARI</b> (the DARI app or dari.ae): the developer\'s ADREC off-plan licence, the project\'s registration, its <b>escrow account</b> and completion status. A project being marketed needs a <b>Madhmoun</b> licence.'+
      '<a class="btn" style="margin-top:10px;font-size:17px;padding:11px 14px" href="https://wa.me/971528728248?text='+encodeURIComponent(m)+'"><svg class="lg"><use href="#waw"/></svg>Ask Sam to check it on DARI</a>';
    card.hidden=false; if(typeof holdNext==="function") holdNext(card); if(typeof update==="function") update(); }
  function search(){
    var q=pin.value.trim().toLowerCase(); if(q.length<2){ sg.hidden=true; return; }
    adLoad(function(){ if(pin.value.trim().toLowerCase()!==q) return;
      var ws=q.split(/\s+/), hits=ADP.filter(function(p){ var t=(p.n+" "+(p.d||"")+" "+(p.dev||"")+" "+(p.tags||"")).toLowerCase(); return ws.every(function(w){ return t.indexOf(w)>=0; }); });
      hits.sort(function(a,b){ var an=a.n.toLowerCase().indexOf(q)===0?0:1, bn=b.n.toLowerCase().indexOf(q)===0?0:1; return an-bn||(b.s||0)-(a.s||0); }); hits=hits.slice(0,7);
      sg.innerHTML=hits.map(function(p,k){ return '<button type="button" data-k="'+k+'">'+esc(p.n)+(p.dev?' <span class="mdev">· '+esc(p.dev)+'</span>':'')+'<small>'+esc([p.d,p.s?p.s+" sales registered with ADREC":""].filter(Boolean).join(" · "))+'</small></button>'; }).join("")+
        '<button type="button" class="adtyped">✍️ Use "'+esc(pin.value.trim())+'"'+(hits.length?' (not in this list)':'')+' ›<small>Abu Dhabi project not listed? Check it with its name as typed.</small></button>';
      Array.prototype.forEach.call(sg.querySelectorAll("button[data-k]"),function(b){ b.addEventListener("click",function(){ var p=hits[+b.dataset.k]; adPick(p.n,p.d||"",p.dev||""); }); });
      sg.querySelector(".adtyped").addEventListener("click",function(){ adPick(pin.value.trim(),"",""); });
      sg.hidden=false; sg.scrollTop=0; });
  }
  function searchDXB(){'''
rep("  function search(){\n    var q=pin.value.trim().toLowerCase(); if(q.length<2){ sg.hidden=true; return; }\n    load(function(){",
    AD_JS + "\n    var q=pin.value.trim().toLowerCase(); if(q.length<2){ sg.hidden=true; return; }\n    load(function(){", 1)
# agent mode ?proj=: open the Abu Dhabi project straight away
rep('if(m){ mktPick(m); return; } if(++tries<20&&!MKT.length) return setTimeout(mk,250); pin.dispatchEvent(new Event("input",{bubbles:true})); })(); }); }',
    'void m; adLoad(function(){ var h=ADP.filter(function(p){ return p.n.toLowerCase()===lo; })[0]; adPick(h?h.n:pj,h?h.d:"",h?h.dev:""); }); })(); }); }', 1)
# the DLD project list is empty in Abu Dhabi: don't show "checked against 0 projects"
rep('document.getElementById("dldsrc").textContent="🏛️ Checked against "+j.p.length+" DLD-registered projects (updated "+j.updated+"). Source: "+j.source+".";', 'void 0;', 1)
rep('<p class="dldsrc" id="dldsrc">🏛️ We check the project against Dubai Land Department records and tick what they confirm.</p>',
    '<p class="dldsrc" id="dldsrc">🏛️ Abu Dhabi projects are regulated by ADREC. Check the registration, escrow and completion status on DARI; prices are compared with ADREC-registered sales.</p>', 1)
# geocoding: Abu Dhabi instead of Dubai
s = s.replace("viewbox=54.85,25.40,55.65,24.70", "viewbox=54.10,24.75,55.10,24.05")
rep('m.comm||m.area||"","Dubai"]', 'm.comm||m.area||"","Abu Dhabi"]')

# ---------- 5. wording: Abu Dhabi rules and institutions ----------
W = [
 ("<title>", None),
 ("Off-Plan Deal Stress Test", "Abu Dhabi Off-Plan Deal Stress Test"),
 ("20 checks plus real DLD market data before you buy off-plan in Dubai", "20 checks plus real ADREC market data before you buy off-plan in Abu Dhabi"),
 ("20 checks plus a real DLD price per sq ft comparison", "20 checks plus a real ADREC price per sq ft comparison"),
 ("A 2-minute test against real DLD sales, not the brochure", "A 2-minute test against real ADREC sales, not the brochure"),
 ("Based on registered DLD sales across <b id=\"st1b\">770</b> projects. Updated daily.", "Based on sales registered with ADREC (Abu Dhabi Real Estate Centre)."),
 ("<span><b id=\"st1\">770</b>DLD-registered projects</span>", "<span><b>ADREC</b>regulated projects</span>"),
 ("DLD publishes sales with a delay", "ADREC publishes sales with a delay"),
 ("developer websites, property portals and Dubai REST takes about 2 minutes here", "developer websites, property portals and DARI takes about 2 minutes here"),
 ("We check it against Dubai Land Department records and <b>tick the boxes DLD confirms for you</b>.", "Then check lines 1 to 7 on <b>DARI</b>: we tell you exactly what to look for."),
 ("Dubai protects off-plan buyers well.", "Abu Dhabi protects off-plan buyers well (Law No. 3 of 2015 on escrow)."),
 ("The developer is registered with RERA", "The developer is licensed by ADREC"),
 ("A developer registered with RERA is accountable to the regulator", "A developer licensed by ADREC for off-plan sales is accountable to the regulator"),
 ("You don't need to search any registry: we check the developer against Dubai Land Department records as soon as you pick your project, or type the developer's nam", "Search the developer on DARI (app or dari.ae) and check it holds an active ADREC off-plan licence, or type the developer's nam"),
 ("Developer found on Dubai REST", "Developer found on DARI with an active ADREC licence"),
 ("Project number verified on Dubai REST", "Project registration verified on DARI"),
 ("Every off-plan project needs its own DLD registration before it can legally be sold", "Every off-plan project must be registered with ADREC (each phase separately) before it can legally be sold"),
 ("Project has an escrow account registered with DLD", "Project has an escrow account registered with ADREC"),
 ("Only a RERA-licensed agent can legally sell you property", "Only an ADREC-licensed broker can legally sell you property"),
 ("Oqood is usually paid at booking (some launches cover or share it, so ask). At handover budget for DEWA, cooling (if any) and service charges.", "The 2% registration fee is paid when your purchase is registered on DARI (some launches cover or share it, so ask). At handover budget for ADDC/TAQA utilities, cooling (if any) and service charges."),
 ("We do the DLD checks for you", "How to check lines 1 to 7 on DARI"),
 ("Checks 1 to 4 normally mean searching the developer, the project and the escrow account one by one in the Dubai REST app and on developer websites. Here they're pulled from Dubai Land Department records the moment you pick your project. If a project isn't in DLD records and isn't in its EOI / pre-launch phase, walk away.",
  "Open the DARI app or dari.ae and search the developer and the project: check the developer's ADREC off-plan licence, the project's registration, its escrow account and the completion status, and compare them with the sales material. A project being marketed needs a Madhmoun licence. If the project or its escrow account isn't on DARI, walk away."),
 ("Your purchase is registered (Oqood)", "Your purchase is registered (Interim Real Estate Register)"),
 ("Oqood is DLD's interim registration of your off-plan purchase.", "Abu Dhabi records every off-plan purchase on the Interim Real Estate Register through DARI; an off-plan sale that isn't registered there isn't legally binding."),
 ("Developer confirms your purchase will be registered (Oqood) with DLD", "Developer confirms your purchase will be registered on the Interim Real Estate Register (DARI)"),
 ("If a buyer defaults, Dubai rules let the developer keep part of what was paid", "If a buyer defaults, Abu Dhabi rules let the developer keep part of what was paid"),
 ("No DLD registration, no escrow account, no Oqood?", "No ADREC registration, no escrow account, no Interim Register entry?"),
 ("We use every sale registered with the Dubai Land Department, checked every day for new data.", "We use sales registered with the Abu Dhabi Real Estate Centre (ADREC)."),
 ("Oqood (off-plan registration) can be issued now", "Interim Register (off-plan registration) can be done now"),
 ("DEWA connection vs district cooling (chiller) fees confirmed", "ADDC/TAQA connection vs district cooling (chiller) fees confirmed"),
 ("This is a buyer checklist based on DLD records, not legal advice. Always verify your SPA, escrow account and Oqood with DLD before you pay. Data: Dubai Land Department open data via Dubai Data (CC BY 4.0), checked daily. Not an official DLD service.",
  "This is a buyer checklist, not legal advice. Always verify your SPA, the escrow account and the Interim Register entry on DARI before you pay. Data: Abu Dhabi Real Estate Centre (ADREC) market data. Not an official ADREC service."),
 ("I work with Dubai's leading developers", "I work with the UAE's leading developers"),
 ("Dubai property updates", "UAE property updates"),
 ("Nearest metro and Blue Line", "Location and access"),
 ("nearest metro and Blue Line station", "location and access"),
 ("nearest metro + Blue Line", "location and access"),
 ("Confirm current DLD conditions for your case", "Confirm the current conditions for your case"),
]
for a, b in W:
    if b is None: continue
    if a in s: s = s.replace(a, b)
    else: miss.append(("TEXT " + a[:70], 0))
# remaining generic terms in visible text (not code identifiers like DLDFOUND or data paths)
s = re.sub(r"Dubai Land Department", "ADREC", s)
s = re.sub(r"Dubai REST", "DARI", s)
s = re.sub(r"\bRERA\b", "ADREC", s)
s = re.sub(r"\bOqood\b", "Interim Register", s)
s = re.sub(r"\bEjari\b", "Tawtheeq", s)
s = re.sub(r"(?<![\w/.-])DLD(?![\w/-])", "ADREC", s)
s = s.replace("My Dubai Abu Dhabi Off-Plan", "My Abu Dhabi Off-Plan").replace("My Dubai Off-Plan", "My Abu Dhabi Off-Plan")
s = s.replace('<div class="hpill">OFF-PLAN DEAL STRESS TEST</div>', '<div class="hpill">🌴 ABU DHABI · OFF-PLAN DEAL STRESS TEST</div>')

s = s.replace("Not found? Type the full project name, then tap \u201cIt\\'s in EOI / pre-launch phase\u201d", "Not in the list? Type the full project name, then tap \u201cUse \u2026\u201d")
s = s.replace("e.g. Binghatti JVC", "e.g. Saadiyat Lagoons")
s = s.replace("(for example JVC or Dubai South)", "(for example Al Reem Island or Yas Island)")
s = s.replace("open data via Dubai Data (CC BY 4.0)", "market data")
s = s.replace("(open data via Dubai Data)", "(market data)")
if miss:
    print("NOT FOUND (check the Dubai page changed):"); [print("  ", m) for m in miss]
open(OUT, "w", encoding="utf-8").write(s)
print("wrote", OUT, len(s), "chars")
sys.exit(1 if miss else 0)
