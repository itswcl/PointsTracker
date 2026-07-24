# Install Points Tracker in Chrome

You do not need coding experience, Node.js, Terminal, or a GitHub account. Until Points Tracker is available in the Chrome Web Store, Chrome requires a few manual steps to install it.

## Quick installation

### 1. Download Points Tracker

Select this link:

[**Download Points Tracker for Chrome**](https://github.com/itswcl/PointsTracker/releases/latest/download/points-tracker-chrome.zip)

The file is named `points-tracker-chrome.zip` and normally appears in your **Downloads** folder.

### 2. Unzip the download

- **Mac:** Double-click `points-tracker-chrome.zip`.
- **Windows:** Right-click `points-tracker-chrome.zip`, select **Extract All**, and then select **Extract**.

You should now have a regular folder named `points-tracker-chrome`. Keep this folder after installation; Chrome needs it to run the extension.

### 3. Open Chrome's Extensions page

Copy `chrome://extensions`, paste it into Chrome's address bar, and press **Return** or **Enter**.

### 4. Turn on Developer mode

Turn on the **Developer mode** switch in the upper-right corner of the Extensions page. New buttons will appear.

### 5. Load Points Tracker

1. Select **Load unpacked**.
2. Choose the unzipped `points-tracker-chrome` folder—not the ZIP file.
3. Select **Open** or **Select Folder**.

The **Points Tracker** card should now appear on the Extensions page.

### 6. Pin the extension

1. Select Chrome's puzzle-piece **Extensions** button near the address bar.
2. Find **Points Tracker**.
3. Select its pin icon.

The Points Tracker icon should now remain visible in the Chrome toolbar.

## First use

1. Select the Points Tracker toolbar icon.
2. Select the pencil icon beside a program to enter a balance manually.
3. Select the refresh icon beside a program to open its official account page.
4. Sign in normally on the airline or hotel website. Never enter your loyalty-site password into Points Tracker.
5. After the official page loads, Points Tracker attempts to read only the displayed loyalty member number, balance, and expiration information.

If a website changes and automatic refresh does not work, your last saved value remains available and you can update it with the pencil icon.

## Chrome's permission message

Chrome should disclose access to United, Cathay, Air France, Virgin Atlantic, Alaska Airlines, American Airlines, EVA Air, British Airways, ANA, Delta, Hyatt, Hilton, and Marriott account hosts only. The production manifest requests `storage` plus host access to `*.united.com`, `*.cathaypacific.com`, `wwws.airfrance.us`, `www.virginatlantic.com`, `www.alaskaair.com`, `www.aa.com`, `eservice.evaair.com`, `www.britishairways.com`, `stmt.cam.ana.co.jp`, `cam.ana.co.jp`, `www.delta.com`, `www.hyatt.com`, `www.hilton.com`, and `www.marriott.com`. ANA uses both official hosts because its balance/expiration statement and member-number reference are separate pages. It does not request cookie, history, password, or network-interception permissions.

## Updating Points Tracker

Installing a newer copy does not automatically transfer the locally saved ledger. Before updating:

1. Open Points Tracker and select **Export** to save a backup.
2. Download and unzip the newest `points-tracker-chrome.zip`.
3. Open `chrome://extensions`.
4. Select **Remove** on the old Points Tracker card.
5. Select **Load unpacked** and choose the newly unzipped folder.
6. Open Points Tracker and select **Import** to restore your backup.

## Troubleshooting

### I do not see “Load unpacked”

Make sure **Developer mode** is turned on in the upper-right corner of `chrome://extensions`.

### Chrome says the manifest is missing

You probably selected the ZIP file or the wrong folder. Unzip the download and select the `points-tracker-chrome` folder that directly contains `manifest.json`.

### I cannot find the Points Tracker icon

Select Chrome's puzzle-piece **Extensions** button and pin **Points Tracker**.

### Chrome shows a Developer mode warning

That warning is expected for an extension installed outside the Chrome Web Store. Points Tracker can be removed at any time from `chrome://extensions`.

### A balance does not refresh

Confirm that you are signed in on the official account page and let the page finish loading. Try the refresh icon again. If the website has changed, use the pencil icon to keep the balance current manually.

## Backups

- **Export** downloads a plain JSON file containing the approved member numbers, balances, and expiration records.
- **Import** accepts only the current versioned schema and rejects unexpected fields.
- The file is not encrypted and contains your loyalty member numbers. Treat it like any other personal local document.

## Developer installation

Developers who want to build the strict TypeScript source can clone the repository and run:

```bash
npm install
npm run check
```

The verified unpacked extension is written to `dist`. Open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose the generated `dist` folder.

`npm run check` performs TypeScript validation, linting, tests, and the production build. To run only the compiler, use `npm run typecheck`.

After making source changes, rebuild with:

```bash
npm run check
```

Then select the reload icon on the Points Tracker card in `chrome://extensions`.
