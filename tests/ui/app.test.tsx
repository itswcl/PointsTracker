import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { App } from '../../entrypoints/popup/App.jsx';
import {
  applyAutomaticCapture,
  createInitialState,
  STORAGE_KEY,
} from '../../src/domain/records.js';
import {
  LATEST_RELEASE_URL,
  UPDATE_CACHE_KEY,
} from '../../src/update-check.js';
import { createFakeStorageArea } from '../helpers/fake-storage.js';
import type { FakeStorageArea } from '../helpers/fake-storage.js';

function eventTarget() {
  return {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };
}

function requiredElement<T extends Element>(
  element: T | null,
  label: string,
): T {
  if (!element) throw new Error(`${label} is missing from the test fixture`);
  return element;
}

describe('popup', () => {
  let storageArea: FakeStorageArea;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    let state = applyAutomaticCapture(
      createInitialState(),
      'united',
      {
        balance: 125400,
        memberNumber: 'UA000001',
        expiration: { type: 'never', date: null, note: 'No expiration' },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'unitedpool',
      {
        balance: 22000,
        memberNumber: 'UA000001',
        expiration: { type: 'never', date: null, note: 'No expiration' },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'unitedtravelbank',
      {
        balance: 12550,
        memberNumber: 'UA000001',
        expiration: {
          type: 'fixed_date',
          date: '2027-06-15',
          note: 'Earliest displayed TravelBank expiration',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'cathay',
      {
        balance: 84500,
        memberNumber: 'CX000002',
        expiration: {
          type: 'activity_based',
          date: '2026-12-14',
          note: 'Activity based',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'airfrance',
      {
        balance: 210500,
        memberNumber: 'AF000003',
        expiration: {
          type: 'fixed_date',
          date: '2027-05-15',
          note: 'Valid until date shown by Flying Blue',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'virginatlantic',
      {
        balance: 163250,
        memberNumber: 'VS000004',
        expiration: {
          type: 'never',
          date: null,
          note: 'No expiration',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'alaska',
      {
        balance: 422100,
        memberNumber: 'AS000005',
        expiration: {
          type: 'never',
          date: null,
          note: 'No expiration',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'american',
      {
        balance: 176400,
        memberNumber: 'AA000006',
        expiration: {
          type: 'never',
          date: null,
          note: 'No expiration with an open primary credit card account',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'evaair',
      {
        balance: 96575,
        memberNumber: 'BR000007',
        expiration: {
          type: 'fixed_date',
          date: null,
          month: '2028-07',
          amount: 50,
          note: 'Earliest expiring mileage tranche shown by EVA Air',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'britishairways',
      {
        balance: 42300,
        memberNumber: 'BA000008',
        expiration: {
          type: 'activity_based',
          date: '2029-01-01',
          note: 'Derived from the newest activity month shown by British Airways',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'ana',
      {
        balance: 77500,
        memberNumber: 'NH000009',
        expiration: {
          type: 'fixed_date',
          date: null,
          month: '2028-10',
          note: 'Expiry month shown for the latest ANA activity',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'delta',
      {
        balance: 119300,
        memberNumber: 'DL000010',
        expiration: {
          type: 'never',
          date: null,
          note: 'No expiration',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'southwest',
      {
        balance: 20383,
        memberNumber: 'RR000016',
        expiration: {
          type: 'never',
          date: null,
          note: 'No expiration',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'southwestcredit',
      {
        balance: 69796,
        memberNumber: 'RR000016',
        expiration: {
          type: 'fixed_date',
          date: '2028-01-15',
          note: 'Earliest Southwest Flight Credit expiration',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'hyatt',
      {
        balance: 55000,
        memberNumber: 'HY000011',
        expiration: {
          type: 'never',
          date: null,
          note: 'N/A for the cardholder profile configured in this local ledger',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'hilton',
      {
        balance: 180000,
        memberNumber: 'HH000012',
        expiration: {
          type: 'activity_based',
          date: null,
          inactivityMonths: 24,
          note: 'Expires after 24 consecutive months without eligible activity',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'marriott',
      {
        balance: 340000,
        memberNumber: 'MB000013',
        expiration: {
          type: 'activity_based',
          date: '2028-07-05',
          inactivityMonths: 24,
          note: 'Derived from the newest All Qualifying Marriott activity',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'ihg',
      {
        balance: 25000,
        memberNumber: 'IHG000014',
        expiration: {
          type: 'never',
          date: null,
          note: 'N/A while IHG One Rewards Platinum Elite status is active',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'wyndham',
      {
        balance: 42500,
        memberNumber: 'WR000015',
        expiration: {
          type: 'activity_based',
          date: null,
          inactivityMonths: 18,
          note: 'Points may expire after 18 months of inactivity and four years after posting',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'amex',
      {
        balance: 112233,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'Expiration does not apply to this balance-only ledger row',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'capitalone',
      {
        balance: 445566,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'Expiration does not apply to this balance-only ledger row',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'chase',
      {
        balance: 700000,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'Expiration does not apply to this balance-only ledger row',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'citi',
      {
        balance: 246810,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'Expiration does not apply to this balance-only ledger row',
        },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'bilt',
      {
        balance: -4321,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'Expiration does not apply to this balance-only ledger row',
        },
      },
      new Date(2026, 6, 17),
    );

    storageArea = createFakeStorageArea({
      [STORAGE_KEY]: state,
      [UPDATE_CACHE_KEY]: {
        checkedAt: Date.now(),
        latestVersion: '1.3.0',
      },
    });
    vi.stubGlobal('chrome', {
      storage: {
        local: storageArea,
        onChanged: eventTarget(),
      },
      runtime: {
        getManifest: vi.fn(() => ({ version: '1.3.0' })),
        sendMessage: vi.fn(async () => ({ ok: true })),
      },
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(async () => undefined),
      },
    });
  });

  it('renders compact balances, member numbers, and fixed date formatting', async () => {
    const { container } = render(<App />);

    expect(await screen.findByText('125,400')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Point Ledger' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('84,500')).toBeInTheDocument();
    expect(screen.getByText('210,500')).toBeInTheDocument();
    expect(screen.getByText('163,250')).toBeInTheDocument();
    expect(screen.getByText('422,100')).toBeInTheDocument();
    expect(screen.getByText('176,400')).toBeInTheDocument();
    expect(screen.getByText('96,575')).toBeInTheDocument();
    expect(screen.getByText('42,300')).toBeInTheDocument();
    expect(screen.getByText('77,500')).toBeInTheDocument();
    expect(screen.getByText('119,300')).toBeInTheDocument();
    expect(screen.getByText('22,000')).toBeInTheDocument();
    expect(screen.getByText('$125.50')).toBeInTheDocument();
    expect(screen.getByText('20,383')).toBeInTheDocument();
    expect(screen.getByText('$697.96')).toBeInTheDocument();
    expect(screen.getByText('55,000')).toBeInTheDocument();
    expect(screen.getByText('180,000')).toBeInTheDocument();
    expect(screen.getByText('340,000')).toBeInTheDocument();
    expect(screen.getByText('25,000')).toBeInTheDocument();
    expect(screen.getByText('42,500')).toBeInTheDocument();
    expect(screen.getByText('112,233')).toBeInTheDocument();
    expect(screen.getByText('445,566')).toBeInTheDocument();
    expect(screen.getByText('700,000')).toBeInTheDocument();
    expect(screen.getByText('246,810')).toBeInTheDocument();
    expect(screen.getByText('-4,321')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Airline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hotel' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Credit Card' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/\d+ programs?/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Airline total balance')).toHaveTextContent(
      'Total1,560,208',
    );
    expect(screen.getByLabelText('Hotel total balance')).toHaveTextContent(
      'Total642,500',
    );
    expect(screen.getByLabelText('Credit Card total balance')).toHaveTextContent(
      'Total1,500,288',
    );
    expect(screen.getByText('50 · 07/2028')).toBeInTheDocument();
    expect(screen.getByText('10/2028')).toBeInTheDocument();
    expect(screen.queryByText('07/17/2026')).not.toBeInTheDocument();
    expect(screen.getByText('12/14/2026')).toBeInTheDocument();
    expect(screen.getByText('05/15/2027')).toBeInTheDocument();
    expect(screen.getByText('01/01/2029')).toBeInTheDocument();
    expect(screen.getByText('07/05/2028')).toBeInTheDocument();
    expect(screen.getByText('24 mo inactivity')).toBeInTheDocument();
    expect(screen.getByText('18 mo inactivity')).toBeInTheDocument();
    expect(screen.getAllByText('N/A')).toHaveLength(9);
    expect(screen.getAllByText('0001')).toHaveLength(3);
    expect(screen.getAllByText('0016')).toHaveLength(2);
    expect(screen.getByText('0011')).toBeInTheDocument();
    expect(screen.getByText('0012')).toBeInTheDocument();
    expect(screen.getByText('0013')).toBeInTheDocument();
    expect(screen.getByText('0014')).toBeInTheDocument();
    expect(screen.getByText('0015')).toBeInTheDocument();
    expect(screen.queryByText('UA000001')).not.toBeInTheDocument();
    expect(screen.queryByText('CX000002')).not.toBeInTheDocument();
    expect(screen.queryByText('MB000013')).not.toBeInTheDocument();
    expect(screen.queryByText('IHG000014')).not.toBeInTheDocument();
    expect(screen.queryByText('WR000015')).not.toBeInTheDocument();
    expect(screen.getByText('v1.3.0')).toHaveAttribute(
      'aria-label',
      'Version 1.3.0',
    );
    expect(
      screen.queryByText('Stored only in this Chrome profile.'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Update' }),
    ).toHaveAttribute(
      'href',
      'https://github.com/itswcl/PointsTracker/releases/latest',
    );
    expect(
      screen.getByRole('link', { name: 'Update' }),
    ).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('button', { name: 'Setting' })).toHaveAttribute(
      'data-tooltip',
      'Setting',
    );
    expect(screen.getByRole('link', { name: 'Update' })).toHaveAttribute(
      'data-tooltip',
      'Update',
    );
    expect(screen.getByRole('button', { name: 'Export' })).toHaveAttribute(
      'data-tooltip',
      'Export',
    );
    expect(screen.getByRole('button', { name: 'Import' })).toHaveAttribute(
      'data-tooltip',
      'Import',
    );
    const utilityBar = container.querySelector('.utility-bar');
    expect(utilityBar?.firstElementChild).toHaveTextContent('v1.3.0');
    expect(
      utilityBar?.querySelectorAll('.global-icon-button'),
    ).toHaveLength(4);
    expect(container.querySelector('footer')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: 'Update available' }),
    ).not.toBeInTheDocument();
    expect(container.querySelectorAll('.program-name')).toHaveLength(24);
    expect(container.querySelector('[data-program-icon]')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-labelledby="united-name"] .program-name')).toHaveTextContent('UA Miles');
    expect(container.querySelector('[aria-labelledby="unitedpool-name"] .program-name')).toHaveTextContent('UA Pool');
    expect(container.querySelector('[aria-labelledby="unitedtravelbank-name"] .program-name')).toHaveTextContent('UA TB');
    expect(container.querySelector('[aria-labelledby="southwest-name"] .program-name')).toHaveTextContent('Southwest');
    expect(container.querySelector('[aria-labelledby="southwestcredit-name"] .program-name')).toHaveTextContent('SW Credit');
    expect(container.querySelector('[aria-labelledby="evaair-name"] .program-name')).toHaveTextContent('EVA');
    expect(container.querySelector('[aria-labelledby="hyatt-name"] .program-name')).toHaveTextContent('Hyatt');
    expect(container.querySelector('[aria-labelledby="ihg-name"] .program-name')).toHaveTextContent('IHG');
    expect(container.querySelector('[aria-labelledby="wyndham-name"] .program-name')).toHaveTextContent('Wyndham');
    expect(container.querySelector('[aria-labelledby="amex-name"] .program-name')).toHaveTextContent('Amex');
    expect(container.querySelector('[aria-labelledby="capitalone-name"] .program-name')).toHaveTextContent('Capital One');
    expect(container.querySelector('[aria-labelledby="chase-name"] .program-name')).toHaveTextContent('Chase');
    expect(container.querySelector('[aria-labelledby="citi-name"] .program-name')).toHaveTextContent('Citi');
    expect(container.querySelector('[aria-labelledby="bilt-name"] .program-name')).toHaveTextContent('Bilt');
    expect(
      screen.getByRole('heading', { name: 'United MileagePlus' }),
    ).toHaveClass('program-name');
    expect(screen.queryByText('No expiration')).not.toBeInTheDocument();
    expect(screen.queryByText(/username|password/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Member #')).not.toBeInTheDocument();
    expect(screen.queryByText('Program')).not.toBeInTheDocument();
    expect(screen.queryByText('Updated')).not.toBeInTheDocument();
    expect(screen.queryByText('Points / 02')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh all' })).not.toBeInTheDocument();
    expect(screen.queryByText('Current')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh United MileagePlus' }),
    ).toHaveAttribute('data-tooltip', 'Refresh');
    expect(
      screen.getByRole('button', { name: 'Refresh United Pooled Miles' }),
    ).toHaveAttribute('data-tooltip', 'Refresh');
    expect(
      screen.getByRole('button', { name: 'Refresh United TravelBank' }),
    ).toHaveAttribute('data-tooltip', 'Refresh');
    expect(
      screen.getByRole('button', { name: 'Refresh Southwest Rapid Rewards' }),
    ).toHaveAttribute('data-tooltip', 'Refresh');
    expect(
      screen.getByRole('button', { name: 'Refresh Southwest Flight Credits' }),
    ).toHaveAttribute('data-tooltip', 'Refresh');
    expect(
      screen.getByRole('button', {
        name: 'Copy United Pooled Miles member number',
      }),
    ).toHaveTextContent('0001');
    expect(
      screen.getByRole('button', {
        name: 'Copy United TravelBank member number',
      }),
    ).toHaveTextContent('0001');
    expect(
      screen.getByRole('button', {
        name: 'Copy Southwest Flight Credits member number',
      }),
    ).toHaveTextContent('0016');
    expect(
      screen.queryByRole('button', { name: 'Open United MileagePlus account' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Edit United MileagePlus' }),
    ).toHaveAttribute('data-tooltip', 'Edit');
    expect(
      screen.getByRole('button', { name: 'Refresh Air France Flying Blue' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh Virgin Atlantic Flying Club' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh Alaska Airlines Atmos Rewards' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh American AAdvantage' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh EVA Air Infinity MileageLands' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh British Airways Club' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh ANA Mileage Club' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh Delta SkyMiles' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh World of Hyatt' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh Hilton Honors' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh Marriott Bonvoy' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh IHG One Rewards' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh Wyndham Rewards' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Refresh American Express Membership Rewards',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh Capital One Miles' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh Chase Ultimate Rewards' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh Citi ThankYou Rewards' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh Bilt Rewards' }),
    ).toBeInTheDocument();

    const rowOrder = () =>
      Array.from(container.querySelectorAll('.program-row')).map((row) =>
        row.getAttribute('aria-labelledby'),
      );
    const programList = requiredElement(
      container.querySelector('.program-list'),
      'Program list',
    );
    const airlineSection = requiredElement(
      container.querySelector('[data-ledger-section="airline"]'),
      'Airline section',
    );
    const hotelSection = requiredElement(
      container.querySelector('[data-ledger-section="hotel"]'),
      'Hotel section',
    );
    const creditCardSection = requiredElement(
      container.querySelector('[data-ledger-section="credit_card"]'),
      'Credit Card section',
    );
    expect(programList.children).toHaveLength(3);
    expect(programList.firstElementChild).toBe(
      creditCardSection,
    );
    expect(programList.children.item(1)).toBe(
      airlineSection,
    );
    expect(programList.lastElementChild).toBe(hotelSection);
    const originalOrder = [
      'amex-name',
      'capitalone-name',
      'chase-name',
      'citi-name',
      'bilt-name',
      'united-name',
      'unitedpool-name',
      'cathay-name',
      'airfrance-name',
      'virginatlantic-name',
      'alaska-name',
      'american-name',
      'evaair-name',
      'britishairways-name',
      'ana-name',
      'delta-name',
      'southwest-name',
      'unitedtravelbank-name',
      'southwestcredit-name',
      'hyatt-name',
      'hilton-name',
      'marriott-name',
      'ihg-name',
      'wyndham-name',
    ];
    expect(rowOrder()).toEqual(originalOrder);
    expect(airlineSection.lastElementChild).toHaveClass('ledger-total-row');
    expect(hotelSection.lastElementChild).toHaveClass('ledger-total-row');
    expect(creditCardSection.lastElementChild).toHaveClass('ledger-total-row');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Sort Airline by expiration, earliest first',
      }),
    );
    expect(rowOrder()).toEqual([
      'amex-name',
      'capitalone-name',
      'chase-name',
      'citi-name',
      'bilt-name',
      'cathay-name',
      'airfrance-name',
      'unitedtravelbank-name',
      'southwestcredit-name',
      'evaair-name',
      'ana-name',
      'britishairways-name',
      'united-name',
      'unitedpool-name',
      'virginatlantic-name',
      'alaska-name',
      'american-name',
      'delta-name',
      'southwest-name',
      'hyatt-name',
      'hilton-name',
      'marriott-name',
      'ihg-name',
      'wyndham-name',
    ]);
    expect(airlineSection.lastElementChild).toHaveClass('ledger-total-row');
    expect(hotelSection.lastElementChild).toHaveClass('ledger-total-row');
    expect(
      screen.getByRole('button', { name: 'Restore original Airline order' }),
    ).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(
      screen.getByRole('button', { name: 'Restore original Airline order' }),
    );
    expect(rowOrder()).toEqual(originalOrder);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Sort Airline by balance, highest first',
      }),
    );
    expect(rowOrder()).toEqual([
      'amex-name',
      'capitalone-name',
      'chase-name',
      'citi-name',
      'bilt-name',
      'alaska-name',
      'airfrance-name',
      'american-name',
      'virginatlantic-name',
      'united-name',
      'delta-name',
      'evaair-name',
      'cathay-name',
      'ana-name',
      'britishairways-name',
      'unitedpool-name',
      'southwest-name',
      'unitedtravelbank-name',
      'southwestcredit-name',
      'hyatt-name',
      'hilton-name',
      'marriott-name',
      'ihg-name',
      'wyndham-name',
    ]);
    expect(
      screen.getByRole('button', { name: 'Restore original Airline order' }),
    ).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(
      screen.getByRole('button', { name: 'Restore original Airline order' }),
    );
    expect(rowOrder()).toEqual(originalOrder);

    fireEvent.click(
      screen.getByRole('button', { name: 'Sort Hotel by balance, highest first' }),
    );
    expect(rowOrder()).toEqual([
      'amex-name',
      'capitalone-name',
      'chase-name',
      'citi-name',
      'bilt-name',
      'united-name',
      'unitedpool-name',
      'cathay-name',
      'airfrance-name',
      'virginatlantic-name',
      'alaska-name',
      'american-name',
      'evaair-name',
      'britishairways-name',
      'ana-name',
      'delta-name',
      'southwest-name',
      'unitedtravelbank-name',
      'southwestcredit-name',
      'marriott-name',
      'hilton-name',
      'hyatt-name',
      'wyndham-name',
      'ihg-name',
    ]);
    expect(
      screen.getByRole('button', { name: 'Restore original Hotel order' }),
    ).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(
      screen.getByRole('button', { name: 'Restore original Hotel order' }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Sort Hotel by expiration, earliest first',
      }),
    );
    expect(rowOrder()).toEqual([
      'amex-name',
      'capitalone-name',
      'chase-name',
      'citi-name',
      'bilt-name',
      'united-name',
      'unitedpool-name',
      'cathay-name',
      'airfrance-name',
      'virginatlantic-name',
      'alaska-name',
      'american-name',
      'evaair-name',
      'britishairways-name',
      'ana-name',
      'delta-name',
      'southwest-name',
      'unitedtravelbank-name',
      'southwestcredit-name',
      'marriott-name',
      'hyatt-name',
      'hilton-name',
      'ihg-name',
      'wyndham-name',
    ]);

    expect(
      screen.queryByRole('button', {
        name: 'Sort Credit Card by expiration, earliest first',
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Sort Credit Card by balance, highest first',
      }),
    );
    expect(rowOrder()).toEqual([
      'chase-name',
      'capitalone-name',
      'citi-name',
      'amex-name',
      'bilt-name',
      'united-name',
      'unitedpool-name',
      'cathay-name',
      'airfrance-name',
      'virginatlantic-name',
      'alaska-name',
      'american-name',
      'evaair-name',
      'britishairways-name',
      'ana-name',
      'delta-name',
      'southwest-name',
      'unitedtravelbank-name',
      'southwestcredit-name',
      'marriott-name',
      'hyatt-name',
      'hilton-name',
      'ihg-name',
      'wyndham-name',
    ]);
    expect(
      screen.getByRole('button', {
        name: 'Restore original Credit Card order',
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    const americanRow = requiredElement(
      container.querySelector('[aria-labelledby="american-name"]'),
      'American row',
    );
    expect(
      Array.from(americanRow.children).map((child) => child.className),
    ).toEqual([
      'program-name',
      'program-balance',
      'program-member-suffix program-member-suffix--copy',
      'record-facts',
      'program-actions',
    ]);

    const amexRow = requiredElement(
      container.querySelector('[aria-labelledby="amex-name"]'),
      'Amex row',
    );
    expect(
      Array.from(amexRow.children).map((child) => child.className),
    ).toEqual([
      'program-name',
      'program-balance',
      'program-actions',
    ]);
  });

  it('hides disabled programs without deleting their saved data', async () => {
    render(<App />);

    expect(await screen.findByText('125,400')).toBeInTheDocument();
    expect(screen.getByLabelText('Airline total balance')).toHaveTextContent(
      'Total1,560,208',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Setting' }));
    expect(
      screen.getByRole('region', { name: 'Settings' }),
    ).toBeInTheDocument();
    const unitedPoolToggle = screen.getByRole('switch', {
      name: 'Show United Pooled Miles',
    });
    expect(unitedPoolToggle).toBeChecked();

    fireEvent.click(unitedPoolToggle);

    await waitFor(() => {
      expect(unitedPoolToggle).not.toBeChecked();
    });
    expect(unitedPoolToggle).toHaveTextContent('Hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Back to ledger' }));
    expect(
      screen.queryByRole('heading', { name: 'United Pooled Miles' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Airline total balance')).toHaveTextContent(
      'Total1,538,208',
    );
    expect(storageArea.snapshot()).toMatchObject({
      pointsTrackerSettings: {
        schemaVersion: 1,
        disabledProgramIds: ['unitedpool'],
      },
      [STORAGE_KEY]: {
        records: {
          unitedpool: {
            automatic: {
              balance: 22000,
            },
          },
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Setting' }));
    const hiddenUnitedPoolToggle = screen.getByRole('switch', {
      name: 'Show United Pooled Miles',
    });
    expect(hiddenUnitedPoolToggle).not.toBeChecked();
    fireEvent.click(hiddenUnitedPoolToggle);
    await waitFor(() => {
      expect(hiddenUnitedPoolToggle).toBeChecked();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Back to ledger' }));
    expect(
      await screen.findByRole('heading', { name: 'United Pooled Miles' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Airline total balance')).toHaveTextContent(
      'Total1,560,208',
    );
  });

  it('copies a captured member number from its ledger row', async () => {
    render(<App />);

    const copyButton = await screen.findByRole('button', {
      name: 'Copy United MileagePlus member number',
    });
    expect(copyButton.closest('.program-actions')).toBeNull();
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('UA000001');
    });
    expect(copyButton).toHaveAttribute('data-tooltip', 'Copied');
    expect(copyButton).toHaveAccessibleName(
      'Copied United MileagePlus member number',
    );

    fireEvent.mouseLeave(copyButton);
    expect(copyButton).toHaveAttribute(
      'data-tooltip',
      'Copy member#',
    );
    expect(copyButton).toHaveAccessibleName(
      'Copy United MileagePlus member number',
    );

    const hotelCopyButton = screen.getByRole('button', {
      name: 'Copy World of Hyatt member number',
    });
    fireEvent.click(hotelCopyButton);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
        'HY000011',
      );
    });
  });

  it('asks the user to update when a newer cached release is available', async () => {
    await storageArea.set({
      [UPDATE_CACHE_KEY]: {
        checkedAt: Date.now(),
        latestVersion: '1.4.0',
      },
    });

    render(<App />);

    const alert = await screen.findByRole('status', {
      name: 'Update available',
    });
    expect(alert).toHaveTextContent('Version 1.4.0 is available.');
    expect(
      screen.getByRole('link', { name: 'Update to version 1.4.0' }),
    ).toHaveAttribute('href', LATEST_RELEASE_URL);
    expect(
      screen.getByRole('link', { name: 'Update to version 1.4.0' }),
    ).toHaveAttribute('target', '_blank');
  });

  it('allows a member number to be corrected with the manual fallback', async () => {
    render(<App />);
    await screen.findByRole('button', {
      name: 'Copy United MileagePlus member number',
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit United MileagePlus' }),
    );
    const memberNumberInput = screen.getByLabelText('Member number');
    fireEvent.change(memberNumberInput, {
      target: { value: 'UA000099' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }));

    await waitFor(() => {
      expect(storageArea.snapshot()).toMatchObject({
        [STORAGE_KEY]: {
          records: {
            united: {
              manualOverride: {
                memberNumber: 'UA000099',
              },
            },
          },
        },
      });
    });
    expect(
      screen.queryByRole('dialog', { name: 'United MileagePlus' }),
    ).not.toBeInTheDocument();
  });

  it('uses a balance-only manual editor for Amex', async () => {
    render(<App />);
    expect(await screen.findByText('112,233')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Edit American Express Membership Rewards',
      }),
    );

    expect(screen.getByRole('dialog')).toHaveTextContent(
      'American Express Membership Rewards',
    );
    expect(screen.getByLabelText('Balance')).toBeInTheDocument();
    expect(screen.queryByLabelText('Member number')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Expiration type')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Balance'), {
      target: { value: '600000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }));

    await waitFor(() => {
      expect(storageArea.snapshot()).toMatchObject({
        [STORAGE_KEY]: {
          records: {
            amex: {
              manualOverride: {
                balance: 600000,
                memberNumber: null,
                expiration: {
                  type: 'unknown',
                  date: null,
                },
              },
            },
          },
        },
      });
    });
  });

  it('edits cash balances as dollars while storing exact cents', async () => {
    render(<App />);
    expect(await screen.findByText('$697.96')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Edit Southwest Flight Credits',
      }),
    );

    expect(screen.getByLabelText('Balance (USD)')).toHaveValue('697.96');
    fireEvent.change(screen.getByLabelText('Balance (USD)'), {
      target: { value: '88.07' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }));

    await waitFor(() => {
      expect(storageArea.snapshot()).toMatchObject({
        [STORAGE_KEY]: {
          records: {
            southwestcredit: {
              manualOverride: {
                balance: 8807,
                memberNumber: 'RR000016',
                expiration: {
                  type: 'fixed_date',
                  date: '2028-01-15',
                },
              },
            },
          },
        },
      });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Airline total balance')).toHaveTextContent(
      'Total1,560,208',
    );
  });

  it('allows a signed manual balance only for Credit Card programs', async () => {
    render(<App />);
    expect(await screen.findByText('-4,321')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit Bilt Rewards' }),
    );
    fireEvent.change(screen.getByLabelText('Balance'), {
      target: { value: '-5000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }));

    await waitFor(() => {
      expect(storageArea.snapshot()).toMatchObject({
        [STORAGE_KEY]: {
          records: {
            bilt: {
              manualOverride: {
                balance: -5000,
                memberNumber: null,
              },
            },
          },
        },
      });
    });
  });
});
