import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { eventDates } from '../scripts/calendar-model.js';
import { descriptionFragment, mountCalendar, renderEvent } from '../scripts/calendar.js';

const now = new Date('2026-09-14T12:00:00Z');
const timed = (overrides = {}) => ({ id: 'one', summary: 'Community event', start: { dateTime: '2026-09-15T01:00:00Z' }, end: { dateTime: '2026-09-15T02:00:00Z' }, ...overrides });
const environment = () => {
  const dom = new JSDOM('<ol data-event-list></ol><p data-calendar-status></p><button data-more-events></button>', { url: 'https://rebsct.com/take-action/' });
  return { document: dom.window.document, purifier: createDOMPurify(dom.window), close: () => dom.window.close() };
};

test('timed events use Connecticut dates even after UTC midnight', () => {
  const dates = eventDates(timed(), now);
  assert.equal(dates.date, '2026-09-14');
  assert.equal(dates.day, '14');
  assert.match(dates.meta, /Monday.*9:00 PM.*10:00 PM EDT/);
});

test('all-day ends are exclusive and multi-day ranges retain both dates', () => {
  const single = eventDates({ start: { date: '2026-09-14' }, end: { date: '2026-09-15' } }, now);
  assert.equal(single.meta, 'Monday · All day');
  const multi = eventDates({ start: { date: '2026-09-14' }, end: { date: '2026-09-17' } }, now);
  assert.match(multi.meta, /Sep 14, 2026 – Sep 16, 2026 · All day/);
});

test('timed multi-day events and DST transitions keep meaningful time ranges', () => {
  const overnight = eventDates(timed({ end: { dateTime: '2026-09-15T13:00:00Z' } }), now);
  assert.match(overnight.meta, /Sep 14, 2026.*Sep 15, 2026/);
  const dst = eventDates(timed({ start: { dateTime: '2026-03-08T06:30:00Z' }, end: { dateTime: '2026-03-08T07:30:00Z' } }), now);
  assert.match(dst.meta, /1:30 AM EST – 3:30 AM EDT/);
  assert.match(eventDates({ start: { date: '2027-01-01' }, end: { date: '2027-01-02' } }, now).meta, /2027/);
});

test('descriptions preserve formatting and links while dropping executable HTML', () => {
  const env = environment();
  const fragment = descriptionFragment('<p><b>Bring signs</b> <a href="https://example.org/rsvp">RSVP</a></p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><p>Visit https://example.org/info?a=1&amp;b=2.</p>', env.document, env.purifier);
  assert.equal(fragment.querySelector('b').textContent, 'Bring signs');
  assert.equal(fragment.querySelectorAll('script,img,[onerror],[onclick]').length, 0);
  const links = [...fragment.querySelectorAll('a')];
  assert.equal(links.length, 2);
  assert.equal(links[1].href, 'https://example.org/info?a=1&b=2');
  assert.ok(links.every((link) => link.rel.includes('noopener') && link.target === '_blank'));
  env.close();
});

test('missing optional fields do not invent a venue or empty event details', () => {
  const env = environment();
  const item = renderEvent(timed({ summary: '' }), env.document, { purifier: env.purifier, now });
  assert.equal(item.querySelector('h3').textContent, 'Community event');
  assert.equal(item.querySelector('.event-location'), null);
  assert.equal(item.querySelector('.event-details'), null);
  assert.equal(eventDates({}).meta, 'Date to be confirmed');
  env.close();
});

test('pagination deduplicates events and fixes timeMin across pages', async () => {
  const env = environment();
  const requests = [];
  const pages = [{ items: [timed()], nextPageToken: 'next' }, { items: [timed(), timed({ id: 'two', summary: 'Second event' })] }];
  const calendar = mountCalendar({ root: env.document, config: { apiKey: 'test-key', calendarId: 'test@example.org' }, purifier: env.purifier, now: () => now, fetcher: async (url) => {
    requests.push(url);
    return { ok: true, json: async () => pages.shift() };
  } });
  await calendar.ready;
  assert.equal(env.document.querySelector('[data-more-events]').hidden, false);
  await calendar.load();
  assert.equal(env.document.querySelectorAll('.event').length, 2);
  assert.equal(requests[1].searchParams.get('pageToken'), 'next');
  assert.equal(requests[0].searchParams.get('timeMin'), requests[1].searchParams.get('timeMin'));
  assert.equal(env.document.querySelector('[data-more-events]').hidden, true);
  calendar.destroy(); env.close();
});

test('empty responses show an empty state and network errors can be retried', async () => {
  const env = environment();
  let calls = 0;
  const calendar = mountCalendar({ root: env.document, config: { apiKey: 'test-key', calendarId: 'test@example.org' }, purifier: env.purifier, now: () => now, fetcher: async () => {
    if (++calls === 1) throw new Error('offline');
    return { ok: true, json: async () => ({ items: [] }) };
  } });
  await calendar.ready;
  assert.equal(env.document.querySelector('[data-calendar-status]').getAttribute('role'), 'alert');
  assert.equal(env.document.querySelector('[data-more-events]').textContent, 'Try again');
  await calendar.load();
  assert.match(env.document.querySelector('[data-calendar-status]').textContent, /No upcoming events/);
  assert.equal(env.document.querySelector('[data-more-events]').hidden, true);
  calendar.destroy(); env.close();
});

test('a failed next page preserves existing events and retries the same token', async () => {
  const env = environment();
  let calls = 0;
  const tokens = [];
  const calendar = mountCalendar({ root: env.document, config: { apiKey: 'test-key', calendarId: 'test@example.org' }, purifier: env.purifier, now: () => now, fetcher: async (url) => {
    tokens.push(url.searchParams.get('pageToken'));
    calls++;
    if (calls === 2) return { ok: false };
    return { ok: true, json: async () => calls === 1 ? { items: [timed()], nextPageToken: 'next' } : { items: [timed({ id: 'two' })] } };
  } });
  await calendar.ready;
  await calendar.load();
  assert.equal(env.document.querySelectorAll('.event').length, 1);
  await calendar.load();
  assert.deepEqual(tokens, [null, 'next', 'next']);
  assert.equal(env.document.querySelectorAll('.event').length, 2);
  calendar.destroy(); env.close();
});
