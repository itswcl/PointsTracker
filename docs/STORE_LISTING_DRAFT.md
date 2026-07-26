# Chrome Web Store Listing Draft

This is working copy for a future Chrome Web Store listing. Confirm every statement against the submitted build before publishing it.

## Name

Points Tracker

## Short summary

Track airline, hotel, and credit-card rewards balances locally.

## Detailed description

Points Tracker provides one compact local ledger for supported airline, hotel, and credit-card rewards balances, with loyalty member numbers and expiration information where applicable.

- Refresh a program after signing in directly on its official website.
- Use manual entry whenever a loyalty website changes or automatic capture is unavailable.
- Sort each rewards category by balance and airline/hotel programs by expiration.
- Keep Credit Card, Airline, and Hotel totals separate.
- Export or import a local JSON backup when you choose.
- Receive a compact notice when a newer public release is available.

Points Tracker does not ask for account credentials. It stores only program-level ledger values and displayed loyalty member numbers where applicable, plus a non-personal update-check timestamp and latest public release version, in the current Chrome profile. It does not store card details or per-card balances. It has no backend, analytics, advertising, or telemetry. It contacts GitHub's public release API no more than once every 24 hours to compare version numbers; the request contains no rewards data.

## Independent-product disclaimer

Points Tracker is an independent project and is not affiliated with or endorsed by any supported airline, hotel, card issuer, or loyalty program. All company and program names and marks belong to their respective owners and are used only to identify supported programs.

## Before publishing

- Replace this note with final support, homepage, and privacy-policy URLs.
- Confirm supported programs and page-dependent limitations against the submitted build.
- Use synthetic member numbers, balances, and dates in all screenshots.
- Keep the listing consistent with the manifest permissions and Privacy-tab disclosures.
