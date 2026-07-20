# Implementation Plan

## Approach

Build the approved MVP as a Vite/CRXJS-powered Manifest V3 extension with a React popup, native extension storage and messaging, and one isolated adapter per loyalty program. Keep parsing, data validation, and persistence in pure JavaScript modules so they can be tested without a live account.

## Scope

- In: United MileagePlus, Cathay Asia Miles, Air France Flying Blue, Virgin Atlantic Flying Club, Alaska Airlines Atmos Rewards, American AAdvantage, EVA Air Infinity MileageLands, British Airways Club, ANA Mileage Club, World of Hyatt, Hilton Honors, Marriott Bonvoy, automatic tab-driven capture, manual overrides, local storage, JSON backup, compact popup, failure recovery, tests, and unpacked installation.
- Out: credentials, cookies, network interception, cloud services, alerts, recommendations, transaction history, P2, and Chrome Web Store publishing.

## Action Items

- [x] Select Vite, CRXJS, React, JavaScript, Node, and Vitest as the initial toolchain.
- [x] Scaffold the Manifest V3 entrypoints and exact host permissions.
- [x] Implement versioned records, validation, manual overrides, and JSON import/export.
- [x] Implement the capture coordinator with owned-tab tracking, cooldowns, and timeouts.
- [x] Implement United, Cathay, Air France, Virgin Atlantic, Alaska Airlines, American Airlines, EVA Air, British Airways, ANA, Hyatt, Hilton, and Marriott adapters behind a shared parser contract.
- [x] Build the title-free two-column popup, separate airline and hotel displayed-balance totals, editing, refresh, and backup interactions.
- [x] Add adapter, domain, storage, coordinator, privacy, and UI tests.
- [x] Run lint, tests, production build, and manifest/package inspection.
- [x] Document local installation and live adapter-discovery acceptance steps.

## Open Questions

- Cathay's account URL and production selectors were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- United's production balance selector was confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- Air France Flying Blue's production balance and expiration selectors were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- Virgin Atlantic Flying Club's production homepage balance selector was confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- Alaska Airlines' production homepage shadow-root balance path was confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- American AAdvantage's production account-summary balance and expiration-message selectors were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- EVA Air's production self-award balance and expiring-mileage table structure were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- British Airways' production Avios balance and newest statement-month structure were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- ANA's production total balance and latest-activity expiry-month structure were confirmed live on 07/17/2026; the rebuilt extension still needs the end-to-end reload check.
- World of Hyatt's production `Current Point Balance` structure was confirmed live on 07/18/2026; the rebuilt extension still needs the end-to-end reload check.
- Hilton Honors' hydrated `totalPointsFmt` and `pointsExpiration` fields, visible balance fallback, and 24-month inactivity fallback were confirmed live on 07/19/2026.
- Marriott Bonvoy's production balance, custom `All Qualifying` filter, and newest activity-row date were confirmed live on 07/19/2026; the rebuilt extension still needs the end-to-end reload check.

These are environment-dependent acceptance tasks, not reasons to broaden permissions or store page snapshots.

## Next Adapters

Add and validate these programs one at a time against their rendered authenticated account pages:

1. Singapore Airlines KrisFlyer
