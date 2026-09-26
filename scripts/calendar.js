import DOMPurify from './vendor/purify.es.mjs';
import { calendarRequestUrl, eventDates } from './calendar-model.js';

export function safeCalendarLink(href, base) {
  if (typeof href !== 'string' || !href.trim()) return null;
  try {
    const url = new URL(href, base);
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function prepareLink(link, document) {
  const href = safeCalendarLink(link.getAttribute('href'), document.baseURI);
  if (!href) { link.replaceWith(...link.childNodes); return; }
  link.href = href;
  if (/^https?:/i.test(href)) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
}

export function descriptionFragment(description, document, purifier = DOMPurify) {
  const text = typeof description === 'string' ? description : '';
  if (!purifier.isSupported) {
    const fallback = document.createDocumentFragment();
    fallback.append(document.createTextNode(text));
    return fallback;
  }
  const fragment = purifier.sanitize(text, {
    ALLOWED_TAGS: ['p', 'br', 'div', 'span', 'a', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote'],
    ALLOWED_ATTR: ['href', 'title'], ALLOW_DATA_ATTR: false, RETURN_DOM_FRAGMENT: true,
  });
  fragment.querySelectorAll('a').forEach((link) => prepareLink(link, document));
  const walker = document.createTreeWalker(fragment, 4); // SHOW_TEXT
  const nodes = [];
  while (walker.nextNode()) {
    if (!walker.currentNode.parentElement?.closest('a')) nodes.push(walker.currentNode);
  }
  for (const node of nodes) {
    const pattern = /https?:\/\/[^\s<>"']+/giu;
    const replacement = document.createDocumentFragment();
    let cursor = 0;
    for (const match of node.textContent.matchAll(pattern)) {
      let url = match[0].replace(/[.,;:!?]+$/, '');
      while (url.endsWith(')') && (url.match(/\)/g) || []).length > (url.match(/\(/g) || []).length) url = url.slice(0, -1);
      replacement.append(document.createTextNode(node.textContent.slice(cursor, match.index)));
      const href = safeCalendarLink(url, document.baseURI);
      if (href) {
        const link = document.createElement('a');
        link.textContent = url;
        link.href = href;
        prepareLink(link, document);
        replacement.append(link);
      } else replacement.append(document.createTextNode(url));
      cursor = match.index + url.length;
    }
    if (cursor) {
      replacement.append(document.createTextNode(node.textContent.slice(cursor)));
      node.replaceWith(replacement);
    }
  }
  return fragment;
}

export function renderEvent(event, document, { purifier = DOMPurify, now = new Date() } = {}) {
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const dates = eventDates(event, now);
  const item = element('li', 'event');
  const date = element('time', 'event-date');
  if (dates.date) date.dateTime = dates.date;
  date.setAttribute('aria-label', dates.label);
  date.append(element('span', 'event-month', dates.month), element('span', 'event-day', dates.day));
  const copy = element('div', 'event-copy');
  const title = typeof event.summary === 'string' && event.summary.trim() ? event.summary : 'Community event';
  copy.append(element('p', 'event-meta', dates.meta), element('h3', 'event-title', title));
  if (typeof event.location === 'string' && event.location.trim()) copy.append(element('p', 'event-location', event.location));
  const description = descriptionFragment(event.description, document, purifier);
  if (description.textContent.trim()) {
    const details = element('div', 'event-details');
    const body = element('div', 'event-description');
    body.append(description);
    details.append(body);
    copy.append(details);
  }
  item.append(date, copy);
  return item;
}

export function mountCalendar({ root = document, config, fetcher = fetch, purifier = DOMPurify, now = () => new Date() }) {
  const document = root.ownerDocument || root;
  const list = root.querySelector('[data-event-list]');
  const status = root.querySelector('[data-calendar-status]');
  const button = root.querySelector('[data-more-events]');
  const timeMin = now().toISOString();
  let nextPageToken = null;
  let loading = false;
  let complete = false;
  let controller;
  const seen = new Set();

  async function load() {
    if (loading || complete) return;
    loading = true;
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    list.setAttribute('aria-busy', 'true');
    status.setAttribute('role', 'status');
    status.textContent = seen.size ? 'Loading more events…' : 'Loading upcoming events…';
    button.disabled = true;
    button.hidden = false;
    button.textContent = 'Loading events…';
    try {
      const response = await fetcher(calendarRequestUrl(config, { timeMin, pageToken: nextPageToken }), { signal: controller.signal });
      if (!response.ok) throw new Error('Calendar unavailable');
      const data = await response.json();
      if (!data || data.error || (data.items !== undefined && !Array.isArray(data.items))) throw new Error('Invalid calendar response');
      const additions = document.createDocumentFragment();
      const addedIds = [];
      for (const event of data.items || []) {
        if (!event || event.status === 'cancelled') continue;
        const id = event.id || JSON.stringify([event.summary, event.start]);
        if (seen.has(id) || addedIds.includes(id)) continue;
        additions.append(renderEvent(event, document, { purifier, now: now() }));
        addedIds.push(id);
      }
      list.append(additions);
      addedIds.forEach((id) => seen.add(id));
      nextPageToken = typeof data.nextPageToken === 'string' && data.nextPageToken ? data.nextPageToken : null;
      complete = !nextPageToken;
      button.hidden = complete;
      button.textContent = 'See more events ↓';
      status.textContent = seen.size
        ? `${seen.size} upcoming event${seen.size === 1 ? '' : 's'} shown.`
        : complete ? 'No upcoming events right now. Please check back soon.' : 'No events on this page. See more events to continue.';
    } catch {
      status.setAttribute('role', 'alert');
      status.textContent = seen.size ? 'We couldn’t load more events. Please try again.' : 'We couldn’t load the calendar. Please try again or open the calendar below.';
      button.textContent = 'Try again';
      button.hidden = false;
    } finally {
      clearTimeout(timeout);
      loading = false;
      button.disabled = false;
      list.setAttribute('aria-busy', 'false');
    }
  }
  button.addEventListener('click', load);
  const ready = load();
  return { ready, load, destroy() { controller?.abort(); button.removeEventListener('click', load); } };
}
