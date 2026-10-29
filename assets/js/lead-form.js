/**
 * Lead forms (đặt lịch & liên hệ): validate, then send to Google Sheets through Apps Script.
 * Requires window.SITE_CONFIG (config.js) and window.LandingUtils (utils.js).
 */
(function () {
  "use strict";

  const config = window.SITE_CONFIG || {};
  const { normalizePhone, isValidVnPhone } = window.LandingUtils;
  const utm = new URLSearchParams(window.location.search);

  document.querySelectorAll('form.lead-form').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitLead(form);
    });
  });

  // Date picker: placeholder text while empty, no past dates, click anywhere opens the calendar
  document.querySelectorAll('.date-field input[type="date"]').forEach((input) => {
    const sync = () => input.classList.toggle('is-empty', !input.value);
    const today = new Date();
    input.min = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
    input.addEventListener('input', sync);
    input.addEventListener('change', sync);
    input.addEventListener('click', () => {
      try {
        input.showPicker();
      } catch (error) {
        // older browsers: the date can still be typed in
      }
    });
    input.form.addEventListener('reset', () => setTimeout(sync));
    sync();
  });

  async function submitLead(form) {
    const loading = form.querySelector('.loading');
    const errorMessage = form.querySelector('.error-message');
    const sentMessage = form.querySelector('.sent-message');
    const button = form.querySelector('button[type="submit"]');
    [loading, errorMessage, sentMessage].forEach((element) => element.classList.remove('d-block'));

    const data = new FormData(form);
    if (data.get('website')) return; // honeypot: only bots fill this hidden field

    const phone = normalizePhone(data.get('phone') || '');
    if (!isValidVnPhone(phone)) {
      showError(errorMessage, 'Số điện thoại chưa đúng. Vui lòng nhập số 10 chữ số, ví dụ 098 381 66 26.');
      return;
    }
    data.delete('website');
    data.set('phone', phone);
    data.set('site', 'ong-co-tay');
    data.set('form_type', form.dataset.formType || '');
    data.set('page', window.location.href);
    if (data.get('date')) data.set('date', data.get('date').split('-').reverse().join('/'));
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach((key) => data.set(key, utm.get(key) || ''));

    if (!config.leadEndpoint) {
      showError(errorMessage, `Đặt lịch online đang được cập nhật. Vui lòng gọi ${config.hotlineDisplay} để được hỗ trợ ngay.`);
      notifyLead(data, false);
      return;
    }

    loading.classList.add('d-block');
    button.disabled = true;
    let saved = false;
    try {
      const response = await fetch(config.leadEndpoint, { method: 'POST', body: data });
      const result = await response.json();
      if (result.result !== 'success') throw new Error(result.error || 'Unknown error');
      saved = true;
      sentMessage.classList.add('d-block');
      form.reset();
      document.dispatchEvent(new CustomEvent('lead:submitted', { detail: { formType: form.dataset.formType } }));
    } catch (error) {
      showError(errorMessage, `Gửi thông tin chưa thành công. Vui lòng thử lại hoặc gọi ${config.hotlineDisplay}.`);
    } finally {
      loading.classList.remove('d-block');
      button.disabled = false;
      notifyLead(data, saved);
    }
  }

  // Telegram message for every submitted form (telegram.js), with whether Google Sheets saved it
  function notifyLead(data, saved) {
    if (typeof window.notifyTelegram !== 'function') return;
    window.notifyTelegram(data.get('form_type') === 'lien-he' ? '📝 LIÊN HỆ TƯ VẤN' : '📝 ĐẶT LỊCH KHÁM', [
      `Họ tên: ${data.get('name')}`,
      `SĐT: ${data.get('phone')}`,
      data.get('date') && `Ngày muốn khám: ${data.get('date')}`,
      data.get('symptom') && `Triệu chứng: ${data.get('symptom')}`,
      data.get('subject') && `Chủ đề: ${data.get('subject')}`,
      data.get('message') && `Ghi chú: ${data.get('message')}`,
      saved ? '✅ Đã lưu Google Sheet' : '⚠️ Chưa lưu được vào Google Sheet – gọi lại khách ngay',
    ]);
  }

  function showError(element, message) {
    element.textContent = message;
    element.classList.add('d-block');
  }
})();
