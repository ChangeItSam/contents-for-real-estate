var SHEET = 'Leads';
var HEAD = ['Date (Dubai)', 'Name', 'WhatsApp', 'Project', 'Deal Score', 'Verdict', 'Price / sq ft (AED)',
            'Area average (AED)', 'Price rating', 'Result link', 'Send result', 'Status',
            'Checks by this number', 'Access', 'I am', 'Device'];
// Free full reports per WhatsApp number before the paywall. Existing clients (tab "Customers") are never asked to pay.
// Premium members (tab "Premium") get 10 different projects a month (PREMIUM_LIMIT), then AED 19 each.
var FREE_REPORTS = 3;
var PRICE_ONE = 19, PRICE_MONTH = 49, PREMIUM_LIMIT = 10;   // Premium (AED 49) = 10 different projects a month; more = AED 19 each
// Agent Pro (portal: samsuryarealty.com/agent/). Pro = AGENT_PRO_LIMIT projects a month (+ AED 19 top-ups), Unlimited = no limit.
var PRICE_AGENT = 199, PRICE_AGENT_UNL = 299, AGENT_PRO_LIMIT = 30;
var AGP_TAB = 'Agent Pro', AGP_HEAD = ['Token (keep private)', 'Name', 'Agency', 'BRN', 'WhatsApp', 'Email', 'Plan', 'Status', 'Paid until', 'Top-up credits', 'Signed up', 'Send link', 'Note', 'Photo', 'Public ID'];
var AGR_TAB = 'Agent reports', AGR_HEAD = ['Date (Dubai)', 'Token', 'Agent', 'Project', 'Month', 'Client'];
var SITE = 'https://samsuryarealty.com', AGENT_SITE = 'https://dealproagent.com';
// Broker filter: a number in tab "Agents" only ever gets the score, never the full report.
// A number that checks AGENT_LIMIT or more different projects within AGENT_DAYS days is flagged
// "Possible agent": the full-report link is held back until Sam approves it from the menu.
// Numbers in tab "Verified buyers" are never flagged.
var AGENT_LIMIT = 5, AGENT_DAYS = 30;
// DLD broker register (Dubai Pulse open data "dld_brokers-open"), refreshed weekly by refreshBrokerList()
// into the hidden tab "DLD brokers" of THIS private sheet (never on the public website or GitHub).
var BROKER_TAB = 'DLD brokers';
var BROKER_SOURCES = [
  'https://www.dubaipulse.gov.ae/api/3/action/package_show?id=dld_brokers-open',
  'https://gslb.dubaipulse.gov.ae/api/3/action/package_show?id=dld_brokers-open'
];

function book() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('BOOK_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (!ss) ss = SpreadsheetApp.create('Stress Test Leads');
  props.setProperty('BOOK_ID', ss.getId());
  return ss;
}

function leadsSheet() {
  var ss = book();
  var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  if (sh.getLastRow() === 0) sh.appendRow(HEAD);
  if (sh.getRange(1, HEAD.length).getValue() !== HEAD[HEAD.length - 1]) sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]);
  sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold').setBackground('#0B1F3A').setFontColor('#E8CF8E');
  sh.setFrozenRows(1);
  return sh;
}

// tabs for free access
function listSheet(name, head) {
  var ss = book();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(head);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#0B1F3A').setFontColor('#E8CF8E');
    sh.setFrozenRows(1);
  }
  return sh;
}
function customersSheet() { return listSheet('Customers', ['WhatsApp', 'Name', 'Note']); }
function premiumSheet() { return listSheet('Premium', ['WhatsApp', 'Name', 'Plan (monthly / single)', 'Paid until (yyyy-mm-dd)', 'Note']); }
function agentsSheet() { return listSheet('Agents', ['WhatsApp', 'Name', 'Note']); }
function agentNote(digits) { var k = key9(digits), v = agentsSheet().getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (key9(v[i][0]) === k) return (v[i][1] ? '\nName in list: ' + v[i][1] : '') + (v[i][2] ? '\nNote: ' + v[i][2] : ''); return ''; }
// ---- DLD broker register ----
function brokerCsvUrl() {
  for (var i = 0; i < BROKER_SOURCES.length; i++) {
    try {
      var r = UrlFetchApp.fetch(BROKER_SOURCES[i], { muteHttpExceptions: true, followRedirects: true });
      if (r.getResponseCode() !== 200) { Logger.log(BROKER_SOURCES[i] + ' -> HTTP ' + r.getResponseCode()); continue; }
      var res = (JSON.parse(r.getContentText()).result || {}).resources || [];
      for (var j = 0; j < res.length; j++) if (/csv/i.test(res[j].format || res[j].url || '')) return res[j].url;
    } catch (e) { Logger.log(BROKER_SOURCES[i] + ' -> ' + e); }
  }
  return '';
}
// Run once by hand (Apps Script ▶ Run), then it runs itself every Monday
function refreshBrokerList() {
  var url = brokerCsvUrl();
  if (!url) throw new Error('Could not reach the DLD broker register on Dubai Pulse. Kept the old list.');
  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (r.getResponseCode() !== 200) throw new Error('Broker file download failed: HTTP ' + r.getResponseCode());
  saveBrokerRows(Utilities.parseCsv(r.getContentText('UTF-8')), 'DLD via Dubai Pulse');
}
// Import the broker CSV you downloaded from data.dubai (Real Estate Brokers) and saved anywhere in Google Drive.
// Picks the newest file whose name starts with "brokers". Menu: Stress Test > Import DLD broker list from Drive.
function importBrokerListFromDrive() {
  var it = DriveApp.searchFiles("title contains 'brokers' and trashed = false"), best = null;
  while (it.hasNext()) { var f = it.next(); if (!/^brokers.*\.csv$/i.test(f.getName())) continue; if (!best || f.getLastUpdated() > best.getLastUpdated()) best = f; }
  if (!best) throw new Error('No brokers….csv found in your Google Drive. Download the CSV from data.dubai (Real Estate Brokers) and upload it to Drive first.');
  var n = saveBrokerRows(Utilities.parseCsv(best.getBlob().getDataAsString('UTF-8')), 'data.dubai file ' + best.getName());
  SpreadsheetApp.getActive().toast('DLD broker list imported: ' + n + ' phone numbers from ' + best.getName());
}
function saveBrokerRows(rows, source) {
  var h = rows[0].map(function (x) { return String(x).toLowerCase().replace(/^\ufeff/, '').trim(); });
  var col = function (re) { for (var i = 0; i < h.length; i++) if (re.test(h[i])) return i; return -1; };
  var cPh = [], cBrn = col(/broker_number|^brn|card/), cName = col(/broker_name_en|name_en|broker_name/), cOff = col(/real_estate_name_en|office_name_en|real_estate_name|office/), cEnd = col(/license_end|end_date|expiry/);
  h.forEach(function (x, i) { if (/phone|mobile/.test(x)) cPh.push(i); });
  if (!cPh.length) throw new Error('The broker file has no phone column. Columns: ' + h.join(', '));
  var out = [];
  for (var k = 1; k < rows.length; k++) {
    var x = rows[k];
    cPh.forEach(function (c) { var key = key9(x[c]); if (key.length >= 8) out.push([key, cBrn >= 0 ? x[cBrn] : '', cName >= 0 ? x[cName] : '', cOff >= 0 ? x[cOff] : '', cEnd >= 0 ? x[cEnd] : '']); });
  }
  if (out.length < 500) throw new Error('Only ' + out.length + ' broker numbers found, kept the old list.');
  var ss = book(), sh = ss.getSheetByName(BROKER_TAB) || ss.insertSheet(BROKER_TAB);
  sh.clear();
  sh.getRange(1, 1, 1, 5).setValues([['Phone (last 9 digits)', 'BRN', 'Broker', 'Agency', 'Licence end']]).setFontWeight('bold');
  sh.getRange(2, 1, out.length, 5).setNumberFormat('@').setValues(out);
  sh.getRange(1, 7).setValue('Updated ' + Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd HH:mm') + ' · ' + out.length + ' numbers · source: ' + source);
  sh.hideSheet();
  Logger.log('Broker list saved: ' + out.length + ' numbers');
  return out.length;
}
function setupWeeklyBrokerRefresh() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'refreshBrokerList') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('refreshBrokerList').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(5).inTimezone('Asia/Dubai').create();
  refreshBrokerList();
}
// [BRN, broker, agency, licence end] if this number is in the DLD register, else null
function dldBroker(digits) {
  var k = key9(digits); if (k.length < 8) return null;
  var sh = book().getSheetByName(BROKER_TAB); if (!sh || sh.getLastRow() < 2) return null;
  var f = sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(k).matchEntireCell(true).findNext();
  if (!f) return null;
  return sh.getRange(f.getRow(), 2, 1, 4).getValues()[0];
}
function buyersSheet() { return listSheet('Verified buyers', ['WhatsApp', 'Name', 'Note']); }
function inList(sh, digits) { var k = key9(digits); if (k.length < 8) return false; var v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (key9(v[i][0]) === k) return true; return false; }
// different projects checked by this number in the last `days` days (this check included)
function recentChecks(sh, digits, project, days) {
  var k = key9(digits), seen = {}, cut = new Date(Date.now() - days * 864e5), v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (key9(v[i][2]) !== k) continue;
    var d = v[i][0] instanceof Date ? v[i][0] : new Date(String(v[i][0]).replace(' ', 'T') + ':00+04:00');
    if (!isNaN(d) && d < cut) continue;
    seen[String(v[i][3] || '').trim().toLowerCase()] = 1;
  }
  seen[String(project || '').trim().toLowerCase()] = 1;
  return Object.keys(seen).filter(function (x) { return x; }).length;
}
// other names used with this number, and other numbers sent from this device (this lead not yet in the sheet)
function otherNames(sh, digits, name) {
  var k = key9(digits), nz = function (x) { return String(x || '').toLowerCase().replace(/[^a-z\u0600-\u06ff]+/g, ' ').trim(); }, me = nz(name), seen = {}, v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (key9(v[i][2]) === k) { var x = nz(v[i][1]); if (x && x !== me && x.split(' ')[0] !== me.split(' ')[0]) seen[v[i][1]] = 1; }
  return Object.keys(seen);
}
function otherNumbers(sh, dev, digits) {
  if (!dev) return [];
  var k = key9(digits), seen = {}, v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (String(v[i][15] || '') === dev && key9(v[i][2]) !== k && key9(v[i][2]).length >= 8) seen[v[i][2]] = 1;
  return Object.keys(seen);
}
function key9(v) { var d = String(v || '').replace(/[^0-9]/g, ''); return d.slice(-9); }

// "Customer", "Premium" or "" for this number
function accessFor(digits) {
  var k = key9(digits);
  if (k.length < 8) return '';
  var c = customersSheet().getDataRange().getValues();
  for (var i = 1; i < c.length; i++) if (key9(c[i][0]) === k) return 'Customer';
  var p = premiumSheet().getDataRange().getValues(), today = Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd');
  for (var j = 1; j < p.length; j++) {
    if (key9(p[j][0]) !== k) continue;
    var until = p[j][3] instanceof Date ? Utilities.formatDate(p[j][3], 'Asia/Dubai', 'yyyy-MM-dd') : String(p[j][3] || '');
    if (!until || until >= today) return 'Premium';
  }
  return '';
}

// different projects this number checked in this calendar month (Dubai), this one included
function monthChecksFor(sh, digits, project) {
  var k = key9(digits), seen = {}, rows = sh.getLastRow(), month = Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM');
  if (rows > 1) {
    var v = sh.getRange(2, 1, rows - 1, 4).getValues();
    for (var i = 0; i < v.length; i++) {
      var d = v[i][0] instanceof Date ? Utilities.formatDate(v[i][0], 'Asia/Dubai', 'yyyy-MM') : String(v[i][0] || '').slice(0, 7);
      if (d === month && key9(v[i][2]) === k) seen[String(v[i][3]).toLowerCase().trim()] = 1;
    }
  }
  seen[String(project || '').toLowerCase().trim()] = 1;
  return Object.keys(seen).length;
}

// how many different projects this number has checked (this one included)
function checksFor(sh, digits, project) {
  var k = key9(digits), seen = {}, rows = sh.getLastRow();
  if (rows > 1) {
    var v = sh.getRange(2, 3, rows - 1, 2).getValues();
    for (var i = 0; i < v.length; i++) if (key9(v[i][0]) === k) seen[String(v[i][1]).toLowerCase().trim()] = 1;
  }
  seen[String(project || '').toLowerCase().trim()] = 1;
  return Object.keys(seen).length;
}

function payLink(link, n) { return link ? link.replace('#', '?pay=1&n=' + n + '#') : link; }
function freeLink(link) { return String(link || '').replace(/\?pay=1&n=\d+/, '').replace(/\?pm=1/, ''); }
// Premium members get ?pm=1: the report then opens the Premium market dashboard
function premLink(link) { link = freeLink(link); return link ? link.replace('#', '?pm=1#') : link; }

function resultMessage(first, project, score, verdict, link, locked, n) {
  return 'Hi ' + first + ', this is Sam Surya. Here is your Off-Plan Deal Stress Test result' +
    (project ? ' for ' + project : '') + ': ' + (score || '') + '/100, ' + (verdict || '') + '.\n\n' +
    (locked ? '🔒 You have checked ' + n + ' projects with this number, and the first ' + FREE_REPORTS +
              ' full reports are free. Unlock this one for AED ' + PRICE_ONE + ', or go Premium for AED ' + PRICE_MONTH +
              '/month (' + PREMIUM_LIMIT + ' full reports a month): ' + link
            : (link ? '📊 Your full report: ' + link : '')) +
    '\n\nHappy to go through it with you. When suits you for a quick call?';
}

function premOverMessage(first, project, score, verdict, link) {
  return 'Hi ' + first + ', this is Sam Surya. Here is your Off-Plan Deal Stress Test result' + (project ? ' for ' + project : '') + ': ' + (score || '') + '/100, ' + (verdict || '') + '.\n\n' +
    '⭐ You have used your ' + PREMIUM_LIMIT + ' Premium reports this month. Unlock this one for AED ' + PRICE_ONE + ' (your Premium resets on the 1st): ' + link +
    '\n\nHappy to go through it with you. When suits you for a quick call?';
}

function setSend(sh, row, digits, msg) {
  if (digits.length < 8) return;
  var url = 'https://wa.me/' + digits + '?text=' + encodeURIComponent(msg);
  sh.getRange(row, 11).setRichTextValue(SpreadsheetApp.newRichTextValue().setText('📲 Send result').setLinkUrl(url).build());
}

// Sheet menu: unlock a report after payment, or mark a number as an existing client
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Stress Test')
    .addItem('🔓 Unlock full report (selected row)', 'unlockSelected')
    .addItem('🤝 Mark selected number as existing client (always free)', 'markCustomer')
    .addItem('⭐ Add selected number to Premium (1 month)', 'markPremium')
    .addSeparator()
    .addItem('🚫 Mark selected number as agent / broker (score only)', 'markAgent')
    .addItem('✅ Not an agent: approve and send full report', 'approveBuyer')
    .addSeparator()
    .addItem('📥 Import DLD broker list from Drive', 'importBrokerListFromDrive')
    .addSeparator()
    .addItem('👑 Create my master agent access (Sam)', 'agpMaster')
    .addItem('🏢 Agent Pro: activate / renew 1 month (selected row)', 'agpActivate')
    .addItem('➕ Agent Pro: add 1 top-up project (selected row)', 'agpTopup')
    .addToUi();
}
function selectedLead() {
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== SHEET) throw new Error('Select a row in the Leads tab first.');
  var row = sh.getActiveRange().getRow();
  if (row < 2) throw new Error('Select a lead row (not the header).');
  return { sh: sh, row: row, v: sh.getRange(row, 1, 1, HEAD.length).getValues()[0] };
}
function unlockSelected() {
  var L = selectedLead(), v = L.v, link = freeLink(v[9]), digits = String(v[2]).replace(/[^0-9]/g, '');
  L.sh.getRange(L.row, 10).setValue(link);
  L.sh.getRange(L.row, 14).setValue('Unlocked (paid)');
  setSend(L.sh, L.row, digits, resultMessage(String(v[1]).split(/\s+/)[0] || 'there', v[3], v[4], v[5], link, false, 0));
  SpreadsheetApp.getActive().toast('Unlocked. Tap "📲 Send result" in this row to send the full report.');
}
function markAgent() {
  var L = selectedLead(), v = L.v, digits = String(v[2]).replace(/[^0-9]/g, '');
  if (!inList(agentsSheet(), digits)) agentsSheet().appendRow([String(v[2]), String(v[1]), 'Added ' + Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd')]);
  L.sh.getRange(L.row, 14).setValue('🚫 Agent (score only)');
  L.sh.getRange(L.row, 3).setNote('🚫 AGENT / BROKER: marked by Sam on ' + Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd') + '. Score only, no full report.');
  L.sh.getRange(L.row, 1, 1, HEAD.length).setBackground('#F8D7D3');
  setSend(L.sh, L.row, digits, resultMessage(String(v[1]).split(/\s+/)[0] || 'there', v[3], v[4], v[5], '', false, 0));
  SpreadsheetApp.getActive().toast('Marked as agent. This number will only get the score, never the full report.');
}
function approveBuyer() {
  var L = selectedLead(), v = L.v, digits = String(v[2]).replace(/[^0-9]/g, '');
  if (!inList(buyersSheet(), digits)) buyersSheet().appendRow([String(v[2]), String(v[1]), 'Approved ' + Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd')]);
  var link = freeLink(v[9]);
  L.sh.getRange(L.row, 10).setValue(link);
  L.sh.getRange(L.row, 14).setValue('✅ Verified buyer');
  L.sh.getRange(L.row, 3).setNote('✅ Verified buyer (approved by Sam). Never flagged again.');
  L.sh.getRange(L.row, 1, 1, HEAD.length).setBackground(null);
  setSend(L.sh, L.row, digits, resultMessage(String(v[1]).split(/\s+/)[0] || 'there', v[3], v[4], v[5], link, false, 0));
  SpreadsheetApp.getActive().toast('Approved. Tap "📲 Send result" in this row to send the full report.');
}
function markCustomer() {
  var L = selectedLead(), v = L.v, link = premLink(v[9]), digits = String(v[2]).replace(/[^0-9]/g, '');
  customersSheet().appendRow([String(v[2]), String(v[1]), 'Added ' + Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd')]);
  L.sh.getRange(L.row, 10).setValue(link);
  L.sh.getRange(L.row, 14).setValue('Free (existing client)');
  setSend(L.sh, L.row, digits, resultMessage(String(v[1]).split(/\s+/)[0] || 'there', v[3], v[4], v[5], link, false, 0));
  SpreadsheetApp.getActive().toast('Marked as existing client. Tap "📲 Send result" in this row to send the full report.');
}
function markPremium() {
  var L = selectedLead(), until = new Date(); until.setMonth(until.getMonth() + 1);
  premiumSheet().appendRow([String(L.v[2]), String(L.v[1]), 'monthly', Utilities.formatDate(until, 'Asia/Dubai', 'yyyy-MM-dd'), 'Added from menu']);
  var v = L.v, link = premLink(v[9]), digits = String(v[2]).replace(/[^0-9]/g, '');
  L.sh.getRange(L.row, 10).setValue(link);
  L.sh.getRange(L.row, 14).setValue('Premium');
  setSend(L.sh, L.row, digits, resultMessage(String(v[1]).split(/\s+/)[0] || 'there', v[3], v[4], v[5], link, false, 0));
  SpreadsheetApp.getActive().toast('Premium added for 1 month. Tap "📲 Send result" in this row to send the Premium report.');
}

function setup() {
  var sh = leadsSheet();
  Logger.log('Leads go to: ' + sh.getParent().getUrl());
}

function clean(v) {
  v = String(v == null ? '' : v).slice(0, 300);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var p = (e && e.parameter) || {};
    if (p.a === 'agent_signup') return agpSignup(p);
    if (p.a === 'agent_photo') return agpPhoto(p);
    var sh = leadsSheet();
    var digits = String(p.phone || '').replace(/[^0-9]/g, '');
    var name = String(p.name || '').trim();
    var first = name.split(/\s+/)[0] || 'there';
    var link = String(p.link || '');
    if (!/^https:\/\/((www\.)?samsuryarealty\.com|changeitsam\.github\.io)\//.test(link)) link = '';
    var n = checksFor(sh, digits, p.project), acc = accessFor(digits);
    var verified = !acc && inList(buyersSheet(), digits);
    var agent = !acc && !verified && inList(agentsSheet(), digits), dld = null;
    if (!acc && !agent && !verified) {
      dld = dldBroker(digits);
      if (dld) { agent = true; agentsSheet().appendRow([clean(p.phone), clean(name), 'DLD register: BRN ' + dld[0] + ', ' + dld[1] + ', ' + dld[2] + ' (auto ' + Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd') + ')']); }
    }
    var role = clean(p.role), dev = String(p.dev || '').replace(/[^a-z0-9]/gi, '').slice(0, 24);
    if (!acc && !verified && !agent && /agent|broker/i.test(role)) {   // said so on the form
      agent = true; agentsSheet().appendRow([clean(p.phone), clean(name), 'Chose "Agent / broker" on the form (' + Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd') + ')']);
    }
    var rc = acc || agent || verified ? 0 : recentChecks(sh, digits, p.project, AGENT_DAYS);
    var why = [];
    if (!acc && !agent && !verified) {
      if (rc >= AGENT_LIMIT) why.push(rc + ' different projects in ' + AGENT_DAYS + ' days');
      var on = otherNames(sh, digits, name); if (on.length) why.push('this number also used the name(s): ' + on.slice(0, 4).join(', '));
      var od = otherNumbers(sh, dev, digits); if (od.length >= 2) why.push('this device also sent ' + od.length + ' other numbers: ' + od.slice(0, 4).join(', '));
    }
    var maybe = !agent && why.length > 0;
    var mn = acc === 'Premium' ? monthChecksFor(sh, digits, p.project) : 0, premOver = mn > PREMIUM_LIMIT && !!link;
    var locked = (!acc && !agent && !maybe && n > FREE_REPORTS && !!link) || premOver;
    if (locked) link = payLink(link, n);
    else if (acc) link = premLink(link);   // Premium members and existing clients get everything
    var access = premOver ? 'Premium: ' + PREMIUM_LIMIT + ' of ' + PREMIUM_LIMIT + ' used this month · AED ' + PRICE_ONE + ' for this one' :
      acc ? (acc === 'Customer' ? 'Free (existing client)' : 'Premium (' + mn + ' of ' + PREMIUM_LIMIT + ' this month)') :
      agent ? (dld ? '🚫 Registered broker (DLD) · score only' : '🚫 Agent (score only)') :
      maybe ? '⚠️ Possible agent: ' + why.join('; ') + '. Check, then use the menu' :
      (locked ? 'Payment needed (AED ' + PRICE_ONE + ' / ' + PRICE_MONTH + ' monthly)' : 'Free (' + Math.min(n, FREE_REPORTS) + ' of ' + FREE_REPORTS + ')');
    // agents and possible agents: the message carries the score only; the link stays in the sheet for Sam
    var msg = premOver ? premOverMessage(first, p.project, p.score, p.verdict, link) : resultMessage(first, p.project, p.score, p.verdict, agent || maybe ? '' : link, locked, n);
    if (agent) msg += '\n\nAre you an agent? Get full reports with your own name, photo and BRN for your clients: ' + AGENT_SITE;
    var when = Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd HH:mm');
    sh.appendRow([when, clean(name), clean(p.phone), clean(p.project), Number(p.score) || 0, clean(p.verdict),
                  Number(p.psf) || '', Number(p.avg) || '', clean(p.rating), link, '', 'New', n, access, role, dev]);
    var row = sh.getLastRow();
    setSend(sh, row, digits, msg);
    if (agent || maybe) sh.getRange(row, 1, 1, HEAD.length).setBackground(agent ? '#F8D7D3' : '#FFF1C2');
    if (agent) sh.getRange(row, 3).setNote((dld ? '🚫 REGISTERED BROKER (DLD register): BRN ' + dld[0] + ' · ' + dld[1] + ' · ' + dld[2] + (dld[3] ? ' · licence until ' + dld[3] : '') + '\n' : '🚫 AGENT / BROKER: this number is in your Agents list.\n') + 'Score only, no full report sent. Wrong? Use the menu: Not an agent (approve).' + (dld ? '' : agentNote(digits)));
    else if (maybe) sh.getRange(row, 3).setNote('⚠️ POSSIBLE AGENT:\n• ' + why.join('\n• ') + '\nFull report held back. Use the Stress Test menu: Mark as agent, or Not an agent (approve).');
    alertSam(clean(name), clean(p.phone), clean(p.project), p.score, clean(p.verdict), access, n, digits, sh);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {}, cb = String(p.callback || '').replace(/[^\w$]/g, '').slice(0, 60);
  if (p.a) {
    var out, lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      if (p.a === 'use') out = agpUse(p.t, p.p, p.c);
      else if (p.a === 'me') { var f = agpFind(p.t); out = f ? agpState(f) : { ok: false, st: 'unknown' }; if (f) { out.pid = String(f.v[14] || ''); out.img = agpImg(f.v[13]); } }
      else if (p.a === 'pic') out = agpPic(p.id);
      else out = { ok: false };
    } catch (err) { out = { ok: false, err: String(err) }; }
    finally { lock.releaseLock(); }
    var js = JSON.stringify(out);
    return cb ? ContentService.createTextOutput(cb + '(' + js + ');').setMimeType(ContentService.MimeType.JAVASCRIPT)
              : ContentService.createTextOutput(js).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput('Stress Test lead sheet is running. Leads go to: ' + book().getUrl());
}

// ---------------- Agent Pro ----------------
function agpSheet() { return listSheet(AGP_TAB, AGP_HEAD); }
function agrSheet() { return listSheet(AGR_TAB, AGR_HEAD); }
function dstr(d) { return d instanceof Date ? Utilities.formatDate(d, 'Asia/Dubai', 'yyyy-MM-dd') : String(d || '').trim(); }
function mstr(d) { return d instanceof Date ? Utilities.formatDate(d, 'Asia/Dubai', 'yyyy-MM') : String(d || '').trim(); }
function agpTok(t) { t = String(t || '').replace(/[^A-Za-z0-9]/g, ''); return t.length >= 12 ? t.slice(0, 40) : ''; }
function agpFind(t) {
  t = agpTok(t); if (!t) return null;
  var sh = agpSheet(), v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (String(v[i][0]) === t) return { sh: sh, row: i + 1, v: v[i] };
  return null;
}
function agpUsed(t, month) {
  var v = agrSheet().getDataRange().getValues(), seen = {};
  for (var i = 1; i < v.length; i++) if (String(v[i][1]) === t && mstr(v[i][4]) === month) seen[String(v[i][3]).toLowerCase().trim()] = 1;
  return Object.keys(seen);
}
function agpState(f) {
  var v = f.v, today = dstr(new Date()), until = dstr(v[8]), st = String(v[7] || '');
  var plan = /unl/i.test(String(v[6])) ? 'unlimited' : 'pro';
  var isAct = /active/i.test(st), live = isAct && until && until >= today;
  return { ok: true, st: live ? 'active' : (isAct ? 'expired' : 'pending'), n: String(v[1]), ag: String(v[2]), brn: String(v[3]), ph: String(v[4]),
           plan: plan, until: until, used: agpUsed(String(v[0]), today.slice(0, 7)).length, limit: plan === 'pro' ? AGENT_PRO_LIMIT : 0, cr: Number(v[9]) || 0 };
}
// one full report: counts each different project once per month; Pro stops at the limit unless top-up credits are left
function agpUse(t, project, client) {
  var f = agpFind(t); if (!f) return { ok: false, st: 'unknown' };
  var s = agpState(f); if (s.st !== 'active') return s;
  var month = dstr(new Date()).slice(0, 7), key = String(project || '').toLowerCase().trim();
  var used = agpUsed(String(f.v[0]), month), already = used.indexOf(key) >= 0;
  if (!already) {
    if (s.plan === 'pro' && used.length >= AGENT_PRO_LIMIT) {
      if (s.cr > 0) { s.cr -= 1; f.sh.getRange(f.row, 10).setValue(s.cr); }
      else { s.ok = false; s.need = 'topup'; return s; }
    }
    agrSheet().appendRow([Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd HH:mm'), String(f.v[0]), String(f.v[1]), clean(project), "'" + month, clean(client)]);
    s.used = used.length + 1;
  }
  s.counted = !already;
  return s;
}
function agpSignup(p) {
  var t = agpTok(p.t), out = function (o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); };
  if (!t) return out({ ok: false });
  if (agpFind(t)) return out({ ok: true });
  var unl = /unl/i.test(String(p.plan || '')), plan = unl ? 'Unlimited (AED ' + PRICE_AGENT_UNL + '/month)' : 'Pro (AED ' + PRICE_AGENT + '/month, ' + AGENT_PRO_LIMIT + ' projects)';
  var when = Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd HH:mm');
  agpSheet().appendRow([t, clean(p.name), clean(p.agency), clean(p.brn), clean(p.phone), clean(p.email), plan, 'Awaiting payment', '', 0, when, '', '', agpImg(p.photo), agpTok(p.pid) || Utilities.getUuid().replace(/-/g, '').slice(0, 12)]);
  try {
    var to = PropertiesService.getScriptProperties().getProperty('ALERT_TO') || Session.getEffectiveUser().getEmail();
    if (to) MailApp.sendEmail({ to: to, name: 'Stress Test Leads', subject: '🏢 New Agent Pro sign-up: ' + clean(p.name) + ' · ' + plan,
      body: 'New Agent Pro sign-up\n\nName: ' + clean(p.name) + '\nAgency: ' + clean(p.agency) + '\nBRN: ' + clean(p.brn) + '\nWhatsApp: ' + clean(p.phone) + '\nEmail: ' + clean(p.email) + '\nPlan: ' + plan +
            '\n\nWhen the Ziina payment arrives: open the sheet, tab "' + AGP_TAB + '", select the row, menu Stress Test → Agent Pro: activate / renew 1 month, then tap "📲 Send link".\n' + book().getUrl() });
  } catch (err) { Logger.log('agent alert failed: ' + err); }
  return out({ ok: true });
}
// agent photo: a small JPEG (data URL) kept in the 'Photo' column; shown on the agent's reports
function agpImg(d) { d = String(d || ''); return /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(d) && d.length < 48000 ? d : ''; }
function agpPhoto(p) {
  var f = agpFind(p.t), img = agpImg(p.photo);
  if (f && img) f.sh.getRange(f.row, 14).setValue(img);
  return ContentService.createTextOutput(JSON.stringify({ ok: !!(f && img) })).setMimeType(ContentService.MimeType.JSON);
}
// public photo lookup for a client opening a shared report (by Public ID, never by the private token)
function agpPic(id) {
  id = agpTok(id); if (!id) return { ok: false };
  var v = agpSheet().getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (String(v[i][14]) === id) return { ok: true, img: agpImg(v[i][13]) };
  return { ok: false };
}
function agpSelected() {
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== AGP_TAB) throw new Error('Open the "' + AGP_TAB + '" tab and select the agent\'s row first.');
  var row = sh.getActiveRange().getRow();
  if (row < 2) throw new Error('Select an agent row (not the header).');
  return { sh: sh, row: row, v: sh.getRange(row, 1, 1, AGP_HEAD.length).getValues()[0] };
}
function agpActivate() {
  var f = agpSelected(), today = dstr(new Date()), cur = dstr(f.v[8]);
  var base = cur && cur > today && /active/i.test(String(f.v[7])) ? new Date(cur + 'T12:00:00') : new Date();
  base.setMonth(base.getMonth() + 1);
  var until = Utilities.formatDate(base, 'Asia/Dubai', 'yyyy-MM-dd');
  f.sh.getRange(f.row, 8).setValue('Active');
  f.sh.getRange(f.row, 9).setValue("'" + until);
  var digits = String(f.v[4]).replace(/[^0-9]/g, ''), first = String(f.v[1]).split(/\s+/)[0] || 'there';
  var msg = 'Hi ' + first + ', your ' + (/unl/i.test(String(f.v[6])) ? 'Agent Unlimited' : 'Agent Pro') + ' is active until ' + until + '. ✅\n\n' +
    'Open your portal here (keep this link private, it is your login): ' + AGENT_SITE + '/?t=' + f.v[0] + '\n\n' +
    'Type any project and the full report opens with your name, agency and BRN, ready to send to your client.';
  if (digits.length >= 8) f.sh.getRange(f.row, 12).setRichTextValue(SpreadsheetApp.newRichTextValue().setText('📲 Send link').setLinkUrl('https://wa.me/' + digits + '?text=' + encodeURIComponent(msg)).build());
  f.sh.getRange(f.row, 1, 1, AGP_HEAD.length).setBackground('#E8F8EE');
  SpreadsheetApp.getActive().toast('Active until ' + until + '. Tap "📲 Send link" in this row to send the portal link.');
}
// Sam's own master access: Agent Unlimited, active until 2099, on his number. Running it again re-sends the same link.
var MASTER_PHONE = '+971528728248', MASTER_NAME = 'Sam Surya Tamang', MASTER_AGENCY = 'SamSurya Realty';
function agpMaster() {
  var sh = agpSheet(), v = sh.getDataRange().getValues(), row = 0, t = '';
  for (var i = 1; i < v.length; i++) if (key9(v[i][4]) === key9(MASTER_PHONE) && /master/i.test(String(v[i][6]))) { row = i + 1; t = String(v[i][0]); break; }
  if (!row) {
    t = (Utilities.getUuid() + Utilities.getUuid()).replace(/[^A-Za-z0-9]/g, '').slice(0, 28);
    sh.appendRow([t, MASTER_NAME, MASTER_AGENCY, '', "'" + MASTER_PHONE, '', 'Unlimited (master)', 'Active', "'2099-12-31", 0,
                  Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd HH:mm'), '', 'Master access for Sam: never expires, no limits. Put your BRN in column D if you want it on reports.', '',
                  Utilities.getUuid().replace(/-/g, '').slice(0, 12)]);
    row = sh.getLastRow();
  } else {
    sh.getRange(row, 8).setValue('Active'); sh.getRange(row, 9).setValue("'2099-12-31");
  }
  sh.getRange(row, 1, 1, AGP_HEAD.length).setBackground('#FFF4D6');
  if (!inList(customersSheet(), MASTER_PHONE)) customersSheet().appendRow(["'" + MASTER_PHONE, MASTER_NAME, 'Master (Sam): full reports, no limits']);
  var link = AGENT_SITE + '/?t=' + t;
  sh.getRange(row, 12).setRichTextValue(SpreadsheetApp.newRichTextValue().setText('📲 Send link').setLinkUrl('https://wa.me/' + MASTER_PHONE.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('👑 My DealPro Agent master access (keep private): ' + link)).build());
  SpreadsheetApp.getUi().alert('👑 Master agent access', 'Your private link (open it once on each phone/laptop you use):\n\n' + link + '\n\nUnlimited projects, never expires. Tap "📲 Send link" in your row to WhatsApp it to yourself. Keep it private: it works like a password.', SpreadsheetApp.getUi().ButtonSet.OK);
}
function agpTopup() {
  var f = agpSelected(), n = (Number(f.v[9]) || 0) + 1;
  f.sh.getRange(f.row, 10).setValue(n);
  SpreadsheetApp.getActive().toast('Top-up added. ' + n + ' extra project' + (n === 1 ? '' : 's') + ' available.');
}

// Email alert to the sheet owner for every new lead (shows as a Gmail notification on the phone)
function alertSam(name, phone, project, score, verdict, access, n, digits, sh) {
  try {
    var to = PropertiesService.getScriptProperties().getProperty('ALERT_TO') || Session.getEffectiveUser().getEmail();
    if (!to) { Logger.log('alert: no email address. Run testAlert once in the editor.'); return; }
    var wa = digits.length >= 8 ? 'https://wa.me/' + digits : '';
    var subject = '🔔 New Stress Test lead: ' + (name || 'Someone') + ' · ' + (project || 'project') + ' · ' + (score || '?') + '/100';
    var body = 'New lead from the Off-Plan Stress Test\n\n' +
      'Name: ' + (name || '-') + '\nWhatsApp: ' + (phone || '-') + (wa ? '  (' + wa + ')' : '') +
      '\nProject: ' + (project || '-') + '\nScore: ' + (score || '-') + '/100 · ' + (verdict || '') +
      '\nAccess: ' + access + '\nProjects checked by this number: ' + n +
      '\n\nOpen the sheet: ' + sh.getParent().getUrl() + '\nTap "📲 Send result" in the new row to send the report.';
    MailApp.sendEmail({ to: to, subject: subject, body: body, name: 'Stress Test Leads' });
  } catch (err) { Logger.log('alert failed: ' + err); }
}

// Run this ONCE from the Apps Script editor (choose testAlert, press Run): it asks Google for the
// "send email" permission, remembers your address for the alerts and sends you a test email.
function testAlert() {
  var to = Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail();
  if (!to) throw new Error('Google did not give the script your email address.');
  PropertiesService.getScriptProperties().setProperty('ALERT_TO', to);
  MailApp.sendEmail({ to: to, subject: '🔔 Test: Stress Test lead alerts are on', body: 'Lead alerts are working. Every new Stress Test lead will email you like this.', name: 'Stress Test Leads' });
  Logger.log('Test alert sent. Emails left today: ' + MailApp.getRemainingDailyQuota());
}
