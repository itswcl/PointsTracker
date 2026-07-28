# Implementation Plan

## Approach

Build the approved MVP as a Vite/CRXJS-powered Manifest V3 extension with a React popup, native extension storage and messaging, and one isolated adapter per loyalty program. Keep parsing, data validation, and persistence in strict TypeScript modules so they can be tested without a live account.

## Scope

- In: United MileagePlus miles, pooled miles, and TravelBank; Southwest Rapid Rewards points and Flight Credits; Cathay Asia Miles; Air France Flying Blue; Virgin Atlantic Flying Club; Alaska Airlines Atmos Rewards; American AAdvantage; EVA Air Infinity MileageLands; British Airways Club; ANA Mileage Club; Singapore Airlines KrisFlyer; Delta SkyMiles; World of Hyatt; Hilton Honors; Marriott Bonvoy; IHG One Rewards; Wyndham Rewards; Choice Privileges; Leading Hotels of the World Leaders Club; American Express Membership Rewards; Capital One Miles; Chase Ultimate Rewards; Citi ThankYou Rewards; Bilt Rewards; automatic account-page balance capture; member-number/expiration capture where applicable; manual overrides; per-program visibility settings; local storage; JSON backup; compact popup; failure recovery; tests; and unpacked installation.
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
- [x] Protect manual values from passive capture and require confirmation before
  an explicit refresh can replace them after a complete successful capture.
- [x] Implement all twenty-seven airline, hotel, and Credit Card row adapters behind a shared parser contract.
- [x] Build the title-free three-column popup with full airline/hotel rows, balance-only Credit Card rows, separate category totals, editing, refresh, sorting, and backup interactions.
- [x] Add adapter, domain, storage, coordinator, privacy, and UI tests.
- [x] Run lint, tests, production build, and manifest/package inspection.
- [x] Document local installation and live adapter-discovery acceptance steps.

## Open Questions

- Cathay's account URL and production selectors were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- United's production MileagePlus, pooled-miles, and TravelBank rendered structures were confirmed live; the rebuilt extension still needs the end-to-end reload check.
- Air France Flying Blue's production balance, expiration, and membership-card selectors were confirmed live; the rebuilt extension still needs the end-to-end reload check.
- Virgin Atlantic Flying Club's production account-overview balance and member-number selectors were confirmed live; the rebuilt extension still needs the end-to-end reload check.
- Alaska Airlines' production homepage shadow-root balance path was confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- American AAdvantage's production account-summary balance and expiration-message selectors were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- EVA Air's production self-award balance and expiring-mileage table structure were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- British Airways' production Avios balance and newest statement-month structure were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- ANA's production total balance and latest-activity expiry-month structure were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- Singapore Airlines KrisFlyer's production account-header balance and member-number structures plus the Miles validity empty state were confirmed live on 07/28/2026; the available account has zero miles, so a non-zero expiring tranche still needs live acceptance.
- Delta SkyMiles' production overview balance selector and no-expiration status were confirmed live on 07/23/2026; the rebuilt extension still needs the end-to-end reload check.
- Southwest's production Available Points, member-number, and expanded Flight Credit structures were confirmed live on 07/26/2026; the rebuilt extension still needs the end-to-end reload check.
- World of Hyatt's production `Current Point Balance` structure was confirmed live on 07/18/2026; the rebuilt extension still needs the end-to-end reload check.
- Hilton Honors' hydrated `totalPointsFmt` and `pointsExpiration` fields, visible balance fallback, and 24-month inactivity fallback were confirmed live on 07/19/2026.
- Marriott Bonvoy's production balance, custom `All Qualifying` filter, and newest activity-row date were confirmed live on 07/19/2026; the rebuilt extension still needs the end-to-end reload check.
- IHG One Rewards' production balance, member number, and exact Elite-tier marker were confirmed live on 07/25/2026; the rebuilt extension still needs the end-to-end reload check.
- Wyndham Rewards' production balance, member-number, and no-recent-activity selectors were confirmed live on 07/25/2026; the account page does not display a personal expiration date or Premier-card exemption.
- Choice Privileges' production balance, member-number, status, and Points History structures were confirmed live on 07/28/2026; the available account has zero points and no activity, so dated activity and active Elite fixtures still need live acceptance.
- Leading Hotels of the World's production balance, member-ID, activity-table, and empty-activity structures were confirmed live on 07/28/2026; the available account has zero points and no activity, so a dated activity row still needs live acceptance.
- American Express Membership Rewards' rendered `Available Points` block was confirmed live on 07/25/2026.
- Capital One's rendered `.primary-detail__balances-container` structure and exact `Miles` label were confirmed live; signed balances split across sign and digit elements are supported, while neighboring Rewards cash is excluded.
- Chase Ultimate Rewards' complete account-selector card list and per-row `Available Points` labels were confirmed live on 07/25/2026; only the combined total is stored.
- Citi ThankYou Rewards' rendered `Total ThankYou® Points` block was confirmed live on 07/25/2026.
- Bilt Rewards' top-right points pill and exact `Your Points` menu value were confirmed live on 07/25/2026; the menu may require one preparatory click.

Member-number selectors or approved hydrated fields for all eighteen airline and hotel programs were confirmed live by 07/28/2026. The five Credit Card rows intentionally do not collect member numbers or expiration data. Flying Blue, British Airways, and ANA require the same-tab secondary-page path. The rebuilt extension still needs the final end-to-end reload check.

## Next Adapters

No additional adapter is currently queued.
