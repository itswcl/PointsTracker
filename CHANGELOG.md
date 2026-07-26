# Changelog

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
