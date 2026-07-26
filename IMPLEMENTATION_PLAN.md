# Implementation Plan

## Approach

Build the approved MVP as a Vite/CRXJS-powered Manifest V3 extension with a React popup, native extension storage and messaging, and one isolated adapter per loyalty program. Keep parsing, data validation, and persistence in strict TypeScript modules so they can be tested without a live account.

## Scope

- In: United MileagePlus, Cathay Asia Miles, Air France Flying Blue, Virgin Atlantic Flying Club, Alaska Airlines Atmos Rewards, American AAdvantage, EVA Air Infinity MileageLands, British Airways Club, ANA Mileage Club, Delta SkyMiles, World of Hyatt, Hilton Honors, Marriott Bonvoy, IHG One Rewards, Wyndham Rewards, American Express Membership Rewards, Capital One Miles, Chase Ultimate Rewards, Citi ThankYou Rewards, Bilt Rewards, automatic account-page balance capture, member-number/expiration capture where applicable, manual overrides, local storage, JSON backup, compact popup, failure recovery, tests, and unpacked installation.
- Out: credentials, cookies, network interception, cloud services, alerts, recommendations, transaction history, P2, and Chrome Web Store publishing.

## Action Items

- [x] Select Vite, CRXJS, React, TypeScript, Node, and Vitest as the maintained toolchain.
- [x] Enforce strict TypeScript validation across runtime code, adapters, configuration, and tests through `npm run typecheck` and `npm run check`.
- [x] Scaffold the Manifest V3 entrypoints and exact host permissions.
- [x] Implement versioned records, validation, manual overrides, and JSON import/export.
- [x] Add backward-compatible loyalty member-number records and manual editing without collecting credentials or member names.
- [x] Implement the capture coordinator with owned-tab tracking, cooldowns, and timeouts.
- [x] Reveal login-required refresh tabs immediately and extend only their observation window to three minutes.
- [x] Reuse the same extension-owned tab for split account data on Flying Blue, British Airways, and ANA, preserving the primary balance and expiration before navigating to the member-number page.
- [x] Implement all twenty airline, hotel, and Credit Card adapters behind a shared parser contract.
- [x] Build the title-free three-column popup with full airline/hotel rows, balance-only Credit Card rows, separate category totals, editing, refresh, sorting, and backup interactions.
- [x] Add adapter, domain, storage, coordinator, privacy, and UI tests.
- [x] Run lint, tests, production build, and manifest/package inspection.
- [x] Document local installation and live adapter-discovery acceptance steps.

## Open Questions

- Cathay's account URL and production selectors were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- United's production balance selector was confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- Air France Flying Blue's production balance, expiration, and membership-card selectors were confirmed live; the rebuilt extension still needs the end-to-end reload check.
- Virgin Atlantic Flying Club's production account-overview balance and member-number selectors were confirmed live; the rebuilt extension still needs the end-to-end reload check.
- Alaska Airlines' production homepage shadow-root balance path was confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- American AAdvantage's production account-summary balance and expiration-message selectors were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- EVA Air's production self-award balance and expiring-mileage table structure were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- British Airways' production Avios balance and newest statement-month structure were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- ANA's production total balance and latest-activity expiry-month structure were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- Delta SkyMiles' production overview balance selector and no-expiration status were confirmed live on 07/23/2026; the rebuilt extension still needs the end-to-end reload check.
- World of Hyatt's production `Current Point Balance` structure was confirmed live on 07/18/2026; the rebuilt extension still needs the end-to-end reload check.
- Hilton Honors' hydrated `totalPointsFmt` and `pointsExpiration` fields, visible balance fallback, and 24-month inactivity fallback were confirmed live on 07/19/2026.
- Marriott Bonvoy's production balance, custom `All Qualifying` filter, and newest activity-row date were confirmed live on 07/19/2026; the rebuilt extension still needs the end-to-end reload check.
- IHG One Rewards' production balance, member number, and exact Elite-tier marker were confirmed live on 07/25/2026; the rebuilt extension still needs the end-to-end reload check.
- Wyndham Rewards' production balance, member-number, and no-recent-activity selectors were confirmed live on 07/25/2026; the account page does not display a personal expiration date or Premier-card exemption.
- American Express Membership Rewards' rendered `Available Points` block was confirmed live on 07/25/2026.
- Capital One's rendered `.primary-detail__balances-container` structure and exact `Miles` label were confirmed live on 07/25/2026; neighboring Rewards cash is excluded.
- Chase Ultimate Rewards' complete account-selector card list and per-row `Available Points` labels were confirmed live on 07/25/2026; only the combined total is stored.
- Citi ThankYou Rewards' rendered `Total ThankYou® Points` block was confirmed live on 07/25/2026.
- Bilt Rewards' top-right points pill and exact `Your Points` menu value were confirmed live on 07/25/2026; the menu may require one preparatory click.

Member-number selectors or approved hydrated fields for all fifteen airline and hotel programs were confirmed live by 07/25/2026. The five Credit Card rows intentionally do not collect member numbers or expiration data. Flying Blue, British Airways, and ANA require the same-tab secondary-page path. The rebuilt extension still needs the final end-to-end reload check.

## Next Adapters

Add and validate these programs one at a time against their rendered authenticated account pages:

1. Singapore Airlines KrisFlyer
