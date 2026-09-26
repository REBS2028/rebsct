import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { validateActions } from '../scripts/lib/action-content.mjs';
import { renderHomeFeature, renderElection, renderMemorial } from '../scripts/lib/home-content.mjs';
import { electionState, updateElection } from '../scripts/election-model.js';
import { updateExpiredActions } from '../scripts/action-expiry.js';
import { mountMemorial } from '../scripts/memorial.js';

test('countdown follows Connecticut midnight and DST, including election day and afterward', () => {
  assert.equal(electionState(new Date('2026-09-25T16:00:00Z')).days, 39);
  assert.equal(electionState(new Date('2026-11-01T03:59:59Z')).days, 3);
  assert.equal(electionState(new Date('2026-11-01T04:00:00Z')).days, 2);
  assert.equal(electionState(new Date('2026-11-02T04:59:59Z')).days, 2);
  const eve = electionState(new Date('2026-11-02T05:00:00Z'));
  assert.equal(eve.days, 1);
  assert.equal(eve.label, 'day until');
  const day = electionState(new Date('2026-11-03T05:00:00Z'));
  assert.equal(day.days, null);
  assert.equal(day.label, 'Today is');
  assert.equal(day.heading, 'Election Day');
  assert.equal(electionState(new Date('2026-11-04T05:00:00Z')).heading, 'Election resources');
});

test('early voting transitions on the correct local dates and the static fallback gives the dates', () => {
  assert.equal(electionState(new Date('2026-10-19T03:59:59Z')).earlyLabel, 'CT early voting');
  assert.equal(electionState(new Date('2026-10-19T04:00:00Z')).earlyLabel, 'CT early voting is open');
  assert.equal(electionState(new Date('2026-11-02T04:59:59Z')).earlyLabel, 'CT early voting is open');
  assert.equal(electionState(new Date('2026-11-02T05:00:00Z')).earlyLabel, 'CT early voting ended');
  const document = new JSDOM(renderElection()).window.document;
  assert.equal(document.querySelector('[data-election-days]').hidden, true);
  assert.match(document.body.textContent, /November 3, 2026/);
  updateElection(document, new Date('2026-11-02T05:00:00Z'));
  assert.equal(document.querySelector('[data-election-days]').textContent, '1');
  updateElection(document, new Date('2026-11-03T05:00:00Z'));
  assert.equal(document.querySelector('[data-election-days]').hidden, true);
  assert.equal(document.querySelector('[data-election-label]').textContent, 'Today is');
});

test('homepage selects the shared feature, escapes summaries, supports missing CTAs, and expires in place', () => {
  const records = validateActions([{ id:'mixer', title:'Mixer', bodyMarkdown:'Longer **copy**', summary:'<img src=x> Short copy', displayOrder:10, isFeatured:true, endDate:'2026-10-04', cta:{ label:'Register', href:'https://example.org/rsvp' } }]);
  const document = new JSDOM(renderHomeFeature(records, '2026-10-04')).window.document;
  assert.equal(document.querySelectorAll('article').length, 1);
  assert.equal(document.querySelector('img'), null);
  assert.match(document.querySelector('.home-feature-description').textContent, /<img src=x>/);
  assert.equal(document.querySelector('.home-more-actions').getAttribute('href'), '/take-action/#mixer');
  assert.equal(document.querySelector('.home-feature-cta').rel, 'noopener noreferrer');
  updateExpiredActions(document, new Date('2026-10-05T04:00:00Z'));
  assert.equal(document.querySelector('article').hidden, true);
  assert.equal(renderHomeFeature(records, '2026-10-05'), '');
  assert.equal(renderHomeFeature([]), '');
  const noCTA = records.map(({ cta, ...record }) => record);
  const without = new JSDOM(renderHomeFeature(noCTA, '2026-10-04')).window.document;
  assert.equal(without.querySelector('.home-feature-cta'), null);
  assert.ok(without.querySelector('.home-more-actions'));
});

test('memorial keeps full details accessible without animation or JavaScript', () => {
  const entries = ['A Person, 25, of Example, died in Somewhere on January 1, 2026', 'Another Person <unknown>'];
  const document = new JSDOM(renderMemorial(entries)).window.document;
  assert.deepEqual([...document.querySelectorAll('.memorial-accessible-records li')].map(item => item.textContent), entries);
  assert.equal(document.querySelector('.memorial-ticker-track').getAttribute('aria-hidden'), 'true');
  assert.equal(document.querySelectorAll('.memorial-ticker-group').length, 2);
  assert.equal(document.querySelector('unknown'), null);
  assert.throws(() => renderMemorial(['same', 'same']), /unique/);
});

test('memorial initializes without controls and retains a constant reading speed', () => {
  const { window } = new JSDOM(renderMemorial(['Full memorial record']));
  const document = window.document;
  document.querySelector('.memorial-ticker-group').getBoundingClientRect = () => ({width:3375});
  mountMemorial(document, window);
  const section = document.querySelector('.home-memorial');
  assert.ok(section.classList.contains('memorial-ready'));
  assert.equal(section.querySelector('button, details'), null);
  assert.equal(document.querySelector('.memorial-ticker-track').style.animationDuration, '100s');
  window.close();
});
