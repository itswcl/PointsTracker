# Changelog

## 1.6.0 — 2026-07-26

### Added

- Southwest Rapid Rewards as two separate Airline rows from one account page:
  points with no expiration, and a USD Flight Credit total with the earliest
  displayed expiration date.
- United Pooled Miles and United TravelBank as separate rows alongside the
  existing MileagePlus miles row.
- Shared-page batch capture so one owned account tab can update multiple
  independently stored program rows.
- Local program visibility settings. A disabled program is hidden, excluded
  from its category total and sorting, and ignored by automatic capture without
  deleting its saved ledger record.

### Changed

- Cash rows display a dollar sign and cents, retain manual correction support,
  and are excluded from Airline balance sorting and the Airline points total.
- The default Airline order keeps miles and points programs together, with
  cash-related rows such as UA TravelBank and Southwest Flight Credits at the
  bottom.
- United and Southwest rows from the same account display the same captured
  loyalty member number.
- Southwest Flight Credits display `N/A` when the account page provides no
  expiration detail, while still preferring any real date that is displayed.
- Repeated refreshes for rows sharing an account page reuse one in-progress
  capture instead of opening duplicate tabs.
- Redesigned Settings as a dedicated ledger-style screen with Credit Card,
  Airline, and Hotel sections plus clear `Shown` and `Hidden` switches.
- Replaced the footer's Check updates, Export, and Import wording with compact
  icons, added a Settings icon before them, and provided Setting, Update,
  Export, and Import hover descriptions. These global actions now sit in the
  upper-right, while only the installed version appears in the upper-left.

### Privacy and maintenance

- Southwest capture is restricted to rendered `Available Points`, member
  number, and Flight Credit amount/expiration fields. Individual Flight Credit
  details are neither stored nor included in backups.
- United pooled miles and TravelBank remain rendered-page adapters; no private
  API, cookie, token, or network interception access was added.
- Consolidated overlapping documentation into task-focused Installation,
  Architecture, Live Acceptance, and Publishing guides with a central
  documentation index.

## 1.5.0 — 2026-07-25

### Added

- Capital One Miles as a balance-only Credit Card program. The adapter reads
  only the rendered whole-number balance paired with the exact `Miles` label on
  the authenticated account-summary page.
- Exact webpage access for `myaccounts.capitalone.com`; no member number,
  expiration, card details, rewards cash, or private account API data is read
  or stored.

## 1.4.0 — 2026-07-25

### Added

- IHG One Rewards and Wyndham Rewards hotel adapters.
- A Credit Card ledger with Amex Membership Rewards, Chase Ultimate Rewards,
  Citi ThankYou Rewards, and Bilt Rewards.
- Local summing of every Chase card balance shown on the Ultimate Rewards
  account-selector page; only the combined total is stored.
- A longer login window that brings a signed-out account tab forward and keeps
  observing it for up to three minutes.
- Click-to-copy member-number suffixes for airline and hotel rows. Only the last
  four characters are displayed; the full locally stored value is copied.

### Changed

- Reordered the popup columns to Credit Card, Airline, and Hotel.
- Removed category counts and the Program and Member # column titles to create
  a wider, less crowded ledger.
- Added separate Credit Card, Airline, and Hotel totals on one baseline.
- Added concise custom tooltips for member-number copy, refresh, and edit
  actions.
- Updated the README preview with fictional test balances, member numbers, and
  expiration dates.

### Fixed

- Chase now finds and sums multiple card balances rendered in open shadow roots,
  including the account selector's internal accessibility-hidden number wrapper
  without accepting hidden duplicate card rows.
- IHG no longer reports a missing expiration when the page confirms an active
  Elite tier; those profiles display `N/A`.
- Wyndham zero-point accounts with the exact no-activity state display `N/A`
  instead of a false expiration error.
- Credit Card programs can preserve an exact negative issuer balance without
  allowing negative airline or hotel balances.
- Member-number, balance, expiration, and tooltip content no longer clip or
  overflow in the compact popup.
- Older backups and stored state normalize safely with the newly supported
  program rows.

### Privacy and maintenance

- Automatic capture remains limited to allowlisted rendered account-page
  elements; no credentials, cookies, private authorization, card details,
  per-card balances, or raw HTML are stored.
- Updated the development lockfile to resolve the `brace-expansion` security
  advisory reported by `npm audit`.
