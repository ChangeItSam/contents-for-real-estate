var SHEET = 'Leads';
var HEAD = ['Date (Dubai)', 'Name', 'WhatsApp', 'Project', 'Deal Score', 'Verdict', 'Price / sq ft (AED)',
            'Area average (AED)', 'Price rating', 'Result link', 'Send result', 'Status'];

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
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEAD);
    sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold').setBackground('#0B1F3A').setFontColor('#E8CF8E');
    sh.setFrozenRows(1);
  }
  return sh;
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
    if (!/^https:\/\/changeitsam\.github\.io\//.test(link)) link = '';
    var msg = 'Hi ' + first + ', this is Sam Surya. Here is your Off-Plan Deal Stress Test result' +
              (p.project ? ' for ' + p.project : '') + ': ' + (p.score || '') + '/100, ' + (p.verdict || '') + '.\n\n' +
              link + '\n\nHappy to go through it with you. When suits you for a quick call?';
    var when = Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd HH:mm');
    sh.appendRow([when, clean(name), clean(p.phone), clean(p.project), Number(p.score) || 0, clean(p.verdict),
                  Number(p.psf) || '', Number(p.avg) || '', clean(p.rating), link, '', 'New']);
    var row = sh.getLastRow();
    if (digits.length >= 8) {
      var url = 'https://wa.me/' + digits + '?text=' + encodeURIComponent(msg);
      sh.getRange(row, 11).setRichTextValue(
        SpreadsheetApp.newRichTextValue().setText('📲 Send result').setLinkUrl(url).build());
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('Stress Test lead sheet is running. Leads go to: ' + book().getUrl());
}
