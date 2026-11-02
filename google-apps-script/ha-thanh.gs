/**
 * Google Sheet "Hà Thành" – nhận dữ liệu form của 2 landing page Phòng khám Ngoại Hà Thành:
 *   - baoquydau (Cắt bao quy đầu)       → tab "Bao quy đầu"
 *   - ongcotay  (Hội chứng ống cổ tay)  → tab "Ống cổ tay"
 * Cài đặt: Tiện ích mở rộng → Apps Script → dán toàn bộ file này → chạy hàm setup
 *          → Triển khai → Ứng dụng web (Thực thi: Tôi, Quyền truy cập: Bất kỳ ai).
 * TikTok Events API: dán access token vào Cài đặt dự án → Thuộc tính tập lệnh, tên thuộc tính TIKTOK_TOKEN_<pixel>
 *          (vd TIKTOK_TOKEN_DBJ9U8RC77UBKGR7MI7G). Không ghi token vào file này vì repo công khai.
 * File này giống hệt nhau ở 2 repo Ha-Thanh-Bao-Quy-Dau và Ha-Thanh-Ong-Co-Tay (1 script dùng chung) – sửa thì sửa cả hai.
 * Author: WaveBear
 */
const SITES = {
  'bao-quy-dau': {
    sheet: 'Bao quy đầu',
    notifyEmail: 'phongkhamngoaihathanh@gmail.com', // để '' nếu không muốn nhận email báo khách mới
    subject: '[Bao quy đầu] Đặt lịch mới',
    tiktokPixel: 'DBJ9U8RC77UBKGR7MI7G', // để '' nếu không gửi sự kiện lên TikTok Events API
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
    tiktokPixel: '',
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

// Sự kiện trình duyệt nhờ script gửi tiếp lên TikTok Events API; Lead do doPost tự gửi sau khi đã lưu Sheet.
const TIKTOK_RELAY_EVENTS = ['ViewContent', 'Contact'];

// Chạy 1 lần trong trình soạn thảo: tạo các tab + dòng tiêu đề và cấp quyền cho script.
function setup() {
  Object.keys(SITES).forEach((key) => getSheet_(SITES[key]));
}

// Chạy trong trình soạn thảo để thử token TikTok. Cần thuộc tính TIKTOK_TEST_EVENT_CODE (mã ở tab "Kiểm tra sự kiện"
// của TikTok Events Manager) để sự kiện thử chỉ hiện ở tab đó, không lẫn vào số liệu thật. Thử xong nhớ xoá thuộc tính này.
function testTiktok() {
  if (!PropertiesService.getScriptProperties().getProperty('TIKTOK_TEST_EVENT_CODE')) {
    throw new Error('Chưa có thuộc tính TIKTOK_TEST_EVENT_CODE');
  }
  console.log(sendTiktok_(SITES['bao-quy-dau'], 'Lead', { event_id: 'test-' + Date.now(), trang: 'https://phongkhamngoaihathanh.io.vn/' }));
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  const site = SITES[params.site];
  if (!site) return json_({ result: 'error', error: 'Không rõ form gửi từ trang nào' });

  if (params.tiktok_event) {
    if (TIKTOK_RELAY_EVENTS.indexOf(params.tiktok_event) === -1) return json_({ result: 'error', error: 'Sự kiện không hợp lệ' });
    sendTiktok_(site, params.tiktok_event, params);
    return json_({ result: 'success' });
  }

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
  sendTiktok_(site, 'Lead', params);
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

// Gửi 1 sự kiện lên TikTok Events API, cùng event_id với TikTok Pixel trên trang để TikTok gộp làm 1, không đếm trùng.
function sendTiktok_(site, eventName, params) {
  if (!site.tiktokPixel) return;
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TIKTOK_TOKEN_' + site.tiktokPixel);
  if (!token) {
    console.warn('Chưa có thuộc tính TIKTOK_TOKEN_' + site.tiktokPixel + ', bỏ qua sự kiện TikTok ' + eventName);
    return;
  }

  const user = {};
  ['ttclid', 'ttp', 'user_agent'].forEach((key) => {
    if (params[key]) user[key] = String(params[key]).slice(0, 500);
  });
  const event = { event: eventName, event_time: Math.floor(Date.now() / 1000), user: user, page: { url: params.trang || params.page || '' } };
  if (params.event_id) event.event_id = String(params.event_id).slice(0, 100);
  const payload = { event_source: 'web', event_source_id: site.tiktokPixel, data: [event] };
  const testCode = props.getProperty('TIKTOK_TEST_EVENT_CODE');
  if (testCode) payload.test_event_code = testCode;

  try {
    const response = UrlFetchApp.fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Access-Token': token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const body = response.getContentText();
    if (response.getResponseCode() !== 200 || JSON.parse(body).code !== 0) console.error('TikTok Events API báo lỗi: ' + body);
    return body;
  } catch (error) {
    console.error('Không gửi được sự kiện TikTok ' + eventName + ': ' + error);
  }
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
