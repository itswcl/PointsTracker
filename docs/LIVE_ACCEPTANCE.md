# Privacy-Safe Live Acceptance

The adapter framework is implemented, but production selectors must be confirmed against authenticated program pages because those sites can change independently of this repository.

## Hard privacy rules

- Sign in only through the official website.
- Never enter credentials into the extension.
- Do not copy or save credential fields, cookies, account numbers, profile names, raw HTML, screenshots, or private network responses.
- Inspect only rendered elements that display the balance, expiration date, or a positive authenticated-account marker.
- Prefer stable `data-*`, ARIA, or semantic attributes over generated CSS class names.
- Keep host permissions unchanged unless an official account flow demonstrably uses another first-party hostname.

## United acceptance — selector confirmed 07/17/2026

Configured official page:

`https://www.united.com/en/us/account/activity/`

Confirmed production selector:

`[aria-labelledby="accountBalanceAriaLabel"] [data-test-name="balance_value"]`

This selector is scoped to the accessible Account balance list and intentionally excludes the separate pooled-miles amount in the account header.

Remaining end-to-end checks:

- A normal United login reaches or can access the configured page.
- The parser returns the same integer shown on the page after the rebuilt extension is reloaded.
- The popup displays `Expiration: N/A`.
- The updated date uses `MM/DD/YYYY`.
- An expired session reveals the login tab and preserves the last good value.

The stable selector and a synthetic regression fixture are recorded in `src/adapters/united.js` and `tests/adapters/adapters.test.js`. No production markup or account identifier is stored.

## Cathay acceptance — URL and selectors confirmed 07/17/2026

Confirmed account-summary URL:

`https://www.cathaypacific.com/cx/en_HK/membership/my-account/miles-and-points/membership-summary.html?cxsource=MEMBER_PANEL_MY_ACCOUNT_2_1`

Confirmed production selectors:

- Balance: `.mpo_miles-details .mpo_miles-details-cur-points`
- Expiration message: `.mpo_miles-details .mpo_miles-details-activity-base-message-box`

Both selectors are scoped to the Asia Miles details section. They intentionally exclude the duplicate member-panel balance and the separate Status Points expiration.

Remaining end-to-end checks:

- The rebuilt extension follows the confirmed account-summary URL after normal login.
- The popup matches both values shown by Cathay.
- If deriving a date, the source is explicitly the last eligible crediting or debiting date—not a generic transaction date.
- MFA or CAPTCHA is left for the user and is never bypassed.

The final URL, stable selectors, and a synthetic regression fixture are recorded in `src/programs.js`, `src/adapters/cathay.js`, and `tests/adapters/adapters.test.js`. No production markup or account identifier is stored.

## Air France Flying Blue acceptance — URL and selectors confirmed 07/17/2026

Confirmed miles-overview URL:

`https://wwws.airfrance.us/profile/flying-blue/miles-overview`

Confirmed production selectors:

- Balance: `.bw-fb-miles-overview__totals .bw-fb-miles-overview__totals-title`
- Expiration: `.bw-fb-miles-overview__totals .bw-fb-miles-overview__totals-label`

Both selectors are scoped to the Flying Blue totals section. They intentionally exclude the member-recognition header, XP values, and individual transaction amounts.

Remaining end-to-end checks:

- Reload the rebuilt extension and refresh Flying Blue from the popup.
- Confirm the popup matches the visible balance and valid-until date.
- Confirm the extension-created tab closes after capture succeeds.
- Confirm an expired session preserves the last good value and reveals the login page.

The final URL, stable selectors, and a synthetic regression fixture are recorded in `src/programs.js`, `src/adapters/airfrance.js`, and `tests/adapters/adapters.test.js`. No production markup or account identifier is stored.

## Virgin Atlantic Flying Club acceptance — selector confirmed 07/17/2026

Confirmed logged-in homepage URL:

`https://www.virginatlantic.com/en-US`

Confirmed production selector:

`#sign-in-menu [class*="accountOverviewPoints"] span:last-child`

The selector is scoped to the logged-in account menu and returns only the Virgin Points balance. It intentionally excludes tier points, booking prices, and account identity information. Virgin Atlantic's official Flying Club page states that Virgin Points do not expire.

Remaining end-to-end checks:

- Reload the rebuilt extension and refresh Virgin Atlantic from the popup.
- Confirm the popup matches the balance visible in the logged-in homepage menu.
- Confirm the popup displays `Expiration: N/A`.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, selector, and a synthetic regression fixture are recorded in `src/programs.js`, `src/adapters/virginatlantic.js`, and `tests/adapters/adapters.test.js`. No production markup or account identifier is stored.

## Alaska Airlines Atmos Rewards acceptance — balance path confirmed 07/17/2026

Confirmed logged-in homepage URL:

`https://www.alaskaair.com/`

Confirmed production path:

1. `#borealis-header` open shadow root
2. `borealis-guest-info-section` open shadow root
3. `.guest-datapoint` row labeled `Available points:`
4. The row's final paragraph containing the balance

This scoped traversal is necessary because the account menu uses web-component shadow roots. It intentionally ignores the adjacent Atmos Rewards number and all status information. Alaska Air Group states that Atmos Rewards points do not expire.

Remaining end-to-end checks:

- Reload the rebuilt extension and refresh Alaska Airlines from the popup.
- Confirm the popup matches the available-points value visible on the homepage.
- Confirm the popup displays `Expiration: N/A`.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, traversal, and a synthetic regression fixture are recorded in `src/programs.js`, `src/adapters/alaska.js`, and `tests/adapters/adapters.test.js`. No production markup or account identifier is stored.

## American AAdvantage acceptance — selectors confirmed 07/17/2026

Confirmed account-summary URL:

`https://www.aa.com/aadvantage-program/profile/account-summary`

Confirmed production selectors:

- Balance: `[data-testid="award-miles-balance-text"]`
- Expiration message: `[data-testid="award-miles-balance-section"] [class*="miles-expiring"]`

Both selectors are scoped to the award-miles balance section. The adapter first captures an explicit displayed expiration date. If no date is present, it displays `N/A` only when the page states that a primary cardholder has no miles expiration with an open card account. Other date-less messages remain `Unknown`.

Remaining end-to-end checks:

- Reload the rebuilt extension and refresh American AAdvantage from the popup.
- Confirm the popup matches the visible award-miles balance.
- Confirm the cardholder exemption displays `Expiration: N/A`, or an explicit date displays in `MM/DD/YYYY` format.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped selectors, and synthetic regression fixtures are recorded in `src/programs.js`, `src/adapters/american.js`, and `tests/adapters/adapters.test.js`. No production markup or account identifier is stored.

## EVA Air Infinity MileageLands acceptance — structure confirmed 07/17/2026

Confirmed account URL:

`https://eservice.evaair.com/flyeva/eva/ffp/frequent-flyer.aspx`

Confirmed production structure:

- The `#div_Mile` parent is the scoped **Overview of Award Miles** container.
- The self-award balance is the green primary value in its direct `p.margin-b-2` summary.
- The direct table with `Valid Through` and `Mileage` headers contains expiring mileage tranches.

The adapter intentionally excludes Status Miles, transferred mileage, and expired-mileage history. It captures the earliest upcoming tranche and preserves the source's month precision. The popup displays this as `amount · MM/YYYY`, so a small expiring tranche is not mistaken for the entire balance.

Remaining end-to-end checks:

- Reload the rebuilt extension and refresh EVA Air from the popup.
- Confirm the popup balance matches the visible Self Award Miles value.
- Confirm the Expiration cell matches the earliest `Valid Through` row and its mileage amount.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped traversal, and synthetic regression fixture are recorded in `src/programs.js`, `src/adapters/evaair.js`, and `tests/adapters/adapters.test.js`. No production markup or account identifier is stored.

## British Airways Club acceptance — structure confirmed 07/17/2026

Confirmed statement URL:

`https://www.britishairways.com/nx/b/customerhub/en/usa/your-account/executive-statements/`

Confirmed production structure:

- Account root: `[data-testid="executive-statements"]`
- Balance values: `[data-testid="avios-card-value"]`, scoped to the card whose text begins with `Avios`
- Activity months: full month-and-year headings under the account root

The balance matcher intentionally excludes the adjacent Tier Points card. British Airways does not display an exact Avios expiration date here, so the adapter uses the first, newest statement month, treats its first day as the activity date, and adds 36 months. This is a conservative display convention requested for the MVP, not a date directly stated by British Airways.

Remaining end-to-end checks:

- Reload the rebuilt extension and refresh British Airways from the popup.
- Confirm the popup balance matches the visible Avios card rather than Tier Points.
- Confirm the calculated expiration is 36 months after the first visible statement month, using day `01`.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped traversal, and synthetic regression fixture are recorded in `src/programs.js`, `src/adapters/britishairways.js`, and `tests/adapters/adapters.test.js`. No production markup or account identifier is stored.

## ANA Mileage Club acceptance — structure confirmed 07/17/2026

Confirmed statement URL:

`https://stmt.cam.ana.co.jp/psz/amcj/jsp/renew/mile/reference_e.jsp#month`

Confirmed production structure:

- Total balance label: `Mileage balance (Total)` in a `dt`, with the displayed total in the following `dd`; ANA places the number and nested `miles` span together without whitespace
- Activity root: `#meisai`
- Latest-activity expiration: the `Expiry date` table column (rendered as `Expiry<br>date` in the DOM), displayed as `YYYY/MM`

The adapter reads only the labeled total and the first non-empty expiry month in the activity table. It waits for the Activity details table instead of saving an early `Unknown` result when ANA renders the balance first. It does not capture flight numbers, activity descriptions, account groups, or other transaction fields. Month precision is preserved in the ledger as `MM/YYYY`; no day is invented.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new ANA host permission.
- Refresh ANA from the popup and confirm the balance matches `Mileage balance (Total)`.
- Confirm Expiration matches the first displayed `Expiry date` month under Activity details.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped traversal, and synthetic regression fixture are recorded in `src/programs.js`, `src/adapters/ana.js`, and `tests/adapters/adapters.test.js`. No production markup or account identifier is stored.

## World of Hyatt acceptance — structure confirmed 07/18/2026

Confirmed account URL:

`https://www.hyatt.com/profile/en-US/account-overview`

Confirmed production structure:

- Exact balance label: `Current Point Balance`
- Displayed balance: the numeric sibling inside the label's parent container
- Responsive layout: the page renders multiple copies with the value either before or after the label; the adapter supports both orders and requires a numeric display element

The adapter ignores unrelated Base Points, promotion content, and form controls. Expiration displays `N/A` because this personal ledger is explicitly configured for the user's cardholder account. It does not infer cardholder status from generic card promotions on the Hyatt page.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new Hyatt host permission.
- Refresh World of Hyatt from the popup and confirm the balance matches `Current Point Balance`.
- Confirm Expiration displays `N/A`.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped traversal, and synthetic regression fixture are recorded in `src/programs.js`, `src/adapters/hyatt.js`, and `tests/adapters/adapters.test.js`. No production markup or account identifier is stored.

## Hilton Honors acceptance — structure confirmed 07/19/2026

Confirmed account URL:

`https://www.hilton.com/en/hilton-honors/guest/my-account/`

Confirmed production structure:

- Account points container: `[data-testid="pointsBlock"]`
- Total balance: `[data-testid="honorsPointsBlock"]`
- Policy text on the account page: points expire after 24 months of inactivity

Hilton's hydrated account summary exposes `totalPointsFmt` and `pointsExpiration`. The adapter reads both fields without relying on the query-array position. The visible `honorsPointsBlock` remains a balance fallback, while the official `24 mo inactivity` policy is shown only if the personalized expiration field is unavailable. The separate promotional `usePointsWrapper` value is excluded.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new Hilton host permission.
- Refresh Hilton Honors and confirm the balance and personalized expiration match the account summary.
- Confirm Expiration displays `24 mo inactivity`.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped fields and selector fallback, and synthetic regression fixture are recorded in `src/programs.js`, `src/adapters/hilton.js`, and `tests/adapters/adapters.test.js`. No production markup or account identifier is stored.

## Marriott Bonvoy acceptance — structure confirmed 07/19/2026

Confirmed activity URL:

`https://www.marriott.com/loyalty/myAccount/activity.mi`

Confirmed production structure:

- Account summary root: `.member-status-outer-container`
- Balance: the scoped `h3` whose complete text is the numeric balance followed by `Points`
- Activity filter: `#dropdownactivity-filter`
- Selected filter label: `#dropdown-selected-valueactivity-filter`
- Qualifying filter option: `#option-9`, whose exact text is `All Qualifying`
- Activity rows: `[role="table"] [role="row"]`, with the posted date in the first `[role="cell"]`

The content script opens Marriott's custom filter and selects `All Qualifying` in two DOM stages before capture. The adapter then adds 24 months to the newest qualifying activity date. It does not derive point expiration from reward-certificate dates, elite-status dates, unfiltered activity, or the extension refresh date. A Lifetime Elite heading inside the scoped member-status root displays `N/A`; a co-branded credit card by itself does not.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new Marriott host permission.
- Refresh Marriott Bonvoy and confirm the filter switches to `All Qualifying` automatically.
- Confirm the balance matches the member-status point total.
- Confirm Expiration is 24 months after the first displayed qualifying activity date.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped traversal, filter preparation, and synthetic regression fixtures are recorded in `src/programs.js`, `src/adapters/marriott.js`, `entrypoints/supported.content.js`, and `tests/adapters/adapters.test.js`. No production markup, transaction description, or account identifier is stored.

## Completion gate

For each program, acceptance requires three consecutive successful flows:

1. Start from a normal signed-out session.
2. Sign in on the official website.
3. Allow the extension to open its inactive account-detail tab.
4. Compare the popup with the official rendered values.
5. Confirm the extension-created tab closes after success.
6. Confirm local storage contains only the versioned approved fields.

Automatic capture is not considered production-confirmed until this gate passes. Manual entry remains the supported fallback.
