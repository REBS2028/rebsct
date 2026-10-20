const outcomes = new Set(['success', 'partial', 'no_match', 'ambiguous', 'out_of_state', 'rate_limited', 'error', 'cancelled']);
export function createUsageReporter(send) {
  return (event, outcome) => {
    try {
      if (event === 'rep_lookup_submit') send?.('event', event, {});
      else if (event === 'rep_lookup_outcome' && outcomes.has(outcome)) send?.('event', event, { outcome });
    } catch { /* Analytics must never interrupt a lookup. */ }
  };
}

export function initializeLookupAnalytics(browser, streamReviewed) {
  if (!streamReviewed || !['rebsct.com', 'www.rebsct.com'].includes(browser.location.hostname)) return createUsageReporter();
  // Release gate: the receiving GA4 stream must have automatic form/search/outbound measurement off.
  browser.dataLayer = browser.dataLayer || [];
  browser.gtag = function () { browser.dataLayer.push(arguments); };
  browser.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  browser.gtag('js', new Date());
  let referrer = '';
  try { const url = new URL(browser.document.referrer); referrer = `${url.origin}${url.pathname}`; } catch { /* Empty/invalid referrer. */ }
  browser.gtag('config', 'G-RDWQCYQ3HT', { page_location: 'https://rebsct.com/tools/', page_title: 'Tools & Resources | REBs', page_referrer: referrer, allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = browser.document.createElement('script'); script.async = true; script.src = 'https://www.googletagmanager.com/gtag/js?id=G-RDWQCYQ3HT'; browser.document.head.append(script);
  return createUsageReporter((...args) => browser.gtag(...args));
}
