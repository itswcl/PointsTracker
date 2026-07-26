# IHG One Rewards adapter

## Understanding summary

- Add IHG One Rewards as a hotel program using the authenticated account-home page.
- Capture the displayed points balance and member number.
- Display expiration as `N/A` only when the account page proves the profile is
  an active IHG One Rewards Elite member.
- Preserve the existing local-only privacy boundary.
- Do not copy private authorization, inspect cookies, intercept requests, or add
  access to IHG's private API host.
- Preserve the last saved value and manual fallback when required page evidence
  is unavailable.
- Keep the work local until the user finishes adding programs, then include it
  in the coordinated version 1.4.0 release.

## Assumptions

- The adapter serves the current single-user Elite cardholder profile.
- The confirmed `data-testid` attributes are the most stable rendered-page
  contracts currently available.
- Future Club-level profiles must not inherit the current profile's
  non-expiration status.
- Existing backup normalization will create an empty IHG record when importing
  backups that predate IHG support.
- Versioning, GitHub publishing, and packaging are handled by the coordinated
  version 1.4.0 release after the remaining planned programs are complete.

## Investigation evidence

The authenticated account page exposes these rendered-page contracts:

- Balance: `[data-testid="pointsToRedeemSID"]`
- Member number: `[data-testid="memberNumberSID"]`
- Elite proof: `.header-member-level-name`, with exact rendered text for the
  active Silver, Gold, Platinum, or Diamond Elite tier
- Program rows: `[data-testid="memberProgram0SID"]` and
  `[data-testid="memberProgram1SID"]`

The live page contains more than one `.header-member-program` element: Business
Rewards appears before the credit cardmember row. More importantly, IHG's
current point-expiration rule is tied to maintained Elite status, so neither
program row is used as non-expiration proof.

The page's public configuration identifies private account endpoints on
`apis.ihg.com`. A credential-free account request returned `403`, so those
endpoints are not an approved data source for this extension.

## Final design

Register `ihg` as a hotel program with display name `IHG`, account and login URL
`https://www.ihg.com/rewardsclub/us/en/account-mgmt/home`, and exact webpage
host access to `https://www.ihg.com/*`.

The adapter reads only allowed rendered elements. When it finds a valid balance
and an allowlisted exact Elite-tier marker, it captures the member number and returns a
successful record whose expiration type is `never` and whose displayed value is
`N/A`.

If the balance is present but Elite proof is absent, the adapter returns
`expiration_not_found` rather than making a general claim about IHG points.
Login, verification, and missing-balance states use the established shared
adapter safeguards.

No `apis.ihg.com` permission or content script is added. No API response,
credential, cookie, token, raw HTML, or transaction history is stored.

## Testing

- Capture balance, member number, and `N/A` with visible Elite proof
- Reject expiration when Elite proof is absent
- Reject generic credit cardmember and Club-level text as non-expiration proof
- Never read matching credential-input values
- Detect login and verification states
- Register IHG in the hotel program list and adapter map
- Normalize older state and backups with an empty IHG row
- Add only the exact IHG webpage host to the manifest and content-script list
- Update the program lists and privacy/installation documentation
- Run the complete `npm run check` gate and inspect the built manifest

## Decision log

| Decision | Alternatives considered | Reason |
| --- | --- | --- |
| Use rendered account-page HTML | Private account API | The credential-free API request was rejected and private authorization is outside the privacy boundary |
| Require exact Elite proof for `N/A` | Cardmember label or always show `N/A` | Matches IHG's current expiration rule and avoids a false claim for Club profiles |
| Return `expiration_not_found` without proof | Derive a date from account activity | Keeps the MVP focused on the current cardholder profile |
| Add only `www.ihg.com` webpage access | Add `apis.ihg.com` | The API host is unnecessary for the approved rendered-page adapter |
| Coordinate one version 1.4.0 release | Publish IHG immediately | Keeps the planned hotel and issuer additions in one tested release |
