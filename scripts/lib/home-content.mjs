import { actionAttributes, selectActions } from './action-content.mjs';
import { actionExpired, connecticutDate } from '../date-utils.js';
import { escapeHtml } from './content-markdown.mjs';
import { ELECTION_DAY, EARLY_VOTING_START, EARLY_VOTING_END } from '../election-model.js';

export function renderHomeFeature(records, today = connecticutDate()) {
  const { featured } = selectActions(records, today);
  // Keep future features in the page so the browser can switch without a new build.
  return records.filter(record => record.isFeatured && !actionExpired(record.endDate, today)).map(record => {
    const target = `/take-action/#${record.id}`;
    const external = record.cta && /^https?:/i.test(record.cta.href);
    return `<article class="home-feature" ${actionAttributes(record)}${record === featured ? '' : ' hidden'} aria-labelledby="home-feature-heading-${record.id}">
      <div><p class="home-feature-label">Featured action</p>
      <h2 id="home-feature-heading-${record.id}"><a href="${target}">${escapeHtml(record.title)}</a></h2>
      <p class="home-feature-description">${escapeHtml(record.summary)}</p></div>
      <div class="home-feature-links">
        ${record.cta ? `<a class="home-feature-cta" href="${escapeHtml(record.cta.href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(record.cta.label)} <span aria-hidden="true">${external ? '↗' : '→'}</span></a>` : ''}
        <a class="home-more-actions" href="${target}">More on Take Action <span aria-hidden="true">→</span></a>
      </div>
    </article>`;
  }).join('\n');
}

export function renderElection() {
  return `<section class="election-card" data-election aria-labelledby="election-heading">
    <div class="election-countdown">
      <span class="election-days" data-election-days hidden></span>
      <div><p class="election-label" data-election-label hidden></p><h2 id="election-heading">Election Day</h2>
      <p class="election-date"><time datetime="${ELECTION_DAY}">November 3, 2026</time></p></div>
    </div>
    <p class="early-voting"><span data-early-voting-label>CT early voting</span> <span aria-hidden="true">·</span> <strong><time datetime="${EARLY_VOTING_START}">Oct 19</time>–<time datetime="${EARLY_VOTING_END}">Nov 1</time></strong></p>
    <div class="election-links"><a href="https://portal.ct.gov/sots/election-services/voter-information/where-and-how-do-i-vote" target="_blank" rel="noopener noreferrer">Voting information <span aria-hidden="true">↗</span></a><a href="https://accountabilityscorecard.org/" target="_blank" rel="noopener noreferrer">Accountability Scorecard <span aria-hidden="true">↗</span></a></div>
  </section>`;
}

export function renderMemorial(entries) {
  if (!Array.isArray(entries) || !entries.length || entries.some(entry => typeof entry !== 'string' || !entry.trim()) || new Set(entries).size !== entries.length) throw new Error('Memorial entries must be unique, nonempty text.');
  const group = `<div class="memorial-ticker-group">${entries.map(entry => `<span>${escapeHtml(entry)}</span>`).join('')}</div>`;
  return `<section class="home-memorial" aria-labelledby="memorial-heading">
    <div class="memorial-heading"><h2 id="memorial-heading">Say their names.</h2><p>Died in ICE &amp; CBP custody or operations</p></div>
    <div class="memorial-ticker-window" tabindex="0" role="region" aria-label="Memorial ticker"><div class="memorial-ticker-track" aria-hidden="true">${group}${group}</div></div>
    <ul class="memorial-accessible-records">${entries.map(entry => `<li>${escapeHtml(entry)}</li>`).join('')}</ul>
  </section>`;
}
