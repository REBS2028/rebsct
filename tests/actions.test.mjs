import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { validateActions, selectActions, renderActions, safeActionLink } from '../scripts/lib/action-content.mjs';
import { connecticutDate, validDateOnly } from '../scripts/date-utils.js';
import { updateExpiredActions } from '../scripts/action-expiry.js';

const action = (overrides = {}) => ({ id: 'community-action', title: 'Support our neighbors', bodyMarkdown: '**Help** our neighbors. [Details](/take-action/).', displayOrder: 10, isFeatured: false, ...overrides });

test('actions support rich text, a derived summary, and safe external links', () => {
  const [record] = validateActions([action({ bodyMarkdown: '**Help** our neighbors.\n\n- [Read more](https://example.org/action)\n- Get involved' })]);
  assert.equal(record.summary, 'Help our neighbors.');
  assert.match(record.bodyHtml, /<strong>Help<\/strong>/);
  assert.match(record.bodyHtml, /<ul>/);
  assert.match(record.bodyHtml, /rel="noopener noreferrer"/);
});

test('one-feature gate includes expired records and reports both IDs', () => {
  assert.throws(() => validateActions([
    action({ id: 'old-feature', isFeatured: true, endDate: '2025-01-01' }),
    action({ id: 'new-feature', isFeatured: true }),
  ]), /old-feature, new-feature/);
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
