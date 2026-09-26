import { escapeHtml, safeContentLink, renderMarkdown } from './content-markdown.mjs';

const externalUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value) && safeContentLink(value);

export function validateOrganizations(records) {
  if (!Array.isArray(records)) throw new Error('Organizations must be an array.');
  const ids = new Set();
  const fields = new Set(['id', 'name', 'bodyMarkdown', 'websiteUrl', 'websiteLabel', 'donationUrl', 'displayOrder']);
  return records.map((record, index) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`Organization ${index + 1} must be an object.`);
    const fail = (message) => { throw new Error(`Organization ${record.id || index + 1}: ${message}`); };
    for (const key of Object.keys(record)) if (!fields.has(key)) fail(`unknown field "${key}".`);
    if (typeof record.id !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(record.id)) fail('id must be a lowercase slug.');
    if (ids.has(record.id)) fail('duplicate id.');
    ids.add(record.id);
    for (const key of ['name', 'bodyMarkdown']) {
      if (typeof record[key] !== 'string' || !record[key].trim()) fail(`${key} is required.`);
    }
    if (!Number.isSafeInteger(record.displayOrder)) fail('displayOrder must be an integer.');
    if (!externalUrl(record.websiteUrl)) fail('websiteUrl must be an absolute HTTP(S) URL without credentials.');
    if ('websiteLabel' in record && (typeof record.websiteLabel !== 'string' || !record.websiteLabel.trim())) fail('websiteLabel must be nonempty text, or omitted.');
    if ('donationUrl' in record && !externalUrl(record.donationUrl)) fail('donationUrl must be an absolute HTTP(S) URL without credentials, or omitted.');
    let bodyHtml;
    try { bodyHtml = renderMarkdown(record.bodyMarkdown); } catch (error) { fail(error.message); }
    return { ...record, bodyHtml };
  });
}

function renderOrganization(record) {
  const external = 'target="_blank" rel="noopener noreferrer"';
  return `<li><article class="organization" id="organization-${record.id}" aria-labelledby="organization-${record.id}--title">
    <h3 id="organization-${record.id}--title">${escapeHtml(record.name)}</h3>
    <div class="organization-description">${record.bodyHtml}</div>
    <div class="organization-links">
${record.donationUrl ? `      <a class="organization-donate" href="${escapeHtml(record.donationUrl)}" ${external}>Donate <span class="visually-hidden">to ${escapeHtml(record.name)}</span><span aria-hidden="true">↗</span></a>` : ''}
      <a href="${escapeHtml(record.websiteUrl)}" ${external}>${escapeHtml(record.websiteLabel || (record.donationUrl ? 'Visit website' : 'Learn more & support'))} <span class="visually-hidden">${escapeHtml(record.name)}</span><span aria-hidden="true">↗</span></a>
    </div>
  </article></li>`;
}

export function renderOrganizations(records) {
  if (!records.length) return '';
  const sorted = [...records].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id, 'en'));
  return `<section class="organizations-section" id="organizations" aria-labelledby="organizations-title">
    <h2 id="organizations-title">Organizations to support</h2>
    <p class="organizations-intro">REBs recommends these organizations for community support.</p>
    <ul class="organization-list">${sorted.map(renderOrganization).join('\n')}</ul>
  </section>`;
}
