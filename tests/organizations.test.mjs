import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { validateOrganizations, renderOrganizations } from '../scripts/lib/organization-content.mjs';
import { validateActions, renderActions } from '../scripts/lib/action-content.mjs';
import { updateExpiredActions } from '../scripts/action-expiry.js';

const organization = (overrides = {}) => ({
  id: 'sample-organization', name: 'Sample organization',
  bodyMarkdown: '**Community support** with [program details](https://example.org/programs).',
  websiteUrl: 'https://example.org/', donationUrl: 'https://example.org/donate?source=rebs&fund=general',
  displayOrder: 10, ...overrides,
});

test('organization links and required fields are validated independently of action fields', () => {
  for (const invalid of [null, [], organization({ id: 'Not a slug' }), organization({ name: ' ' }),
    organization({ bodyMarkdown: null }), organization({ displayOrder: 1.5 }),
    organization({ websiteUrl: '/local/' }), organization({ donationUrl: '//example.org' }),
    organization({ donationUrl: 'javascript:alert(1)' }), organization({ websiteUrl: 'https://user:secret@example.org/' }),
    organization({ actionId: 'some-action' }), organization({ isFeatured: true }), organization({ active: true }),
    organization({ endDate: '2026-09-25' }), organization({ donationUrl: '' }),
  ]) assert.throws(() => validateOrganizations([invalid]));
  assert.throws(() => validateOrganizations({}), /array/);
  assert.throws(() => validateOrganizations([organization(), organization()]), /duplicate/);
  assert.throws(() => validateOrganizations([organization({ bodyMarkdown: '[Unsafe](javascript:alert%281%29)' })]), /Unsupported/);
});

test('organizations retain formatting, escape markup, and support an omitted donation link', () => {
  const noDonation = organization({ id: 'information-only', name: '<script>Sample</script>', bodyMarkdown: '**Support** our neighbors.\n\n<img src=x onerror=alert(1)>\n\n[Programs](https://example.org/programs)' });
  delete noDonation.donationUrl;
  const records = validateOrganizations([noDonation, organization()]);
  const document = new JSDOM(renderOrganizations(records)).window.document;
  assert.equal(document.querySelectorAll('.organization').length, 2);
  assert.equal(document.querySelector('#organization-information-only .organization-donate'), null);
  assert.equal(document.querySelector('#organization-information-only h3').textContent, noDonation.name);
  assert.equal(document.querySelector('#organization-information-only strong').textContent, 'Support');
  assert.equal(document.querySelector('script, img'), null);
  assert.equal(document.querySelector('.organization-donate').getAttribute('href'), organization().donationUrl);
  for (const link of document.querySelectorAll('a')) {
    assert.equal(link.target, '_blank');
    assert.equal(link.rel, 'noopener noreferrer');
  }
});

test('organization order is deterministic and an empty list publishes no recommendations', () => {
  const records = validateOrganizations([organization({ id: 'z-last', displayOrder: 20 }), organization({ id: 'b-next' }), organization({ id: 'a-first' })]);
  const originalOrder = records.map((record) => record.id);
  const document = new JSDOM(renderOrganizations(records)).window.document;
  assert.deepEqual([...document.querySelectorAll('.organization')].map((item) => item.id), ['organization-a-first', 'organization-b-next', 'organization-z-last']);
  assert.deepEqual(records.map((record) => record.id), originalOrder);
  assert.equal(renderOrganizations(validateOrganizations([])), '');
});

test('organization section sits between actions and events and survives expiry of a matching action', async () => {
  const records = validateOrganizations([organization({ id: 'shared-name' }), organization({ id: 'shared-name-title' })]);
  const actionRecord = { id: 'shared-name', title: 'A current action', bodyMarkdown: 'Time-limited action.', displayOrder: 10, isFeatured: true, endDate: '2026-09-25' };
  const actions = validateActions([actionRecord]);
  const template = await readFile(new URL('../templates/take-action.html', import.meta.url), 'utf8');
  const page = template.replace('{{ACTIONS}}', () => renderActions(actions, '2026-09-25')).replace('{{ORGANIZATIONS}}', () => renderOrganizations(records));
  const document = new JSDOM(page).window.document;
  assert.deepEqual([...document.querySelectorAll('.action-page-content > section')].map((item) => item.id), ['current-actions', 'organizations', 'events']);
  const ids = [...document.querySelectorAll('[id]')].map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  updateExpiredActions(document, new Date('2026-09-26T05:00:00Z'));
  assert.equal(document.querySelector('#shared-name').hidden, true);
  assert.equal(document.querySelector('#organization-shared-name').hidden, false);
  assert.equal(document.querySelectorAll('[data-action]').length, 1);
  assert.equal(new JSDOM(renderOrganizations(records)).window.document.querySelectorAll('.organization').length, 2);
  for (const id of ['organizations', 'organizations-title', 'organization-shared-name']) {
    assert.throws(() => validateActions([{ ...actionRecord, id }]), /reserved/);
  }
});
