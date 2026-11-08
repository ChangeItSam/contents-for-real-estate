/**
 * Off-Plan Deal Stress Test: lead sheet for Sam Surya.
 * Paste into the Google Sheet's Extensions > Apps Script, then Deploy > New deployment > Web app
 * (Execute as: Me, Who has access: Anyone). Give the Web app URL to Claude to connect the page.
 * Every result seen on the test adds one row, with a button that opens WhatsApp on your phone
 * with the lead's result message ready to send.
 */
var SHEET = 'Leads';
var HEAD = ['Date (Dubai)', 'Name', 'WhatsApp', 'Project', 'Deal Score', 'Verdict', 'Price / sq ft (AED)',
            'Area average (AED)', 'Price rating', 'Result link', 'Send result', 'Status'];

function clean(v) {               // stop anything typed on the page from running as a formula
  v = String(v == null ? '' : v).slice(0, 300);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var p = (e && e.parameter) || {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEAD);
      sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold').setBackground('#0B1F3A').setFontColor('#E8CF8E');
      sh.setFrozenRows(1);
    }
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
  return ContentService.createTextOutput('Stress Test lead sheet is running.');
}
