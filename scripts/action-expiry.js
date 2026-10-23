import { actionExpired, connecticutDate } from './date-utils.js';
import { selectActions } from './action-model.js';

export function updateExpiredActions(root = document, now = new Date()) {
  const today = connecticutDate(now);
  root.querySelectorAll('[data-action-end-date]').forEach((item) => {
    item.hidden = actionExpired(item.dataset.actionEndDate, today);
  });
  const recordFor = (item) => ({
    id: item.dataset.actionId,
    displayOrder: Number(item.dataset.actionOrder),
    isFeatured: item.hasAttribute('data-action-featured'),
    featureStartDate: item.dataset.actionFeatureStartDate,
    endDate: item.dataset.actionEndDate,
    node: item,
  });
  const homeRecords = [...root.querySelectorAll('.home-feature[data-action]')].map(recordFor);
  const homeFeature = selectActions(homeRecords, today).featured;
  homeRecords.forEach(record => { record.node.hidden = record !== homeFeature; });
  root.querySelectorAll('[data-action-list]').forEach((list) => {
    const section = list.parentElement;
    const records = [...section.querySelectorAll('[data-action]')].map(recordFor);
    const { featured, others } = selectActions(records, today);
    for (const record of records) {
      const item = record.node;
      const isFeatured = record === featured;
      item.hidden = actionExpired(record.endDate, today);
      item.classList.toggle('featured-action', isFeatured);
      item.classList.toggle('other-action', !isFeatured);
      const label = item.querySelector('.feature-label');
      if (label) label.hidden = !isFeatured;
      const copy = item.querySelector('.featured-copy, .action-copy');
      copy.className = isFeatured ? 'featured-copy' : 'action-copy';
      const cta = item.querySelector('.feature-cta, .action-cta');
      if (cta) {
        cta.className = isFeatured ? 'feature-cta' : 'action-cta';
        cta.querySelector('a').className = isFeatured ? 'primary-action' : 'text-action';
      }
    }
    if (featured && (featured.node.parentElement !== section || featured.node.nextElementSibling !== list)) list.before(featured.node);
    // Keep expired records for future refreshes, after the visible list items.
    const listed = [...others, ...records.filter(record => actionExpired(record.endDate, today))];
    listed.forEach((record, index) => {
      if (list.children[index] !== record.node) list.insertBefore(record.node, list.children[index] || null);
    });
    list.toggleAttribute('data-action-empty-slot', others.length % 2 === 1);
    list.hidden = ![...list.querySelectorAll('[data-action]')].some((item) => !item.hidden);
  });
  const empty = root.querySelector('.actions-empty-state');
  if (empty) empty.hidden = [...root.querySelectorAll('[data-action]')].some((item) => !item.hidden);
}

export function watchActionExpiry(root = document, browser = window) {
  const update = () => updateExpiredActions(root);
  update();
  // Check Connecticut's calendar date; a fixed 24-hour timer is wrong across DST.
  const interval = browser.setInterval(update, 30_000);
  browser.addEventListener('pageshow', update);
  browser.addEventListener('focus', update);
  root.addEventListener('visibilitychange', update);
  return () => {
    browser.clearInterval(interval);
    browser.removeEventListener('pageshow', update);
    browser.removeEventListener('focus', update);
    root.removeEventListener('visibilitychange', update);
  };
}
