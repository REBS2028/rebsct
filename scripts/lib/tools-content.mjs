import { escapeHtml as e, safeContentLink, renderMarkdown } from './content-markdown.mjs';

function fields(record, allowed) {
  if (!record || typeof record !== 'object' || Array.isArray(record) || Object.keys(record).some(k => !allowed.includes(k))) throw new Error('Invalid Tools content fields.');
}
function text(value) { if (typeof value !== 'string' || !value.trim()) throw new Error('Tools content requires nonempty text.'); }
function url(value) { if (!/^https:\/\//.test(value || '') || !safeContentLink(value)) throw new Error('Tools links must be safe absolute HTTPS URLs.'); }
function slug(value) { if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value || '')) throw new Error('Tools IDs must be lowercase slugs.'); }
function order(value) { if (!Number.isSafeInteger(value)) throw new Error('Tools displayOrder must be an integer.'); }
const sorted = records => [...records].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id, 'en'));

export function validateStatewide(records) {
  if (!Array.isArray(records) || records.length !== 3) throw new Error('Tools requires the two U.S. senators and governor.');
  const expected = new Set(['CT-us-senate-1', 'CT-us-senate-3', 'CT-governor']);
  for (const record of records) {
    fields(record, ['officeKey', 'chamber', 'district', 'office', 'name', 'officialUrl', 'sourceUrl', 'checkedAt', 'validUntil', 'termStart', 'termEnd']);
    if (!expected.delete(record.officeKey)) throw new Error('Duplicate or unknown statewide office.');
    for (const key of ['office', 'name', 'chamber']) text(record[key]);
    url(record.officialUrl); url(record.sourceUrl);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.checkedAt) || !Number.isFinite(Date.parse(record.checkedAt)) || !Number.isFinite(Date.parse(record.validUntil)) || Date.parse(record.checkedAt) >= Date.parse(record.validUntil)) throw new Error('Invalid statewide verification/effective date.');
    if (!Number.isFinite(Date.parse(record.termStart)) || !Number.isFinite(Date.parse(record.termEnd)) || Date.parse(record.termStart) >= Date.parse(record.termEnd)) throw new Error('Invalid statewide office term.');
  }
  return records;
}

export function renderStatewide(records) {
  return records.map(record => `<article class="official-card" data-statewide-office="${e(record.officeKey)}" data-chamber="${e(record.chamber)}" data-checked-at="${e(record.checkedAt)}" data-valid-until="${e(record.validUntil)}" aria-labelledby="${e(record.officeKey)}-name">
    <p class="office-label">${e(record.office)}</p>
    <h3 id="${e(record.officeKey)}-name" data-official-name>${e(record.name)}</h3>
    <p class="office-term" data-official-term>Term: ${e(record.termStart.slice(0, 4))}–${e(record.termEnd.slice(0, 4))}</p>
    <a data-official-link href="${e(record.officialUrl)}" target="_blank" rel="noopener noreferrer">Official website <span class="visually-hidden">for ${e(record.name)}</span> <span aria-hidden="true">↗</span></a>
  </article>`).join('\n');
}

export function validateResources(sections) {
  if (!Array.isArray(sections)) throw new Error('Resource sections must be an array.');
  const ids = new Set();
  return sections.map(section => {
    fields(section, ['id', 'title', 'descriptionMarkdown', 'displayOrder', 'resources']); slug(section.id); text(section.title); order(section.displayOrder);
    if (ids.has(section.id)) throw new Error('Duplicate resource section.'); ids.add(section.id);
    if ('descriptionMarkdown' in section) text(section.descriptionMarkdown);
    if (!Array.isArray(section.resources)) throw new Error('Resources must be an array.');
    const resourceIds = new Set();
    const resources = section.resources.map(record => {
      fields(record, ['id', 'title', 'descriptionMarkdown', 'url', 'linkLabel', 'displayOrder']); slug(record.id); text(record.title); text(record.descriptionMarkdown); order(record.displayOrder); url(record.url);
      if (resourceIds.has(record.id)) throw new Error('Duplicate resource.'); resourceIds.add(record.id);
      if ('linkLabel' in record) text(record.linkLabel);
      return { ...record, bodyHtml: renderMarkdown(record.descriptionMarkdown) };
    });
    return { ...section, resources, bodyHtml: section.descriptionMarkdown ? renderMarkdown(section.descriptionMarkdown) : '' };
  });
}

export function renderResources(sections) {
  return sorted(sections).filter(section => section.resources.length).map(section => `<section class="resource-section" id="resource-section--${section.id}" aria-labelledby="resource-heading--${section.id}">
    <h2 id="resource-heading--${section.id}">${e(section.title)}</h2>${section.bodyHtml ? `<div class="tools-intro">${section.bodyHtml}</div>` : ''}
    <ul class="resource-list">${sorted(section.resources).map(record => `<li><article id="resource-item--${section.id}--${record.id}"><h3>${e(record.title)}</h3><div>${record.bodyHtml}</div><a href="${e(record.url)}" target="_blank" rel="noopener noreferrer">${e(record.linkLabel || 'Learn more')}<span class="visually-hidden">: ${e(record.title)}</span> <span aria-hidden="true">↗</span></a></article></li>`).join('')}</ul>
  </section>`).join('\n');
}

export function validateScorecardLinks(records) {
  if (!records || typeof records !== 'object' || Array.isArray(records)) throw new Error('Scorecard links must map bioguide IDs to verified URLs.');
  for (const [id, value] of Object.entries(records)) {
    if (!/^[A-Z]\d{6}$/.test(id)) throw new Error('Invalid scorecard bioguide ID.');
    url(value); if (new URL(value).origin !== 'https://accountabilityscorecard.org' || new URL(value).search || new URL(value).hash) throw new Error('Use canonical scorecard URLs.');
  }
  return records;
}
