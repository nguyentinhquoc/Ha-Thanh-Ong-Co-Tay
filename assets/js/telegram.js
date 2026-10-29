/**
 * Telegram notifications: phone / Zalo clicks anywhere on the page and lead forms (window.notifyTelegram).
 * Bot token + chat ids come from assets/js/n7q2x9.js (window.TG_NOTIFY); no chat ids, no messages.
 */
(function () {
  "use strict";

  const SITE_NAME = 'Hội chứng ống cổ tay';
  const CLICK_GAP_MS = 60 * 1000; // at most 1 message per minute per button type per visitor

  function context() {
    const utm = new URLSearchParams(window.location.search);
    const source = ['utm_source', 'utm_medium', 'utm_campaign'].map((key) => utm.get(key)).filter(Boolean).join(' / ');
    return [
      source && 'Nguồn: ' + source,
      'Thiết bị: ' + (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Điện thoại' : 'Máy tính'),
      'Trang: ' + window.location.href,
    ].filter(Boolean);
  }

  function send(title, lines) {
    const tg = window.TG_NOTIFY || {};
    if (!tg.token || !tg.chatIds || !tg.chatIds.length) return;
    const text = [`${title} – ${SITE_NAME}`].concat(lines.filter(Boolean), context()).join('\n');
    const url = `https://api.telegram.org/bot${tg.token}/sendMessage`;
    tg.chatIds.forEach((chatId) => {
      const body = new URLSearchParams({ chat_id: chatId, text, disable_web_page_preview: 'true' });
      // sendBeacon still delivers when the browser hands over to the dialer / Zalo app
      if (!(navigator.sendBeacon && navigator.sendBeacon(url, body))) {
        fetch(url, { method: 'POST', body, mode: 'no-cors', keepalive: true }).catch(() => {});
      }
    });
  }

  function sentRecently(key) {
    try {
      const last = Number(sessionStorage.getItem(`tg-${key}`)) || 0;
      if (Date.now() - last < CLICK_GAP_MS) return true;
      sessionStorage.setItem(`tg-${key}`, String(Date.now()));
    } catch (error) {
      // sessionStorage blocked: still notify
    }
    return false;
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="tel:"], a[href*="zalo.me"]');
    if (!link) return;
    const href = link.getAttribute('href');
    const isPhone = href.startsWith('tel:');
    if (sentRecently(isPhone ? 'phone' : 'zalo')) return;
    send(isPhone ? '📞 Khách bấm GỌI' : '💬 Khách bấm ZALO', [isPhone ? `Số: ${href.slice(4)}` : `Link: ${href}`]);
  });

  window.notifyTelegram = send;
})();
