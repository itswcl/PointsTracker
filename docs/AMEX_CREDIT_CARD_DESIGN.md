# Credit Card rewards category

## Understanding summary

- Add `Credit Card` as a third top-level ledger category.
- Display the category as the first popup column, followed by Airline and Hotel.
- Model each row as an issuer rewards program rather than an individual card.
- Add `Amex`, `Capital One`, `Chase`, `Citi`, and `Bilt` as balance-only
  program rows.
- Amex reads rendered `Available Points` at
  `https://global.americanexpress.com/rewards`.
- Capital One reads the rendered whole-number value paired with the exact
  `Miles` label at `https://myaccounts.capitalone.com/accountSummary`.
- Chase sums every rendered card balance at
  `https://ultimaterewardspoints.chase.com/account-selector`, but stores only the
  combined Ultimate Rewards total.
- Citi reads rendered `Total ThankYou® Points` at
  `https://online.citi.com/US/ag/dashboard/summary`.
- Bilt opens the points pill when needed and reads the exact rendered
  `Your Points` value at `https://www.bilt.com/rewards/neighborhood`.
- Credit Card rows display Program, Balance, and Actions, with balance sorting
  and a category total.
- Do not display or collect a member number, expiration, card number, card name,
  statement balance, or other account details.

## Assumptions and non-functional requirements

- The extension remains a single-user, local-only tool for a few dozen programs
  at most.
- Refresh continues to use one official account page and the existing
  extension-owned-tab capture flow.
- A failed refresh preserves the last saved value and retains manual balance
  editing.
- The extension does not collect credentials, cookies, tokens, private API
  authorization, card details, raw HTML, or transaction history.
- The popup can expand to approximately 800 pixels and use unequal category
  widths without reducing the current font sizes.
- Each transferable credit-card currency receives an isolated adapter.
- Credit Card balances may be signed because a rewards program can display a
  negative total; airline and hotel balance validation remains nonnegative.
- The category is included in the coordinated version 1.4.0 release after all
  four initially planned issuer adapters were completed. Capital One is a
  follow-up addition to the same balance-only category.

## Approaches considered

### Program capabilities — selected

Add typed display capabilities to each program definition so the UI knows
whether member-number and expiration fields apply. Amex disables both fields.
This keeps the existing normalized storage record while making the popup and
manual editor category-appropriate.

### Category-specific record types

Use a discriminated storage union for airline, hotel, and credit-card records.
This offers stronger theoretical domain modeling but requires a broader storage,
backup, messaging, form, and migration rewrite for one new balance-only program.

### Category-specific UI conditionals

Hardcode checks for the Credit Card category inside the popup. This is smaller
initially but couples field behavior to category names and becomes brittle when
future programs need different combinations of fields.

## Final design

Add a `credit_card` category with `amex`, `capitalone`, `chase`, `citi`, and
`bilt` program definitions and exact official account URLs.

Program definitions expose typed capabilities for member-number and expiration
visibility. Existing airline and hotel programs enable both. All five Credit
Card programs disable both, store `memberNumber: null`, and use an internal
unknown expiration placeholder that is not rendered or editable.

The popup uses three unequal columns in Credit Card, Airline, and Hotel order.
Airline and Hotel retain their program label, balance, last-four member suffix,
expiration, and actions. Credit Card uses a narrower program label, balance,
and actions ledger with balance-only sorting and its own total. The manual
editor shows only the selected Credit Card balance field.

Each adapter reads only allowlisted rendered HTML scoped to its exact account
label or control. Capital One pairs one whole-number value with the exact
`Miles` label and excludes the adjacent Rewards cash container. Chase
deduplicates responsive card rows before summing them; Citi rejects conflicting
responsive totals; Bilt clicks only the exact points pill and reads the exact
menu value. Promotional values, hidden duplicates, and form controls are
rejected. Login, verification, timeout, and missing-balance failures follow the
existing recovery behavior.

No private API host, cookie, token, network interception, raw HTML, card detail,
or transaction data is requested or stored.

## Testing strategy

- Capture positive and zero balances from all scoped totals, plus an exact
  negative Bilt balance.
- Verify Chase sums every rendered card balance without storing per-card data.
- Reject promotional point values and credential inputs.
- Detect login and verification states.
- Register the Credit Card category and all five adapters.
- Normalize older state and backups with empty records for all five programs.
- Verify exact webpage access and unchanged credential-adjacent
  permissions.
- Verify the three-column popup, Credit Card total, balance sorting, and
  balance-only edit form.
- Run the full `npm run check` gate and inspect the built manifest.

## Decision log

| Decision | Alternatives considered | Reason |
| --- | --- | --- |
| Represent rewards programs, not cards | One row per physical card | Avoids duplicate Membership Rewards balances and collecting card details |
| Use typed program capabilities | Category-specific records or UI conditionals | Reuses the stable storage model while remaining extensible |
| Use three unequal popup columns | Stack Credit Card below or use equal columns | Matches the requested layout while reserving more space for detailed loyalty rows |
| Keep current font sizes | Compress all typography | Preserves the approved readability |
| Store hidden null/unknown placeholders | Add a new storage union immediately | Avoids an unnecessary schema migration for a balance-only program |
| Use rendered Available Points HTML | Private account API | Preserves the local-only credential boundary |
| Permit signed balances only for Credit Card rows | Reject every negative balance | Preserves a live issuer value without weakening airline or hotel validation |
| Store only Chase's combined total | Store one balance per card | Meets the ledger goal without collecting card-level data |
| Coordinate one version 1.4.0 release | Publish each issuer separately | Keeps all four planned issuer adapters and their shared UI changes in one tested release |
