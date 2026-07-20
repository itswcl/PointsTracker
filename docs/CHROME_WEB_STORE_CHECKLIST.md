# Chrome Web Store 1.0 Checklist

Status legend:

- `[x]` complete in the current repository
- `[ ]` required before submission
- `[~]` recommended or requires a publishing decision

This checklist is tailored to Points Tracker 1.0 and was reviewed against the Chrome Web Store documentation on July 19, 2026.

## Public GitHub readiness

- [x] Source scan found no credentials, API keys, authentication tokens, private keys, account identifiers, live account payloads, or machine-specific paths.
- [x] `node_modules`, `dist`, coverage output, ZIP packages, and `.DS_Store` files are excluded from Git.
- [x] The repository stores no Chrome profile data, cookies, passwords, account numbers, or raw account-page HTML.
- [x] Test balances, dates, and member numbers are synthetic fixtures.
- [x] The original Points Tracker toolbar artwork contains no private information.
- [x] The popup uses recognizable program labels and contains no third-party airline, hotel, or loyalty-program logo assets.
- [x] Add an independent-product disclaimer to the README and store listing: "Points Tracker is an independent project and is not affiliated with or endorsed by any supported airline, hotel, or loyalty program."
- [x] Replace airline and hotel marks with recognizable text labels for public distribution.
- [x] License the source under the MIT License.
- [x] Update `docs/BRAND_ASSETS.md` if the project changes from a private personal ledger to a publicly distributed extension.
- [x] Run one final repository and Git-history secret scan immediately before changing GitHub visibility.
  - Final scan completed July 19, 2026; evidence and the reviewed synthetic-fixture false positive are recorded in `docs/PUBLIC_REPOSITORY_AUDIT.md`.

## Developer account

- [ ] Choose the permanent Google account that will own the extension. Google advises using an address that is monitored regularly; changing the owner later requires a transfer.
- [ ] Register in the Chrome Web Store Developer Dashboard and pay the one-time registration fee.
- [ ] Enable Google 2-Step Verification for the developer account.
- [ ] Verify the developer contact email.
- [ ] Record the publisher name and support email that users will see.

Official references: [register the developer account](https://developer.chrome.com/docs/webstore/register/), [set up the account](https://developer.chrome.com/docs/webstore/set-up-account/).

## Extension package

- [x] Manifest V3 is used.
- [x] Version is `1.1.0` in `manifest.config.ts`, `package.json`, and `package-lock.json`.
- [x] The manifest description is fewer than 132 characters.
- [x] Required 16, 32, 48, and 128 pixel extension icons are bundled locally.
- [x] Runtime logic, fonts, and artwork are bundled locally; the extension does not load remote executable code.
- [x] Production verification is available through `npm run check`.
- [ ] Run `npm ci` and `npm run check` from a clean checkout.
- [ ] Load the resulting `dist` directory as an unpacked extension and complete the live acceptance checks in `docs/LIVE_ACCEPTANCE.md`.
- [ ] Create a ZIP containing the *contents* of `dist`, with `manifest.json` at the ZIP root.
- [ ] Open the ZIP and confirm it contains no source maps, test files, development configuration, account data, or unrelated files.
- [ ] Save the exact submitted ZIP and corresponding Git commit for release records.
- [ ] Increase the manifest version before every later store upload.

Official reference: [prepare the extension package](https://developer.chrome.com/docs/webstore/prepare/).

## Single purpose and permissions

- [x] Single purpose: show airline and hotel loyalty balances and expiration information in a local ledger.
- [x] Chrome API permission is limited to `storage`.
- [x] No `cookies`, `history`, `webRequest`, `debugger`, password, or network-interception permission is requested.
- [x] Host access is restricted to the twelve supported account-site hosts rather than `<all_urls>`.
- [ ] Add the following permission explanations to the Privacy tab or listing:

| Permission | Store justification |
| --- | --- |
| `storage` | Saves balances, expiration dates, update dates, and manual overrides only in the user's current Chrome profile. |
| United host | Reads the MileagePlus balance from the user's logged-in United account page when the user refreshes United. |
| Cathay host | Reads the Asia Miles balance and expiration information from the user's logged-in Cathay account page. |
| Air France host | Reads the Flying Blue balance and expiration information from the user's logged-in Air France profile. |
| Virgin Atlantic host | Reads the Flying Club balance from the user's logged-in Virgin Atlantic homepage. |
| Alaska Airlines host | Reads the Atmos Rewards balance from the user's logged-in Alaska Airlines homepage. |
| American Airlines host | Reads the AAdvantage balance and expiration status from the user's logged-in account summary. |
| EVA Air host | Reads the Infinity MileageLands balance and expiring-mile table from the user's logged-in account page. |
| British Airways host | Reads the Avios balance and latest qualifying activity from the user's logged-in statement page. |
| ANA host | Reads the Mileage Club balance and expiration details from the user's logged-in mileage statement. |
| Hyatt host | Reads the World of Hyatt balance from the user's logged-in account overview. |
| Hilton host | Reads `totalPointsFmt` and `pointsExpiration` from the logged-in Hilton account summary, with visible-page fallbacks. |
| Marriott host | Reads the Bonvoy balance and newest qualifying activity from the user's logged-in activity page. |

- [~] Decide whether required host permissions should become `optional_host_permissions`, requested only when the user enables or refreshes a program. The current exact-host list supports existing functionality, but optional permissions would produce a smaller initial access warning and a stronger least-privilege story.
- [ ] Confirm that every requested host still has a working adapter immediately before submission.

Official references: [minimum-permission and user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), [program policies](https://developer.chrome.com/docs/webstore/program-policies/policies).

## Privacy and user-data disclosure

- [ ] Publish a privacy policy at a public URL that works without authentication. A private GitHub repository URL is not sufficient.
- [ ] State exactly what is processed: program identifier, points or miles balance, expiration date or month, expiration amount when available, last-updated date, and user-entered manual overrides.
- [ ] State that webpage content is processed only on the listed loyalty-program hosts and only to provide the ledger's user-facing functionality.
- [ ] State that data is stored only with `chrome.storage.local` in the user's Chrome profile.
- [ ] State that JSON export happens only when the user explicitly downloads a backup.
- [ ] State that the extension does not collect or store usernames, passwords, cookies, authentication tokens, account numbers, transaction history, or raw page HTML.
- [ ] State that the extension has no backend, analytics, advertising, telemetry, sale of data, third-party sharing, or developer access to user records.
- [ ] Include an affirmative Chrome Web Store Limited Use statement.
- [ ] Link the privacy policy in the Developer Dashboard Privacy tab.
- [ ] In the Privacy tab, disclose at least the processing of **website content**. Review the dashboard's current category definitions before submission and keep every checkbox consistent with the code and privacy policy.
- [ ] Do not claim that no user data is handled merely because processing and storage remain local; Chrome's policy treats local webpage processing as user-data handling.
- [ ] Add a short in-product or first-use disclosure explaining that refresh reads the balance and expiration from the selected loyalty account page and stores only those ledger values locally.

Official references: [fill out privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/), [privacy and Limited Use policy](https://developer.chrome.com/docs/webstore/program-policies/policies), [user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

## Store listing

- [ ] Confirm the store name `Points Tracker` is available and does not imply official affiliation.
- [ ] Write a short summary focused on the single purpose.
- [ ] Write a detailed description covering automatic refresh, manual fallback, local-only storage, supported programs, and known page-dependent limitations.
- [ ] Include the independent-product and trademark disclaimer.
- [ ] Upload the existing 128 pixel store icon.
- [ ] Create one to five screenshots at 1280 x 800 or 640 x 400 pixels.
- [ ] Use synthetic balances and dates in screenshots; never publish screenshots of personal loyalty accounts or real account data.
- [ ] Show the popup, airline/hotel grouping, refresh flow, manual edit fallback, and expiration sorting.
- [~] Create an optional 440 x 280 small promotional tile.
- [~] Create an optional 1400 x 560 marquee image if featured placement will be pursued.
- [ ] Provide a public project/homepage URL, public privacy-policy URL, and support URL.
- [ ] Make listing text, screenshots, manifest behavior, and Privacy-tab answers mutually consistent.

Official reference: [create a quality listing](https://developer.chrome.com/docs/webstore/best-listing/).

## Reviewer instructions

- [ ] Explain that Points Tracker never asks for loyalty-site credentials; users sign in directly on each airline or hotel website.
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
- [ ] Re-test live adapters periodically because airline and hotel pages can change without notice.
- [ ] Treat any new host permission as a user-visible access expansion and document why it is necessary.
- [ ] Increment the version, rerun all checks, and retain every submitted package for future releases.
