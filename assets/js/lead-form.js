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
    if (!config.leadEndpoint) {
      showError(errorMessage, `Đặt lịch online đang được cập nhật. Vui lòng gọi ${config.hotlineDisplay} để được hỗ trợ ngay.`);
      return;
    }

    data.delete('website');
    data.set('phone', phone);
    data.set('form_type', form.dataset.formType || '');
    data.set('page', window.location.href);
    data.set('submitted_at', new Date().toLocaleString('vi-VN'));
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach((key) => data.set(key, utm.get(key) || ''));

    loading.classList.add('d-block');
    button.disabled = true;
    try {
      const response = await fetch(config.leadEndpoint, { method: 'POST', body: data });
      const result = await response.json();
      if (result.result !== 'success') throw new Error(result.error || 'Unknown error');
      sentMessage.classList.add('d-block');
      form.reset();
      document.dispatchEvent(new CustomEvent('lead:submitted', { detail: { formType: form.dataset.formType } }));
    } catch (error) {
      showError(errorMessage, `Gửi thông tin chưa thành công. Vui lòng thử lại hoặc gọi ${config.hotlineDisplay}.`);
    } finally {
      loading.classList.remove('d-block');
      button.disabled = false;
    }
  }

  function showError(element, message) {
    element.textContent = message;
    element.classList.add('d-block');
  }
})();
