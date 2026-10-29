/**
 * Pure helpers shared by the landing page scripts.
 * Browser: exposed as window.LandingUtils. Node tests: require('assets/js/utils.js').
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.LandingUtils = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  "use strict";

  /**
   * Recommendation for the symptom self-check.
   * @param {number} count - number of ticked symptoms
   * @param {boolean} hasSevere - true when the red-flag symptom (thenar muscle wasting) is ticked
   */
  function symptomVerdict(count, hasSevere) {
    if (hasSevere) {
      return { level: 'urgent', message: 'Teo cơ gốc ngón cái là dấu hiệu dây thần kinh giữa đã bị chèn ép nặng. Bạn nên đặt lịch khám ngay để được điều trị kịp thời.' };
    }
    if (count >= 4) {
      return { level: 'urgent', message: `Bạn có ${count} dấu hiệu điển hình của Hội chứng ống cổ tay. Hãy đặt lịch khám ngay để tránh teo cơ, mất cảm giác lâu dài.` };
    }
    if (count >= 2) {
      return { level: 'warn', message: `Bạn có ${count} dấu hiệu nghi ngờ Hội chứng ống cổ tay. Bạn nên đi khám sớm để bác sĩ đánh giá chính xác.` };
    }
    if (count === 1) {
      return { level: 'watch', message: 'Bạn có 1 dấu hiệu. Nếu triệu chứng kéo dài trên 2 tuần hoặc tái đi tái lại, bạn nên đi khám để được chẩn đoán sớm.' };
    }
    return { level: 'none', message: 'Hãy đánh dấu các triệu chứng bạn đang gặp để xem gợi ý.' };
  }

  /** Keeps digits only and turns the +84 / 84 country prefix into a leading 0. */
  function normalizePhone(input) {
    const digits = String(input).replace(/\D/g, '');
    return digits.startsWith('84') && digits.length >= 11 ? `0${digits.slice(2)}` : digits;
  }

  /** Vietnamese mobile (03/05/07/08/09 + 8 digits) or landline (02 + 9 digits). */
  function isValidVnPhone(phone) {
    return /^0(?:[35789]\d{8}|2\d{9})$/.test(phone);
  }

  return { symptomVerdict, normalizePhone, isValidVnPhone };
});
