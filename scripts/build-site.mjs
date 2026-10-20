import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateActions, renderActions } from './lib/action-content.mjs';
import { validateOrganizations, renderOrganizations } from './lib/organization-content.mjs';
import { renderHomeFeature, renderElection, renderMemorial } from './lib/home-content.mjs';
import { validateStatewide, renderStatewide, validateResources, renderResources, validateScorecardLinks } from './lib/tools-content.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const records = validateActions(JSON.parse(await readFile(path.join(root, 'content/actions.json'), 'utf8')));
const organizations = validateOrganizations(JSON.parse(await readFile(path.join(root, 'content/organizations.json'), 'utf8')));
const template = await readFile(path.join(root, 'templates/take-action.html'), 'utf8');
for (const marker of ['{{ACTIONS}}', '{{ORGANIZATIONS}}']) {
  if (template.split(marker).length !== 2) throw new Error(`Template must contain exactly one ${marker} marker.`);
}
const parts = { ACTIONS: renderActions(records), ORGANIZATIONS: renderOrganizations(organizations) };
const page = template.replace(/\{\{(ACTIONS|ORGANIZATIONS)\}\}/g, (_, key) => parts[key]);
const homeTemplate = await readFile(path.join(root, 'templates/home.html'), 'utf8');
const memorial = JSON.parse(await readFile(path.join(root, 'content/memorial.json'), 'utf8'));
const homeParts = { ELECTION: renderElection(), FEATURED_ACTION: renderHomeFeature(records), MEMORIAL: renderMemorial(memorial) };
for (const key of Object.keys(homeParts)) {
  if (homeTemplate.split(`{{${key}}}`).length !== 2) throw new Error(`Home template must contain exactly one {{${key}}} marker.`);
}
const home = homeTemplate.replace(/\{\{(ELECTION|FEATURED_ACTION|MEMORIAL)\}\}/g, (_, key) => homeParts[key]);
const toolsTemplate = await readFile(path.join(root, 'templates/tools.html'), 'utf8');
const toolsParts = {
  STATEWIDE: renderStatewide(validateStatewide(JSON.parse(await readFile(path.join(root, 'content/statewide-officials.json'), 'utf8')))),
  RESOURCES: renderResources(validateResources(JSON.parse(await readFile(path.join(root, 'content/resources.json'), 'utf8')))),
};
const scorecardLinks = validateScorecardLinks(JSON.parse(await readFile(path.join(root, 'content/scorecard-links.json'), 'utf8')));
for (const key of Object.keys(toolsParts)) if (toolsTemplate.split(`{{${key}}}`).length !== 2) throw new Error(`Tools template must contain exactly one {{${key}}} marker.`);
const tools = toolsTemplate.replace(/\{\{(STATEWIDE|RESOURCES)\}\}/g, (_, key) => toolsParts[key]);
const cleanHtml = content => content.replace(/[ \t]+$/gm, '');
const outputs = new Map([
  ['index.html', cleanHtml(home)],
  ['take-action/index.html', cleanHtml(page)],
  ['tools/index.html', cleanHtml(tools)],
  ['scripts/scorecard-links.js', `// Generated from content/scorecard-links.json.\nexport const scorecardLinks = Object.freeze(${JSON.stringify(Object.fromEntries(Object.entries(scorecardLinks).sort()), null, 2)});\n`],
  ['events/index.html', await readFile(path.join(root, 'templates/events-redirect.html'), 'utf8')],
  ['events/index.php', await readFile(path.join(root, 'templates/events-redirect.html'), 'utf8')],
  ['scripts/vendor/purify.es.mjs', await readFile(path.join(root, 'node_modules/dompurify/dist/purify.es.mjs'), 'utf8')],
  ['scripts/vendor/purify.es.mjs.map', await readFile(path.join(root, 'node_modules/dompurify/dist/purify.es.mjs.map'), 'utf8')],
  ['scripts/vendor/DOMPurify-LICENSE.txt', await readFile(path.join(root, 'node_modules/dompurify/LICENSE'), 'utf8')],
]);
for (const [relative, content] of outputs) {
  const destination = path.join(root, relative);
  if (check) {
    const existing = await readFile(destination, 'utf8').catch(() => '');
    if (existing !== content) throw new Error(`${relative} is out of date. Run npm run build.`);
  } else {
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
}
console.log(`${check ? 'Checked' : 'Built'} Home, Take Action, and Tools with ${records.length} action record(s), ${organizations.length} organization(s), and ${memorial.length} memorial entries.`);
