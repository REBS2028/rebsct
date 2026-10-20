# REBs public site

Static HTML, CSS, and JavaScript, hosted on GitHub Pages at rebsct.com.

## Local review

Use Node.js 22 or newer:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4173/** for the homepage and **http://127.0.0.1:4173/take-action/** for Take Action, and **http://127.0.0.1:4173/tools/** for Tools. Take Action uses the real public REBs Google Calendar feed. An internet connection is needed for calendar events, fonts, and the existing signup/contact services. Set `PORT=4174 npm run dev` if 4173 is occupied. The preview binds only to this computer. Starting it does not publish anything.

## Publish actions in code

Edit `content/actions.json`, then run:

```sh
npm run build
npm test
npm run check
```

Commit the edited data and generated files together when the content is approved. `index.html`, `take-action/index.html`, `tools/index.html`, and the legacy event redirects are generated; edit their files under `templates/` instead. Other pages remain hand-authored. `npm run check` fails when checked-in output does not match the current data/template. The build also copies the pinned DOMPurify browser module and its license into `scripts/vendor/`; do not edit those copies manually.

Each action has:

| Field | Meaning |
| --- | --- |
| `id` | Unique lowercase slug, also its page anchor (for example `/take-action/#support-dufi`). |
| `title` | Plain text title. |
| `bodyMarkdown` | Paragraphs, **bold**, *emphasis*, lists, and links. Raw HTML is displayed as text. |
| `summary` | Optional plain text for the compact homepage feature; otherwise derived from the first paragraph. |
| `cta` | Optional `{ "label": "Donate", "href": "https://…" }`. Omit the whole field when no button is needed. |
| `displayOrder` | Integer; lower values appear first. Leave gaps such as 10, 20, 30. |
| `isFeatured` | Required boolean. Zero or one record can be true. The build fails if two are featured, even if one has expired. |
| `endDate` | Optional inclusive date, such as `2026-10-31`, in Connecticut's time zone. |

Actions exist until removed or expired. There is no active/status field. Retire an action by removing it; Git retains history. The featured action appears once, then ordinary actions are sorted by order and ID. Expiring a featured action does not promote another one.

Links accept HTTP(S), root-relative site paths, or a page anchor. Executable URLs and embedded images are unsupported. Empty required fields, unknown fields, duplicate/reserved IDs, invalid dates, and incomplete buttons fail the build.

Expiration runs during the build and in the browser on load, tab resume, and every 30 seconds. An item stays visible through its `endDate` in Connecticut. With JavaScript disabled, it is removed on the next build/publish. A visitor whose computer clock is incorrect may see incorrect expiry timing.

## Organizations to support

Edit `content/organizations.json`, then use the same build, test, and check commands above. These are independent, standing recommendations. An organization can also be mentioned in an action, but there is no relationship field or automatic synchronization. Retiring or expiring an action does not remove an organization.

| Field | Meaning |
| --- | --- |
| `id` | Unique lowercase slug; its link is `/take-action/#organization-ID`. IDs are independent of action IDs. |
| `name` | Plain text organization name. |
| `bodyMarkdown` | Short description with the same formatting and safe links supported by actions. |
| `websiteUrl` | Required absolute HTTP(S) website URL. |
| `websiteLabel` | Optional plain text for the website CTA; defaults to “Learn more & support,” or “Visit website” when a separate donation link exists. |
| `donationUrl` | Optional absolute HTTP(S) donation URL. Omit when only a website link is available. |
| `displayOrder` | Integer; lower values appear first, then ID breaks ties. |

The section appears between Current actions and Upcoming events. It is omitted when the collection is empty. There is no active status, featured flag, expiry, or action reference: remove an organization to retire the recommendation, with Git retaining history. Duplicate IDs, unknown fields, missing text, unsafe URLs, and invalid order values fail the build. The `organizations` section IDs and `organization-` anchor prefix are reserved, so action IDs cannot use them.

The initial organizations are Danbury Unites for Immigrants and Each Step Home, supplied in “September 2026 Key Action items for website.docx.” Their support links go to the websites supplied in that document. DUFI uses “Learn more and donate”; Each Step Home uses “Support their work and learn more.” Do not infer organization entries from current actions or add samples to this file.

## Homepage

The paired floating cards show the election countdown and the shared featured action. Removing or expiring the feature removes its entire card and closes the space. The existing introduction, membership/navigation copy, quotation, and footer are preserved in `templates/home.html`.

Election dates live in `scripts/election-model.js`. The countdown uses Connecticut calendar dates, including across daylight saving time, refreshes every 30 seconds and on tab resume, shows “Today is” on Election Day, and switches to “Election resources” afterward. Early voting has before/open/ended labels. Without JavaScript the actual election and early-voting dates remain visible. The 2026 dates were checked against the [Connecticut Secretary of the State's general-election flyer](https://portal.ct.gov/-/media/sots/electionservices/early-voting/2026/2026-general-election-flyer-123-engsp.pdf) on September 25, 2026.

Edit `content/memorial.json` to maintain the full memorial entries, then rebuild. All 51 entries match the live site as of September 25, 2026. The strip matches the page's maximum content width on desktop and goes edge-to-edge at mobile widths, with the live site's unpadded black frame, Arial text, and fades to white at both ends. Its duplicate visual track loops at 33.75 pixels per second and pauses on hover. Entry dividers have an even 20-pixel gap on each side; avoid adding entry padding on top of those gaps. There are no visible Pause or Read all names controls. Keyboard focus, reduced-motion preferences, and no-JavaScript mode provide a static, horizontally scrollable strip. The moving duplicate is hidden from screen readers; a visually hidden list preserves each full record once for assistive technology.

## Calendar

Continue editing the existing **REBs Events** Google Calendar. The site requests event data and renders the layout itself; custom styling does not change the publishing workflow. The list supports timed/all-day/multi-day events, descriptions and links, optional locations, pagination, an empty state, and retry after network/API failure. All displayed dates and times use `America/New_York`.

The existing public browser API configuration is in `scripts/calendar-config.js`. This is the same Calendar integration used by the original events page. Event descriptions are always visible beneath each event heading, without an expand/collapse toggle. There are no per-event Google Calendar links; links supplied within descriptions remain intact. The public calendar link below the event list remains available if JavaScript or the feed is unavailable. `/events/`, `/events/index.html`, and the historical PHP filename redirect to `/take-action/#events`.

## September 2026 release

The Take Action implementation follows the selected modern styling and compact photo banner, which received Celeste's initial design approval. Jeremy supplied the September action document: the REBs Midterm Mixer on October 4 is now the sole featured action on both pages, with the complete copy on Take Action and a compact summary on Home. Its registration link is the supplied Mobilize URL (upgraded to HTTPS); it expires after October 4 in Connecticut time. The two organizations have the document's full descriptions, with the obvious “The empower” typo corrected to “They empower.” No sample actions, organizations, or events are included in the public content collections.

The homepage and Take Action updates were approved for production on September 26, 2026, with all existing lower-page homepage content retained. Tools & Resources remains a separate follow-up.

GitHub Pages publishes the repository root from `main`. Run the build, tests, and generated-output check before committing, then push the approved changes to `main`. Confirm the Pages build completed for that exact commit and verify the homepage, Take Action, live calendar feed, and legacy event redirects at https://rebsct.com/.


## Tools & Resources and representative lookup

Tools & Resources uses the independent production Worker at https://rebs-representative-lookup.rebs2028.workers.dev. Production release was authorized October 20. Local preview commands do not deploy services or publish the website. Start the independent sibling service with `cd ../rebs-lookup && npm ci && npm run dev`, and this site with `npm run dev`. The page at `http://127.0.0.1:4173/tools/` uses real official sources through the local Worker on port 8787. It has no scorecard-service dependency. A different review port also needs a corresponding service CORS origin.

Edit `templates/tools.html` for layout, `content/statewide-officials.json` for static statewide fallbacks and term dates, `content/resources.json` for approved resource sections, and `content/scorecard-links.json` for optional verified bioguide-to-scorecard URLs. Run build/test/check and review generated `tools/index.html` plus `scripts/scorecard-links.js` together. Empty resource sections disappear; no sample endorsements ship. Resource sections have id, title, optional descriptionMarkdown, integer displayOrder, and resources. Each resource has id, title, descriptionMarkdown, safe HTTPS url, optional linkLabel and integer displayOrder. IDs must be lowercase slugs and unique within their collection. Raw HTML is displayed as text; safe Markdown formatting/links use the existing renderer.

Statewide cards show governor first, then senators. All three refresh through the service with a 24-hour TTL, including a live governor-page check. Cards show the office term as years and omit routine source/check-date copy. API verification timestamps stay internal; stale/failure warnings remain. A valid response reporting a missing/vacant office removes its predecessor. On a whole-service failure, recent static fallbacks remain, with an outage notice; JavaScript withholds them after 72 hours or their configured deadline. Update fallback names, official/source URLs, checkedAt, validUntil, termStart and termEnd at content releases. Without JavaScript the static records remain, so term-transition content releases are required. District cards receive term dates and prefer the official member website discovered by the service, with Clerk contact profiles as a fallback.

`representative-config.js` selects port 8787 only for loopback previews; production uses the verified independent Worker; staging origins stay empty until configured for a separate review. No API override or address goes into a URL. Without JavaScript/configuration/service, statewide source links, official finders and the scorecard feature remain usable. Both privacy copy and `analyticsStreamReviewed` are release gates to review before publishing.

Usage events are `rep_lookup_submit` and `rep_lookup_outcome`. The latter accepts only outcome values success, partial, no_match, ambiguous, out_of_state, rate_limited, error, cancelled. Counts mean attempts, not unique people/addresses. Retry/candidate requests count as additional attempts; invalid form submission and background requests do not. No address components/hashes, coordinates, districts, member names, arbitrary error messages, request objects or new custom IDs are sent. Analytics failure never blocks a lookup. Local/staging previews send no production analytics.

At the authorized October 20 release, the receiving REBs GA4 stream was reviewed and automatic form, site-search and outbound-link measurement was disabled before enabling analyticsStreamReviewed. These are stream-wide settings; pageviews, scrolls, video and file downloads remain enabled. Future analytics changes must preserve this protection. Use a synthetic address to inspect every emitted request and verify canonical page metadata and the two event allowlists. Existing GA4 cookies/identifiers remain pseudonymous; do not describe the feature as anonymous or cookie-free.

The October 20 read-only audit confirmed stream `10549816343` (`G-RDWQCYQ3HT`) has enhanced measurement enabled, including outbound clicks, site search and form interactions. All seven displayed measurement categories were initially on. At the authorized production release, the three categories above were turned off, saved and reopened to verify their disabled state. Their automatic events stop across this stream; pageviews, scrolls, video and file-download settings remain on. Local evidence is retained in the workspace’s `tmp/tools-local-review-20261020/ga4-enhanced-measurement-before.png`.

The private GA4 Explore report [Representative lookup usage](https://analytics.google.com/analytics/web/#/analysis/a352485114p485973800/edit/dAU-U7oyQdSeiF_ITNK__Q) was prepared October 20, with daily and weekly tabs, Event count, the event-scoped Lookup outcome dimension (`outcome`), and the exact event-name filter `^rep_lookup_(submit|outcome)$`. It uses the last 28 days; it was prepared before production lookup collection was activated. The daily tab groups Date, Event name and Lookup outcome; the weekly tab groups Event name, Lookup outcome and Week. Week numbers are intended for this short date range; add Year if comparing across multiple years. Metadata/report preparation does not change the live stream's collection settings.

Use only rep_lookup_submit for total usage; do not add submits and outcomes together or use the report's combined total as the number of searches. The outcome rows give success/partial/error counts. For rates, compare each outcome count with submit counts over the same day/week. Keep this report private, identify/exclude release smoke tests, and verify production receipt after release. Browser blockers and early exits can undercount. Local tests inspect equivalent payloads without sending visitor data.

The independent service README and DEPLOYMENT runbook cover map/term manifests, free Cloudflare hosting with daily public-roster refresh, request-driven refresh for missing/expired data, bounded 72-hour fallback, 15-minute failure cooldown, source recovery and isolated deployment. A SQLite-backed Durable Object handles roster parsing; submitted addresses never enter its storage. Review federal/state term transitions before January 2027; election-night winners must not appear as current officeholders early. The usual build may also remove expired actions from generated Home/Take Action output; the action data and templates remain unchanged.

October 20 release: the production service uses its own SQLite Durable Object and maintenance KV; Cloudflare remains on Workers Free. The deployed source version is `20261020-464b81e25f04`. See the independent service DEPLOYMENT.md for resource IDs, alarm/CPU evidence, recovery, and the final website commit. The normal build removes the expired October 4 mixer from generated Home/Take Action output; source action data remains available.
