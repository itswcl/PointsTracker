# Publishing and Distribution

This guide combines public-repository readiness, brand policy, Chrome Web Store
submission tasks, and the working store-listing copy. Revalidate policy links
and listing claims against the exact build being submitted.

Status legend:

- `[x]` complete in the current repository
- `[ ]` required before submission
- `[~]` recommended or requires a publishing decision

This checklist is tailored to Points Tracker and was reviewed against the
Chrome Web Store documentation on July 19, 2026.

## Public repository readiness

- [x] Source scan found no credentials, API keys, authentication tokens, private keys, real account identifiers, live account payloads, or machine-specific paths.
- [x] `node_modules`, `dist`, coverage output, ZIP packages, and `.DS_Store` files are excluded from Git.
- [x] The repository contains no Chrome profile data, cookies, passwords, real member numbers, or raw account-page HTML.
- [x] Test balances, dates, and member numbers are synthetic fixtures.
- [x] The original Points Tracker toolbar artwork contains no private information.
- [x] The popup uses recognizable program labels and contains no third-party airline, hotel, issuer, or loyalty-program logo assets.
- [x] Add an independent-product disclaimer to the README and store listing: "Points Tracker is an independent project and is not affiliated with or endorsed by any supported airline, hotel, or loyalty program."
- [x] Replace airline, hotel, and rewards-program marks with recognizable text labels for public distribution.
- [x] License the source under the MIT License.
- [x] Document the program-name, trademark, and original-artwork boundary for
  public distribution.
- [x] Run one final repository and Git-history secret scan immediately before changing GitHub visibility.
  - Final scan completed July 19, 2026; evidence and the reviewed
    synthetic-fixture false positive are recorded below.

## Brand and independent-product policy

The popup identifies supported loyalty programs with recognizable names or
abbreviations such as UA, Cathay, ANA, Hyatt, and Hilton. Full official names
remain available to assistive technology and as hover text. The popup does not
bundle or display airline, hotel, issuer, or loyalty-program logos and does not
load remote artwork at runtime.

Points Tracker is an independent project and is not affiliated with or endorsed
by any supported airline, hotel, card issuer, or loyalty program. Company and
program names and marks belong to their respective owners and are used only to
identify supported programs.

The program-logo assets and `simple-icons` dependency were removed before
public distribution. Any future third-party mark or artwork requires a new
review documented in this section.

The Chrome toolbar and extension-management icon is an original Point Ledger
mark generated for this project. It combines a simplified ledger with airline,
hotel, and credit-card symbols using the popup palette. Its source and packaged
16, 32, 48, and 128 pixel PNG files live in `assets/icons`.

## Public repository audit evidence

The preliminary and final scans on July 19, 2026 covered:

- tracked and untracked project files, excluding `.git`, `node_modules`, and
  generated `dist`;
- every commit reachable from repository branches and tags;
- high-confidence private-key, cloud-key, GitHub-token, Slack-token,
  Google-key, live Stripe-key, bearer-token, JWT, credential-assignment, and
  URL-embedded credential patterns;
- machine-specific absolute paths, local extension origins, suspicious
  credential filenames, and tracked generated artifacts; and
- Chrome profiles, cookies, passwords, real member numbers, raw account HTML,
  ZIP packages, coverage output, and `.DS_Store`.

Results:

- No credentials, private keys, authentication tokens, account identifiers,
  machine-specific paths, suspicious credential files, or tracked generated
  artifacts were found.
- No high-confidence secret pattern was found in reachable Git history.
- A broad credential-assignment scan identified only commit `a40d133`'s
  deliberately synthetic password-field rejection fixture in the original
  `tests/storage/backup.test.js`. Manual review confirmed that the value is test
  data and the parser rejects the field.
- Removed program-logo assets and the `simple-icons` dependency are absent from
  the application and dependency graph.

### v1.6.0 release audit — July 26, 2026

The v1.6.0 release gate repeated the public-repository checks against the
current source and every reachable Git commit:

- 116 current project files contained no high-confidence secrets.
- Reachable Git history contained no high-confidence secrets.
- `npm audit --audit-level=moderate` reported zero vulnerabilities.
- The production manifest requests only `storage`, contains no `<all_urls>`
  access, and limits host access to the supported account sites plus GitHub's
  public release API.
- The production build contains 17 runtime files and no source maps, TypeScript
  source, test files, account data, or development configuration.

## Developer account

- [ ] Choose the permanent Google account that will own the extension. Google advises using an address that is monitored regularly; changing the owner later requires a transfer.
- [ ] Register in the Chrome Web Store Developer Dashboard and pay the one-time registration fee.
- [ ] Enable Google 2-Step Verification for the developer account.
- [ ] Verify the developer contact email.
- [ ] Record the publisher name and support email that users will see.

Official references: [register the developer account](https://developer.chrome.com/docs/webstore/register/), [set up the account](https://developer.chrome.com/docs/webstore/set-up-account/).

## Extension package

- [x] Manifest V3 is used.
- [x] Version is `1.6.0` in `manifest.config.ts`, `package.json`, and `package-lock.json`.
- [x] The manifest description is fewer than 132 characters.
- [x] Required 16, 32, 48, and 128 pixel extension icons are bundled locally.
- [x] Runtime logic, fonts, and artwork are bundled locally; the extension does not load remote executable code.
- [x] Production verification is available through `npm run check`.
- [ ] Run `npm ci` and `npm run check` from a clean checkout.
- [ ] Load the resulting `dist` directory as an unpacked extension and complete
  the checks in [Live acceptance](./LIVE_ACCEPTANCE.md).
- [ ] Create a ZIP containing the *contents* of `dist`, with `manifest.json` at the ZIP root.
- [ ] Open the ZIP and confirm it contains no source maps, test files, development configuration, account data, or unrelated files.
- [ ] Save the exact submitted ZIP and corresponding Git commit for release records.
- [ ] Increase the manifest version before every later store upload.

Official reference: [prepare the extension package](https://developer.chrome.com/docs/webstore/prepare/).

## Single purpose and permissions

- [x] Single purpose: show airline, hotel, and credit-card rewards balances in a local ledger, with loyalty member numbers and expiration information where applicable.
- [x] Chrome API permission is limited to `storage`.
- [x] No `cookies`, `history`, `webRequest`, `debugger`, password, or network-interception permission is requested.
- [x] Host access is restricted to twenty-two exact account-host patterns for the twenty-one supported rewards programs plus the exact GitHub API host rather than `<all_urls>`; ANA requires separate official statement and member-number hosts.
- [ ] Add the following permission explanations to the Privacy tab or listing:

| Permission | Store justification |
| --- | --- |
| `storage` | Saves loyalty member numbers, balances, expiration dates, capture dates, and manual overrides only in the user's current Chrome profile. |
| United host | Reads the MileagePlus member number, miles, pooled miles, TravelBank total, and displayed TravelBank expiration from the user's logged-in United account page. |
| Southwest host | Reads the Rapid Rewards member number and points, then sums rendered Flight Credit amounts and keeps only the earliest displayed expiration; no individual credit details are stored. |
| Cathay host | Reads the Asia Miles member number, balance, and expiration information from the user's logged-in Cathay account page. |
| Air France host | Reads the Flying Blue balance and expiration information, then reuses the same extension tab for the membership-card number when needed. |
| Virgin Atlantic host | Reads the Flying Club member number and balance from the user's logged-in account overview. |
| Alaska Airlines host | Reads the Atmos Rewards member number and balance from the user's logged-in Alaska Airlines homepage. |
| American Airlines host | Reads the AAdvantage member number, balance, and expiration status from the user's logged-in account summary. |
| EVA Air host | Reads the Infinity MileageLands member number, balance, and expiring-mile table from the user's logged-in account page. |
| British Airways host | Reads the Avios balance and latest qualifying activity, then reuses the same extension tab for the membership number when needed. |
| ANA hosts | Reads the Mileage Club balance and expiration details from the official statement host, then reuses the same extension tab for the member number on ANA's separate official reference host. |
| Delta host | Reads the SkyMiles member number and balance from the user's logged-in SkyMiles overview page. |
| Hyatt host | Reads the World of Hyatt member number and balance from the user's logged-in account overview. |
| Hilton host | Reads the Honors member number, `totalPointsFmt`, and `pointsExpiration` from the logged-in account summary, with focused visible-page fallbacks. |
| Marriott host | Reads the Bonvoy member number, balance, and newest qualifying activity from the user's logged-in activity page. |
| IHG host | Reads the One Rewards member number, balance, and exact Elite-tier marker from the user's logged-in account page. |
| Wyndham host | Reads the Rewards member number, balance, and exact no-recent-activity state from the user's logged-in activity page. |
| Amex host | Reads the Membership Rewards `Available Points` total from the user's logged-in rewards page. |
| Capital One host | Reads only the whole-number total paired with the exact `Miles` label on the user's logged-in account summary. |
| Chase host | Reads every visible Ultimate Rewards card balance on the account-selector page, computes one total locally, and stores no card-level details. |
| Citi host | Reads the `Total ThankYou® Points` value from the user's logged-in dashboard. |
| Bilt host | Opens the account points menu when needed and reads the exact `Your Points` total from the user's logged-in rewards page. |
| GitHub API host | Checks the latest public Points Tracker release no more than once every 24 hours and sends no loyalty data. |

- [~] Decide whether required host permissions should become `optional_host_permissions`, requested only when the user enables or refreshes a program. The current exact-host list supports existing functionality, but optional permissions would produce a smaller initial access warning and a stronger least-privilege story.
- [ ] Confirm that every requested host still has a working adapter immediately before submission.

Official references: [minimum-permission and user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), [program policies](https://developer.chrome.com/docs/webstore/program-policies/policies).

## Privacy and user-data disclosure

- [ ] Publish a privacy policy at a public URL that works without authentication. A private GitHub repository URL is not sufficient.
- [ ] State exactly what is processed: program identifier, loyalty member number where applicable, program-level points or miles balance, expiration date or month and expiration amount where applicable, capture date, user-entered manual overrides, and the non-personal update-check timestamp/latest release version.
- [ ] State that webpage content is processed only on the listed loyalty-program hosts and only to provide the ledger's user-facing functionality.
- [ ] State that data is stored only with `chrome.storage.local` in the user's Chrome profile.
- [ ] State that JSON export happens only when the user explicitly downloads a backup.
- [ ] State that the extension does not collect or store usernames, passwords, cookies, authentication tokens, member names, transaction history, or raw page HTML. State clearly that the displayed loyalty member number is stored locally.
- [ ] State that the extension has no backend, analytics, advertising, telemetry, sale of data, third-party sharing, or developer access to user records.
- [ ] State that the extension contacts GitHub's public release API no more than once every 24 hours and does not include loyalty data in that request.
- [ ] Include an affirmative Chrome Web Store Limited Use statement.
- [ ] Link the privacy policy in the Developer Dashboard Privacy tab.
- [ ] In the Privacy tab, disclose at least the processing of **website content**. Review the dashboard's current category definitions before submission and keep every checkbox consistent with the code and privacy policy.
- [ ] Do not claim that no user data is handled merely because processing and storage remain local; Chrome's policy treats local webpage processing as user-data handling.
- [ ] Add a short in-product or first-use disclosure explaining that refresh reads the displayed loyalty member number, balance, and expiration from the selected account page and stores only those ledger values locally.

Official references: [fill out privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/), [privacy and Limited Use policy](https://developer.chrome.com/docs/webstore/program-policies/policies), [user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

## Store listing

- [ ] Confirm the store name `Points Tracker` is available and does not imply official affiliation.
- [ ] Write a short summary focused on the single purpose.
- [ ] Write a detailed description covering automatic refresh, manual fallback, local-only storage, supported programs, and known page-dependent limitations.
- [ ] Include the independent-product and trademark disclaimer.
- [ ] Upload the existing 128 pixel store icon.
- [ ] Create one to five screenshots at 1280 x 800 or 640 x 400 pixels.
- [ ] Use synthetic balances and dates in screenshots; never publish screenshots of personal loyalty accounts or real account data.
- [ ] Show the popup, Credit Card/Airline/Hotel grouping, refresh flow, manual edit fallback, balance sorting, and expiration sorting where applicable.
- [~] Create an optional 440 x 280 small promotional tile.
- [~] Create an optional 1400 x 560 marquee image if featured placement will be pursued.
- [ ] Provide a public project/homepage URL, public privacy-policy URL, and support URL.
- [ ] Make listing text, screenshots, manifest behavior, and Privacy-tab answers mutually consistent.

Official reference: [create a quality listing](https://developer.chrome.com/docs/webstore/best-listing/).

### Working listing copy

**Name:** Points Tracker

**Short summary:** Track airline, hotel, and credit-card rewards balances
locally.

**Detailed description:**

Points Tracker provides one compact local ledger for supported airline, hotel,
and credit-card rewards balances, with loyalty member numbers and expiration
information where applicable.

- Refresh a program after signing in directly on its official website.
- Use manual entry whenever a loyalty website changes or automatic capture is
  unavailable.
- Hide programs you do not use without deleting their saved records.
- Sort each rewards category by balance and Airline or Hotel programs by
  expiration.
- Keep Credit Card, Airline, and Hotel totals separate.
- Export or import a local JSON backup when you choose.
- Receive a compact notice when a newer public release is available.

Points Tracker does not ask for account credentials. It stores only
program-level ledger values, displayed loyalty member numbers where applicable,
program visibility preferences, and a non-personal update-check timestamp and
latest public release version in the current Chrome profile. It does not store
card details or per-card balances. It has no backend, analytics, advertising,
or telemetry. It contacts GitHub's public release API no more than once every
24 hours to compare version numbers; that request contains no rewards data.

**Independent-product disclaimer:** Points Tracker is an independent project
and is not affiliated with or endorsed by any supported airline, hotel, card
issuer, or loyalty program. All company and program names and marks belong to
their respective owners and are used only to identify supported programs.

Before publishing this copy:

- add final support, homepage, and privacy-policy URLs;
- confirm the supported program list and page-dependent limitations against the
  submitted build;
- use only synthetic member numbers, balances, and dates in screenshots; and
- keep the listing consistent with manifest permissions and Privacy-tab
  disclosures.

## Reviewer instructions

- [ ] Explain that Points Tracker never asks for account credentials; users sign in directly on each airline, hotel, or card-rewards website.
- [ ] Provide exact steps to test installation, popup rendering, manual entry, sorting, backup export/import, and automatic refresh.
- [ ] Explain that automatic refresh requires an authenticated session on the applicable third-party website.
- [ ] Make the manual-entry path sufficient for a reviewer to verify the core ledger without receiving personal credentials.
- [ ] Never submit a personal loyalty account as reviewer credentials. If Google requires authenticated testing, create dedicated non-personal test accounts where the program permits it.
- [ ] Mention that page-dependent selectors can fail when a loyalty site changes and that manual entry remains available.

## Distribution and submission

- [~] Recommended initial distribution: **Private** for the developer and trusted tester accounts, including the future partner account.
- [ ] If choosing **Unlisted**, remember that anyone with the store URL can install it.
- [ ] If choosing **Public**, complete the brand, privacy, support, and reviewer-readiness items above first.
- [ ] Select geographic availability.
- [ ] Complete the Listing, Privacy, and Distribution tabs.
- [ ] Submit the extension for review.
- [ ] Record the Chrome Web Store item ID and submission date.
- [ ] Monitor the developer email and dashboard for reviewer questions or policy findings.

Private, unlisted, and public visibility all receive policy review. New developers, new extensions, broader host access, and difficult-to-review code can increase review time. Official references: [distribution settings](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution/), [review process](https://developer.chrome.com/docs/webstore/review-process/).

## After approval

- [ ] Install the store build in a clean Chrome profile and repeat the acceptance checklist.
- [ ] Verify automatic updates from the store.
- [ ] Publish a tagged GitHub release matching the submitted commit and version.
- [ ] Keep the privacy policy, support information, and permission explanations current.
- [ ] Re-test live adapters periodically because airline, hotel, and card-rewards pages can change without notice.
- [ ] Treat any new host permission as a user-visible access expansion and document why it is necessary.
- [ ] Increment the version, rerun all checks, and retain every submitted package for future releases.
