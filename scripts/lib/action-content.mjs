import { connecticutDate, validDateOnly } from '../date-utils.js';
import { selectActions } from '../action-model.js';
import { escapeHtml, safeContentLink as safeActionLink, renderMarkdown, firstParagraphText } from './content-markdown.mjs';

export { escapeHtml, safeActionLink, selectActions };

export function validateActions(records) {
  if (!Array.isArray(records)) throw new Error('Actions must be an array.');
  const ids = new Set();
  const fields = new Set(['id', 'title', 'bodyMarkdown', 'summary', 'cta', 'displayOrder', 'isFeatured', 'featureStartDate', 'endDate']);
  const requiredText = (value) => typeof value === 'string' && Boolean(value.trim());
  const validated = records.map((record, index) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`Action ${index + 1} must be an object.`);
    const fail = (message) => { throw new Error(`Action ${record.id || index + 1}: ${message}`); };
    for (const key of Object.keys(record)) if (!fields.has(key)) fail(`unknown field "${key}".`);
    if (typeof record.id !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(record.id)) fail('id must be a lowercase slug.');
    if (['events', 'current-actions', 'organizations', 'organizations-title', 'main-content', 'current-actions-title', 'calendar-title', 'mobile-navigation'].includes(record.id) || record.id.startsWith('action-title-') || record.id.startsWith('organization-') || record.id.startsWith('member-signup')) fail('id is reserved for page navigation.');
    if (ids.has(record.id)) fail('duplicate id.');
    ids.add(record.id);
    for (const key of ['title', 'bodyMarkdown']) if (!requiredText(record[key])) fail(`${key} is required.`);
    if ('summary' in record && !requiredText(record.summary)) fail('summary must be nonempty text.');
    if (!Number.isSafeInteger(record.displayOrder)) fail('displayOrder must be an integer.');
    if (typeof record.isFeatured !== 'boolean') fail('isFeatured must be a boolean.');
    if ('endDate' in record && !validDateOnly(record.endDate)) fail('endDate must be a real YYYY-MM-DD date.');
    if ('featureStartDate' in record) {
      if (!validDateOnly(record.featureStartDate)) fail('featureStartDate must be a real YYYY-MM-DD date.');
      if (!record.isFeatured) fail('featureStartDate requires isFeatured to be true.');
      if (record.endDate && record.featureStartDate > record.endDate) fail('featureStartDate cannot be after endDate.');
    }
    if ('cta' in record) {
      if (!record.cta || typeof record.cta !== 'object' || Array.isArray(record.cta) || !requiredText(record.cta.label) || !safeActionLink(record.cta.href)) fail('cta needs a label and a valid HTTP(S) or site-relative href.');
      if (Object.keys(record.cta).some((key) => !['label', 'href'].includes(key))) fail('cta contains an unknown field.');
    }
    let bodyHtml;
    try { bodyHtml = renderMarkdown(record.bodyMarkdown); } catch (error) { fail(error.message); }
    return { ...record, bodyHtml, summary: record.summary || firstParagraphText(record.bodyMarkdown) };
  });
  const featured = validated.filter((record) => record.isFeatured);
  for (let i = 0; i < featured.length; i++) {
    for (const other of featured.slice(i + 1)) {
      const record = featured[i];
      if ((!record.endDate || !other.featureStartDate || other.featureStartDate <= record.endDate)
        && (!other.endDate || !record.featureStartDate || record.featureStartDate <= other.endDate)) {
        throw new Error(`Featured action dates overlap, including expired records: ${record.id}, ${other.id}.`);
      }
    }
  }
  return validated;
}

export function actionAttributes(record) {
  return `data-action data-action-id="${record.id}" data-action-order="${record.displayOrder}"${record.isFeatured ? ' data-action-featured' : ''}${record.featureStartDate ? ` data-action-feature-start-date="${record.featureStartDate}"` : ''}${record.endDate ? ` data-action-end-date="${record.endDate}"` : ''}`;
}

export function renderAction(record, featured = false) {
  const link = record.cta && `<a class="${featured ? 'primary-action' : 'text-action'}" href="${escapeHtml(record.cta.href)}"${/^https?:/i.test(record.cta.href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(record.cta.label)} <span aria-hidden="true">${/^https?:/i.test(record.cta.href) ? '↗' : '→'}</span></a>`;
  return `<article class="${featured ? 'featured-action' : 'other-action'}${!link ? ' action-without-cta' : ''}" id="${record.id}" ${actionAttributes(record)} aria-labelledby="action-title-${record.id}">
    <div class="${featured ? 'featured-copy' : 'action-copy'}">
      ${record.isFeatured ? `<p class="feature-label"${featured ? '' : ' hidden'}>Featured action</p>` : ''}
      <h3 id="action-title-${record.id}">${escapeHtml(record.title)}</h3>
      <div class="action-description">${record.bodyHtml}</div>
    </div>
    ${link ? `<div class="${featured ? 'feature-cta' : 'action-cta'}">${link}</div>` : ''}
  </article>`;
}

export function renderActions(records, today = connecticutDate()) {
  const { featured, others } = selectActions(records, today);
  return `${featured ? renderAction(featured, true) : ''}
  <div class="other-actions" data-action-list${others.length % 2 === 1 ? ' data-action-empty-slot' : ''}${others.length ? '' : ' hidden'}>${others.map((record) => renderAction(record)).join('\n')}</div>
  <p class="actions-empty-state"${featured || others.length ? ' hidden' : ''}>More ways to take action are coming soon. Find an upcoming event below.</p>`;
}
