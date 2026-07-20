import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../entrypoints/popup/App.jsx';
import {
  applyAutomaticCapture,
  createInitialState,
  STORAGE_KEY,
} from '../../src/domain/records.js';
import { createFakeStorageArea } from '../helpers/fake-storage.js';

function eventTarget() {
  return {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };
}

describe('popup', () => {
  beforeEach(() => {
    let state = applyAutomaticCapture(
      createInitialState(),
      'united',
      {
        balance: 125400,
        expiration: { type: 'never', date: null, note: 'No expiration' },
      },
      new Date(2026, 6, 17),
    );
    state = applyAutomaticCapture(
      state,
      'cathay',
      {
        balance: 84500,
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
      'hyatt',
      {
        balance: 55000,
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
        expiration: {
          type: 'activity_based',
          date: '2028-07-05',
          inactivityMonths: 24,
          note: 'Derived from the newest All Qualifying Marriott activity',
        },
      },
      new Date(2026, 6, 17),
    );

    globalThis.chrome = {
      storage: {
        local: createFakeStorageArea({ [STORAGE_KEY]: state }),
        onChanged: eventTarget(),
      },
      runtime: { sendMessage: vi.fn(async () => ({ ok: true })) },
    };
  });

  it('renders compact balances and fixed date formatting without identifiers', async () => {
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
    expect(screen.getByText('55,000')).toBeInTheDocument();
    expect(screen.getByText('180,000')).toBeInTheDocument();
    expect(screen.getByText('340,000')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Airline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hotel' })).toBeInTheDocument();
    expect(screen.getByLabelText('Airline total balance')).toHaveTextContent(
      'Total1,398,525',
    );
    expect(screen.getByLabelText('Hotel total balance')).toHaveTextContent(
      'Total575,000',
    );
    expect(screen.getByText('50 · 07/2028')).toBeInTheDocument();
    expect(screen.getByText('10/2028')).toBeInTheDocument();
    expect(screen.getAllByText('07/17/2026')).toHaveLength(12);
    expect(screen.getByText('12/14/2026')).toBeInTheDocument();
    expect(screen.getByText('05/15/2027')).toBeInTheDocument();
    expect(screen.getByText('01/01/2029')).toBeInTheDocument();
    expect(screen.getByText('07/05/2028')).toBeInTheDocument();
    expect(screen.getByText('24 mo inactivity')).toBeInTheDocument();
    expect(screen.getAllByText('N/A')).toHaveLength(5);
    expect(container.querySelectorAll('[data-program-icon]')).toHaveLength(12);
    expect(
      container.querySelector('[data-program-icon="united"] .program-icon__mark'),
    ).toBeInTheDocument();
    expect(
      container
        .querySelector('[data-program-icon="cathay"] .program-icon__image')
        .getAttribute('href'),
    ).toMatch(/^data:image\/png;base64,/);
    expect(
      container.querySelector('[data-program-icon="hyatt"] .program-icon__image'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-program-icon="hilton"] .program-icon__mark'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-program-icon="marriott"] .program-icon__mark'),
    ).toBeInTheDocument();
    expect(container.querySelector('.program-icon text')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'United MileagePlus' }),
    ).toHaveClass('visually-hidden');
    expect(screen.queryByText('No expiration')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/username|password|member number/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Points / 02')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh all' })).not.toBeInTheDocument();
    expect(screen.queryByText('Current')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh United MileagePlus' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open United MileagePlus account' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Edit United MileagePlus' }),
    ).toBeInTheDocument();
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
      screen.getByRole('button', { name: 'Refresh World of Hyatt' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh Hilton Honors' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh Marriott Bonvoy' }),
    ).toBeInTheDocument();

    const rowOrder = () =>
      Array.from(container.querySelectorAll('.program-row')).map((row) =>
        row.getAttribute('aria-labelledby'),
      );
    const airlineSection = container.querySelector('[data-ledger-section="airline"]');
    const hotelSection = container.querySelector('[data-ledger-section="hotel"]');
    expect(container.querySelector('.program-list').children).toHaveLength(2);
    expect(container.querySelector('.program-list').firstElementChild).toBe(
      airlineSection,
    );
    expect(container.querySelector('.program-list').lastElementChild).toBe(
      hotelSection,
    );
    const originalOrder = [
      'united-name',
      'cathay-name',
      'airfrance-name',
      'virginatlantic-name',
      'alaska-name',
      'american-name',
      'evaair-name',
      'britishairways-name',
      'ana-name',
      'hyatt-name',
      'hilton-name',
      'marriott-name',
    ];
    expect(rowOrder()).toEqual(originalOrder);
    expect(airlineSection.lastElementChild).toHaveClass('ledger-total-row');
    expect(hotelSection.lastElementChild).toHaveClass('ledger-total-row');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Sort Airline by expiration, earliest first',
      }),
    );
    expect(rowOrder()).toEqual([
      'cathay-name',
      'airfrance-name',
      'evaair-name',
      'ana-name',
      'britishairways-name',
      'united-name',
      'virginatlantic-name',
      'alaska-name',
      'american-name',
      'hyatt-name',
      'hilton-name',
      'marriott-name',
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
      'alaska-name',
      'airfrance-name',
      'american-name',
      'virginatlantic-name',
      'united-name',
      'evaair-name',
      'cathay-name',
      'ana-name',
      'britishairways-name',
      'hyatt-name',
      'hilton-name',
      'marriott-name',
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
      'united-name',
      'cathay-name',
      'airfrance-name',
      'virginatlantic-name',
      'alaska-name',
      'american-name',
      'evaair-name',
      'britishairways-name',
      'ana-name',
      'marriott-name',
      'hilton-name',
      'hyatt-name',
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
      'united-name',
      'cathay-name',
      'airfrance-name',
      'virginatlantic-name',
      'alaska-name',
      'american-name',
      'evaair-name',
      'britishairways-name',
      'ana-name',
      'marriott-name',
      'hyatt-name',
      'hilton-name',
    ]);

    const americanRow = container.querySelector('[aria-labelledby="american-name"]');
    expect(
      Array.from(americanRow.children).map((child) => child.className),
    ).toEqual([
      'visually-hidden',
      'program-icon program-icon--american',
      'program-balance',
      'record-facts',
      'program-actions',
      'program-updated',
    ]);
  });
});
