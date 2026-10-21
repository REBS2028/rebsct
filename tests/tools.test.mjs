import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { validateStatewide, renderStatewide, validateResources, renderResources, validateScorecardLinks } from '../scripts/lib/tools-content.mjs';
import { createUsageReporter, initializeLookupAnalytics } from '../scripts/lookup-analytics.js';
import { mountRepresentativeLookup, renderOffice } from '../scripts/representative-lookup.js';
import { apiBaseFor } from '../scripts/representative-config.js';

const page = await readFile(new URL('../tools/index.html', import.meta.url), 'utf8');
const statewide = JSON.parse(await readFile(new URL('../content/statewide-officials.json', import.meta.url), 'utf8'));
const address = { street: '91 PRIVACY-SENTINEL Lane', city: 'Synthetic Town', state: 'CT', zip: '06000' };
const record = (chamber, extra = {}) => ({ chamber, officeKey: `CT-${chamber}-${chamber === 'us-house' ? '04' : '135'}`, district: chamber === 'us-house' ? '04' : '135', status: 'occupied', name: `Public ${chamber}`, officialUrl: 'https://www.cga.ct.gov/', sourceUrl: 'https://www.cga.ct.gov/', rosterCheckedAt: '2026-10-20T12:00:00Z', freshness: 'fresh', ...extra });
const success = { status: 'success', matchedAddress: '91 PRIVACY-SENTINEL LN, SYNTHETIC TOWN, CT, 06000', offices: ['us-house', 'state-house', 'state-senate'].map(c => record(c)) };
function setup({ response = success, lookupFetch, statewideFetch, reporter } = {}) {
  const dom = new JSDOM(page, { url: 'http://127.0.0.1:4173/tools/' });
  const calls = []; const events = [];
  const report = reporter || createUsageReporter((...args) => events.push(args));
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/statewide')) return statewideFetch ? statewideFetch(url, options) : new Response(JSON.stringify({ status: 'success', offices: [record('governor', { officeKey: 'CT-governor', name: 'Current Governor', district: undefined, termStart: '2023-01-04T17:00:00Z', termEnd: '2027-01-06T15:00:00Z' }), record('us-senate', { officeKey: 'CT-us-senate-1', name: 'Current Senator One', district: '1' }), record('us-senate', { officeKey: 'CT-us-senate-3', name: 'Current Senator Three', district: '3' })] }));
    return lookupFetch ? lookupFetch(url, options) : new Response(JSON.stringify(response), { status: ['no_match', 'out_of_state'].includes(response.status) ? 422 : response.status === 'rate_limited' ? 429 : 200 });
  };
  const app = mountRepresentativeLookup({ root: dom.window.document, browser: dom.window, fetcher, apiBase: 'https://lookup.test', report, now: () => Date.parse('2026-10-20T12:00:00Z') });
  return { dom, doc: dom.window.document, app, calls, events };
}

test('generated Tools page preserves shared flows, ordered sections, and usable no-JavaScript fallbacks', () => {
  const doc = new JSDOM(page).window.document;
  assert.deepEqual([...doc.querySelectorAll('.tools-content > section')].map(s => s.id || s.className), ['know-your-rep', 'lookup-section', 'scorecard-feature']);
  assert.equal(doc.querySelectorAll('[data-statewide-office]').length, 3); assert.equal(doc.querySelector('[data-lookup-form]').hidden, true);
  assert.deepEqual([...doc.querySelectorAll('[data-statewide-office]')].map(card => card.dataset.statewideOffice), ['CT-governor', 'CT-us-senate-1', 'CT-us-senate-3']);
  assert.deepEqual([...doc.querySelectorAll('.official-grid .office-term')].map(p => p.textContent), ['Term: 2023–2027', 'Term: 2025–2031', 'Term: 2023–2029']);
  assert.doesNotMatch(doc.querySelector('main').textContent, /Last checked|Source checked|maintained separately|We count lookup attempts/);
  assert.equal(doc.querySelector('footer a').getAttribute('href'), '../index.html');
  assert.equal(doc.querySelector('.hamburger').tagName, 'BUTTON'); assert.equal(doc.querySelector('.hamburger').getAttribute('aria-controls'), doc.querySelector('.mobile-menu').id);
  assert.ok(doc.querySelector('[data-member-signup]')); assert.ok(doc.querySelector('a[href*="tally-open=w2orMD"]'));
  assert.ok(doc.querySelector('a[href="https://www.cga.ct.gov/webapps/cgafyl.asp"]'));
  assert.doesNotMatch(page, /Under Construction|\{\{STATEWIDE\}\}|googletagmanager\.com/);
  const ids = [...doc.querySelectorAll('[id]')].map(e => e.id); assert.equal(new Set(ids).size, ids.length);
});

test('resource collections validate safe content and omit empty sections without inventing endorsements', () => {
  const section = { id: 'public-guides', title: 'Guides', displayOrder: 10, resources: [{ id: 'sample-guide', title: '<script>Sample</script>', descriptionMarkdown: '**Read** this guide.', url: 'https://example.org/guide', displayOrder: 20 }] };
  const doc = new JSDOM(renderResources(validateResources([section]))).window.document;
  assert.equal(doc.querySelector('h3').textContent, '<script>Sample</script>'); assert.equal(doc.querySelector('script'), null); assert.equal(doc.querySelector('strong').textContent, 'Read');
  assert.equal(renderResources(validateResources([])), ''); assert.equal(renderResources(validateResources([{ ...section, resources: [] }])), '');
  for (const bad of [{ ...section, id: 'Not a slug' }, { ...section, displayOrder: 1.2 }, { ...section, unknown: true }, { ...section, resources: [{ ...section.resources[0], url: 'javascript:alert(1)' }] }]) assert.throws(() => validateResources([bad]));
  assert.throws(() => validateResources([section, section]));
  assert.throws(() => validateScorecardLinks({ H001047: 'https://evil.test/reps/H001047/' }));
  assert.deepEqual(validateScorecardLinks({}), {});
});

test('valid resource slugs never collide with headings or resources in another section', () => {
  const resource = { id: 'title', title: 'Guide', descriptionMarkdown: 'A public guide.', url: 'https://example.org/', displayOrder: 1 };
  const sections = [
    { id: 'guides', title: 'Guides', displayOrder: 1, resources: [resource, { ...resource, id: 'local-help' }] },
    { id: 'guides-title', title: 'More guides', displayOrder: 2, resources: [resource] },
    { id: 'guides-local', title: 'Local guides', displayOrder: 3, resources: [{ ...resource, id: 'help' }] },
  ];
  const doc = new JSDOM(renderResources(validateResources(sections))).window.document;
  const ids = [...doc.querySelectorAll('[id]')].map(node => node.id);
  assert.equal(ids.length, new Set(ids).size);
  for (const section of doc.querySelectorAll('section')) assert.equal(doc.getElementById(section.getAttribute('aria-labelledby')), section.querySelector('h2'));
});

test('statewide fallbacks require all offices, sources, verification dates, and term deadlines', () => {
  assert.equal(new JSDOM(renderStatewide(validateStatewide(statewide))).window.document.querySelectorAll('article').length, 3);
  assert.throws(() => validateStatewide(statewide.slice(0, 2)));
  assert.throws(() => validateStatewide([statewide[0], statewide[0], statewide[2]]));
  assert.throws(() => validateStatewide(statewide.map(r => ({ ...r, officialUrl: 'javascript:alert(1)' }))));
});

test('lookup success renders safe text and emits only attempt and outcome, never input or results', async () => {
  const { app, doc, calls, events, dom } = setup(); await app.statewideReady; assert.equal(events.length, 0);
  await app.lookup(address);
  assert.equal(doc.querySelectorAll('.district-grid .official-card').length, 3); assert.match(doc.querySelector('[data-lookup-results]').textContent, /PRIVACY-SENTINEL/);
  assert.deepEqual(events, [['event', 'rep_lookup_submit', {}], ['event', 'rep_lookup_outcome', { outcome: 'success' }]]);
  assert.doesNotMatch(JSON.stringify(events), /PRIVACY|06000|135|Public us-house|street|city|matchedAddress/);
  const sent = calls.find(c => c.url.endsWith('/lookup')); assert.equal(sent.options.method, 'POST'); assert.equal(sent.options.credentials, 'omit'); assert.equal(sent.url, 'https://lookup.test/v1/lookup');
  assert.equal(dom.window.localStorage.length, 0); assert.equal(dom.window.sessionStorage.length, 0); assert.equal(dom.window.location.href, 'http://127.0.0.1:4173/tools/');
  assert.equal(doc.activeElement, doc.querySelector('[data-lookup-results]'));
  assert.equal(doc.querySelector('[data-lookup-status]').textContent, '');
  assert.equal(doc.querySelector('[data-statewide-status]').hidden, true);
  assert.equal(doc.querySelector('[data-statewide-office="CT-governor"] h3').textContent, 'Current Governor');
});

test('every outcome remains broad and analytics failure never prevents results', async () => {
  for (const outcome of ['partial', 'no_match', 'out_of_state', 'rate_limited', 'ambiguous']) {
    const state = setup({ response: { ...success, status: outcome, candidates: [] } }); await state.app.lookup(address);
    assert.deepEqual(state.events.at(-1), ['event', 'rep_lookup_outcome', { outcome }]); assert.equal(state.events.length, 2);
  }
  const broken = setup({ reporter: () => { throw new Error('Blocked analytics'); } }); await broken.app.lookup(address);
  assert.equal(broken.doc.querySelectorAll('.district-grid article').length, 3);
});

test('incomplete form never requests a lookup or counts an attempt; unknown statuses never enter analytics', async () => {
  const state = setup({ response: { status: 'PRIVATE-RESPONSE-MARKER' } });
  state.doc.querySelector('form').dispatchEvent(new state.dom.window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(state.calls.filter(c => c.url.endsWith('/lookup')).length, 0); assert.equal(state.events.length, 0);
  await state.app.lookup(address); assert.equal(state.events.at(-1)[2].outcome, 'error'); assert.doesNotMatch(JSON.stringify(state.events), /PRIVATE-RESPONSE/);
});

test('superseded requests clear old results and late replies cannot replace the new address', async () => {
  let finishOld; let calls = 0;
  const state = setup({ lookupFetch: async () => ++calls === 1 ? new Promise(resolve => { finishOld = resolve; }) : new Response(JSON.stringify({ ...success, matchedAddress: 'New public address' })) });
  const old = state.app.lookup(address); assert.equal(state.doc.querySelector('[data-lookup-results]').childElementCount, 0);
  await state.app.lookup({ ...address, street: 'New public address' });
  finishOld(new Response(JSON.stringify({ ...success, matchedAddress: 'Old address' }))); await old;
  assert.match(state.doc.querySelector('[data-lookup-results]').textContent, /New public address/); assert.doesNotMatch(state.doc.querySelector('[data-lookup-results]').textContent, /Old address/);
  assert.equal(state.events.filter(e => e[1] === 'rep_lookup_submit').length, 2);
  assert.deepEqual(state.events.filter(e => e[1] === 'rep_lookup_outcome').map(e => e[2].outcome).sort(), ['cancelled', 'success']);
});

test('candidate selection sends a new address request and unresolved candidates never show officials', async () => {
  const state = setup({ response: { status: 'ambiguous', candidates: [{ label: 'Public candidate', address }] } });
  await state.app.lookup(address); assert.equal(state.doc.querySelectorAll('.district-grid article').length, 0);
  assert.equal(state.doc.querySelectorAll('.candidate-button').length, 1);
  await state.app.lookup(address, true); assert.equal(state.doc.querySelectorAll('.candidate-button').length, 0);
  assert.match(state.doc.querySelector('[data-lookup-status]').textContent, /still ambiguous/);
});

test('missing live officials remove static predecessors, while whole-service outage preserves recent fallbacks', async () => {
  const missing = setup({ statewideFetch: async () => new Response(JSON.stringify({ status: 'partial', offices: [] })) }); await missing.app.statewideReady;
  assert.doesNotMatch(missing.doc.querySelector('.official-grid').textContent, /Chris Murphy|Richard Blumenthal|Ned Lamont/);
  const outage = setup({ statewideFetch: async () => { throw new Error('Network unavailable'); } }); await outage.app.statewideReady;
  assert.match(outage.doc.querySelector('.official-grid').textContent, /Chris Murphy/);
  assert.equal(outage.doc.querySelector('[data-statewide-status]').textContent, ''); assert.equal(outage.doc.querySelector('[data-statewide-status]').hidden, true);
});

test('district cards show office terms and prefer verified official websites without check dates', () => {
  const doc = new JSDOM('<main></main>').window.document;
  const card = renderOffice(doc, record('us-house', { officialUrl: 'https://himes.house.gov/', termStart: '2025-01-03T17:00:00Z', termEnd: '2027-01-03T17:00:00Z' }));
  assert.equal(card.querySelector('a').href, 'https://himes.house.gov/'); assert.equal(card.querySelector('a').textContent, 'Official website ↗');
  assert.match(card.textContent, /Term: 2025–2027/); assert.doesNotMatch(card.textContent, /checked|Official source|contact profile/);
  assert.equal(renderOffice(doc, record('us-house', { officialUrl: 'https://clerk.house.gov/members/H001047' })).querySelector('a').textContent, 'Official contact profile ↗');
});

test('unsafe member markup and executable contact destinations cannot run', () => {
  const doc = new JSDOM('<main></main>').window.document;
  doc.querySelector('main').append(renderOffice(doc, record('state-house', { name: '<img src=x onerror=alert(1)>', officialUrl: 'javascript:alert(1)', contactUrl: 'data:text/html,evil' })));
  assert.equal(doc.querySelector('img'), null); assert.match(doc.querySelector('h3').textContent, /<img/); assert.ok([...doc.querySelectorAll('a')].every(a => !/^(javascript|data):/.test(a.href)));
});

test('network failure gives an available official fallback without exposing exceptions or stale results', async () => {
  const state = setup({ lookupFetch: async () => { throw new TypeError('PRIVATE-URL-QUERY'); } }); await state.app.lookup(address);
  assert.match(state.doc.querySelector('[data-lookup-status]').textContent, /service is unavailable/);
  assert.equal(state.doc.querySelector('[data-lookup-results]').childElementCount, 0); assert.equal(state.doc.querySelector('[data-lookup-retry]').hidden, false);
  assert.doesNotMatch(state.doc.querySelector('[data-lookup-status]').textContent, /PRIVATE-URL/);
  assert.equal(state.events.at(-1)[2].outcome, 'error');
});

test('analytics bootstrap requires a reviewed stream and production host, strips query metadata, and allowlists parameters', () => {
  const local = new JSDOM(page, { url: 'http://127.0.0.1:4173/tools/' }); initializeLookupAnalytics(local.window, true)('rep_lookup_submit');
  assert.equal(local.window.gtag, undefined); assert.equal(local.window.document.querySelector('script[src*="googletagmanager"]'), null);
  const prod = new JSDOM(page, { url: 'https://rebsct.com/tools/?street=PRIVATE-MARKER', referrer: 'https://example.org/?address=PRIVATE-MARKER' });
  initializeLookupAnalytics(prod.window, false); assert.equal(prod.window.gtag, undefined);
  const reporter = initializeLookupAnalytics(prod.window, true); reporter('rep_lookup_submit', address); reporter('rep_lookup_outcome', 'success'); reporter('rep_lookup_outcome', 'PRIVATE-MARKER'); reporter('unknown_event', 'success');
  const events = prod.window.dataLayer.map(a => [...a]); assert.doesNotMatch(JSON.stringify(events), /PRIVATE-MARKER|PRIVACY-SENTINEL|06000/);
  const config = events.find(e => e[0] === 'config')[2]; assert.equal(config.page_location, 'https://rebsct.com/tools/'); assert.equal(config.page_referrer, 'https://example.org/');
  assert.deepEqual(events.filter(e => e[0] === 'event'), [['event', 'rep_lookup_submit', {}], ['event', 'rep_lookup_outcome', { outcome: 'success' }]]);
});

test('API configuration uses the verified production service and has no address-bearing override', () => {
  assert.equal(apiBaseFor(new URL('http://localhost:4173/tools/')), 'http://127.0.0.1:8787');
  assert.equal(apiBaseFor(new URL('https://rebsct.com/tools/')), 'https://rebs-representative-lookup.rebs2028.workers.dev');
  assert.equal(apiBaseFor(new URL('https://www.rebsct.com/tools/')), 'https://rebs-representative-lookup.rebs2028.workers.dev');
  assert.equal(apiBaseFor(new URL('https://other.test/tools/')), '');
  for (const base of ['http://unsafe.test', 'https://user:password@unsafe.test', 'https://safe.test/?address=private', 'https://safe.test/lookup']) assert.equal(apiBaseFor(new URL('https://rebsct.com/'), { productionApiBase: base }), '');
});
