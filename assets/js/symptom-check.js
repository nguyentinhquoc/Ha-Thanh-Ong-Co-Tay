/**
 * Symptom self-check: counts ticked symptoms and shows a recommendation.
 * Requires window.LandingUtils (utils.js).
 */
(function () {
  "use strict";

  const box = document.querySelector('#symptom-check');
  if (!box) return;

  const result = box.querySelector('.symptom-result');
  const resultText = box.querySelector('.symptom-result-text');

  function update() {
    const ticked = [...box.querySelectorAll('input[name="symptom"]:checked')];
    const hasSevere = ticked.some((input) => input.dataset.severe === 'true');
    const verdict = window.LandingUtils.symptomVerdict(ticked.length, hasSevere);
    result.dataset.level = verdict.level;
    resultText.textContent = verdict.message;
  }

  box.addEventListener('change', update);
  update();
})();
