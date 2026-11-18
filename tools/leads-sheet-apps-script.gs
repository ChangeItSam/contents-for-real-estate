var SHEET = 'Leads';
var HEAD = ['Date (Dubai)', 'Name', 'WhatsApp', 'Project', 'Deal Score', 'Verdict', 'Price / sq ft (AED)',
            'Area average (AED)', 'Price rating', 'Result link', 'Send result', 'Status',
            'Checks by this number', 'Access'];
// Free full reports per WhatsApp number before the paywall. Existing clients (tab "Customers") and
// paid members (tab "Premium") are never asked to pay.
var FREE_REPORTS = 3;
var PRICE_ONE = 19, PRICE_MONTH = 49;
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
  var rows = Utilities.parseCsv(r.getContentText('UTF-8'));
  var h = rows[0].map(function (x) { return String(x).toLowerCase(); });
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
  sh.getRange(1, 7).setValue('Updated ' + Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd HH:mm') + ' · ' + out.length + ' numbers · source: DLD via Dubai Pulse');
  sh.hideSheet();
  CacheService.getScriptCache().remove('brk');
  Logger.log('Broker list refreshed: ' + out.length + ' numbers');
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
              '/month (unlimited reports): ' + link
            : (link ? '📊 Your full report: ' + link : '')) +
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
    .addItem('🔄 Refresh DLD broker list now', 'refreshBrokerList')
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
    var rc = acc || agent || verified ? 0 : recentChecks(sh, digits, p.project, AGENT_DAYS);
    var maybe = !agent && rc >= AGENT_LIMIT;
    var locked = !acc && !agent && !maybe && n > FREE_REPORTS && !!link;
    if (locked) link = payLink(link, n);
    else if (acc) link = premLink(link);   // Premium members and existing clients get everything
    var access = acc ? (acc === 'Customer' ? 'Free (existing client)' : 'Premium') :
      agent ? (dld ? '🚫 Registered broker (DLD) · score only' : '🚫 Agent (score only)') :
      maybe ? '⚠️ Possible agent: ' + rc + ' projects in ' + AGENT_DAYS + ' days. Check, then use the menu' :
      (locked ? 'Payment needed (AED ' + PRICE_ONE + ' / ' + PRICE_MONTH + ' monthly)' : 'Free (' + Math.min(n, FREE_REPORTS) + ' of ' + FREE_REPORTS + ')');
    // agents and possible agents: the message carries the score only; the link stays in the sheet for Sam
    var msg = resultMessage(first, p.project, p.score, p.verdict, agent || maybe ? '' : link, locked, n);
    var when = Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd HH:mm');
    sh.appendRow([when, clean(name), clean(p.phone), clean(p.project), Number(p.score) || 0, clean(p.verdict),
                  Number(p.psf) || '', Number(p.avg) || '', clean(p.rating), link, '', 'New', n, access]);
    var row = sh.getLastRow();
    setSend(sh, row, digits, msg);
    if (agent || maybe) sh.getRange(row, 1, 1, HEAD.length).setBackground(agent ? '#F8D7D3' : '#FFF1C2');
    if (agent) sh.getRange(row, 3).setNote((dld ? '🚫 REGISTERED BROKER (DLD register): BRN ' + dld[0] + ' · ' + dld[1] + ' · ' + dld[2] + (dld[3] ? ' · licence until ' + dld[3] : '') + '\n' : '🚫 AGENT / BROKER: this number is in your Agents list.\n') + 'Score only, no full report sent. Wrong? Use the menu: Not an agent (approve).' + (dld ? '' : agentNote(digits)));
    else if (maybe) sh.getRange(row, 3).setNote('⚠️ POSSIBLE AGENT: ' + rc + ' different projects checked in ' + AGENT_DAYS + ' days. Full report held back. Use the Stress Test menu: Mark as agent, or Not an agent (approve).');
    alertSam(clean(name), clean(p.phone), clean(p.project), p.score, clean(p.verdict), access, n, digits, sh);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('Stress Test lead sheet is running. Leads go to: ' + book().getUrl());
}

// Email alert to the sheet owner for every new lead (shows as a Gmail notification on the phone)
function alertSam(name, phone, project, score, verdict, access, n, digits, sh) {
  try {
    var to = Session.getEffectiveUser().getEmail();
    if (!to) return;
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
