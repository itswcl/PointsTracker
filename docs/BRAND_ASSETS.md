# Local Program Marks

The popup bundles compact airline and hotel marks locally. It does not load remote images at runtime and does not request additional host permissions for artwork.

## Sources

- United Airlines, Air France, Virgin Atlantic, American Airlines, British Airways, ANA, Hilton, and Marriott use SVG paths from `simple-icons` 16.26.0. The package metadata traces each mark to the corresponding program website or newsroom.
- Cathay Pacific uses the official web-clip icon published by Cathay Pacific at `https://www.cathaypacific.com/content/dam/header-footer-lrp/cx-web-clip-icon.png`.
- Alaska Airlines uses the official favicon published at `https://resource.alaskaair.net/favicon.ico`.
- EVA Air uses the favicon rendered by its official Infinity MileageLands account page at `https://eservice.evaair.com/flyeva/eva/ffp/frequent-flyer.aspx`.
- World of Hyatt uses the official square SVG published at `https://www.hyatt.com/hds/images/4.3.0/brands/world/logos/logo.svg`, bundled locally as `assets/program-logos/hyatt.svg`.

The source images for Cathay, Alaska, and EVA are embedded as local data URLs in `src/program-icon-images.js`; Hyatt's SVG is bundled as a local asset. Program names and marks may be protected trademarks. Their use here is limited to identifying accounts in this private personal ledger; it does not imply program endorsement.

## Extension icon

The Chrome toolbar and extension-management icon is an original Point Ledger mark generated for this project. It combines a simplified ledger with airline, hotel, and credit-card symbols using the popup palette. The source and packaged 16, 32, 48, and 128 pixel PNGs live in `assets/icons` and are bundled locally with the extension.
