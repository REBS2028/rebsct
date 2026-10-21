import { apiBaseFor, representativeConfig } from './representative-config.js';
import { initializeLookupAnalytics } from './lookup-analytics.js';
import { mountNavigation } from './navigation.js';
import { scorecardLinks } from './scorecard-links.js';

const offices = { 'us-house': 'U.S. representative', 'state-house': 'State representative', 'state-senate': 'State senator', 'us-senate': 'U.S. senator', governor: 'Governor' };
const messages = {
  no_match: 'We couldn’t match that address. Check the street and town, or try the official Connecticut finder below.',
  out_of_state: 'This lookup covers Connecticut. For another state, use the official U.S. House finder below.',
  source_unavailable: 'The lookup service is unavailable right now. Try again, or use the official finder below.',
  lookup_timeout: 'The lookup is taking too long. Try again, or use the official finder below.',
  rate_limited: 'Too many lookups right now. Wait a minute, then try again.',
  invalid_input: 'Enter a street address and Connecticut town. Add a five-digit ZIP if you know it.',
};
function safeUrl(value) {
  if (typeof value !== 'string' || /[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (['https:', 'http:'].includes(url.protocol)) return url.href;
    if (url.protocol === 'mailto:' && /^[\w.+-]+@[\w.-]+$/.test(url.pathname)) return url.href;
  } catch { /* Reject unsafe API URLs. */ }
  return null;
}
function element(doc, tag, text, className) {
  const node = doc.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node;
}
function link(doc, label, href) {
  const safe = safeUrl(href); if (!safe) return null;
  const node = element(doc, 'a', label); node.href = safe; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node;
}

export function renderOffice(doc, record) {
  const card = element(doc, 'article', '', 'official-card');
  const label = `${offices[record.chamber] || 'District official'}${record.district && record.chamber !== 'us-senate' ? ` · District ${Number(record.district)}` : ''}`;
  card.append(element(doc, 'p', label, 'office-label'));
  const name = record.status === 'occupied' && typeof record.name === 'string' ? record.name : record.status === 'vacant' ? 'Seat vacant' : 'Official unavailable';
  card.append(element(doc, 'h3', name));
  if (record.status === 'occupied' && typeof record.termStart === 'string' && typeof record.termEnd === 'string' && Number.isFinite(Date.parse(record.termStart)) && Number.isFinite(Date.parse(record.termEnd))) card.append(element(doc, 'p', `Term: ${record.termStart.slice(0, 4)}–${record.termEnd.slice(0, 4)}`, 'office-term'));
  if (record.status === 'occupied') {
    const website = link(doc, record.chamber === 'us-house' && safeUrl(record.officialUrl) && new URL(record.officialUrl).hostname === 'clerk.house.gov' ? 'Official contact profile ↗' : 'Official website ↗', record.officialUrl);
    if (website) card.append(website);
    if (record.contactUrl && record.contactUrl !== record.officialUrl) {
      const contact = link(doc, 'Contact office ↗', record.contactUrl); if (contact) { card.append(doc.createElement('br'), contact); }
    }
    if (typeof record.phone === 'string' && /^[+()\d .-]{7,30}$/.test(record.phone)) card.append(element(doc, 'p', record.phone, 'source-note'));
    const scorecard = record.chamber === 'us-house' && scorecardLinks[record.externalId] ? link(doc, 'View Accountability Scorecard ↗', scorecardLinks[record.externalId]) : null;
    if (scorecard) card.append(doc.createElement('br'), scorecard);
  } else card.append(element(doc, 'p', record.status === 'vacant' ? 'The official source lists this seat as vacant.' : record.chamber === 'governor' ? 'Current governor details couldn’t be verified. Use the official governor’s office.' : record.chamber === 'us-senate' ? 'Current senator details couldn’t be verified. Use the official Senate directory.' : record.district ? 'Your district is identified, but we can’t verify its current official. Use the official finder below.' : 'We can’t verify this district with the current maps. Use the official finder below.', 'source-note'));
  if (record.status !== 'occupied') {
    const sourceLink = link(doc, 'Official source ↗', record.sourceUrl); if (sourceLink) card.append(sourceLink);
  }
  if (record.freshness === 'stale') card.append(element(doc, 'p', 'Using the last verified roster while the official source is unavailable. Check with the office before relying on this result.', 'lookup-warning'));
  return card;
}

export function mountRepresentativeLookup({ root = document, browser = window, fetcher = fetch, apiBase = apiBaseFor(browser.location), report = initializeLookupAnalytics(browser, representativeConfig.analyticsStreamReviewed), now = Date.now } = {}) {
  const form = root.querySelector('[data-lookup-form]');
  const status = root.querySelector('[data-lookup-status]');
  const results = root.querySelector('[data-lookup-results]');
  const submit = form.querySelector('[type="submit"]');
  const cancel = form.querySelector('[data-lookup-cancel]');
  const retry = root.querySelector('[data-lookup-retry]');
  let current = null; let sequence = 0;
  const emit = (...args) => { try { report(...args); } catch { /* Never couple lookup to analytics. */ } };
  const announce = (message, error = false) => { status.textContent = message; status.dataset.error = String(error); };
  const busy = active => { form.setAttribute('aria-busy', String(active)); submit.disabled = active; submit.textContent = active ? 'Finding your officials…' : 'Find my officials'; cancel.hidden = !active; };

  async function lookup(address, candidateSelection = false) {
    if (!apiBase) return;
    current?.controller.abort();
    const token = ++sequence;
    const attempt = { controller: new AbortController(), outcomeSent: false };
    const deadline = AbortSignal.timeout(13000);
    current = attempt;
    const finish = outcome => { if (!attempt.outcomeSent) { attempt.outcomeSent = true; emit('rep_lookup_outcome', outcome); } };
    results.replaceChildren(); retry.hidden = true; busy(true); announce('Looking up your districts and current officials…'); emit('rep_lookup_submit');
    try {
      const response = await fetcher(`${apiBase}/v1/lookup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ street: address.street, city: address.city, state: 'CT', zip: address.zip || '' }), cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.any([attempt.controller.signal, deadline]) });
      const data = await response.json();
      if (attempt.controller.signal.aborted || token !== sequence) { finish('cancelled'); return; }
      if (data.status === 'ambiguous' && response.ok) {
        finish('ambiguous');
        announce(candidateSelection ? 'That address is still ambiguous. Please use the official finder below to confirm your districts.' : 'More than one address matched. Choose your address to continue.');
        if (!candidateSelection && Array.isArray(data.candidates)) {
          const list = element(root, 'ul', '', 'candidate-list');
          for (const candidate of data.candidates.slice(0, 5)) {
            if (typeof candidate.label !== 'string' || !candidate.address || typeof candidate.address.street !== 'string' || typeof candidate.address.city !== 'string') continue;
            const item = element(root, 'li'); const button = element(root, 'button', candidate.label, 'candidate-button'); button.type = 'button';
            button.addEventListener('click', () => { form.elements.street.value = candidate.address.street; form.elements.city.value = candidate.address.city; form.elements.zip.value = candidate.address.zip || ''; void lookup(candidate.address, true); });
            item.append(button); list.append(item);
          }
          results.append(list);
        }
      } else if (response.ok && ['success', 'partial'].includes(data.status) && Array.isArray(data.offices)) {
        finish(data.status);
        announce(data.status === 'partial' ? 'Some officials couldn’t be verified. Available districts and officials are shown below.' : '');
        const addressLine = element(root, 'p', typeof data.matchedAddress === 'string' ? data.matchedAddress : 'Matched address', 'matched-address'); addressLine.prepend(element(root, 'span', 'Results for'));
        const grid = element(root, 'div', '', 'district-grid');
        for (const chamber of ['us-house', 'state-house', 'state-senate']) grid.append(renderOffice(root, data.offices.find(o => o.chamber === chamber) || { chamber, status: 'unavailable' }));
        results.append(addressLine, grid);
      } else {
        const code = response.status === 429 ? 'rate_limited' : Object.hasOwn(messages, data.status) ? data.status : 'source_unavailable';
        finish(['no_match', 'out_of_state', 'rate_limited'].includes(code) ? code : 'error'); announce(messages[code], true); retry.hidden = code === 'out_of_state';
      }
      if (results.childElementCount) results.focus();
    } catch {
      if (attempt.controller.signal.aborted) { finish('cancelled'); if (token === sequence) announce('Search cancelled. Update the address and try again.'); }
      else { finish('error'); if (token === sequence) { announce(deadline.aborted ? messages.lookup_timeout : messages.source_unavailable, true); retry.hidden = false; } }
    } finally {
      if (token === sequence) { busy(false); current = null; }
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const address = { street: form.elements.street.value.trim(), city: form.elements.city.value.trim(), zip: form.elements.zip.value.trim() };
    if (!address.street || !address.city) { announce(messages.invalid_input, true); return; }
    void lookup(address);
  });
  form.addEventListener('input', () => { current?.controller.abort(); });
  cancel.addEventListener('click', () => { current?.controller.abort(); });
  retry.addEventListener('click', () => { form.requestSubmit(); });
  if (apiBase) form.hidden = false;
  else announce('Use the official Connecticut finder below while this lookup is unavailable.');

  async function refreshStatewide() {
    const note = root.querySelector('[data-statewide-status]');
    const cards = [...root.querySelectorAll('[data-statewide-office]')];
    const replaceCard = (card, office) => {
      const rendered = renderOffice(root, office); rendered.dataset.statewideOffice = card.dataset.statewideOffice; rendered.dataset.chamber = office.chamber; rendered.dataset.validUntil = card.dataset.validUntil; card.replaceWith(rendered);
    };
    for (const card of cards) {
      if (now() >= Date.parse(card.dataset.validUntil) || now() - Date.parse(card.dataset.checkedAt) >= 72 * 60 * 60 * 1000) {
        const chamber = card.dataset.chamber;
        replaceCard(card, { chamber, status: 'unavailable', sourceUrl: chamber === 'governor' ? 'https://portal.ct.gov/governor' : 'https://www.senate.gov/senators/senators-contact.htm' });
      }
    }
    if (!apiBase) return;
    try {
      const response = await fetcher(`${apiBase}/v1/statewide`, { credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10000) });
      const data = await response.json(); if (!response.ok || !Array.isArray(data.offices)) throw new Error('Invalid statewide response');
      for (const card of root.querySelectorAll('[data-statewide-office]')) {
        const chamber = card.dataset.chamber;
        replaceCard(card, data.offices.find(o => o.officeKey === card.dataset.statewideOffice) || { chamber, status: 'unavailable', sourceUrl: chamber === 'governor' ? 'https://portal.ct.gov/governor' : 'https://www.senate.gov/senators/senators-contact.htm' });
      }
      note.textContent = data.status === 'partial' || data.offices.some(o => o.status === 'unavailable') ? 'Some officials could not be verified. Use the official office links.' : '';
      note.hidden = !note.textContent;
    } catch { note.textContent = ''; note.hidden = true; }
  }
  const statewideReady = refreshStatewide();
  return { lookup, statewideReady, destroy() { current?.controller.abort(); sequence++; } };
}

if (typeof document !== 'undefined' && document.querySelector('[data-lookup-form]')) {
  mountRepresentativeLookup();
  mountNavigation();
}
