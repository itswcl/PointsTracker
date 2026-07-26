import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../entrypoints/popup/App.jsx';
import '../../entrypoints/popup/styles.css';
import {
  applyAutomaticCapture,
  createInitialState,
  STORAGE_KEY,
} from '../../src/domain/records.js';
import { UPDATE_CACHE_KEY } from '../../src/update-check.js';
import type {
  AutomaticCapture,
  ProgramId,
} from '../../src/types.js';
import { createFakeStorageArea } from '../../tests/helpers/fake-storage.js';

const CAPTURED_ON = new Date(2026, 6, 25);
const HIDDEN_EXPIRATION = {
  type: 'unknown',
  date: null,
  note: 'Expiration does not apply to this balance-only ledger row',
} as const;

const DEMO_CAPTURES: readonly (readonly [
  ProgramId,
  AutomaticCapture,
])[] = [
  [
    'united',
    {
      balance: 12345,
      memberNumber: 'TEST-UA-1001',
      expiration: { type: 'never', date: null, note: 'No expiration' },
    },
  ],
  [
    'cathay',
    {
      balance: 23456,
      memberNumber: 'TEST-CX-1002',
      expiration: {
        type: 'activity_based',
        date: '2030-02-01',
        note: 'Synthetic demo date',
      },
    },
  ],
  [
    'airfrance',
    {
      balance: 34567,
      memberNumber: 'TEST-AF-1003',
      expiration: {
        type: 'fixed_date',
        date: '2029-03-15',
        note: 'Synthetic demo date',
      },
    },
  ],
  [
    'virginatlantic',
    {
      balance: 45678,
      memberNumber: 'TEST-VS-1004',
      expiration: { type: 'never', date: null, note: 'No expiration' },
    },
  ],
  [
    'alaska',
    {
      balance: 56789,
      memberNumber: 'TEST-AS-1005',
      expiration: { type: 'never', date: null, note: 'No expiration' },
    },
  ],
  [
    'american',
    {
      balance: 67890,
      memberNumber: 'TEST-AA-1006',
      expiration: { type: 'never', date: null, note: 'No expiration' },
    },
  ],
  [
    'evaair',
    {
      balance: 78901,
      memberNumber: 'TEST-BR-1007',
      expiration: {
        type: 'fixed_date',
        date: null,
        month: '2030-08',
        amount: 250,
        note: 'Synthetic demo tranche',
      },
    },
  ],
  [
    'britishairways',
    {
      balance: 89012,
      memberNumber: 'TEST-BA-1008',
      expiration: {
        type: 'activity_based',
        date: '2030-04-01',
        note: 'Synthetic demo date',
      },
    },
  ],
  [
    'ana',
    {
      balance: 90123,
      memberNumber: 'TEST-NH-1009',
      expiration: {
        type: 'fixed_date',
        date: null,
        month: '2030-09',
        note: 'Synthetic demo month',
      },
    },
  ],
  [
    'delta',
    {
      balance: 101234,
      memberNumber: 'TEST-DL-1010',
      expiration: { type: 'never', date: null, note: 'No expiration' },
    },
  ],
  [
    'hyatt',
    {
      balance: 123456,
      memberNumber: 'TEST-HY-2001',
      expiration: { type: 'never', date: null, note: 'Synthetic demo status' },
    },
  ],
  [
    'hilton',
    {
      balance: 234567,
      memberNumber: 'TEST-HH-2002',
      expiration: {
        type: 'activity_based',
        date: '2030-06-30',
        inactivityMonths: 24,
        note: 'Synthetic demo date',
      },
    },
  ],
  [
    'marriott',
    {
      balance: 345678,
      memberNumber: 'TEST-MB-2003',
      expiration: {
        type: 'activity_based',
        date: '2030-07-15',
        inactivityMonths: 24,
        note: 'Synthetic demo date',
      },
    },
  ],
  [
    'ihg',
    {
      balance: 456789,
      memberNumber: 'TEST-IH-2004',
      expiration: { type: 'never', date: null, note: 'Synthetic demo status' },
    },
  ],
  [
    'wyndham',
    {
      balance: 0,
      memberNumber: 'TEST-WR-2005',
      expiration: { type: 'never', date: null, note: 'Synthetic demo status' },
    },
  ],
  [
    'amex',
    {
      balance: 112233,
      memberNumber: null,
      expiration: HIDDEN_EXPIRATION,
    },
  ],
  [
    'chase',
    {
      balance: 223344,
      memberNumber: null,
      expiration: HIDDEN_EXPIRATION,
    },
  ],
  [
    'citi',
    {
      balance: 334455,
      memberNumber: null,
      expiration: HIDDEN_EXPIRATION,
    },
  ],
  [
    'bilt',
    {
      balance: -1234,
      memberNumber: null,
      expiration: HIDDEN_EXPIRATION,
    },
  ],
];

let state = createInitialState();
for (const [programId, capture] of DEMO_CAPTURES) {
  state = applyAutomaticCapture(state, programId, capture, CAPTURED_ON);
}

const storageArea = createFakeStorageArea({
  [STORAGE_KEY]: state,
  [UPDATE_CACHE_KEY]: {
    checkedAt: Date.now(),
    latestVersion: '1.4.0',
  },
});

const demoChrome = {
  storage: {
    local: storageArea,
    onChanged: {
      addListener() {},
      removeListener() {},
    },
  },
  runtime: {
    getManifest: () => ({ version: '1.4.0' }),
    sendMessage: async () => ({ ok: true }),
  },
};

if (globalThis.chrome) {
  Object.assign(
    globalThis.chrome,
    demoChrome as unknown as Partial<typeof chrome>,
  );
} else {
  Object.defineProperty(globalThis, 'chrome', {
    configurable: true,
    value: demoChrome as unknown as typeof chrome,
  });
}

const root = document.querySelector('#root');
if (!(root instanceof HTMLElement)) {
  throw new Error('Demo root is missing');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
