/**
 * PocketFlow bridge for a private Google Sheet.
 *
 * Lets the PocketFlow app read this spreadsheet and save transactions into it without making the sheet public
 * and without a Google Cloud project. Every request must carry KEY; anything else gets no data.
 *
 * Setup (once):
 *   1. In the Google Sheet: Extensions → Apps Script, paste this file, set KEY to a long random string, save.
 *      Add the advanced service: Services → + → Google Sheets API → Add.
 *   2. Run setupPocketFlow() once (adds next year's month tabs and the Lending tab) and allow access.
 *   3. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone → Deploy.
 *   4. In the app's .env.local: VITE_SHEET_URL=<the /exec web app URL>, VITE_SHEET_KEY=<KEY>.
 *   5. File → Share → Publish to web → Stop publishing, if the sheet was published before.
 */
const KEY = 'PASTE_A_LONG_RANDOM_KEY_HERE';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const HEADER = ['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes'];
const LENDING_HEADER = ['Date', 'Person', 'Given via', 'Card / account', 'Purpose', 'Amount (INR)', 'Cashback (INR)', 'Paid back (INR)', 'Remaining (INR)', 'Notes'];

function doGet() {
  return ContentService.createTextOutput('PocketFlow bridge is running.');
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: 'bad request' });
  }
  if (!body || body.key !== KEY) return reply({ ok: false, error: 'unauthorized' });
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (body.action === 'write') writeSheets(body.sheets || {});
    return reply({ ok: true, title: SpreadsheetApp.getActive().getName(), sheets: readSheets() });
  } catch (err) {
    return reply({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Every sheet's values in one Sheets API call (reading tab by tab takes ~15 s for 27 tabs).
 * Dates come back as serial numbers, which the app reads like Excel dates.
 * Needs the "Google Sheets API" advanced service (Services → + → Google Sheets API).
 */
function readSheets() {
  var ss = SpreadsheetApp.getActive();
  var names = ss.getSheets().map(function (sh) { return sh.getName(); });
  var res = Sheets.Spreadsheets.Values.batchGet(ss.getId(), {
    ranges: names.map(function (n) { return "'" + n.replace(/'/g, "''") + "'"; }),
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER',
  });
  return res.valueRanges.map(function (vr, i) { return { name: names[i], rows: vr.values || [] }; });
}

/**
 * Replaces the transaction rows (the HEADER columns only) of each given monthly sheet.
 * Rows arrive as [date, description, category, type, payment method, amount, notes].
 */
function writeSheets(sheets) {
  var ss = SpreadsheetApp.getActive();
  Object.keys(sheets).forEach(function (name) {
    var rows = sheets[name];
    var sh = ss.getSheetByName(name) || createMonthSheet(ss, name, ss.getSheets().length);
    var width = Math.max(sh.getLastColumn(), HEADER.length);
    var header = sh.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
    var cols = HEADER.map(function (h) {
      var i = header.indexOf(h.toLowerCase());
      if (i < 0) throw new Error('Sheet "' + name + '" has no "' + h + '" column in row 1.');
      return i + 1;
    });
    var last = sh.getLastRow();
    var block = cols.every(function (c, k) { return c === cols[0] + k; });
    if (block) {
      // Standard layout (Date … Notes side by side): clear and write the whole block in one go.
      if (last > 1) sh.getRange(2, cols[0], last - 1, HEADER.length).clearContent();
      if (!rows.length) return;
      sh.getRange(2, cols[0], rows.length, HEADER.length).setValues(rows.map(function (r) {
        return HEADER.map(function (_, k) { return r[k] === null || r[k] === undefined ? '' : r[k]; });
      }));
      sh.getRange(2, cols[0], rows.length, 1).setNumberFormat('dd-mmm-yyyy');
      sh.getRange(2, cols[5], rows.length, 1).setNumberFormat('#,##0.00');
      return;
    }
    if (last > 1) cols.forEach(function (c) { sh.getRange(2, c, last - 1, 1).clearContent(); });
    if (!rows.length) return;
    cols.forEach(function (c, k) {
      var range = sh.getRange(2, c, rows.length, 1);
      range.setValues(rows.map(function (r) { return [r[k] === null || r[k] === undefined ? '' : r[k]]; }));
      if (k === 0) range.setNumberFormat('dd-mmm-yyyy');
      if (k === 5) range.setNumberFormat('#,##0.00');
    });
  });
}

function createMonthSheet(ss, name, index) {
  var sh = ss.insertSheet(name, index);
  sh.getRange(1, 1, 1, HEADER.length).setValues([HEADER]).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.getRange('A:A').setNumberFormat('dd-mmm-yyyy');
  sh.getRange('F:F').setNumberFormat('#,##0.00');
  [110, 220, 170, 90, 140, 120, 220].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  return sh;
}

/**
 * One-time setup: names this year's tabs by year ("January" → "January 2026"), adds next year's twelve tabs
 * and Summary rows, and adds the Lending tab. Safe to run again; it skips what already exists.
 */
function setupPocketFlow() {
  var ss = SpreadsheetApp.getActive();
  var year = 2026;

  MONTHS.forEach(function (m) {
    var sh = ss.getSheetByName(m);
    if (sh && !ss.getSheetByName(m + ' ' + year)) sh.setName(m + ' ' + year);
  });

  var after = ss.getSheetByName('December ' + year);
  MONTHS.forEach(function (m) {
    var name = m + ' ' + (year + 1);
    var existing = ss.getSheetByName(name);
    after = existing || createMonthSheet(ss, name, after ? after.getIndex() : ss.getSheets().length);
  });

  var summary = ss.getSheetByName('Summary');
  if (summary && !summary.getRange('A17').getValue()) {
    summary.getRange('A1').setValue('Month (' + year + ')');
    var rows = [['Month (' + (year + 1) + ')', 'Income', 'Expenses', 'Net']];
    MONTHS.forEach(function (m, i) {
      var ref = "'" + m + ' ' + (year + 1) + "'";
      var r = 18 + i;
      rows.push([m, '=SUMIF(' + ref + '!D:D,"Income",' + ref + '!F:F)', '=SUMIF(' + ref + '!D:D,"Expense",' + ref + '!F:F)', '=B' + r + '-C' + r]);
    });
    rows.push(['Total', '=SUM(B18:B29)', '=SUM(C18:C29)', '=SUM(D18:D29)']);
    summary.getRange(17, 1, rows.length, 4).setValues(rows);
    summary.getRange('A17:D17').setFontWeight('bold');
  }

  if (!ss.getSheetByName('Lending')) {
    var template = ss.getSheetByName('Template');
    var lending = ss.insertSheet('Lending', template ? template.getIndex() : 1);
    lending.getRange(1, 1, 1, LENDING_HEADER.length).setValues([LENDING_HEADER]).setFontWeight('bold');
    lending.setFrozenRows(1);
    // Remaining fills itself for every row: amount taken minus paid back. Edit this formula to change the rule.
    lending.getRange('I2').setFormula('=ARRAYFORMULA(IF(F2:F="","",F2:F-H2:H))');
    lending.getRange('A:A').setNumberFormat('dd-mmm-yyyy');
    lending.getRange('F:I').setNumberFormat('#,##0.00');
    lending.getRange('C2:C1000').setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Cash', 'UPI', 'Bank transfer', 'Credit card', 'Debit card'], true).setAllowInvalid(true).build()
    );
    lending.getRange('L1').setValue('Add one row each time someone borrows money or uses your card. Update "Paid back" as they repay. Remaining is calculated (Amount - Paid back); do not type in column I.');
    [110, 140, 120, 150, 200, 120, 120, 130, 130, 200].forEach(function (w, i) { lending.setColumnWidth(i + 1, w); });
  }
}
