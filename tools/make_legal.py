"""Builds the legal pages (shared by samsuryarealty.com and dealproagent.com):
   /legal/                      index
   /legal/terms/                Terms & Conditions
   /legal/privacy/              Privacy Policy
   /legal/refunds/              Cancellation & Refund Policy
Edit the texts below, then run:  python3 tools/make_legal.py
"""
import os, html

ROOT = os.path.join(os.path.dirname(__file__), "..")
UPDATED = "19 November 2026"
OP = "SURYA TAMANG Marketing Management"
LIC = "Trader Licence no. 1661461, issued by the Department of Economy and Tourism, Dubai"
WA = "+971 52 872 8248"
WAL = "https://wa.me/971528728248?text=" + "Hi%20Sam%2C%20I%20have%20a%20question%20about%20your%20terms%20%2F%20privacy."

def contact():
    return f'<p>WhatsApp: <a href="{WAL}">{WA}</a> (messages answered on working days, usually within 24 hours).</p>'

PAGES = {}

PAGES["terms"] = ("Terms & Conditions", f"""
<p class="lead">These terms apply when you use <b>samsuryarealty.com</b> (including the Off-Plan Deal Stress Test, Picks and Premium) or <b>dealproagent.com</b> (DealPro Agent), together "the Services". By using the Services, creating an account or paying for a plan, you agree to them.</p>

<h2>1. Who we are</h2>
<p>The Services are operated by <b>{OP}</b>, a sole establishment owned by Surya Narayan Tamang ("Sam Surya"), holding {LIC} ("we", "us").</p>
{contact()}

<h2>2. What the Services are</h2>
<ul>
<li><b>Off-Plan Deal Stress Test</b>: a free buyer checklist that scores an off-plan project from your answers and from public market data.</li>
<li><b>Premium</b> (buyers): full reports for up to 10 different projects a month.</li>
<li><b>DealPro Agent</b> (real estate agents): branded deal reports for your clients, market statistics, Where to focus, upcoming supply, news and the price map.</li>
</ul>
<p>The Services are information tools. <b>They are not financial, investment, legal or valuation advice</b>, and a score or verdict is not a recommendation to buy or sell. Always check the SPA, the escrow account and the registration with the developer and the authorities before paying, and take professional advice where you need it.</p>

<h2>3. Data sources</h2>
<p>Dubai market figures come from Dubai Land Department open data published through Dubai Data under the CC BY 4.0 licence, and from developers' official launch information. Abu Dhabi figures, where shown, come from the Abu Dhabi Real Estate Centre (ADREC). We are <b>not</b> an official service of the Dubai Land Department, RERA, ADREC or any developer. Public data can be delayed, incomplete or corrected by its publisher, and estimates (for example exit scenarios, property type or handover year) are projections, not guarantees. We do our best to keep the data accurate but do not guarantee it.</p>

<h2>4. Accounts (DealPro Agent)</h2>
<ul>
<li>You must be 18 or over and give true details: your name, agency, BRN, WhatsApp number, email and photo.</li>
<li>DealPro Agent is for <b>licensed real estate professionals</b>. You are responsible for holding a valid licence for the market you work in (for Dubai, a RERA broker registration) and for following the rules that apply to you, including advertising and marketing rules.</li>
<li>One account is for one person. Don't share your login. You are responsible for activity on your account and for keeping your password safe.</li>
<li>Reports you send carry your name, BRN, photo and number. You are responsible for how you use and present them to clients. Don't edit a report to change its figures or present it as an official document.</li>
<li>We may suspend or close an account that breaks these terms, gives false details, shares access or misuses the Services.</li>
</ul>

<h2>5. Free trial (DealPro Agent)</h2>
<p>After you verify your email you can run up to 3 different projects free. Trial reports show Sam Surya's name and number and a "FREE TRIAL" watermark, so clients who open them may contact Sam Surya. To remove the watermark and brand reports with your own details, subscribe to a paid plan.</p>

<h2>6. Plans and prices</h2>
<ul>
<li><b>Premium</b>: AED 49 a month, up to 10 different projects a month.</li>
<li><b>Agent Pro</b>: AED 199 a month, up to 30 different projects a month. Extra projects: AED 19 each (top-up).</li>
<li><b>Agent Unlimited</b>: AED 299 a month, unlimited projects.</li>
</ul>
<p>A "project" is each different project you run a full report on in a calendar month; opening the same project again in that month doesn't count twice. Prices are in UAE dirhams and are the total you pay. If we register for VAT, prices will be shown inclusive of 5% VAT and invoices will show the VAT amount. We may change prices for future periods; a change never affects a period you have already paid for, and we will show the new price before you renew.</p>

<h2>7. Payment and renewal</h2>
<p>Payments are made through our payment provider (Ziina) by card or Apple Pay; we never see or store your card details. A plan runs for one month from activation. <b>Plans do not renew automatically</b>: you pay again to renew, and if you don't, the plan simply ends on its end date. Report links you have sent to clients may stop opening after your plan ends. Ziina charges us a processing fee on each payment; it is included in our prices and not added to what you pay. Cancellations and refunds are covered by our <a href="/legal/refunds/">Cancellation &amp; Refund Policy</a>.</p>

<h2>8. Acceptable use</h2>
<p>Don't copy, scrape, resell or republish the Services or their data in bulk; don't try to get around plan limits, access controls or the trial watermark; don't use the Services for anything unlawful, misleading or harmful; don't upload content you don't have the right to use (for example someone else's photo).</p>

<h2>9. Intellectual property</h2>
<p>The Services, their design, texts, scoring method, reports and the DealPro Agent and SamSurya Realty names and logos belong to us. Third-party data remains subject to its own licence (for example CC BY 4.0 for Dubai Land Department open data). You may share reports with your own clients for their property decisions.</p>

<h2>10. Liability</h2>
<p>We provide the Services "as is". To the extent the law allows, we are not liable for decisions made using the Services, for losses arising from data errors or delays, or for indirect or consequential losses, and our total liability to you is limited to the amount you paid us in the month before the claim. Nothing in these terms limits rights you have under UAE consumer protection law that cannot be limited.</p>

<h2>11. Privacy</h2>
<p>How we handle personal data is explained in our <a href="/legal/privacy/">Privacy Policy</a>.</p>

<h2>12. Changes</h2>
<p>We may update these terms. The date at the top shows the latest version. Significant changes will be shown on the site or sent to account holders before they apply.</p>

<h2>13. Law and disputes</h2>
<p>These terms are governed by the laws of the Emirate of Dubai and the federal laws of the UAE. Please contact us first so we can try to resolve any issue; otherwise the courts of Dubai have jurisdiction.</p>
""")

PAGES["privacy"] = ("Privacy Policy", f"""
<p class="lead">This policy explains what personal data we collect through <b>samsuryarealty.com</b> and <b>dealproagent.com</b>, why, and your rights under the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021).</p>

<h2>1. Who is responsible</h2>
<p><b>{OP}</b> ({LIC}), owned by Surya Narayan Tamang ("Sam Surya").</p>
{contact()}

<h2>2. What we collect</h2>
<h3>Buyers using the Stress Test, Picks or Premium</h3>
<ul>
<li>Your name, WhatsApp number and whether you are a buyer or an agent, when you ask for your result or report.</li>
<li>The project you check, your answers and your score, and optional details you type (price, size, payment plan, area, rent).</li>
</ul>
<h3>Agents using DealPro Agent</h3>
<ul>
<li>Account details: name, agency, BRN, WhatsApp number, email address and photo.</li>
<li>Your password is never stored as typed: we keep only a salted, one-way scrambled version.</li>
<li>Usage: the projects you run reports on, the month, and the client name you choose to add (optional).</li>
<li>Payments: the plan, the date and the receipt you send us. Card details are handled by Ziina and never reach us.</li>
</ul>
<h3>On your device</h3>
<p>The sites save a few settings in your browser's local storage (for example your login session, recent reports and form entries) so you don't have to retype them. We don't use advertising cookies or trackers.</p>

<h2>3. Why we use it</h2>
<ul>
<li>To give you your result, report or account, and to count plan usage (this is needed to provide the service you asked for).</li>
<li>To send you your result and, if you agree, property updates on WhatsApp. Reply STOP at any time to stop updates.</li>
<li>To verify agents' email addresses, reset passwords and activate paid plans.</li>
<li>To show agents' name, BRN, photo and number on the reports they send to their clients.</li>
<li>To keep the Services secure and to meet legal, tax and accounting obligations.</li>
</ul>
<p>We do <b>not</b> sell personal data.</p>

<h2>4. Who sees it</h2>
<ul>
<li><b>Your agent's clients</b>: reports an agent sends show that agent's name, agency, BRN, photo and number. Free-trial reports show Sam Surya's details instead.</li>
<li><b>Service providers</b> that run the Services for us: Cloudflare (website hosting), Google (Google Sheets and Apps Script where submissions and accounts are stored, and Gmail for account emails), Ziina (payments), WhatsApp (messages you start), and OpenStreetMap / Leaflet map services when you open a map. Some of these providers process data outside the UAE under their own safeguards.</li>
<li><b>Authorities</b>, where the law requires it.</li>
</ul>

<h2>5. How long we keep it</h2>
<ul>
<li>Buyer submissions: up to 24 months, then deleted.</li>
<li>Agent accounts: while the account is active and up to 12 months after the last plan ends; payment and invoice records for as long as tax law requires.</li>
</ul>

<h2>6. Your rights</h2>
<p>You can ask us to show you the data we hold about you, correct it, delete it, stop using it for updates, or give you a copy. Message us on WhatsApp from the number you used. We reply within 30 days. If you are not satisfied, you can complain to the UAE Data Office.</p>

<h2>7. Security</h2>
<p>Data is stored in access-controlled accounts, passwords are stored only in scrambled form, and the sites use HTTPS. No system is perfectly secure; if a breach affects you, we will tell you as the law requires.</p>

<h2>8. Children</h2>
<p>The Services are for adults. We don't knowingly collect data from anyone under 18.</p>

<h2>9. Changes</h2>
<p>We may update this policy; the date at the top shows the latest version.</p>
""")

PAGES["refunds"] = ("Cancellation & Refund Policy", f"""
<p class="lead">This policy applies to paid plans on <b>samsuryarealty.com</b> (Premium) and <b>dealproagent.com</b> (Agent Pro, Agent Unlimited and top-ups).</p>

<h2>1. Plans don't renew automatically</h2>
<p>Every plan runs for one month from activation and ends on its own. There is nothing to cancel to avoid being charged again: if you don't pay for the next month, nothing more is taken.</p>

<h2>2. Cancelling</h2>
<p>You can stop using a plan at any time. Your access continues until the end date of the month you paid for. To close your account and delete your details, message us on WhatsApp (see below).</p>

<h2>3. Refunds</h2>
<ul>
<li><b>Changed your mind</b>: refund if you ask within <b>48 hours</b> of payment and have not run any full report or project in that paid month. The payment processing fee charged by Ziina (about 1.5% to 2% of the payment) is not returned to us when a payment is refunded, so it is deducted from change-of-mind refunds.</li>
<li><b>After that</b>, or once you have used the plan, the current month is not refundable, because the reports and data have already been provided.</li>
<li><b>Top-ups</b> (AED 19 per project) are not refundable once the project has been used.</li>
<li><b>Paid twice or charged the wrong amount</b>: the extra amount is always refunded in full, with no fee deducted.</li>
<li><b>Service problem</b>: if a technical fault on our side stops you using a paid plan for more than 3 days in a row and we can't fix it, we refund the unused part of the month (no fee deducted) or extend your plan, as you prefer.</li>
<li><b>Account closed for misuse</b> (see the Terms): no refund.</li>
</ul>

<h2>4. How refunds are paid</h2>
<p>Refunds go back to the original payment method through Ziina. We start the refund within 5 working days of approving it; the time for it to appear depends on your bank or card provider (usually up to 14 days).</p>

<h2>5. How to ask</h2>
<p>Send us your name, the email or WhatsApp number on the account, the payment date and the reason.</p>
{contact()}
<p>This policy doesn't affect any rights you have under UAE consumer protection law.</p>
""")

CSS = """
:root{--navy:#081830;--gold:#C9A24A;--gold2:#E8CF8E;--ink:#1B2433;--muted:#5B6678;--line:#E6E1D6;--cream:#FAF7F0}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:var(--cream);line-height:1.6;font-size:16.5px}
header{background:linear-gradient(160deg,#0F2748,var(--navy));color:#fff;padding:28px 18px 34px}header .w,main{max-width:780px;margin:0 auto}
header a{color:var(--gold2);text-decoration:none;font-weight:700;font-size:14px}h1{margin:12px 0 4px;font-size:clamp(26px,5vw,36px);letter-spacing:-.5px}
header p{margin:0;color:#C9D5E8;font-size:14px}main{padding:22px 18px 60px}
.lead{font-size:17px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px}
h2{color:var(--navy);font-size:20px;margin:28px 0 8px}h3{color:var(--navy);font-size:16.5px;margin:16px 0 4px}ul{padding-left:20px}li{margin:4px 0}
a{color:#1A5DAB}nav.lg{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}nav.lg a{background:rgba(255,255,255,.1);border:1px solid rgba(232,207,142,.35);border-radius:20px;padding:6px 12px;color:#fff;font-size:13.5px}
nav.lg a.on{background:var(--gold);color:var(--navy);border-color:var(--gold)}footer{text-align:center;color:var(--muted);font-size:13px;padding:0 18px 40px}
"""
NAV = [("terms", "Terms & Conditions"), ("privacy", "Privacy Policy"), ("refunds", "Cancellation & Refunds")]

def page(key, title, body):
    nav = "".join(f'<a href="/legal/{k}/"' + (' class="on"' if k == key else "") + f">{html.escape(t)}</a>" for k, t in NAV)
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)} | SamSurya Realty & DealPro Agent</title><meta name="robots" content="index,follow">
<link rel="icon" href="/favicon.svg"><style>{CSS}</style></head><body>
<header><div class="w"><a href="#" onclick="if(history.length>1){{history.back();return false;}}else{{location.href='/';return false;}}">← Back</a>
<h1>{html.escape(title)}</h1><p>SamSurya Realty (samsuryarealty.com) and DealPro Agent (dealproagent.com) · Last updated {UPDATED}</p><nav class="lg">{nav}</nav></div></header>
<main>{body}</main>
<footer>{OP} · {LIC}</footer></body></html>
"""

for k, (t, b) in PAGES.items():
    d = os.path.join(ROOT, "legal", k); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(page(k, t, b))
idx = "<p class=\"lead\">Our policies for samsuryarealty.com and dealproagent.com.</p><ul>" + "".join(f'<li><a href="/legal/{k}/">{html.escape(t)}</a></li>' for k, t in NAV) + "</ul>"
open(os.path.join(ROOT, "legal", "index.html"), "w", encoding="utf-8").write(page("", "Legal", idx))
print("ok")
