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

## United acceptance — MileagePlus selector confirmed 07/17/2026; shared rows added 07/26/2026

Configured official page:

`https://www.united.com/en/us/myunited`

Confirmed production selectors, newest first:

- `[class*="MileageBalance__milesContainer"] [class*="MileageBalance__totalMiles"]`
- `[aria-labelledby="accountBalanceAriaLabel"] [data-test-name="balance_value"]`
- Member number: `[class*="AccountSummary-accountSummary__mpNumber"]`, parsed only after the exact `MileagePlus Number` label

Additional rendered targets:

- Pooled miles: a unique whole-number value immediately followed by the exact
  text `pooled miles` in the authenticated United header.
- TravelBank: the exact `TRAVELBANK` summary heading and its exact dollar total.
  Displayed dates within TravelBank summary/detail containers are normalized and
  the earliest date is stored.

The primary balance selector is scoped to the My United MileageBalance component. The second supports the earlier accessible Account balance list. The member-number selector is scoped to the labeled Account details row. Together they exclude pooled miles in the account header and lifetime miles in Premier progress.

United's balance endpoint requires a bearer authorization header managed by the page. Because the extension must never read or copy credentials or authorization tokens, United is an explicit rendered-HTML fallback rather than an API capture.

Remaining end-to-end checks:

- A normal United login reaches or can access the configured page.
- The parser returns the same integer shown on the page after the rebuilt extension is reloaded.
- The popup member number matches the displayed MileagePlus number.
- `UA Miles` and `UA Pool` display `Expiration: N/A`.
- All three United rows display the same MileagePlus member number.
- `UA TB` displays USD with cents, uses the earliest displayed expiration when
  available, and remains excluded from the Airline points total.
- An expired session reveals the login tab and preserves the last good value.

The selectors and synthetic regression fixtures are recorded in
`src/adapters/united.ts`, `src/adapters/unitedpool.ts`,
`src/adapters/unitedtravelbank.ts`, and their adapter tests. No production
markup or real member number is stored in the repository.

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

## Singapore Airlines KrisFlyer acceptance — header and empty state confirmed 07/28/2026

Confirmed account URLs:

- Miles validity:
  `https://www.singaporeair.com/krisflyer/miles/expiring-miles/`
- Statements:
  `https://www.singaporeair.com/krisflyer/miles/statements/`

Confirmed production structure:

- Member number: the rendered KrisFlyer membership line in the account masthead
- Balance: the rendered masthead value ending in `KrisFlyer Miles`
- Validity root: `#typeInfoText`
- Validity heading: `#typeInfoTextTitle`, rendered as `Miles validity`
- Empty state: the page explicitly reports when no KrisFlyer miles expire in
  the next six months

The available account has zero miles, so the balance, member-number, loading,
and empty-validity states are confirmed live. The adapter waits for the Miles
validity section before saving and displays `N/A` when no tranche is shown. A
non-zero fixture verifies that the earliest rendered tranche is stored with its
amount and month, then displayed as `amount · MM/YYYY`, but that row structure
still needs live acceptance on an account with expiring miles. Active PPS Club
status displays `N/A` because miles do not expire while that status remains
active.

Singapore Airlines states that KrisFlyer miles generally expire at the end of
the equivalent earning month after three years, while PPS Club miles do not
expire during active PPS membership. A first expiry can be extended for six
months for a Basic member or twelve months for an Elite member. Points Tracker
does not calculate or extend dates; it records the current tranche rendered by
Singapore Airlines. See the
[official KrisFlyer terms](https://www.singaporeair.com/en_UK/br/ppsclub-krisflyer/termsconditions-kf/).

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the Singapore Airlines host
  permission.
- Refresh Singapore and confirm the balance and last-four member-number suffix
  match the account masthead.
- On an account with expiring miles, confirm the ledger matches the earliest
  amount and month shown under Miles validity.
- Confirm a zero-mile or no-tranche account displays `N/A`.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, scoped traversal, and synthetic regression fixtures are recorded
in `src/programs.ts`, `src/adapters/krisflyer.ts`, and
`tests/adapters/krisflyer.test.ts`. No production markup, account activity, or
real member number is stored in the repository.

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

## Southwest Rapid Rewards acceptance — structure confirmed 07/26/2026

Confirmed official page:

`https://www.southwest.com/loyalty/myaccount/`

Confirmed rendered structure:

- Points are read only from the exact `Available Points` labeled container.
- Member number is parsed only from the rendered `.accountNumber` element after
  the exact `RR#` prefix.
- Flight Credits are scoped to `#my-flight-credits-card` and its real
  `ul > li` entries.
- The adapter selects the unique exact `Expand all` button when expiration
  details have not rendered.
- Each entry begins with an amount announced as `<amount> Dollars`; the adapter
  sums those amounts locally as integer cents.
- The earliest parseable date is stored. If every entry says
  `Expiration: None` or no expiration detail is displayed, the row displays
  `N/A`.

End-to-end check:

- Reload the rebuilt extension and approve the new Southwest host permission.
- Refresh either Southwest row and confirm only one account tab opens.
- Confirm `Southwest` matches the rendered points total and shows `N/A`.
- Confirm `SW Credit` matches the sum of the rendered credits, displays a dollar
  sign and cents, and does not change the Airline points total.
- Confirm both Southwest rows display the same Rapid Rewards member number.
- Confirm no individual Flight Credit record appears in storage or a backup.

The URL, scoped traversal, preparer, and synthetic regression fixtures are
recorded in `src/programs.ts`, `src/adapters/southwest.ts`,
`src/adapters/southwestcredit.ts`, and their adapter tests. No production
markup, real member number, or individual credit detail is stored in the
repository.

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

## IHG One Rewards acceptance — structure confirmed 07/25/2026

Confirmed account URL:

`https://www.ihg.com/rewardsclub/us/en/account-mgmt/home`

Confirmed production structure:

- Balance: `[data-testid="pointsToRedeemSID"]`
- Member number: `[data-testid="memberNumberSID"]`
- Account marker: `[data-testid="yourPointsLabelSID"]`
- Elite-status proof: `.header-member-level-name`, allowlisted only for exact Silver, Gold, Platinum, or Diamond Elite Member text
- Additional rendered program rows: `[data-testid="memberProgram0SID"]` and `[data-testid="memberProgram1SID"]`

The adapter reads only the rendered account page. It displays expiration as
`N/A` only when an exact active Elite-tier marker is present; if the balance is
available without that proof, it preserves the saved record and reports that
expiration details were not found. The generic credit cardmember and Business
Rewards program rows are not treated as non-expiration proof. A credential-free
account API request was rejected, so the private API host is not requested or
used.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new IHG host permission.
- Refresh IHG One Rewards and confirm the balance and member number match the account page.
- Confirm Expiration displays `N/A` only while an allowlisted active Elite-tier label is present.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, selectors, and synthetic regression fixtures are recorded in
`src/programs.ts`, `src/adapters/ihg.ts`, and
`tests/adapters/ihg.test.ts`. No production markup, real member number, private
API response, cookie, or authorization data is stored in the repository.

## Wyndham Rewards acceptance — structure confirmed 07/25/2026

Confirmed activity URL:

`https://www.wyndhamhotels.com/wyndham-rewards/my-account/activity`

Confirmed production structure:

- Balance: `.details-points.member-level-color` with the exact text form `You have {number} points`
- Member number: `.img-container .text-number`
- Member-number fallback: `.details-number.member-attribute`
- Empty state: `.no-activity .no-activity-headline.headline-g` with the exact text `You have no recent activity.`

The account block does not display a personal expiration date or a Wyndham
Rewards Earner Premier exemption. When the rendered balance is exactly zero and
the exact empty-state marker is also present, Expiration displays `N/A` because
there are no points to expire. A positive balance displays `18 mo inactivity`
and retains the separate four-year per-point rule in the record note, even if
the activity table is empty. The adapter does not interpret the unrelated
credit-card promotion as proof of a cardholder exemption. No credential-free
account API was identified, so the adapter uses rendered HTML only.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new Wyndham host permission.
- Refresh Wyndham Rewards and confirm the balance matches the `You have … points` value.
- Confirm the popup member number matches the displayed Wyndham Rewards number.
- With zero points and the exact empty state, confirm Expiration displays `N/A`.
- With a positive balance, confirm Expiration displays `18 mo inactivity`.
- Confirm the extension-created tab closes after capture succeeds.

The final URL, selectors, and synthetic regression fixtures are recorded in
`src/programs.ts`, `src/adapters/wyndham.ts`, and
`tests/adapters/wyndham.test.ts`. No production markup, real member number,
cookie, token, or network response is stored in the repository.

## Choice Privileges acceptance — structure confirmed 07/28/2026

Confirmed account URL:

`https://www.choicehotels.com/choice-privileges/account`

Confirmed production structure:

- Account scope: `div.cp-member-info-card.choice`
- Balance scope: `.cp-member-info-card.choice .points-container`
- Balance candidate: a scoped `div` whose normalized text is exactly
  `{number} points`
- Member number: `.cp-member-info-card.choice p.member-number`
- Active tier only:
  `.cp-member-info-card.choice .member-tier-ribbon.choice span.membership-tier`
- History trigger:
  `button#myStaysActivityModalBtn.choice-button.text_link_dark` with exact text
  `See points history`
- History dialogs: `My stay & points statement` and `My statements`
- Qualifying tables: accessibility names `Points earned` and
  `Points redeemed`
- Confirmed empty states: `No points earned for this time period.` and
  `No points redeemed for this time period.`

The adapter deliberately ignores `.member-level-label`, which displays
progress labels for Member, Gold, Platinum, Diamond, and Titanium rather than
the account's active tier. Active Gold, Platinum, Diamond, or Titanium status
displays `N/A`. A non-elite account adds 18 months to the newest exact date
rendered inside the Points earned or Points redeemed tables. The confirmed
account has zero points and no activity, so it displays `N/A` because there are
no points to expire. A positive balance without a rendered activity date keeps
the 18-month inactivity policy without inventing a date.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the Choice host permission.
- Refresh Choice and confirm the ledger matches the account-card balance and
  displayed member number.
- With an active Elite account, confirm Expiration displays `N/A`.
- With a dated earn or redeem row, confirm Expiration is 18 months after the
  newest qualifying activity.

## Leading Hotels of the World acceptance — structure confirmed 07/28/2026

Confirmed Points Activity URL:

`https://www.lhw.com/account/points-activity`

Confirmed production structure:

- Balance: `#point-counter`
- Account proof: `#rewardsActivityApp` or `section.reward-activity`
- Activity rows: `#rewardsActivityApp .reward-list-table tbody tr`
- Activity date: the first exact date cell in each scoped activity row
- Member ID when rendered: `.col.user-info` containing `Member ID …`

The adapter adds 24 months to the newest exact activity date and never uses the
extension refresh date as activity. The confirmed account has zero points and
no activity, so the popup displays `N/A` because there are no points to expire.
A positive balance without a rendered activity date keeps the 24-month
inactivity policy without inventing a date. The account menu's confirmed
trigger has a personalized accessible label, so the content script does not click it automatically;
member ID is captured only when the allowlisted `.col.user-info` markup is
already rendered, with manual correction remaining available.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the LHW host permission.
- Refresh LHW and confirm the ledger matches `#point-counter`.
- With a dated activity row, confirm Expiration is 24 months after the newest
  qualifying activity.
- Confirm member ID is captured when the account menu markup is rendered.

## American Express Membership Rewards acceptance — structure confirmed 07/25/2026

Confirmed rewards URL:

`https://global.americanexpress.com/rewards`

Confirmed production structure:

- Desktop label: `#available-header-lg` containing exact text `Available Points`
- Desktop scope: nearest `[data-testid="desktop-tile"]`
- Desktop amount: `p.heading-sans-medium-bold.color-text-emphasis`
- Responsive label: `#available-header-md-sm` containing exact text `Available Points`
- Responsive scope: nearest `[data-testid="small-tile"]`
- Responsive amount: `p.heading-sans-medium-bold`

The adapter reads only the balance inside the exact Available Points tile. It
does not read card details, promotional offers, form controls, member numbers,
or expiration data.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new Amex host permission.
- Refresh Amex and confirm the ledger matches the rendered Available Points total.
- Confirm only Program, Balance, and Actions appear in the Credit Card row.

## Capital One Miles acceptance — structure confirmed 07/25/2026

Confirmed account-summary URL:

`https://myaccounts.capitalone.com/accountSummary`

Confirmed production structure:

- Rewards scope: `.primary-detail__balances`
- Balance rows: `.primary-detail__balances-container`
- Signed whole-number value:
  `.primary-detail__balances-number-container`; Capital One may render the
  minus sign and digits in separate child elements
- Exact currency label: `.labels` with `Miles`
- Excluded neighboring row: `.labels` with `Rewards cash`

The adapter accepts one consistent signed whole-number balance paired with the exact
Miles label. It rejects Rewards cash, promotional miles, form controls, and
conflicting duplicate Miles rows. It does not collect a member number,
expiration, card details, account identifiers, or transaction data.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new Capital One host permission.
- Refresh Capital One and confirm the ledger matches the rendered Miles total.
- Confirm Rewards cash and card-level information do not appear in storage,
  export, or the popup.

## Chase Ultimate Rewards acceptance — structure confirmed 07/25/2026

Confirmed account-selector URL:

`https://ultimaterewardspoints.chase.com/account-selector`

Confirmed production structure:

- Rewards list host: `mds-list.mds-list--cmb[list-type="navigational"]`
- Card rows inside the open shadow root: `li.list-item--navigational`
- Balance elements: `.list-item__description.list-item__description--subdued`
- Exact balance text: `Available Points: {number} pts`

The adapter traverses only open shadow roots, sums one exact balance for every
rendered card row, ignores hidden responsive lists, and accepts multiple
rendered list copies only when their totals agree. Missing or conflicting card
rows fail closed. Only the combined Ultimate Rewards total is stored; card
names, partial card numbers, links, and per-card balances are not retained.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new Chase host permission.
- Refresh Chase and compare the ledger total with the sum of every visible card balance.
- Confirm no card-level information appears in storage, export, or the popup.

## Citi ThankYou Rewards acceptance — structure confirmed 07/25/2026

Confirmed dashboard URL:

`https://online.citi.com/US/ag/dashboard/summary`

Confirmed production structure:

- Rewards scope: `.reward-wrapper.clubbed-wrapper`
- Exact heading: `.reward-heading[role="heading"]` with `Total ThankYou® Points`
- Amount scope: `.reward-amount`

The adapter accepts one consistent whole-number total across rendered responsive
copies and rejects conflicting totals, unrelated point offers, editable fields,
and account details.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new Citi host permission.
- Refresh Citi and confirm the ledger matches Total ThankYou Points.
- Confirm only the combined program balance is stored.

## Bilt Rewards acceptance — structure confirmed 07/25/2026

Confirmed rewards URL:

`https://www.bilt.com/rewards/neighborhood`

Confirmed production structure:

- Points control: `button[data-testid="user-info-points-pill"]`
- Exact balance scope: rendered `[role="menu"]`
- Exact label: `Your Points`
- Exact amount: the label's signed whole-number next sibling

The content script clicks the single rendered points pill only when the exact
menu is not already available. The adapter ignores rounded pill text when it
cannot prove an exact whole-number balance, rejects hidden or conflicting
copies, and accepts a signed Bilt balance. Signed values remain restricted to
the Credit Card category.

Remaining end-to-end checks:

- Reload the rebuilt extension and approve the new Bilt host permission.
- Refresh Bilt and confirm the ledger matches the exact Your Points menu value.
- Confirm a negative displayed value remains negative in the row, category total, manual editor, backup, and restore flow.

All five Credit Card adapters use rendered, allowlisted page content only. No
private account API, credential, cookie, authorization token, raw HTML, card
detail, or transaction data is requested or stored.

## Completion gate

For each program, acceptance requires three consecutive successful flows:

1. Start from a normal signed-out session.
2. Sign in on the official website.
3. Allow the extension to open its inactive account-detail tab.
4. Compare the popup member number, balance, and expiration with the official rendered values.
5. Confirm the extension-created tab closes after success.
6. Confirm local storage contains only the versioned approved fields.

Automatic capture is not considered production-confirmed until this gate passes. Manual entry remains the supported fallback.
