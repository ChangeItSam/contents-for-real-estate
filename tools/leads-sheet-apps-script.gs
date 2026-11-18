var SHEET = 'Leads';
var HEAD = ['Date (Dubai)', 'Name', 'WhatsApp', 'Project', 'Deal Score', 'Verdict', 'Price / sq ft (AED)',
            'Area average (AED)', 'Price rating', 'Result link', 'Send result', 'Status',
            'Checks by this number', 'Access'];
// Free full reports per WhatsApp number before the paywall. Existing clients (tab "Customers") and
// paid members (tab "Premium") are never asked to pay.
var FREE_REPORTS = 3;
var PRICE_ONE = 19, PRICE_MONTH = 49;

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
    var locked = !acc && n > FREE_REPORTS && !!link;
    if (locked) link = payLink(link, n);
    else if (acc) link = premLink(link);   // Premium members and existing clients get everything
    var access = acc ? (acc === 'Customer' ? 'Free (existing client)' : 'Premium') : (locked ? 'Payment needed (AED ' + PRICE_ONE + ' / ' + PRICE_MONTH + ' monthly)' : 'Free (' + Math.min(n, FREE_REPORTS) + ' of ' + FREE_REPORTS + ')');
    var msg = resultMessage(first, p.project, p.score, p.verdict, link, locked, n);
    var when = Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd HH:mm');
    sh.appendRow([when, clean(name), clean(p.phone), clean(p.project), Number(p.score) || 0, clean(p.verdict),
                  Number(p.psf) || '', Number(p.avg) || '', clean(p.rating), link, '', 'New', n, access]);
    var row = sh.getLastRow();
    setSend(sh, row, digits, msg);
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
