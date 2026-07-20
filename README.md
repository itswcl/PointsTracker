# Points Tracker

A local-only Chrome extension for viewing airline and hotel loyalty balances and expiration information in one compact two-column popup. Supported programs include United MileagePlus, Cathay Asia Miles, Air France Flying Blue, Virgin Atlantic Flying Club, Alaska Airlines Atmos Rewards, American AAdvantage, EVA Air Infinity MileageLands, British Airways Club, ANA Mileage Club, World of Hyatt, Hilton Honors, and Marriott Bonvoy.

The extension never asks for or stores usernames, passwords, cookies, account numbers, or transaction history. Data is stored only in the current Chrome profile.

## Independent project

Points Tracker is an independent project and is not affiliated with or endorsed by any supported airline, hotel, or loyalty program. All airline, hotel, and loyalty-program names and marks belong to their respective owners and are used only to identify the programs supported by the extension.

## Development

Requirements: Node.js 22 or newer and Chrome.

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run check
```

Load `dist` from `chrome://extensions` with Developer mode enabled.

Detailed setup and usage are in [docs/INSTALLATION.md](./docs/INSTALLATION.md).

The program-name and original-artwork boundary is documented in [docs/BRAND_ASSETS.md](./docs/BRAND_ASSETS.md).

The Chrome toolbar uses the bundled Point Ledger icon from `assets/icons` instead of Chrome's generated letter placeholder.

See [MVP_DESIGN.md](./MVP_DESIGN.md) for the approved design and [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the delivery sequence.

Chrome Web Store and public-repository readiness are tracked in [docs/CHROME_WEB_STORE_CHECKLIST.md](./docs/CHROME_WEB_STORE_CHECKLIST.md). Draft store-listing copy is in [docs/STORE_LISTING_DRAFT.md](./docs/STORE_LISTING_DRAFT.md).

## Privacy boundary

- Exact host access only for United, Cathay, Air France, Virgin Atlantic, Alaska Airlines, American Airlines, EVA Air, British Airways, ANA, Hyatt, Hilton, and Marriott
- No cookie, password, history, or network interception permissions
- No backend, analytics, or data uploads
- No raw account-page HTML stored
- Plain local JSON backup contains balances and dates only

## Implementation status

- React popup, local records, separate airline and hotel balance totals, manual overrides, import/export, capture coordination, and privacy safeguards are implemented.
- United, Cathay, Air France, Virgin Atlantic, Alaska Airlines, American Airlines, EVA Air, British Airways, ANA, Hyatt, Hilton, and Marriott adapters have tested parser contracts.
- United's My United account URL and production balance selector are confirmed.
- Cathay's authenticated account URL and production selectors are confirmed; remaining rebuilt-extension checks are tracked in [docs/LIVE_ACCEPTANCE.md](./docs/LIVE_ACCEPTANCE.md).
- Air France Flying Blue's authenticated miles-overview URL and production selectors are confirmed.
- Virgin Atlantic Flying Club's logged-in homepage balance selector is confirmed.
- Alaska Airlines' logged-in homepage balance path is confirmed.
- American AAdvantage's account-summary balance and expiration-message selectors are confirmed.
- EVA Air's self-award balance and expiring-mileage table structure are confirmed.
- British Airways' Avios balance and newest statement-month structure are confirmed.
- ANA's total-mileage definition list and latest-activity expiry column are confirmed.
- World of Hyatt's `Current Point Balance` layout is confirmed; this personal cardholder profile is configured to display expiration as `N/A`.
- Hilton Honors' account summary fields `totalPointsFmt` and `pointsExpiration` are confirmed; the visible `honorsPointsBlock` and 24-month inactivity policy remain fallbacks.
- Marriott Bonvoy's member-status balance and `All Qualifying` activity filter are confirmed; expiration is derived by adding 24 months to the newest qualifying activity, while Lifetime Elite displays `N/A`.
- Manual entry is the reliable fallback until live selectors are confirmed.

## License

Points Tracker is available under the [MIT License](./LICENSE).
