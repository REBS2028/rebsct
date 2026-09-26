import { actionExpired, connecticutDate } from './date-utils.js';

export function updateExpiredActions(root = document, now = new Date()) {
  const today = connecticutDate(now);
  root.querySelectorAll('[data-action-end-date]').forEach((item) => {
    item.hidden = actionExpired(item.dataset.actionEndDate, today);
  });
  root.querySelectorAll('[data-action-list]').forEach((list) => {
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
