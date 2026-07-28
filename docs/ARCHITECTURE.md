# Architecture and Design Decisions

This document records the durable architecture and design decisions for Points
Tracker. Adapter-specific production selectors and account-page evidence live
in [LIVE_ACCEPTANCE.md](./LIVE_ACCEPTANCE.md); user setup lives in
[INSTALLATION.md](./INSTALLATION.md).

## System shape

Points Tracker is a local-only Manifest V3 Chrome extension with four runtime
surfaces:

1. The React popup renders the ledger, settings, manual editor, backups, and
   update notice.
2. One allowlisted content script detects supported official account pages and
   runs the matching rendered-DOM adapters.
3. The background service worker coordinates extension-owned refresh tabs,
   login waiting, grouped capture, timeouts, and storage writes.
4. Typed repositories normalize all data written to `chrome.storage.local` or
   short-lived refresh cooldowns written to `chrome.storage.session`.

Each visible ledger row has its own program definition, adapter, stored record,
manual override, status, and tests. The definition supplies its official URLs,
allowlisted hosts, category, field visibility, currency format, capture group,
and total/sorting behavior.

## Privacy and data boundary

The extension may process only the rendered aggregate values needed for the
ledger:

- program identifier;
- program-level balance;
- displayed loyalty member number where applicable;
- expiration date, month, amount, or inactivity policy where applicable;
- capture date and status;
- user-entered manual overrides;
- enabled/disabled program preferences; and
- the non-personal update-check timestamp and latest version.

It does not request or persist usernames, passwords, cookies, authorization
tokens, member names, card details, passenger details, transaction history,
individual Flight Credit records, raw HTML, intercepted network responses, or
analytics. The extension has no backend and makes no loyalty-data uploads.

## Storage and display model

All programs reuse one normalized record shape. `ProgramDefinition` capabilities
control which fields are visible instead of branching storage into separate
airline, hotel, and credit-card schemas.

- Airline and Hotel rows normally show balance, last-four member-number suffix,
  expiration, and actions.
- Credit Card rewards rows show only program, balance, and actions.
- Whole-number rewards balances remain integers.
- Cash balances are stored as integer cents and formatted as USD.
- Credit Card rewards may be signed; Airline and Hotel rewards remain
  nonnegative.
- Older stored state and backups normalize with an empty record for every newly
  supported program.

The popup uses three unequal columns in Credit Card, Airline, and Hotel order.
Each category has an independent balance sort and total. Airline and Hotel also
support expiration sorting. The default Airline order places points and miles
first, followed by cash-related rows.

Activity-based Hotel adapters derive dates only from rendered qualifying
activity. Choice adds 18 months to the newest points activity unless the page
shows active Gold, Platinum, Diamond, or Titanium status. LHW adds 24 months to
the newest rendered earn or redeem activity. A zero balance displays `N/A`
because there are no points to expire. A positive balance with no rendered
activity date retains the applicable inactivity policy without fabricating a
date. Neither adapter uses the extension refresh date as an account-activity
substitute.

KrisFlyer reads the rendered account-header balance and member number only on
Singapore Airlines' first-party pages. The Miles validity page supplies the
earliest displayed expiring-mile tranche, stored with month precision and shown
as `amount · MM/YYYY`, like EVA. When the page displays no tranche, the ledger
shows `N/A`; active PPS Club status is treated as non-expiring. The adapter does
not calculate an expiry month from earning history or the general three-year
policy.

Zero balance is a shared record invariant rather than an adapter-specific rule.
For every program, an effective automatic or manual balance of `0` clears any
stored date, month, tranche amount, or inactivity period and displays
Expiration as `N/A`. State normalization applies the same rule to older stored
records and imported backups.

## Program visibility settings

Settings are stored separately from ledger records. Disabling a program:

- hides its row;
- excludes it from category totals and sorting;
- prevents its content adapter from running;
- causes the background coordinator to reject stale observations or refresh
  requests for that program; and
- preserves its saved record and manual override for later re-enabling.

All programs default to enabled so existing installations preserve their prior
behavior.

## Manual value protection

Manual values are program-wide write guards, not visual markers. While a row
has a manual override:

- the row keeps only its normal refresh and edit actions;
- passive observations from a user-opened account page are ignored;
- an explicit refresh requires confirmation in the popup;
- canceling the confirmation performs no background action; and
- confirming authorizes only that row, with the manual override cleared only
  after the complete automatic capture sequence succeeds.

A failed confirmed refresh keeps the manual value. For United and Southwest
capture groups, non-manual rows can still update from the shared account page
while manually controlled sibling rows remain unchanged.

## Credit Card rewards category

Credit Card rows represent transferable rewards programs rather than individual
physical cards:

| Program | Rendered source | Stored result |
| --- | --- | --- |
| Amex | Exact `Available Points` tile | Membership Rewards total |
| Capital One | Signed whole-number value paired with exact `Miles` label | Miles total |
| Chase | Every rendered card balance on the account selector | One locally summed Ultimate Rewards total |
| Citi | Exact `Total ThankYou® Points` value | ThankYou total |
| Bilt | Exact `Your Points` menu value | Signed Bilt total |

These adapters do not collect member numbers, expiration, card names, card
numbers, statement values, or per-card balances. Chase deduplicates responsive
card rows before summing; Citi rejects conflicting responsive totals; Capital
One excludes Rewards cash; and Bilt opens only the exact points control when
needed.

Typed field capabilities were selected over category-specific record unions or
hardcoded popup conditionals. This keeps backup, validation, messaging, manual
editing, and rendering on one stable model while still supporting balance-only
programs.

## Shared account pages

### Requirements

- Southwest appears as two Airline rows: `Southwest` for Rapid Rewards points
  and `SW Credit` for Flight Credits.
- United appears as three Airline rows: `UA Miles`, `UA Pool`, and `UA TB`.
- Every row has its own program definition, adapter, stored record, manual
  override, refresh action, and failure state even when rows share one account
  page.
- Flight Credits and TravelBank are displayed as USD with exact cents.
- Cash-related rows are excluded from Airline point totals and point-balance
  sorting.
- A supported account page is inspected after normal login without reading
  credentials, cookies, tokens, network traffic, passenger details, card
  details, or individual credit identifiers.
- The extension remains local-only and preserves last-known-good values when
  one of the page readers fails.

### Assumptions

- Southwest Flight Credits are summed from the rendered entries under
  `My Flight Credits`.
- The earliest rendered Flight Credit expiration date is displayed. If every
  entry says `Expiration: None`, no expiration detail is displayed, or the
  account has no credits, expiration is `N/A`.
- No Southwest Flight Credits means a `$0.00` balance.
- Southwest points and United miles/pooled miles do not expire.
- Rows from the same United or Southwest account repeat the same rendered
  loyalty member number so every row remains identifiable.
- Cash amounts are stored as integer cents so backups and calculations remain
  exact.
- Shared-page capture performs one bounded DOM observation pass and does not
  add remote API calls.

### Approaches considered

#### Separate adapters on one shared page — selected

Each visible row owns an independent program adapter. The content script
detects every supported program for the current host, runs all matching
adapters, and sends their results together. The background coordinator applies
successful records in one local-storage update before closing an
extension-created tab.

This keeps selectors, failure behavior, manual editing, and tests isolated per
row while avoiding duplicate page loads and storage races.

#### One combined collector

A single site-specific collector could return several records. This would make
one page read atomic, but it would couple otherwise independent balances and
make adapter failures harder to diagnose. It was not selected.

#### One stored record with generated UI rows

One record could contain multiple balance fields and let the popup manufacture
rows. This would require special cases throughout validation, sorting, manual
editing, and backup import/export. It was not selected.

### Final design

#### Program metadata

`ProgramDefinition` gains explicit metadata for:

- a shared capture group;
- whole-number rewards versus USD cents;
- inclusion in category totals; and
- inclusion in balance sorting.

Defaults preserve the behavior of every existing program.

#### Page observation

URL detection returns all definitions whose allowlisted host matches the
current page. Preparers run before inspection, allowing a credit adapter to
expand rendered details. The content script then sends a validated batch of
independent observations.

The capture coordinator:

1. prevents duplicate refresh tabs for the same capture group;
2. marks the grouped rows as updating;
3. saves valid successful observations in one storage mutation;
4. keeps observing when a grouped row is still loading;
5. closes only extension-created tabs after grouped inspection finishes; and
6. records an error only on the row whose adapter failed while preserving its
   previous value.

User-opened supported tabs are never closed.

#### Currency and totals

Rewards balances remain safe whole numbers. Cash balances are safe integer
cents and render with `Intl.NumberFormat` using USD currency formatting.
Manual editors accept ordinary dollar input and convert it to cents.

Cash rows:

- display a dollar sign and two decimal places;
- do not contribute to Airline totals; and
- appear after rewards rows in the default Airline order and when Airline
  balance sorting is active.

They still participate in expiration sorting when they have a real expiration
date.

#### Privacy

Adapters may read only the rendered containers required for the aggregate
balance, displayed loyalty member number where applicable, and expiration.
They must not persist names, reservation locators, ticket numbers, passenger
details, individual credit amounts, transaction history, raw HTML, cookies,
tokens, or intercepted network responses.

#### Testing

Coverage includes:

- independent success, zero, login, verification, and not-found fixtures;
- misleading nearby balances and responsive duplicates;
- multiple shared-page observations saved without a race;
- grouped refresh-tab lifecycle and partial failures;
- USD parsing, formatting, manual overrides, backup normalization, sorting,
  and total exclusion;
- exact Southwest host permissions; and
- the full TypeScript, ESLint, Vitest, and production-build gate.

### Decision log

| Decision | Alternatives | Reason |
| --- | --- | --- |
| Use separate adapters per visible row | Combined collector; generated UI rows | User preference and clearer maintenance boundaries |
| Send shared-page results as one validated message | Sequential messages | Prevent tab-close and local-storage write races |
| Store cash as integer cents | Floating-point dollars; rounded whole dollars | Preserve exact displayed cents |
| Exclude cash from Airline totals and reward-balance sorting | Mix dollars with miles | Avoid misleading totals and comparisons |
| Keep expiration sorting for cash rows | Pin all cash rows | Expiring credits should remain discoverable |
| Store only aggregate cash value and earliest date | Store individual credits | Preserve the extension's narrow privacy model |

## Update availability

The popup checks GitHub Releases only when opened and no more than once every
24 hours. The local cache contains only `checkedAt` and `latestVersion`.

When the cache is stale, the extension requests GitHub's public latest-release
API with a short timeout, validates a numeric `major.minor.patch` tag, updates
the cache, and compares it with `chrome.runtime.getManifest().version`.
A newer version produces a compact, non-blocking banner. The upper-right
**Update** icon always opens the repository's fixed latest-release URL; the
extension never opens an API-provided URL, downloads automatically, or installs
automatically.

The manifest grants exact access to `https://api.github.com/*`, but GitHub is
not a content-script host. The request contains no loyalty data, credentials,
cookies, identifiers, or analytics. Network errors, rate limits, timeouts, and
malformed releases fail silently so update checking cannot disrupt the ledger.

## Testing strategy

The quality gate covers:

- adapter success, zero, login, verification, and not-found cases;
- misleading nearby values, hidden responsive duplicates, and credential-field
  rejection;
- shared-page batches, grouped tab lifecycles, partial failures, and login
  waiting;
- whole-number and USD parsing, manual overrides, backup normalization,
  visibility settings, sorting, and total exclusion;
- update version comparison, cache freshness, malformed responses, and fixed
  trusted navigation;
- exact manifest hosts and the absence of credential-adjacent permissions; and
- strict TypeScript, ESLint, all Vitest suites, and the production build through
  `npm run check`.

## Consolidated decision log

| Decision | Alternatives considered | Reason |
| --- | --- | --- |
| Represent issuer programs, not cards | One row per physical card | Avoid duplicate balances and card-level data |
| Use typed program capabilities | Category-specific storage unions; UI hardcoding | Keeps one stable model and remains extensible |
| Keep three unequal ledger columns | Equal widths; stacked Credit Card section | Preserves readable detailed loyalty rows |
| Permit signed balances only for Credit Card rewards | Reject all negative values | Preserves exact issuer totals without weakening loyalty validation |
| Store only Chase's combined total | Store one total per card | Meets the ledger purpose without collecting card details |
| Check GitHub at popup open, at most daily | Manual-only checks; background alarms | Timely without persistent background polling |
| Open a fixed release URL | API-provided URL; automatic download | Keeps installation user-controlled and navigation trusted |
| Preserve disabled records | Delete hidden programs | Makes settings reversible and protects prior data |
