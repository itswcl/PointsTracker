import { describe, expect, it } from 'vitest';
import {
  applyAutomaticCapture,
  applyManualOverride,
  clearManualOverride,
  createInitialState,
  getDisplayRecord,
  validateStateForImport,
} from '../../src/domain/records.js';
import type { AutomaticCapture } from '../../src/types.js';

const automaticCapture: AutomaticCapture = {
  balance: 125400,
  expiration: { type: 'never', date: null, note: 'No expiration' },
};

describe('program records', () => {
  it('preserves automatic data beneath a manual override', () => {
    let state = applyAutomaticCapture(
      createInitialState(),
      'united',
      automaticCapture,
      new Date(2026, 6, 17),
    );
    state = applyManualOverride(
      state,
      'united',
      {
        balance: 130000,
        expiration: { type: 'never', date: null, note: 'No expiration' },
      },
      new Date(2026, 6, 18),
    );

    expect(getDisplayRecord(state.records.united)).toMatchObject({
      balance: 130000,
      source: 'manual',
      updatedOn: '2026-07-18',
    });
    expect(state.records.united.automatic.balance).toBe(125400);

    state = clearManualOverride(state, 'united');
    expect(getDisplayRecord(state.records.united)).toMatchObject({
      balance: 125400,
      source: 'automatic',
    });
  });

  it('rejects state with unexpected private fields during import', () => {
    const state = createInitialState();
    Reflect.set(state.records.united, 'username', 'should-not-be-here');
    expect(validateStateForImport(state)).toBe(false);
  });

  it('preserves an expiring amount with month-only precision', () => {
    const state = applyAutomaticCapture(
      createInitialState(),
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

    expect(state.records.evaair.automatic.expiration).toMatchObject({
      month: '2028-07',
      amount: 50,
    });
  });
});
