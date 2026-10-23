import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { validateActions, selectActions, renderActions, safeActionLink } from '../scripts/lib/action-content.mjs';
import { connecticutDate, validDateOnly } from '../scripts/date-utils.js';
import { updateExpiredActions } from '../scripts/action-expiry.js';
import { renderHomeFeature } from '../scripts/lib/home-content.mjs';

const action = (overrides = {}) => ({ id: 'community-action', title: 'Support our neighbors', bodyMarkdown: '**Help** our neighbors. [Details](/take-action/).', displayOrder: 10, isFeatured: false, ...overrides });

test('actions support rich text, a derived summary, and safe external links', () => {
  const [record] = validateActions([action({ bodyMarkdown: '**Help** our neighbors.\n\n- [Read more](https://example.org/action)\n- Get involved' })]);
  assert.equal(record.summary, 'Help our neighbors.');
  assert.match(record.bodyHtml, /<strong>Help<\/strong>/);
  assert.match(record.bodyHtml, /<ul>/);
  assert.match(record.bodyHtml, /rel="noopener noreferrer"/);
});

test('overlapping feature ranges include expired records and report both IDs', () => {
  assert.throws(() => validateActions([
    action({ id: 'old-feature', isFeatured: true, endDate: '2025-01-01' }),
    action({ id: 'new-feature', isFeatured: true }),
  ]), /old-feature, new-feature/);
});

test('scheduled features stay listed before their turn and reject overlapping or invalid dates', () => {
  const party = action({ id: 'watch-party', isFeatured: true, endDate: '2026-11-03' });
  const coat = action({ id: 'coat-drive', isFeatured: true, featureStartDate: '2026-11-04', endDate: '2026-11-30', displayOrder: 20 });
  const records = validateActions([party, coat, action({ id: 'ongoing' })]);
  for (const date of ['2026-10-23', '2026-11-03']) {
    const selected = selectActions(records, date);
    assert.equal(selected.featured.id, 'watch-party');
    assert.deepEqual(selected.others.map(record => record.id), ['ongoing', 'coat-drive']);
  }
  assert.equal(selectActions(records, '2026-11-04').featured.id, 'coat-drive');
  assert.equal(selectActions(records, '2026-11-30').featured.id, 'coat-drive');
  assert.equal(selectActions(records, '2026-12-01').featured, undefined);
  for (const overrides of [
    { featureStartDate: '2026-11-03' },
    { featureStartDate: '2026-11-31' },
    { featureStartDate: '2026-12-01' },
    { isFeatured: false },
  ]) assert.throws(() => validateActions([party, { ...coat, ...overrides }]));
  // Input order must not affect a valid schedule.
  assert.equal(selectActions(validateActions([coat, party]), '2026-11-03').featured.id, 'watch-party');
});

test('a page built before Election Day switches both features at Connecticut midnight without rebuilding', () => {
  const records = validateActions([
    action({ id: 'watch-party', title: 'Watch party', isFeatured: true, endDate: '2026-11-03' }),
    action({ id: 'coat-drive', title: 'Coat drive', isFeatured: true, featureStartDate: '2026-11-04', endDate: '2026-11-30', displayOrder: 20, cta: { label: 'Details', href: '/details/' } }),
    action({ id: 'ongoing', title: 'Ongoing action', displayOrder: 30 }),
  ]);
  const { window } = new JSDOM(`<div>${renderHomeFeature(records, '2026-10-23')}</div><section>${renderActions(records, '2026-10-23')}</section>`);
  const document = window.document;
  const visibleHome = () => [...document.querySelectorAll('.home-feature')].filter(item => !item.hidden);
  const listed = () => [...document.querySelectorAll('[data-action-list] > [data-action]')].filter(item => !item.hidden).map(item => item.id);
  const check = (instant, feature, others) => {
    updateExpiredActions(document, new Date(instant));
    assert.deepEqual(visibleHome().map(item => item.dataset.actionId), [feature]);
    assert.equal(document.querySelector('.featured-action').id, feature);
    assert.equal(document.querySelectorAll(`#${feature}`).length, 1);
    assert.equal(document.querySelector(`#${feature} .feature-label`).hidden, false);
    assert.deepEqual(listed(), others);
  };
  check('2026-11-04T04:59:59Z', 'watch-party', ['coat-drive', 'ongoing']);
  assert.equal(document.querySelector('#coat-drive .feature-label').hidden, true);
  check('2026-11-04T05:00:00Z', 'coat-drive', ['ongoing']);
  assert.equal(document.querySelector('#watch-party').hidden, true);
  assert.equal(document.querySelector('#coat-drive .primary-action').textContent.trim(), 'Details →');
  assert.equal(visibleHome()[0].querySelector('.home-more-actions').getAttribute('href'), '/take-action/#coat-drive');
  // Repeated refreshes keep the same nodes and preserve a focused link.
  const link = document.querySelector('#coat-drive .primary-action');
  link.focus();
  check('2026-11-05T12:00:00Z', 'coat-drive', ['ongoing']);
  assert.equal(document.activeElement, link);
  check('2026-12-01T04:59:59Z', 'coat-drive', ['ongoing']);
  updateExpiredActions(document, new Date('2026-12-01T05:00:00Z'));
  assert.equal(visibleHome().length, 0);
  assert.equal(document.querySelector('.featured-action'), null);
  assert.deepEqual(listed(), ['ongoing']);
  const ids = [...document.querySelectorAll('[id]')].map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
  // Builds after the handoff also produce the right static fallback.
  const after = new JSDOM(renderActions(records, '2026-11-04')).window.document;
  assert.equal(after.querySelector('.featured-action').id, 'coat-drive');
  assert.equal(after.querySelector('#watch-party'), null);
  window.close();
});

test('validation catches malformed records, accidental status fields, and reserved IDs', () => {
  for (const record of [
    action({ id: 'Not a slug' }), action({ title: '' }), action({ bodyMarkdown: null }),
    action({ displayOrder: 1.2 }), action({ isFeatured: 'yes' }), action({ endDate: '2026-02-30' }),
    action({ endDate: '' }), action({ cta: { label: 'Donate' } }), action({ active: false }),
    action({ id: 'events' }), action({ id: 'action-title-support-dufi' }),
  ]) assert.throws(() => validateActions([record]));
  assert.throws(() => validateActions([action(), action()]), /duplicate/);
  assert.equal(validDateOnly('2028-02-29'), true);
  assert.equal(validDateOnly('2026-02-29'), false);
});

test('unsafe links fail the build and raw HTML is rendered as text', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,hi', '//example.org', '/\\example.org', 'https://user:password@example.org']) {
    assert.equal(safeActionLink(href), false);
    assert.throws(() => validateActions([action({ cta: { label: 'Go', href } })]));
  }
  assert.throws(() => validateActions([action({ bodyMarkdown: '[Click](javascript:alert%281%29)' })]), /Unsupported/);
  const [record] = validateActions([action({ bodyMarkdown: '<script>alert(1)</script>\n\n<strong>Text</strong>' })]);
  assert.doesNotMatch(record.bodyHtml, /<script>|<strong>Text<\/strong>/);
  assert.match(record.bodyHtml, /&lt;script&gt;/);
});

test('featured action appears once; remaining actions have deterministic display order', () => {
  const records = validateActions([
    action({ id: 'z-last', displayOrder: 20 }), action({ id: 'b-second' }),
    action({ id: 'feature', isFeatured: true, displayOrder: 30 }), action({ id: 'a-first' }),
  ]);
  const selected = selectActions(records, '2026-09-14');
  assert.equal(selected.featured.id, 'feature');
  assert.deepEqual(selected.others.map((record) => record.id), ['a-first', 'b-second', 'z-last']);
  const document = new JSDOM(renderActions(records, '2026-09-14')).window.document;
  assert.equal(document.querySelectorAll('#feature').length, 1);
  assert.equal(document.querySelector('.featured-action').classList.contains('action-without-cta'), true);
});

test('expiry follows Connecticut midnight across the autumn DST boundary', () => {
  assert.equal(connecticutDate(new Date('2026-11-02T04:59:59Z')), '2026-11-01');
  assert.equal(connecticutDate(new Date('2026-11-02T05:00:00Z')), '2026-11-02');
  const records = validateActions([action({ isFeatured: true, endDate: '2026-11-01' }), action({ id: 'ongoing' })]);
  assert.ok(selectActions(records, '2026-11-01').featured);
  assert.equal(selectActions(records, '2026-11-02').featured, undefined);
  const document = new JSDOM(renderActions(records, '2026-11-01')).window.document;
  updateExpiredActions(document, new Date('2026-11-02T05:00:00Z'));
  assert.equal(document.querySelector('#community-action').hidden, true);
  assert.equal(document.querySelector('#ongoing').hidden, false);
  assert.equal(document.querySelector('#ongoing').classList.contains('featured-action'), false);
  assert.equal(document.querySelector('.actions-empty-state').hidden, true);
});

test('empty and all-expired collections keep an actionable empty state', () => {
  const records = validateActions([action({ endDate: '2026-09-14' })]);
  const document = new JSDOM(renderActions(records, '2026-09-14')).window.document;
  updateExpiredActions(document, new Date('2026-09-15T04:00:00Z'));
  assert.equal(document.querySelector('[data-action-list]').hidden, true);
  assert.equal(document.querySelector('.actions-empty-state').hidden, false);
  assert.equal(new JSDOM(renderActions([])).window.document.querySelector('.actions-empty-state').hidden, false);
});

test('the decorative empty slot follows visible ordinary actions through expiry and promotion', () => {
  for (const count of [0, 1, 2, 3, 4]) {
    const records = validateActions(Array.from({ length: count }, (_, index) => action({ id: `action-${index}` })));
    const document = new JSDOM(renderActions(records, '2026-10-23')).window.document;
    assert.equal(document.querySelector('[data-action-list]').hasAttribute('data-action-empty-slot'), count % 2 === 1);
  }
  const records = validateActions([
    action({ id: 'party', isFeatured: true, endDate: '2026-11-03' }),
    action({ id: 'coat-drive', isFeatured: true, featureStartDate: '2026-11-04', endDate: '2026-11-30' }),
    action({ id: 'extra-action', endDate: '2026-10-31' }),
  ]);
  const document = new JSDOM(renderActions(records, '2026-10-23')).window.document;
  const list = document.querySelector('[data-action-list]');
  assert.equal(list.hasAttribute('data-action-empty-slot'), false);
  updateExpiredActions(document, new Date('2026-11-01T16:00:00Z'));
  assert.equal(document.querySelector('#extra-action').hidden, true);
  assert.equal(list.hasAttribute('data-action-empty-slot'), true);
  updateExpiredActions(document, new Date('2026-11-04T05:00:00Z'));
  assert.equal(document.querySelector('.featured-action').id, 'coat-drive');
  assert.equal(list.hasAttribute('data-action-empty-slot'), false);
  assert.equal(list.hidden, true);
});
