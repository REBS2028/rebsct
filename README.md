# REBs public site

Static HTML, CSS, and JavaScript, hosted on GitHub Pages at rebsct.com.

## Local review

Use Node.js 22 or newer:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4173/** for the homepage and **http://127.0.0.1:4173/take-action/** for Take Action. Take Action uses the real public REBs Google Calendar feed. An internet connection is needed for calendar events, fonts, and the existing signup/contact services. Set `PORT=4174 npm run dev` if 4173 is occupied. The preview binds only to this computer. Starting it does not publish anything.

## Publish actions in code

Edit `content/actions.json`, then run:

```sh
npm run build
npm test
npm run check
```

Commit the edited data and generated files together when the content is approved. `index.html`, `take-action/index.html`, and the legacy event redirects are generated; edit their files under `templates/` instead. Other pages remain hand-authored. `npm run check` fails when checked-in output does not match the current data/template. The build also copies the pinned DOMPurify browser module and its license into `scripts/vendor/`; do not edit those copies manually.

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
