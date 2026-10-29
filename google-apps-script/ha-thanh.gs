/**
 * Google Sheet "Hà Thành" – nhận dữ liệu form của 2 landing page Phòng khám Ngoại Hà Thành:
 *   - baoquydau (Cắt bao quy đầu)       → tab "Bao quy đầu"
 *   - ongcotay  (Hội chứng ống cổ tay)  → tab "Ống cổ tay"
 * Cài đặt: Tiện ích mở rộng → Apps Script → dán toàn bộ file này → chạy hàm setup
 *          → Triển khai → Ứng dụng web (Thực thi: Tôi, Quyền truy cập: Bất kỳ ai).
 * File này giống hệt nhau ở 2 repo Ha-Thanh-Bao-Quy-Dau và Ha-Thanh-Ong-Co-Tay (1 script dùng chung) – sửa thì sửa cả hai.
 * Author: WaveBear
 */
const SITES = {
  'bao-quy-dau': {
    sheet: 'Bao quy đầu',
    notifyEmail: 'phongkhamngoaihathanh@gmail.com', // để '' nếu không muốn nhận email báo khách mới
    subject: '[Bao quy đầu] Đặt lịch mới',
    phoneField: 'so_dien_thoai',
    nameField: 'ho_ten',
    fields: [
      ['ho_ten', 'Họ tên'],
      ['so_dien_thoai', 'Số điện thoại'],
      ['van_de', 'Vấn đề'],
      ['ngay_hen', 'Ngày muốn khám'],
      ['ghi_chu', 'Ghi chú'],
      ['trang', 'Trang'],
    ],
  },
  'ong-co-tay': {
    sheet: 'Ống cổ tay',
    notifyEmail: 'medicalcenter.hathanh@gmail.com', // để '' nếu không muốn nhận email báo khách mới
    subject: '[Ống cổ tay] Khách mới',
    phoneField: 'phone',
    nameField: 'name',
    fields: [
      ['form_type', 'Loại form'],
      ['name', 'Họ tên'],
      ['phone', 'Số điện thoại'],
      ['date', 'Ngày muốn khám'],
      ['symptom', 'Triệu chứng'],
      ['subject', 'Chủ đề'],
      ['message', 'Ghi chú'],
      ['utm_source', 'UTM source'],
      ['utm_medium', 'UTM medium'],
      ['utm_campaign', 'UTM campaign'],
      ['page', 'Trang'],
    ],
  },
};

// Chạy 1 lần trong trình soạn thảo: tạo các tab + dòng tiêu đề và cấp quyền cho script.
function setup() {
  Object.keys(SITES).forEach((key) => getSheet_(SITES[key]));
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  const site = SITES[params.site];
  if (!site) return json_({ result: 'error', error: 'Không rõ form gửi từ trang nào' });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const row = [new Date()].concat(site.fields.map(([key]) => cell_(params[key], key === site.phoneField)));
    getSheet_(site).appendRow(row);
  } catch (error) {
    return json_({ result: 'error', error: String(error) });
  } finally {
    lock.releaseLock();
  }
  notify_(site, params);
  return json_({ result: 'success' });
}

function getSheet_(site) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(site.sheet) || spreadsheet.insertSheet(site.sheet);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Thời gian'].concat(site.fields.map(([, label]) => label)));
    sheet.getRange(1, 1, 1, site.fields.length + 1).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Dấu ' đầu ô: giữ số 0 đầu của số điện thoại và chặn nội dung kiểu "=IMPORTXML(...)" chạy thành công thức.
function cell_(value, isPhone) {
  const text = String(value || '').slice(0, 1000);
  return isPhone || /^[=+\-@]/.test(text) ? "'" + text : text;
}

function notify_(site, params) {
  if (!site.notifyEmail) return;
  try {
    const lines = site.fields.filter(([key]) => params[key]).map(([key, label]) => label + ': ' + params[key]);
    MailApp.sendEmail(
      site.notifyEmail,
      site.subject + ': ' + (params[site.nameField] || '') + ' – ' + (params[site.phoneField] || ''),
      lines.join('\n')
    );
  } catch (error) {
    console.error('Không gửi được email báo khách mới: ' + error);
  }
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
