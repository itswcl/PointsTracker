# Chrome Web Store Listing Draft

This is working copy for a future Chrome Web Store listing. Confirm every statement against the submitted build before publishing it.

## Name

Points Tracker

## Short summary

Track airline and hotel member numbers, balances, and expiration dates locally.

## Detailed description

Points Tracker provides one compact ledger for supported airline and hotel loyalty member numbers, balances, and expiration information.

- Refresh a program after signing in directly on its official website.
- Use manual entry whenever a loyalty website changes or automatic capture is unavailable.
- Sort airline and hotel programs by balance or expiration.
- Keep airline and hotel totals separate.
- Export or import a local JSON backup when you choose.
- Receive a compact notice when a newer public release is available.

Points Tracker does not ask for loyalty-site credentials. It stores the displayed loyalty member number and ledger values, plus a non-personal update-check timestamp and latest public release version, only in the current Chrome profile. It has no backend, analytics, advertising, or telemetry. It contacts GitHub's public release API no more than once every 24 hours to compare version numbers; the request contains no loyalty data.

## Independent-product disclaimer

Points Tracker is an independent project and is not affiliated with or endorsed by any supported airline, hotel, or loyalty program. All airline, hotel, and loyalty-program names and marks belong to their respective owners and are used only to identify supported programs.

## Before publishing

- Replace this note with final support, homepage, and privacy-policy URLs.
- Confirm supported programs and page-dependent limitations against the submitted build.
- Use synthetic member numbers, balances, and dates in all screenshots.
- Keep the listing consistent with the manifest permissions and Privacy-tab disclosures.
