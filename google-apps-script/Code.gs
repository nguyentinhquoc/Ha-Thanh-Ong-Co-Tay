/**
 * Nhận dữ liệu form đặt lịch / liên hệ từ landing page và ghi vào Google Sheet.
 * Hướng dẫn cài đặt: docs/google-sheets/HUONG-DAN.md
 */
const SHEET_NAME = 'Leads';
const NOTIFY_EMAIL = 'medicalcenter.hathanh@gmail.com'; // Để '' nếu không muốn nhận email báo khách mới
const FIELDS = [
  ['submitted_at', 'Thời gian gửi'],
  ['form_type', 'Loại form'],
  ['name', 'Họ tên'],
  ['phone', 'Số điện thoại'],
  ['birth_year', 'Năm sinh'],
  ['symptom', 'Triệu chứng'],
  ['date', 'Thời gian muốn khám'],
  ['doctor', 'Bác sĩ'],
  ['subject', 'Chủ đề'],
  ['message', 'Ghi chú'],
  ['utm_source', 'UTM source'],
  ['utm_medium', 'UTM medium'],
  ['utm_campaign', 'UTM campaign'],
  ['page', 'Trang'],
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const params = (e && e.parameter) || {};
    const row = FIELDS.map(([key]) => (key === 'phone' ? "'" + safe_(params.phone) : safe_(params[key])));
    getSheet_().appendRow(row);
    notify_(params);
    return json_({ result: 'success' });
  } catch (error) {
    return json_({ result: 'error', error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(FIELDS.map(([, label]) => label));
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Stops values such as "=IMPORTXML(...)" from running as spreadsheet formulas.
function safe_(value) {
  const text = String(value || '').slice(0, 1000);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function notify_(params) {
  if (!NOTIFY_EMAIL) return;
  try {
    const lines = FIELDS.filter(([key]) => params[key]).map(([key, label]) => label + ': ' + params[key]);
    MailApp.sendEmail(NOTIFY_EMAIL, '[Ống cổ tay] Khách mới: ' + (params.name || '') + ' – ' + (params.phone || ''), lines.join('\n'));
  } catch (error) {
    console.error('Không gửi được email báo lead: ' + error);
  }
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
