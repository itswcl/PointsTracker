import { defineManifest } from '@crxjs/vite-plugin';

export const manifest = {
  manifest_version: 3,
  name: 'Points Tracker',
  description: 'Track loyalty member numbers, balances, and expiration dates locally.',
  version: '1.3.0',
  minimum_chrome_version: '120',
  icons: {
    16: 'assets/icons/icon-16.png',
    32: 'assets/icons/icon-32.png',
    48: 'assets/icons/icon-48.png',
    128: 'assets/icons/icon-128.png',
  },
  permissions: ['storage'],
  host_permissions: [
    'https://*.united.com/*',
    'https://*.cathaypacific.com/*',
    'https://wwws.airfrance.us/*',
    'https://www.virginatlantic.com/*',
    'https://www.alaskaair.com/*',
    'https://www.aa.com/*',
    'https://eservice.evaair.com/*',
    'https://www.britishairways.com/*',
    'https://stmt.cam.ana.co.jp/*',
    'https://cam.ana.co.jp/*',
    'https://www.delta.com/*',
    'https://www.hyatt.com/*',
    'https://www.hilton.com/*',
    'https://www.marriott.com/*',
    'https://api.github.com/*',
  ],
  action: {
    default_title: 'Points Tracker',
    default_popup: 'entrypoints/popup/index.html',
    default_icon: {
      16: 'assets/icons/icon-16.png',
      32: 'assets/icons/icon-32.png',
      48: 'assets/icons/icon-48.png',
    },
  },
  background: {
    service_worker: 'entrypoints/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'https://*.united.com/*',
        'https://*.cathaypacific.com/*',
        'https://wwws.airfrance.us/*',
        'https://www.virginatlantic.com/*',
        'https://www.alaskaair.com/*',
        'https://www.aa.com/*',
        'https://eservice.evaair.com/*',
        'https://www.britishairways.com/*',
        'https://stmt.cam.ana.co.jp/*',
        'https://cam.ana.co.jp/*',
        'https://www.delta.com/*',
        'https://www.hyatt.com/*',
        'https://www.hilton.com/*',
        'https://www.marriott.com/*',
      ],
      js: ['entrypoints/supported.content.ts'],
      run_at: 'document_idle',
    },
  ],
} satisfies chrome.runtime.ManifestV3;

export default defineManifest(manifest);
