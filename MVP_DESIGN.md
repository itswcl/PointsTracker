# Points Tracker MVP Design

Status: Approved for implementation planning  
Date: 07/17/2026

## Purpose

Points Tracker is a private, personal Chrome extension that consolidates loyalty-program balances and expiration information. The MVP reduces the need to remember where each balance is shown while avoiding credential collection or storage.

## Understanding Summary

- The MVP is for one person using one Chrome profile.
- It supports twelve airline and hotel loyalty programs, including World of Hyatt, Hilton Honors, and Marriott Bonvoy.
- The toolbar popup shows the current balance, expiration status or date, and updated date.
- Dates use `MM/DD/YYYY`; no relative timestamps or time of day are displayed.
- The user signs in normally on each official website. The extension never requests or stores credentials.
- After recognizing an authenticated visit, the extension may open a known official account-detail page in an inactive tab, capture the required fields, and close that extension-created tab.
- Automatic capture is primary. Manual capture, manual editing, and retry are fallbacks. Refresh already opens the required account page, so a separate account-link action is intentionally omitted.

## Explicit Non-Goals

- Expiration alerts
- Redemption or transfer recommendations
- Transaction-history tracking
- Cloud sync or a remote backend
- Multiple users or P2 support
- Chrome Web Store distribution
- Additional visual polish beyond compact local program marks
- Private website API integration

## Assumptions

- The MVP tracks one account per program.
- It stores only program name, currency name, balance, expiration information, capture source, status, and updated date.
- Everything remains in `chrome.storage.local` in the current Chrome profile.
- Plain local storage and unencrypted JSON backups are acceptable because no credentials or account identifiers are stored.
- A normal refresh should complete within roughly 30 seconds.
- The extension works only while Chrome is running and the user has a valid website session.
- Supported-program website changes may require adapter maintenance.
- The first installation is an unpacked Chrome extension maintained locally.

## Considered Approaches

### 1. Tab-driven program adapters (selected)

Each program adapter defines official account URLs, authenticated-page indicators, extraction rules, validation, and program-specific failure handling. The extension uses the existing logged-in browser session to load rendered official pages in inactive tabs.

This approach provides the desired login-and-capture experience without handling credentials or depending on private APIs. Program changes remain isolated to the affected adapter.

### 2. Direct private endpoint requests (rejected for MVP)

Calling internal United or Cathay endpoints could avoid opening tabs, but those endpoints may change without notice and could require broader session or network access. This approach is more fragile and expands the security surface.

### 3. Visible-page-only capture (fallback only)

Reading only the page the user manually opens requires fewer automated steps, but it does not meet the goal of finding the relevant data after a normal login. It remains useful as a fallback.

## Architecture

The extension contains five primary components:

1. **Popup** — displays all program records and exposes refresh, official-page, edit, import, and export actions.
2. **Capture coordinator** — starts capture attempts, creates and tracks inactive tabs, prevents loops, applies timeouts, and closes only extension-created tabs.
3. **Program adapters** — contain program-specific URLs, authenticated markers, parsers, and validators.
4. **Page reader** — runs only on approved account pages and returns the allowlisted structured result.
5. **Local store** — preserves automatic captures, manual overrides, freshness, and minimal diagnostic states.

## Data Flow

1. The user signs in normally or visits a supported program while already authenticated.
2. A supported-domain page reader recognizes an authenticated state without inspecting login form values.
3. The capture coordinator checks its session and cooldown state to avoid duplicate work.
4. The coordinator opens the adapter's official account-detail page in an inactive tab.
5. The adapter waits for the rendered balance and expiration information.
6. A valid result is saved locally and the extension-created tab is closed.
7. An invalid or failed result leaves the last successful data intact and records a minimal error category.
8. The popup displays the current value and updated date.

## Data Model

Each program record contains:

- Program name
- Points or miles currency name
- Automatically captured balance
- Optional manual balance override
- Expiration type
- Optional expiration date
- Optional expiration note
- Automatic capture date
- Optional manual edit date
- Status
- Minimal error category
- Official account-detail URL

Expiration types are:

- `never`: the program states that the miles do not expire.
- `fixed_date`: the account displays a specific expiration date.
- `activity_based`: expiration depends on qualifying account activity.
- `unknown`: the extension cannot safely determine an expiration status or date.

United MileagePlus miles, Virgin Points, and Atmos Rewards points currently do not expire. Cathay Asia Miles generally use an activity-based policy that extends the balance after eligible activity. Flying Blue exposes a personal valid-until date on its miles-overview page. Program policies are adapter knowledge, but a personal expiration date is displayed only when the account provides it or provides enough information to derive it safely.

References:

- [United 2026 proxy statement](https://ir.united.com/static-files/f632ccd5-eca8-47c3-8fad-dde309249cbc)
- [Cathay Asia Miles expiry policy](https://www.cathaypacific.com/cx/en_GB/faqs/cathay-membership-programme/asia-miles/new-expiry-arrangement/what-is-the-new-change-on-the-expiry-rule-of-asia-miles.html?cxsource=LANGUAGE_SELECTOR_EN_CA)
- [Virgin Atlantic Flying Club](https://www.virginatlantic.com/en-US/flying-club)
- [Alaska Air Group loyalty program report](https://news.alaskaair.com/wp-content/uploads/2026/03/2025-Annual-Report.pdf)
- [British Airways Avios expiry rules](https://www.britishairways.com/content/en/us/the-british-airways-club/avios)

## Manual Override Rules

The latest automatic capture and an optional manual override remain separate. When an override exists, the popup displays it with a manual label while continuing to record later successful automatic captures. The user can compare the values and remove the override by selecting the automatic value.

An automatic refresh must never silently erase a manual correction.

## Refresh Rules

- Start an automatic capture on the first authenticated visit to each supported program in a Chrome session.
- Start another capture after a newly completed login.
- Apply a short cooldown to repeated page events to prevent tab loops.
- Allow an explicit popup refresh at any time.
- Do not navigate to program websites when the user makes a manual edit.
- Time out a capture instead of waiting indefinitely.
- Close only tabs created by the extension.

## Failure Handling

- **Login required:** retain saved data and provide the official login link.
- **Verification required:** retain saved data and reveal or preserve the tab so the user can complete MFA or CAPTCHA. Never attempt to bypass verification.
- **Data not found:** retain saved data and offer the official account-detail link and manual editing.
- **Website changed:** identify the affected adapter without disabling the other program.
- **Network or timeout:** retain saved data and offer retry.
- **Invalid result:** reject empty, negative, malformed, or otherwise unsafe values.

Failed capture attempts never overwrite the last successful record. Diagnostics contain only categories such as `balance_not_found`; they do not contain raw HTML or network responses.

## Popup Presentation

The popup uses a compact single-line ticker ledger separated by rules. Each airline is represented by a local airline mark, while its full name remains available to screen readers and icon tooltips. Program actions are accessible icons, and refresh is available only per program so one click cannot open multiple account pages:

```text
        Balance  Expiration  Actions                 Updated
[UA]    125,400  N/A         [refresh] [open] [edit] 07/17/2026
[CX]     84,500  12/14/2026  [refresh] [open] [edit] 07/17/2026
[AF]    210,500  05/15/2027  [refresh] [open] [edit] 07/17/2026
[VS]    163,250  N/A         [refresh] [open] [edit] 07/17/2026
[AS]    422,100  N/A         [refresh] [open] [edit] 07/17/2026
[AA]    176,400  N/A         [refresh] [open] [edit] 07/17/2026
[BR]     96,575  50 · 07/2028 [refresh] [open] [edit] 07/17/2026
[BA]     42,300  01/01/2029  [refresh] [open] [edit] 07/17/2026
```

If no exact status or date is available, the popup displays `Expiration: Unknown`. A failed refresh displays a concise error and relevant recovery actions while retaining the prior value.

The ledger uses compact local airline marks with accessible full names. SVG paths or official small-site icons are bundled into the extension, so the popup makes no remote image requests and keeps the row width predictable.

The Balance and Expiration headers are mutually exclusive toggles. Balance sorts highest to lowest; Expiration sorts dated records from earliest to latest, with `Unknown` and `N/A` retained at the bottom. Clicking the active header restores the original program order.

When a program exposes expiring mileage tranches rather than one date for the full balance, the Expiration column shows the earliest tranche as `amount · MM/YYYY`. Month-only source data remains month-only; the extension does not invent a day.

## Security and Privacy Boundary

The extension uses Manifest V3 and requests only the access needed for local storage and exact supported-program account hosts. It does not request general access to all websites.

The extension must not:

- Read username or password input values
- Access or store cookies
- Access general browsing history
- Intercept network requests
- Store raw account-page HTML
- Store member names or account numbers
- Upload data or diagnostics
- Include remote analytics
- Execute remotely downloaded code

The page reader uses allowlisted display elements for balance and expiration data and does not query form inputs. Local Chrome storage and exported JSON are not encrypted vaults; this limitation is accepted for the non-credential MVP data.

## Export and Import

The MVP provides plain JSON export and import. The file contains only approved program records and no credentials, account identifiers, raw HTML, or diagnostics containing page content. Import validates its structure and values before changing local data.

## Testing Strategy

### Adapter tests

Use synthetic, redacted page fragments to verify balance and expiration extraction. Tests also confirm that parsers do not query login fields or unrelated profile content.

### Workflow tests

Verify inactive-tab creation, capture success, timeouts, cooldowns, tab ownership, stale-data preservation, manual overrides, and JSON validation.

### Privacy tests

Verify that storage and exports contain only approved fields and that no credentials, cookies, account identifiers, raw HTML, or network responses are captured.

### Manual acceptance tests

After normal user login, compare the extension popup with values visibly shown by the official supported-program accounts. Do not save private production-page snapshots as fixtures.

## Known Risks

- Supported programs may change authenticated URLs or rendered markup.
- Sites may require MFA, CAPTCHA, or other user interaction.
- An exact Cathay expiration date may not be available on the selected account page.
- Chrome profile data can be lost if the extension or profile is removed without a backup.
- Local Chrome storage and JSON exports are not protected from someone who already has access to the operating-system account and Chrome profile.

Separate adapters, last-good-value preservation, manual editing, clear errors, direct official links, and JSON backup mitigate these risks.

## Implementation Discovery Required

Before implementation, perform a narrow live discovery pass after the user logs into each supported program. Identify:

- Exact authenticated account-detail URLs
- Stable signs that login succeeded
- Stable rendered balance elements
- Cathay expiration or qualifying-activity information exposed by the account
- Verification and session-expiry states

The discovery pass must not save credentials, private page snapshots, raw account HTML, or account identifiers.

## Decision Log

| Decision | Alternatives | Reason |
| --- | --- | --- |
| Personal-first MVP | Multi-user product | Minimizes scope and security complexity; P2 can come later. |
| Twelve initial loyalty programs | Broad program catalog | The adapters validate airline and hotel balances plus non-expiring, personally configured cardholder, inactivity-policy, qualifying-activity, explicit valid-until, month-only, partial-tranche, and shadow-root displays. |
| Tab-driven adapters | Private API requests; visible-only capture | Best match for automatic capture using the existing browser session. |
| Title-free two-column popup | Single-column ledger; full dashboard | Keeps airline and hotel ledgers visible side by side without spending space on a redundant product title. |
| Local-only storage | Local standalone app; cloud backend | Avoids accounts, remote data, and credential concerns. |
| Hybrid automatic/manual data | Automatic-only; manual-only | Provides convenience while remaining usable when a site changes. |
| Separate automatic and manual values | Automatic overwrites manual edits | Preserves corrections without discarding newer captured observations. |
| Preserve last good result | Clear value on failure | Prevents transient failures from destroying useful information. |
| Minimal exact-host permissions | Broad browser access | Keeps the privacy boundary understandable and auditable. |
| JSON export/import | No backup; cloud sync | Provides recoverability without a backend. |
| Unpacked distribution | Chrome Web Store | Faster iteration for one personal user. |
| Local program marks in single-line ledger rows | Airline-code badges; visible program names; program cards | Improves recognition while keeping the growing program list compact and preserving accessible names. |
| Per-program refresh only | Global refresh | Prevents one action from opening multiple airline account pages. |
| Bottom-aligned total per loyalty category | One combined total; separate summary cards | Keeps airline and hotel balances distinct, with both neutral totals sharing one baseline below their independently sorted sections. |
| Alerts and recommendations deferred | Include in MVP | The validated core need is visibility of balances and expiration. |

## Next Phase

The next phase is an implementation plan, starting with live URL/DOM discovery and a minimal skeleton that proves one United capture before adding Cathay and the full popup behavior.
