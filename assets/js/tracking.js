/**
 * Conversion tracking: loads Facebook Pixel / Google tag when their IDs are set in config.js,
 * then reports contact clicks (phone, Zalo, Messenger) and submitted lead forms.
 */
(function () {
  "use strict";

  const config = window.SITE_CONFIG || {};

  if (config.facebookPixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', config.facebookPixelId);
    window.fbq('track', 'PageView');
  }

  if (config.googleTagId) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.googleTagId)}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', config.googleTagId);
  }

  function track(eventName, params) {
    if (window.fbq) window.fbq('track', eventName, params);
    if (window.gtag) {
      window.gtag('event', eventName === 'Lead' ? 'generate_lead' : 'contact', params);
      if (eventName === 'Lead' && config.googleAdsConversion) {
        window.gtag('event', 'conversion', { send_to: config.googleAdsConversion });
      }
    }
  }

  function contactMethod(href) {
    if (href.startsWith('tel:')) return 'phone';
    if (href.includes('zalo.me')) return 'zalo';
    return 'messenger';
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="tel:"], a[href*="zalo.me"], a[href*="m.me/"]');
    if (link) track('Contact', { method: contactMethod(link.getAttribute('href')) });
  });

  document.addEventListener('lead:submitted', (event) => {
    track('Lead', { form_type: event.detail.formType });
  });
})();
