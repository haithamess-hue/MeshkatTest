/**
 * Meshkat — form backend (Google Apps Script)
 * ------------------------------------------------------------
 * Receives the two forms from the landing page, writes one row per
 * answer into a Google Sheet, and emails you a copy.
 *
 * Setup steps are in README.md → "Connect the forms".
 * You only need to change the two lines below.
 */

// [PLACEHOLDER] The long ID in your Sheet's address:
// https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit
const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';

// [PLACEHOLDER] The email address that should receive a message for every new form answer.
const NOTIFY_EMAIL = 'PASTE_YOUR_EMAIL_HERE';

// ------------------------------------------------------------
// You should not need to change anything below this line.
// ------------------------------------------------------------

const TIMEZONE = 'Asia/Amman';
const HONEYPOT_FIELD = 'website_url';
const MAX_LENGTH = 5000;

// Column order for each sheet tab. [field name sent by the page, column title]
const FORMS = {
  company: {
    sheet: 'Companies',
    fields: [
      ['fullName', 'Full name'],
      ['email', 'Work email'],
      ['companyName', 'Company name'],
      ['companyWebsite', 'Company website'],
      ['roleTitle', 'Role title'],
      ['roleType', 'Role type'],
      ['level', 'Level'],
      ['workSetup', 'Work setup'],
      ['location', 'City / country'],
      ['salaryRange', 'Salary range (monthly)'],
      ['timing', 'How soon'],
      ['notes', 'Anything else'],
    ],
    subject: function (p) {
      return 'New company request — ' + (p.companyName || '?') + ' — ' + (p.roleTitle || '?');
    },
  },
  talent: {
    sheet: 'Talent',
    fields: [
      ['fullName', 'Full name'],
      ['email', 'Email'],
      ['linkedin', 'LinkedIn'],
      ['currentRole', 'Current role'],
      ['experience', 'Years of experience'],
      ['country', 'Country'],
      ['openTo', 'Open to'],
      ['portfolio', 'Portfolio / CV link'],
      ['notes', 'Anything else'],
    ],
    subject: function (p) {
      return 'New talent — ' + (p.fullName || '?') + ' — ' + (p.currentRole || '?');
    },
  },
};

// Added after the form answers on every row.
const META_FIELDS = [
  ['lang', 'Language'],
  ['utm_source', 'utm_source'],
  ['utm_medium', 'utm_medium'],
  ['utm_campaign', 'utm_campaign'],
  ['utm_term', 'utm_term'],
  ['utm_content', 'utm_content'],
  ['pageUrl', 'Page URL'],
];

/** Called by the landing page every time someone sends a form. */
function doPost(e) {
  const p = (e && e.parameter) || {};

  // 1. Spam bots fill in the hidden field; people never see it.
  if (p[HONEYPOT_FIELD]) return json_({ ok: true });

  const form = FORMS[p.formType];
  if (!form) return json_({ ok: false, error: 'Unknown form type' });

  // 2 + 3. Write the row (the lock stops two answers arriving at once from clashing).
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_(form);
    const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    const row = [timestamp]
      .concat(form.fields.map(function (f) { return clean_(p[f[0]]); }))
      .concat(META_FIELDS.map(function (f) { return clean_(p[f[0]]); }));
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }

  // 4. Email a copy. If email fails, the row is still saved.
  try {
    sendEmail_(form, p);
  } catch (err) {
    console.error('Email failed: ' + err);
  }

  // 5. Done.
  return json_({ ok: true });
}

/** Lets you open the web app URL in a browser to check it is running. */
function doGet() {
  return json_({ ok: true, message: 'Meshkat form endpoint is running.' });
}

/**
 * Optional: run this once from the Apps Script editor (select "testSetup" → Run).
 * It asks for permission, creates both tabs, and sends you a test email.
 */
function testSetup() {
  Object.keys(FORMS).forEach(function (k) { getSheet_(FORMS[k]); });
  MailApp.sendEmail(NOTIFY_EMAIL, 'Meshkat form test', 'Your Meshkat form backend is set up. New answers will arrive here.');
}

// ---------- helpers ----------

function getSpreadsheet_() {
  if (SHEET_ID && SHEET_ID.indexOf('PASTE_') !== 0) return SpreadsheetApp.openById(SHEET_ID);
  return SpreadsheetApp.getActiveSpreadsheet(); // works when the script was created from the Sheet
}

function getSheet_(form) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(form.sheet);
  if (!sheet) sheet = ss.insertSheet(form.sheet);
  if (sheet.getLastRow() === 0) {
    const headers = ['Timestamp (Amman)']
      .concat(form.fields.map(function (f) { return f[1]; }))
      .concat(META_FIELDS.map(function (f) { return f[1]; }));
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Trims text, limits length, and stops answers being read as spreadsheet formulas. */
function clean_(value) {
  let v = String(value == null ? '' : value).trim().slice(0, MAX_LENGTH);
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  return v;
}

function sendEmail_(form, p) {
  const lines = form.fields.map(function (f) { return f[1] + ': ' + (p[f[0]] || '—'); });
  lines.push('');
  lines.push('Language: ' + (p.lang || '—'));
  const utms = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
    .filter(function (k) { return p[k]; })
    .map(function (k) { return k + '=' + p[k]; });
  if (utms.length) lines.push('UTM: ' + utms.join(', '));
  lines.push('Page: ' + (p.pageUrl || '—'));
  lines.push('');
  lines.push('Saved in the "' + form.sheet + '" tab of your Google Sheet.');

  const message = {
    to: NOTIFY_EMAIL,
    subject: form.subject(p),
    body: lines.join('\n'),
    name: 'Meshkat website',
  };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email || '')) message.replyTo = p.email;
  MailApp.sendEmail(message);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
