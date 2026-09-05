/* ===================================================================
 * ISCEP receipt system — Apps Script (bound to the spreadsheet)
 * -------------------------------------------------------------------
 *  doPost / sendReceiptEmail  → your existing write + e-receipt logic (unchanged)
 *  doGet                      → READ API for the transparency site (added)
 *
 * ONE file, two ways to run it:
 *   A) Bound to the sheet (current)   — write side + read side both work.
 *   B) Standalone on a personal @gmail.com — paste this whole file into a new
 *      script.google.com project. The read side falls back to
 *      openById(TX_SHEET_ID); the write side is just unused there. Use this
 *      when the school Workspace won't let you deploy "Anyone".
 *
 * DEPLOY (either way):
 *   Deploy ▸ New deployment ▸ type "Web app"
 *     Execute as:       Me
 *     Who has access:   Anyone            ← required for the token-free READ side
 *                                           (NOT "Anyone with Google account")
 *   Copy the .../exec URL into  src/data/site.ts  →  APPS_SCRIPT_URL
 *
 * SCRIPT PROPERTIES (Project Settings ▸ Script properties) — set these, they are
 * NOT in source control:
 *     TX_WRITE_KEY = <long random string>   ← REQUIRED. doPost rejects every
 *                                             request without a matching key.
 *                                             The internal writer (VBA / form)
 *                                             must send it as  data.key.
 *     TX_READ_KEY  = <string>               ← optional; overrides the in-source
 *                                             read key. Keep it equal to
 *                                             VITE_APPS_SCRIPT_KEY on the site.
 *     TX_SHEET_ID  = <spreadsheet id>       ← only for a STANDALONE deployment
 *                                             (bound scripts ignore it).
 *
 *   Test in an INCOGNITO window, not signed in to any Google account:
 *     <URL>?route=summary&key=<TX_READ_KEY>   → must be JSON, not a login page.
 *
 * doGet routes (read-only; key required):
 *   ?route=summary            → totals only, no names / student numbers
 *   ?route=record&sid=<no.>   → one student's record (rate-limited, fails closed)
 * =================================================================== */


/* ============================ WRITE SIDE ============================ */
/* (your original code — untouched) */

// Helper: converts a cell value (which may be a real Date object once Google
// Sheets auto-converts it, or a plain string) into a consistent "MM/dd/yyyy"
// string so it can be safely compared against the date string sent from VBA.
function normalizeDate(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "MM/dd/yyyy");
  }
  return String(value).replace(/^'/, ''); // strip leading apostrophe if present
}

// Helper: Synchronizes REMAINING FUNDS cell B5 using payload or dynamic row scanning
function syncRemainingFundsCell(doc, budgetSheet, payloadRemaining) {
  var remSheet = doc.getSheetByName("REMAINING FUNDS");
  if (!remSheet) {
    remSheet = doc.insertSheet("REMAINING FUNDS");
  }

  var targetValue = 0;

  // 1. Prioritize explicit payload value if valid
  if (payloadRemaining !== undefined && payloadRemaining !== null && String(payloadRemaining).trim() !== "") {
    targetValue = parseFloat(String(payloadRemaining).replace(/,/g, ""));
  }

  // 2. Fallback: If payload value is missing/zero, check the last row of Budget and Funds Records (Column I / index 8)
  if (isNaN(targetValue) || targetValue === 0) {
    var lastRow = budgetSheet.getLastRow();
    if (lastRow > 1) {
      var values = budgetSheet.getRange(2, 1, lastRow - 1, budgetSheet.getLastColumn()).getValues();
      for (var i = 0; i < values.length; i++) {
        var colVal = parseFloat(String(values[i][8]).replace(/,/g, ""));
        if (!isNaN(colVal)) {
          targetValue = colVal;
        }
      }
    }
  }

  remSheet.getRange("B5").setValue(targetValue);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    // --- AuthN: writes are NOT public. -------------------------------------
    // The deployed web app is "Who has access: Anyone", so without this check
    // anyone who knows the /exec URL (it ships in the site's JS) could append,
    // edit or delete rows and rewrite the fund totals.
    //
    // Set the shared write key ONCE, out of source control:
    //   Apps Script editor ▸ Project Settings ▸ Script properties
    //     TX_WRITE_KEY = <a long random string>
    // Then have the VBA / internal client send it as  data.key  in the POST
    // body (or as the  ?wkey=  query param). Requests without it are rejected.
    var writeKey = PropertiesService.getScriptProperties().getProperty('TX_WRITE_KEY');
    if (!writeKey) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: 'error', error: 'server not configured' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: 'error', error: 'bad request' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: 'error', error: 'invalid payload' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var providedKey = String(data.key || (e.parameter && e.parameter.wkey) || '');
    // Constant-time-ish compare (length check first, then char accumulation).
    var keyOk = providedKey.length === writeKey.length;
    for (var _k = 0; _k < writeKey.length; _k++) {
      keyOk = keyOk && providedKey.charAt(_k) === writeKey.charAt(_k);
    }
    if (!keyOk) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: 'error', error: 'unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var action = data.action;
    var receiptNo = data.receiptNo;

    // Route 1: H2Go Records Handling
    if (data.formType === "H2Go" || data.dateCollected !== undefined) {
      var h2goSheet = doc.getSheetByName("H2Go Records");
      if (!h2goSheet) {
        h2goSheet = doc.insertSheet("H2Go Records");
        h2goSheet.appendRow(["Date Collected", "Total Amount Collected", "Total Refills", "Total Refills Costs", "Authorized Collector", "Time Stamp"]);
      }

      if (action === "trash" || action === "delete") {
        var h2Rows = h2goSheet.getDataRange().getValues();
        for (var h = h2Rows.length - 1; h >= 1; h--) {
          if (normalizeDate(h2Rows[h][0]) === normalizeDate(data.dateCollected) &&
              String(h2Rows[h][1]) === String(data.amountCollected) &&
              String(h2Rows[h][4]) === String(data.authorizedRep)) {

            h2goSheet.deleteRow(h + 1);
            break;
          }
        }
        return ContentService.createTextOutput(JSON.stringify({"result": "success", "form": "H2Go", "action": "delete"})).setMimeType(ContentService.MimeType.JSON);
      }

      var h2goRowData = [
        data.dateCollected,
        data.amountCollected,
        data.refills,
        data.refillCosts,
        data.authorizedRep,
        new Date()
      ];

      if (action === "update") {
        var h2Rows = h2goSheet.getDataRange().getValues();
        var h2Found = false;
        for (var h = 1; h < h2Rows.length; h++) {
          if (normalizeDate(h2Rows[h][0]) === normalizeDate(data.dateCollected)) {
            h2goSheet.getRange(h + 1, 1, 1, h2goRowData.length).setValues([h2goRowData]);
            h2Found = true;
            break;
          }
        }
        if (!h2Found) {
          h2goSheet.appendRow(h2goRowData);
        }
      } else {
        h2goSheet.appendRow(h2goRowData);
      }

      return ContentService.createTextOutput(JSON.stringify({"result": "success", "form": "H2Go", "action": action || "append"})).setMimeType(ContentService.MimeType.JSON);
    }

    // Route 2: Budget and Funds Records Handling
    if (data.formType === "Budget" || data.fundReference !== undefined || data.budgetUsedFor !== undefined) {
      var budgetSheet = doc.getSheetByName("Budget and Funds Records");
      if (!budgetSheet) {
        budgetSheet = doc.insertSheet("Budget and Funds Records");
        budgetSheet.appendRow(["Budget for", "Event/Project Name", "Date used/implemented", "Estimated Budget", "Costs/Budget used", "Date of withdrawal", "Authorized Representative", "Total Amount of Funds", "Remaining Funds", "Time Stamp"]);
      }

      var trashSheet = doc.getSheetByName("Trash Bin");
      if (!trashSheet) {
        trashSheet = doc.insertSheet("Trash Bin");
        trashSheet.appendRow(["Budget for", "Event/Project Name", "Date used/implemented", "Estimated Budget", "Costs/Budget used", "Date of withdrawal", "Authorized Representative", "Total Amount of Funds", "Remaining Funds", "Time Stamp"]);
      }

      // Handle Budget Deletion / Trash Bin Routing (Robust Matching)
      if (action === "trash" || action === "delete") {
        var bRows = budgetSheet.getDataRange().getValues();
        var deletedMatchFound = false;

        var payloadProject = String(data.budgetUsedFor || "").trim().toLowerCase();
        var payloadAuthRep = String(data.authorizedRep || "").trim().toLowerCase();

        for (var b = bRows.length - 1; b >= 1; b--) {
          var sheetProject = String(bRows[b][1] || "").trim().toLowerCase();
          var sheetAuthRep = String(bRows[b][6] || "").trim().toLowerCase();

          if (sheetProject !== "" && sheetProject === payloadProject && (payloadAuthRep === "" || sheetAuthRep === payloadAuthRep)) {
            var rowValues = budgetSheet.getRange(b + 1, 1, 1, budgetSheet.getLastColumn()).getValues()[0];
            trashSheet.appendRow(rowValues);
            budgetSheet.deleteRow(b + 1);
            deletedMatchFound = true;
            break;
          }
        }

        if (!deletedMatchFound && payloadProject !== "") {
          for (var b = bRows.length - 1; b >= 1; b--) {
            var sheetProjectFallback = String(bRows[b][1] || "").trim().toLowerCase();
            if (sheetProjectFallback === payloadProject) {
              var rowValuesFallback = budgetSheet.getRange(b + 1, 1, 1, budgetSheet.getLastColumn()).getValues()[0];
              trashSheet.appendRow(rowValuesFallback);
              budgetSheet.deleteRow(b + 1);
              break;
            }
          }
        }

        // Sync B5 with payload or recomputed sheet rows after deletion
        syncRemainingFundsCell(doc, budgetSheet, data.remainingFunds);

        return ContentService.createTextOutput(JSON.stringify({"result": "success", "form": "Budget", "action": "trash"})).setMimeType(ContentService.MimeType.JSON);
      }

      var budgetRowData = [
        data.fundReference || data.referenceNo || "",
        data.budgetUsedFor || "",
        data.dateImplemented || "",
        String(data.estimatedBudget || "").replace(/,/g, ""),
        String(data.costsUsed || "").replace(/,/g, ""),
        data.dateWithdrawal || "",
        data.authorizedRep || "",
        String(data.totalFunds || "").replace(/,/g, ""),
        String(data.remainingFunds || "").replace(/,/g, ""),
        new Date()
      ];

      if (action === "update") {
        var bRows = budgetSheet.getDataRange().getValues();
        var bFound = false;
        for (var b = 1; b < bRows.length; b++) {
          if (String(bRows[b][1]) === String(budgetRowData[1]) || String(bRows[b][0]) === String(budgetRowData[0])) {
            budgetSheet.getRange(b + 1, 1, 1, budgetRowData.length).setValues([budgetRowData]);
            bFound = true;
            break;
          }
        }
        if (!bFound) {
          budgetSheet.appendRow(budgetRowData);
        }
      } else {
        budgetSheet.appendRow(budgetRowData);
      }

      // Always sync cell B5 on Save, Add, or Update actions using the payload value
      syncRemainingFundsCell(doc, budgetSheet, data.remainingFunds);

      return ContentService.createTextOutput(JSON.stringify({"result": "success", "form": "Budget", "action": action || "append"})).setMimeType(ContentService.MimeType.JSON);
    }

    // Default Route: Payment Records Handling
    var sheet = doc.getSheetByName("Payment Records");

    if (action === "delete") {
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == receiptNo) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({"result": "success", "action": "delete"})).setMimeType(ContentService.MimeType.JSON);
    }

    var rowData = [
      data.receiptNo,
      data.date,
      data.lastName,
      data.firstName,
      data.middleName,
      data.yearSec,
      data.ssg,
      data.bsis,
      data.orgShirt,
      data.events,
      data.others,
      data.amount,
      data.pesos,
      data.cashier,
      data.email,
      data.paymentStat
    ];

    if (action === "update") {
      var rows = sheet.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == receiptNo) {
          sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow(rowData);
      }
      return ContentService.createTextOutput(JSON.stringify({"result": "success", "action": "update"})).setMimeType(ContentService.MimeType.JSON);
    } else {
      sheet.appendRow(rowData);
      return ContentService.createTextOutput(JSON.stringify({"result": "success", "action": "append"})).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    // Log the detail server-side; never echo internals (sheet names, ranges,
    // stack) back to an unauthenticated caller.
    try { console.error('doPost failed: ' + (error && error.stack || error)); } catch (_e) {}
    return ContentService.createTextOutput(JSON.stringify({"result": "error", "error": "internal error"})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function sendReceiptEmail() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  var receiptNo = sheet.getRange("C5").getValue();
  var studentName = sheet.getRange("C7").getValue();

  var email = "";
  var rowValues = sheet.getRange("C10").getValues()[0];
  for (var i = 0; i < rowValues.length; i++) {
    var val = String(rowValues[i]);
    if (val.indexOf("@") !== -1 && val.indexOf(".") !== -1) {
      email = val;
      break;
    }
  }

  if (!email) {
    SpreadsheetApp.getUi().alert("Error: Could not find a valid email address in row 12.");
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var url = ss.getUrl().replace(/edit$/, '');
  var exportUrl = url + 'export?';

  var exportOptions = {
    exportFormat: 'pdf',
    format: 'pdf',
    size: 'letter',
    portrait: 'true',
    fitw: 'true',
    gridlines: 'false',
    printtitle: 'false',
    sheetnames: 'false',
    fzr: 'false',
    gid: sheet.getSheetId(),
    range: 'A1:F16'
  };

  var payload = [];
  for (var key in exportOptions) {
    payload.push(key + '=' + exportOptions[key]);
  }

  var blob = null;
  try {
    var response = UrlFetchApp.fetch(exportUrl + payload.join('&'), {
      headers: {
        'Authorization': 'Bearer ' + ScriptApp.getOAuthToken(),
        'MuteHttpExceptions': true
      }
    });
    blob = response.getBlob().setName("Official_Receipt_" + receiptNo + ".pdf");
  } catch (e) {
    SpreadsheetApp.getUi().alert("Error generating PDF: " + e.toString());
    return;
  }

  var subject = "Official E-Receipt - " + receiptNo;
  var body = "Dear " + studentName + ",\n\n" +
             "Attached is the PDF copy of your official receipt (" + receiptNo + ").\n\n" +
             "Best Regards,\n" +
             "ISCEP Department";

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    attachments: [blob]
  });

  SpreadsheetApp.getUi().alert("Receipt PDF successfully sent to " + email);
}


/* ===================================================================
 * READ SIDE — transparency site API   (new; nothing below writes)
 *
 * Works two ways from this ONE file:
 *   • bound to the sheet  → SpreadsheetApp.getActiveSpreadsheet()
 *   • standalone project   → falls back to openById(TX_SHEET_ID)
 * so a personal @gmail.com account can deploy it as "Anyone" when the
 * school Workspace blocks public web apps on the bound script.
 * =================================================================== */

// Only used by the standalone fallback (bound deployments use the active
// spreadsheet). The sheet holds student PII, so the id is NOT hard-coded here
// — set it out of source control:
//   Project Settings ▸ Script properties ▸  TX_SHEET_ID = <spreadsheet id>
var TX_SHEET_ID = PropertiesService.getScriptProperties().getProperty('TX_SHEET_ID') || '';

var TX_RECORDS_SHEET = 'Payment Records';
var TX_FUNDS_SHEET = 'REMAINING FUNDS';          // remaining balance is in B5
var TX_BUDGET_SHEET = 'Budget and Funds Records';
var TX_PER_MEMBER_FEE = 50;

function tx_ss_() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  if (!TX_SHEET_ID) {
    throw new Error('TX_SHEET_ID script property is not set');
  }
  return SpreadsheetApp.openById(TX_SHEET_ID);
}

// Read key — must equal APPS_SCRIPT_KEY in src/data/site.ts. This is NOT a
// real secret (it ships in the site's JS); it only blocks casual curling.
// A `TX_READ_KEY` script property, when set, overrides this constant so the
// value can be rotated without editing source.
var TX_API_KEY = PropertiesService.getScriptProperties().getProperty('TX_READ_KEY')
  || 'iscep-CHANGE-ME-2026';
// Global cap on record lookups per minute (stops mass enumeration bursts).
var TX_RECORD_CAP_PER_MIN = 25;

// Global cap on ALL doGet traffic, checked before auth/route — Apps Script
// gives us no per-IP signal, so this is the only lever against a flood: cap
// total requests in flight regardless of who sends them or whether their key
// is valid, so a burst can't eat the project's concurrent-execution quota
// (that quota is shared with every other route, including the write side).
// 40 per 10s (~240/min) is well above real usage but well below what would
// start queuing/erroring out legitimate calls.
var TX_GLOBAL_CAP_PER_10S = 40;

function doGet(e) {
  var p = (e && e.parameter) || {};
  var route = p.route || 'summary';
  var out;
  try {
    if (!tx_globalRateOk_()) {
      // Cheapest possible bail — no auth check, no cache read, no sheet
      // access. This is what actually protects the quota under a flood.
      out = { error: 'busy' };
    } else if (p.key !== TX_API_KEY) {
      out = { error: 'unauthorized' };
    } else if (route === 'record') {
      // `record` returns one student's PII. Student numbers are guessable, so
      // the cap MUST fail closed — a cache outage is not a reason to open the
      // enumeration flood-gates.
      out = tx_rateOk_()
        ? tx_recordCached_(p.sid || '')
        : { error: 'Too many lookups right now — try again in a minute.' };
    } else {
      // Totals aren't fetched by the site anymore (they ship in the bundle),
      // but keep the route working — served from a 60 s cache so a burst of
      // requests can't make it re-scan the whole sheet each time.
      out = tx_summaryCached_();
    }
  } catch (err) {
    // Log server-side; return a generic message so sheet structure / ranges
    // are never disclosed to the caller.
    try { console.error('doGet failed: ' + (err && err.stack || err)); } catch (_e) {}
    out = { error: 'internal error' };
  }
  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function tx_rateOk_() {
  try {
    var c = CacheService.getScriptCache();
    var slot = 'rl_' + Math.floor(Date.now() / 60000);
    var n = Number(c.get(slot) || 0) + 1;
    c.put(slot, String(n), 120);
    return n <= TX_RECORD_CAP_PER_MIN;
  } catch (err) {
    // Fail CLOSED for the PII route — better a rare false "try again" than an
    // uncapped enumeration channel when the cache misbehaves.
    return false;
  }
}

function tx_globalRateOk_() {
  try {
    var c = CacheService.getScriptCache();
    var slot = 'grl_' + Math.floor(Date.now() / 10000);
    var n = Number(c.get(slot) || 0) + 1;
    c.put(slot, String(n), 30);
    return n <= TX_GLOBAL_CAP_PER_10S;
  } catch (err) {
    // Fail OPEN here (unlike tx_rateOk_): this gate isn't the PII boundary —
    // it's a best-effort quota shield. If CacheService itself is down, refusing
    // every request would take the whole read side offline for nothing; the
    // PII-specific cap (tx_rateOk_) still fails closed independently.
    return true;
  }
}

/* ---- Cheap-under-load wrappers (anti-flood) --------------------------
 * Apps Script can't see a real client IP, so per-IP limiting isn't
 * possible. What we CAN do: serve repeated requests from CacheService so a
 * burst never re-reads the spreadsheet, and let Google's own per-project
 * execution quota absorb the rest (it throttles, it doesn't bill).
 * Front the whole site with Cloudflare (free) for network-layer DDoS
 * protection — that is the real mitigation. */

function tx_recordCached_(sid) {
  var key = 'rec_' + tx_norm_(sid);
  try {
    var c = CacheService.getScriptCache();
    var hit = c.get(key);
    if (hit) return JSON.parse(hit);
    var out = tx_recordBySid_(sid);
    c.put(key, JSON.stringify(out), 30); // 30 s — lookups repeat while a user retries
    return out;
  } catch (err) {
    return tx_recordBySid_(sid);
  }
}

function tx_summaryCached_() {
  try {
    var c = CacheService.getScriptCache();
    var hit = c.get('sum_v1');
    if (hit) return JSON.parse(hit);
    var out = tx_summary_();
    c.put('sum_v1', JSON.stringify(out), 60); // 60 s
    return out;
  } catch (err) {
    return tx_summary_();
  }
}

/* ------------------------------ helpers ------------------------------ */

function tx_num_(v) {
  var n = Number(String(v == null ? '' : v).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}
function tx_norm_(v) { return String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function tx_title_(v) {
  return String(v == null ? '' : v).toLowerCase()
    .replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); }).trim();
}
function tx_str_(v) { return String(v == null ? '' : v).trim(); }

function tx_rows_() {
  var ss = tx_ss_();
  var sh = ss.getSheetByName(TX_RECORDS_SHEET) || ss.getSheets()[0];
  var v = sh.getDataRange().getValues();
  return v.length > 1 ? v.slice(1) : [];
}

// "Payment Records" live columns (A..R):
// 0 Receipt No | 1 Student No | 2 Date of Payment | 3 Last | 4 First | 5 Middle
// 6 Year & Section | 7 SSG | 8 BSIS Membership | 9 Org Shirt | 10 Event | 11 Others
// 12 Amount (word) | 13 Pesos/Php | 14 Cashier | 15 Email | 16 Payment Status | 17 Time Stamp
function tx_map_(r) {
  var first = tx_title_(r[4]), middle = tx_title_(r[5]), last = tx_title_(r[3]);
  var amount = tx_num_(r[13]);
  var status = tx_str_(r[16]);
  return {
    studentNo: tx_str_(r[1]),
    name: [first, middle ? middle.charAt(0) + '.' : '', last].filter(String).join(' '),
    firstName: first, middleName: middle, lastName: last,
    section: tx_str_(r[6]).toUpperCase(),
    datePaid: tx_str_(r[2]),
    fees: {
      ssg: tx_str_(r[7]), membership: tx_str_(r[8]), orgShirt: tx_str_(r[9]),
      event: tx_str_(r[10]), others: tx_str_(r[11])
    },
    amountLabel: tx_str_(r[12]),
    amount: amount,
    cashier: tx_str_(r[14]),
    status: status,
    contributor: amount > 0 || /partial|paid/i.test(status),
    timestamp: tx_str_(r[17])
  };
}

function tx_remaining_() {
  try {
    var sh = tx_ss_().getSheetByName(TX_FUNDS_SHEET);
    if (!sh) return null;
    var b5 = tx_num_(sh.getRange('B5').getValue());
    if (b5) return b5;
    var v = sh.getDataRange().getValues();
    for (var i = 0; i < v.length; i++) for (var j = 0; j < v[i].length; j++) {
      var m = String(v[i][j]).match(/₱\s*([\d,]+(?:\.\d+)?)/);
      if (m) return tx_num_(m[1]);
    }
  } catch (err) {}
  return null;
}

// "Budget and Funds Records" columns (A..J):
// 0 Budget for | 1 Event/Project | 2 Date used | 3 Estimated | 4 Costs/Budget used
// 5 Date of withdrawal | 6 Authorized Rep | 7 Total Funds | 8 Remaining | 9 Time Stamp
function tx_usage_() {
  var sh = tx_ss_().getSheetByName(TX_BUDGET_SHEET);
  if (!sh) return { list: [], totalSpent: 0 };
  var v = sh.getDataRange().getValues();
  var list = [], totalSpent = 0;
  for (var i = 1; i < v.length; i++) {
    var r = v[i];
    if (!String(r[1] || r[0] || '').trim()) continue;
    var used = tx_num_(r[4]);
    totalSpent += used;
    list.push({
      purpose: tx_str_(r[0]),
      project: tx_str_(r[1]),
      date: tx_normalizeUsageDate_(r[2]),
      estimated: tx_num_(r[3]),
      used: used,
      by: tx_str_(r[6])
    });
  }
  list.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  return { list: list, totalSpent: totalSpent };
}

function tx_normalizeUsageDate_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return tx_str_(v);
}

/* ------------------------------ routes ------------------------------ */

function tx_recordBySid_(sid) {
  var key = tx_norm_(sid);
  if (!key) return { found: false };
  var hits = tx_rows_().map(tx_map_).filter(function (x) {
    return tx_norm_(x.studentNo) === key;
  });
  if (!hits.length) return { found: false };
  return {
    found: true,
    records: hits.map(function (x) {
      return {
        name: x.name, firstName: x.firstName, middleName: x.middleName, lastName: x.lastName,
        section: x.section, datePaid: x.datePaid, fees: x.fees, amountLabel: x.amountLabel,
        amount: x.amount, cashier: x.cashier, status: x.status,
        contributor: x.contributor, timestamp: x.timestamp
      };
    })
  };
}

function tx_summary_() {
  var recs = tx_rows_().map(tx_map_).filter(function (x) {
    return x.name || x.studentNo || x.section;
  });

  var feeKeys = ['ssg', 'membership', 'orgShirt', 'event', 'others'];
  var feeCounts = {}; feeKeys.forEach(function (k) { feeCounts[k] = 0; });
  var bySection = {}, statusCounts = {}, byCashier = {};
  var totalCollected = 0, contributors = 0;

  recs.forEach(function (r) {
    totalCollected += r.amount;
    if (r.contributor) contributors++;
    feeKeys.forEach(function (k) { if (/^paid$/i.test(r.fees[k])) feeCounts[k]++; });

    var sec = r.section || 'Unlisted';
    var s = bySection[sec] || (bySection[sec] = { section: sec, members: 0, contributors: 0, collected: 0 });
    s.members++; if (r.contributor) s.contributors++; s.collected += r.amount;

    var st = r.status || (r.contributor ? 'Recorded' : 'No amount yet');
    statusCounts[st] = (statusCounts[st] || 0) + 1;

    if (r.amount > 0) {
      var c = r.cashier || 'Unspecified';
      var cc = byCashier[c] || (byCashier[c] = { cashier: c, count: 0, collected: 0 });
      cc.count++; cc.collected += r.amount;
    }
  });

  var sections = Object.keys(bySection).map(function (k) {
    var s = bySection[k];
    s.expected = s.members * TX_PER_MEMBER_FEE;
    s.rate = s.members ? s.collected / s.expected : 0;
    return s;
  }).sort(function (a, b) { return b.collected - a.collected || b.members - a.members; });

  var recent = recs.filter(function (r) { return r.timestamp; })
    .map(function (r) { return { section: r.section, amount: r.amount, ts: new Date(r.timestamp).getTime() || 0 }; })
    .sort(function (a, b) { return b.ts - a.ts; })
    .slice(0, 8)
    .map(function (r) {
      return {
        section: r.section, amount: r.amount,
        date: r.ts ? Utilities.formatDate(new Date(r.ts), Session.getScriptTimeZone(), 'yyyy-MM-dd') : ''
      };
    });

  var expectedMembership = recs.length * TX_PER_MEMBER_FEE;
  var rem = tx_remaining_();
  var usage = tx_usage_();
  var spent = usage.totalSpent || (rem != null ? Math.max(totalCollected - rem, 0) : null);

  return {
    fetchedAt: new Date().toISOString(),
    summary: {
      totalCollected: totalCollected,
      remainingFunds: rem,
      spent: spent,
      perMemberFee: TX_PER_MEMBER_FEE,
      expectedMembership: expectedMembership,
      collectionRate: expectedMembership ? totalCollected / expectedMembership : 0,
      totalMembers: recs.length,
      contributors: contributors,
      pending: recs.length - contributors,
      feeCounts: feeCounts,
      bySection: sections,
      statusCounts: Object.keys(statusCounts).map(function (k) { return { label: k, count: statusCounts[k] }; })
        .sort(function (a, b) { return b.count - a.count; }),
      byCashier: Object.keys(byCashier).map(function (k) { return byCashier[k]; })
        .sort(function (a, b) { return b.collected - a.collected; }),
      recent: recent
    },
    funds: { remainingFunds: rem },
    usage: usage.list
  };
}
