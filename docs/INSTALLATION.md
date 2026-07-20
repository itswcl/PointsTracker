# Local Installation

## Build

From the repository root:

```bash
npm install
npm run check
```

The verified unpacked extension is written to `dist`.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the generated `dist` folder inside your local PointsTracker project.
5. Pin **Points Tracker** from Chrome's Extensions menu.

Chrome should disclose access to United, Cathay, Air France, Virgin Atlantic, Alaska Airlines, American Airlines, EVA Air, British Airways, ANA, Hyatt, Hilton, and Marriott account hosts only. The production manifest requests `storage` plus host access to `*.united.com`, `*.cathaypacific.com`, `wwws.airfrance.us`, `www.virginatlantic.com`, `www.alaskaair.com`, `www.aa.com`, `eservice.evaair.com`, `www.britishairways.com`, `stmt.cam.ana.co.jp`, `www.hyatt.com`, `www.hilton.com`, and `www.marriott.com`. It does not request cookie, history, password, or network-interception permissions.

## First use

1. Click the Points Tracker toolbar icon.
2. Use the pencil icon to add a manual balance while live selectors are being confirmed.
3. Use the refresh icon to open the official account page and capture its displayed values.
4. After a normal login, the extension attempts to locate the supported account-detail page and capture the displayed values.
5. If capture fails, the last saved value remains visible and the row shows a recovery message.

## Backups

- **Export** downloads a plain JSON file containing only the approved records.
- **Import** accepts only the current versioned schema and rejects unexpected fields.
- The file is not encrypted. Treat it like any other personal local document.

## Updating the unpacked extension

After source changes:

```bash
npm run check
```

Then select the reload icon on the Points Tracker card in `chrome://extensions`.
