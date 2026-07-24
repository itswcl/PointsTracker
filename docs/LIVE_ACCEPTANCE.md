# Privacy-Safe Live Acceptance

The adapter framework is implemented, but production selectors must be confirmed against authenticated program pages because those sites can change independently of this repository.

## Hard privacy rules

- Sign in only through the official website.
- Never enter credentials into the extension.
- Do not copy or save credential fields, cookies, profile names, raw HTML, screenshots, or private network responses.
- Inspect only rendered elements that display the loyalty member number, balance, expiration date, or a positive authenticated-account marker.
- Real member numbers may be validated in the live browser and stored by the local extension, but must never be copied into source fixtures, documentation, logs, or reports.
- Prefer stable `data-*`, ARIA, or semantic attributes over generated CSS class names.
- Keep host permissions unchanged unless an official account flow demonstrably uses another first-party hostname.

## United acceptance — selector confirmed 07/17/2026

Configured official page:

`https://www.united.com/en/us/myunited`

Confirmed production selectors, newest first:

- `[class*="MileageBalance__milesContainer"] [class*="MileageBalance__totalMiles"]`
- `[aria-labelledby="accountBalanceAriaLabel"] [data-test-name="balance_value"]`
- Member number: `[class*="AccountSummary-accountSummary__mpNumber"]`, parsed only after the exact `MileagePlus Number` label

The primary balance selector is scoped to the My United MileageBalance component. The second supports the earlier accessible Account balance list. The member-number selector is scoped to the labeled Account details row. Together they exclude pooled miles in the account header and lifetime miles in Premier progress.

United's balance endpoint requires a bearer authorization header managed by the page. Because the extension must never read or copy credentials or authorization tokens, United is an explicit rendered-HTML fallback rather than an API capture.

Remaining end-to-end checks:

- A normal United login reaches or can access the configured page.
- The parser returns the same integer shown on the page after the rebuilt extension is reloaded.
- The popup member number matches the displayed MileagePlus number.
- The popup displays `Expiration: N/A`.
- An expired session reveals the login tab and preserves the last good value.

The stable selector and a synthetic regression fixture are recorded in `src/adapters/united.ts` and `tests/adapters/adapters.test.ts`. No production markup or real member number is stored in the repository.

## Cathay acceptance — URL and selectors confirmed 07/17/2026

Confirmed account-summary URL:

`https://www.cathaypacific.com/cx/en_HK/membership/my-account/miles-and-points/membership-summary.html?cxsource=MEMBER_PANEL_MY_ACCOUNT_2_1`

Confirmed production selectors:

- Balance: `.mpo_miles-details .mpo_miles-details-cur-points`
- Expiration message: `.mpo_miles-details .mpo_miles-details-activity-base-message-box`
- Member number: `.mpo_membership-number-and-status .mpo_membership-box`, parsed only from the box labeled `Membership number`

The balance and expiration selectors are scoped to the Asia Miles details section, while member-number capture is scoped to the labeled membership box. They intentionally exclude the duplicate member-panel balance, membership status, and separate Status Points expiration.

Remaining end-to-end checks:

- The rebuilt extension follows the confirmed account-summary URL after normal login.
- The popup matches both values shown by Cathay.
- The popup member number matches the displayed Cathay membership number.
- If deriving a date, the source is explicitly the last eligible crediting or debiting date—not a generic transaction date.
- MFA or CAPTCHA is left for the user and is never bypassed.

The final URL, stable selectors, and a synthetic regression fixture are recorded in `src/programs.ts`, `src/adapters/cathay.ts`, and `tests/adapters/adapters.test.ts`. No production markup or real member number is stored in the repository.

## Air France Flying Blue acceptance — split-page selectors confirmed 07/24/2026

Confirmed miles-overview URL:

`https://wwws.airfrance.us/profile/flying-blue/miles-overview`

Confirmed member dashboard URL:

`https://wwws.airfrance.us/profile/flying-blue/dashboard`

Confirmed production selectors:

- Balance: `.bw-fb-miles-overview__totals .bw-fb-miles-overview__totals-title`
- Expiration: `.bw-fb-miles-overview__totals .bw-fb-miles-overview__totals-label`
- Member number: `[data-testid="bwpr-flyingblue-membership__card"] .bw-fb-membership-card__number-text strong`

Balance and expiration remain scoped to the miles-overview totals section. Member number is shown only on the authenticated dashboard. One refresh reads the miles overview, navigates the same extension-created tab to the dashboard, merges the member number, and then closes the tab.

Remaining end-to-end checks:

- Reload the rebuilt extension and refresh Flying Blue from the popup.
- Confirm the popup matches the visible balance and valid-until date.
- Confirm the popup member number matches the displayed Flying Blue number.
- Confirm the extension-created tab closes after capture succeeds.
- Confirm an expired session preserves the last good value and reveals the login page.

The final URL, stable selectors, and a synthetic regression fixture are recorded in `src/programs.ts`, `src/adapters/airfrance.ts`, and `tests/adapters/adapters.test.ts`. No production markup or real member number is stored in the repository.

## Virgin Atlantic Flying Club acceptance — selector confirmed 07/17/2026

Confirmed logged-in account-overview URL:

`https://www.virginatlantic.com/flying-club/account/overview`

Confirmed production selector:

- Balance: `#sign-in-menu [class*="accountOverviewPoints"] span:last-child`
- Member number: `[data-testid="membership-number"]`, parsed only after the displayed `Flying Club number` or `Membership number` label

The balance selector is scoped to the logged-in account menu and intentionally excludes tier points and booking prices. The account-overview field supplies the labeled Flying Club number. Virgin Atlantic's official Flying Club page states that Virgin Points do not expire.

Remaining end-to-end checks:

- Reload the rebuilt extension and refresh Virgin Atlantic from the popup.
- Confirm the popup matches the balance visible in the logged-in homepage menu.
- Confirm the popup member number matches the displayed Flying Club number.
- Confirm the popup displays `Expiration: N/A`.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, selector, and a synthetic regression fixture are recorded in `src/programs.ts`, `src/adapters/virginatlantic.ts`, and `tests/adapters/adapters.test.ts`. No production markup or real member number is stored in the repository.

## Alaska Airlines Atmos Rewards acceptance — balance path confirmed 07/17/2026

Confirmed logged-in homepage URL:

`https://www.alaskaair.com/`

Confirmed production path:

1. `#borealis-header` open shadow root
2. `borealis-guest-info-section` open shadow root
3. `.guest-datapoint` row labeled `Atmos Rewards Number:`; its final paragraph contains the member number
4. `.guest-datapoint` row labeled `Available points:`; its final paragraph contains the balance

This scoped traversal is necessary because the account menu uses web-component shadow roots. A second labeled row captures the adjacent Atmos Rewards number while still ignoring status information. Alaska Air Group states that Atmos Rewards points do not expire.

Remaining end-to-end checks:

- Reload the rebuilt extension and refresh Alaska Airlines from the popup.
- Confirm the popup matches the available-points value visible on the homepage.
- Confirm the popup member number matches the labeled Atmos Rewards number.
- Confirm the popup displays `Expiration: N/A`.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, traversal, and a synthetic regression fixture are recorded in `src/programs.ts`, `src/adapters/alaska.ts`, and `tests/adapters/adapters.test.ts`. No production markup or real member number is stored in the repository.

## American AAdvantage acceptance — selectors confirmed 07/24/2026

Confirmed account-summary URL:

`https://www.aa.com/aadvantage-program/profile/account-summary`

Confirmed production selectors:

- Balance: `[data-testid="award-miles-balance-text"]`
- Expiration message: `[data-testid="award-miles-balance-section"] [class*="miles-expiring"]`
- Member number: `[data-testid="member-details-section"] [class*="_aadvantage-number_"]`

Both selectors are scoped to the award-miles balance section. The adapter first captures an explicit displayed expiration date. If no date is present, it displays `N/A` only when the page states that a primary cardholder has no miles expiration with an open card account. Other date-less messages remain `Unknown`.

Remaining end-to-end checks:

- Reload the rebuilt extension and refresh American AAdvantage from the popup.
- Confirm the popup matches the visible award-miles balance.
- Confirm the popup member number matches the displayed AAdvantage number.
- Confirm the cardholder exemption displays `Expiration: N/A`, or an explicit date displays in `MM/DD/YYYY` format.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped selectors, and synthetic regression fixtures are recorded in `src/programs.ts`, `src/adapters/american.ts`, and `tests/adapters/adapters.test.ts`. No production markup or real member number is stored in the repository.

## EVA Air Infinity MileageLands acceptance — structure confirmed 07/17/2026

Confirmed account URL:

`https://eservice.evaair.com/flyeva/eva/ffp/frequent-flyer.aspx`

Confirmed production structure:

- The unique `dl.margin-t-4 > dd.text-4.margin-b-4` account-summary row contains the exact `Membership Number:` label and its displayed value. The adapter targets this row directly instead of scanning generic definition lists.
- The `#div_Mile` parent is the scoped **Overview of Award Miles** container.
- The self-award balance is the green primary value in its direct `p.margin-b-2` summary.
- The direct table with `Valid Through` and `Mileage` headers contains expiring mileage tranches.

The adapter intentionally excludes Status Miles, transferred mileage, and expired-mileage history. It captures the earliest upcoming tranche and preserves the source's month precision. The popup displays this as `amount · MM/YYYY`, so a small expiring tranche is not mistaken for the entire balance.

Remaining end-to-end checks:

- Reload the rebuilt extension and refresh EVA Air from the popup.
- Confirm the popup balance matches the visible Self Award Miles value.
- Confirm the popup member number matches the displayed Infinity MileageLands number.
- Confirm the Expiration cell matches the earliest `Valid Through` row and its mileage amount.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped traversal, and synthetic regression fixture are recorded in `src/programs.ts`, `src/adapters/evaair.ts`, and `tests/adapters/adapters.test.ts`. No production markup or real member number is stored in the repository.

## British Airways Club acceptance — split-page structure confirmed 07/24/2026

Confirmed statement URL:

`https://www.britishairways.com/nx/b/customerhub/en/usa/your-account/executive-statements/`

Confirmed account-overview URL:

`https://www.britishairways.com/nx/b/customerhub/en/usa/your-account/`

Confirmed production structure:

- Account root: `[data-testid="executive-statements"]`
- Balance values: `[data-testid="avios-card-value"]`, scoped to the card whose text begins with `Avios`
- Activity months: full month-and-year headings under the account root
- Member number on the overview: `[data-testid="membership-number"]`, adjacent to the exact `Membership number:` label

The balance matcher intentionally excludes the adjacent Tier Points card. British Airways does not display the member number on its statement page, so one refresh navigates the same tab to the overview after saving balance and activity-derived expiration. The adapter uses the first, newest statement month, treats its first day as the activity date, and adds 36 months.

Remaining end-to-end checks:

- Reload the rebuilt extension and refresh British Airways from the popup.
- Confirm the popup balance matches the visible Avios card rather than Tier Points.
- Confirm the popup member number matches the displayed British Airways membership number.
- Confirm the calculated expiration is 36 months after the first visible statement month, using day `01`.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped traversal, and synthetic regression fixture are recorded in `src/programs.ts`, `src/adapters/britishairways.ts`, and `tests/adapters/adapters.test.ts`. No production markup or real member number is stored in the repository.

## ANA Mileage Club acceptance — split-page structure confirmed 07/24/2026

Confirmed statement URL:

`https://stmt.cam.ana.co.jp/psz/amcj/jsp/renew/mile/reference_e.jsp#month`

Confirmed ANA-number URL:

`https://cam.ana.co.jp/psz/amcj/jsp/renew/amcMemberReference/amcMemberReferenceOS_e.jsp`

Confirmed production structure:

- Total balance label: `Mileage balance (Total)` in a `dt`, with the displayed total in the following `dd`; ANA places the number and nested `miles` span together without whitespace
- Activity root: `#meisai`
- Latest-activity expiration: the `Expiry date` table column (rendered as `Expiry<br>date` in the DOM), displayed as `YYYY/MM`
- Member number: under `#camContentsArea`, the `Main card` heading's following table, in the `ANA Number` column
- Responsive member-number fallback: `dl.mw1803_code > dt` labeled `ANA Number`, followed by its `dd`

The statement page does not show the ANA Number. One refresh therefore saves its labeled total and first non-empty expiry month, then reuses the same tab for the English Main card page and merges only the ANA Number. It does not capture flight numbers, activity descriptions, account groups, other cards, or transaction fields.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new ANA host permission.
- Refresh ANA from the popup and confirm the balance matches `Mileage balance (Total)`.
- Confirm the popup member number matches the displayed ANA Mileage Club number.
- Confirm Expiration matches the first displayed `Expiry date` month under Activity details.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped traversal, and synthetic regression fixture are recorded in `src/programs.ts`, `src/adapters/ana.ts`, and `tests/adapters/adapters.test.ts`. No production markup or real member number is stored in the repository.

## Delta SkyMiles acceptance — selectors confirmed 07/24/2026

Confirmed overview URL:

`https://www.delta.com/myskymiles/overview`

Confirmed production structure:

- Find `.skymiles-landing-page-tracker__container__wrap__content` whose direct subheading is exactly `MILES AVAILABLE`.
- Read its descendant `.skymiles-landing-page-tracker__container__wrap__content__number`.
- Member number: `.skymiles-medallion-banner__details__container__right`, parsed only after the `SKYMILES #` label.

The labeled-container check is required because the number class also appears in Million Miler status. This excludes Medallion progress, Million Miler total, and award-pricing content. The authenticated page states that SkyMiles do not expire, so the popup displays `Expiration: N/A`.

The page calls authenticated Delta loyalty APIs, but those calls depend on authorization managed by Delta's application session. The adapter therefore reads the rendered balance instead of copying authorization data, intercepting private responses, or adding network permissions.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new Delta host permission.
- Refresh Delta SkyMiles from the popup and confirm the balance matches **Miles Available**.
- Confirm the popup member number matches the displayed SkyMiles number.
- Confirm the popup displays `Expiration: N/A`.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, selector, and synthetic regression fixtures are recorded in `src/programs.ts`, `src/adapters/delta.ts`, and `tests/adapters/adapters.test.ts`. No production markup, real member number, or private API response is stored in the repository.

## World of Hyatt acceptance — structure confirmed 07/24/2026

Confirmed account URL:

`https://www.hyatt.com/profile/en-US/account-overview`

Confirmed production structure:

- Exact balance label: `Current Point Balance`
- Displayed balance: the numeric sibling inside the label's parent container
- Responsive layout: the page renders multiple copies with the value either before or after the label; the adapter supports both orders and requires a numeric display element
- Member number: `[class*="MemberCard_memberInfoContainer__"] > .be-text-section-3`

The adapter ignores unrelated Base Points, promotion content, and form controls. Expiration displays `N/A` because this personal ledger is explicitly configured for the user's cardholder account. It does not infer cardholder status from generic card promotions on the Hyatt page.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new Hyatt host permission.
- Refresh World of Hyatt from the popup and confirm the balance matches `Current Point Balance`.
- Confirm the popup member number matches the displayed World of Hyatt number.
- Confirm Expiration displays `N/A`.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped traversal, and synthetic regression fixture are recorded in `src/programs.ts`, `src/adapters/hyatt.ts`, and `tests/adapters/adapters.test.ts`. No production markup or real member number is stored in the repository.

## Hilton Honors acceptance — structure confirmed 07/24/2026

Confirmed account URL:

`https://www.hilton.com/en/hilton-honors/guest/my-account/`

Confirmed production structure:

- Account points container: `[data-testid="pointsBlock"]`
- Total balance: `[data-testid="honorsPointsBlock"]`
- Policy text on the account page: points expire after 24 months of inactivity
- Hydrated member source: `guest.hhonors.hhonorsNumber`
- Visible member fallback: `[data-testid="honorsNumberBlock"]`, parsed only after `Hilton Honors #`

Hilton's hydrated account data exposes `hhonorsNumber`, `totalPointsFmt`, and `pointsExpiration`. The adapter reads those approved fields without relying on query-array position. Focused visible fallbacks remain for member number and balance; the broad member-info container is intentionally excluded because it can contain the member name.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new Hilton host permission.
- Refresh Hilton Honors and confirm the balance and personalized expiration match the account summary.
- Confirm the popup member number matches the displayed Hilton Honors number.
- Confirm Expiration displays `24 mo inactivity`.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped fields and selector fallback, and synthetic regression fixture are recorded in `src/programs.ts`, `src/adapters/hilton.ts`, and `tests/adapters/adapters.test.ts`. No production markup or real member number is stored in the repository.

## Marriott Bonvoy acceptance — structure confirmed 07/24/2026

Confirmed activity URL:

`https://www.marriott.com/loyalty/myAccount/activity.mi`

Confirmed production structure:

- Account summary root: `.member-status-outer-container`
- Balance: the scoped `h3` whose complete text is the numeric balance followed by `Points`
- Activity filter: `#dropdownactivity-filter`
- Selected filter label: `#dropdown-selected-valueactivity-filter`
- Qualifying filter option: `#option-9`, whose exact text is `All Qualifying`
- Activity rows: `[role="table"] [role="row"]`, with the posted date in the first `[role="cell"]`
- Hydrated member source: `props.pageProps.sessionData.cacheData.data.rewardsId`
- Hydrated fallback: `props.pageProps.dataLayer.data[0].mr_id`

The content script opens Marriott's custom filter and selects `All Qualifying` in two DOM stages before capture. The adapter reads only the two approved member-number fields from hydrated page data, then adds 24 months to the newest qualifying activity date. It does not retain raw page data or derive point expiration from reward-certificate dates, elite-status dates, unfiltered activity, or the extension refresh date.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new Marriott host permission.
- Refresh Marriott Bonvoy and confirm the filter switches to `All Qualifying` automatically.
- Confirm the balance matches the member-status point total.
- Confirm the popup member number matches the displayed Marriott Bonvoy number.
- Confirm Expiration is 24 months after the first displayed qualifying activity date.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped traversal, filter preparation, and synthetic regression fixtures are recorded in `src/programs.ts`, `src/adapters/marriott.ts`, `entrypoints/supported.content.ts`, and `tests/adapters/adapters.test.ts`. No production markup, transaction description, or real member number is stored in the repository.

## Completion gate

For each program, acceptance requires three consecutive successful flows:

1. Start from a normal signed-out session.
2. Sign in on the official website.
3. Allow the extension to open its inactive account-detail tab.
4. Compare the popup member number, balance, and expiration with the official rendered values.
5. Confirm the extension-created tab closes after success.
6. Confirm local storage contains only the versioned approved fields.

Automatic capture is not considered production-confirmed until this gate passes. Manual entry remains the supported fallback.
