import { describe, expect, it } from 'vitest';
import {
  applyAutomaticCapture,
  applyAutomaticMemberNumber,
  applyManualOverride,
  clearManualOverride,
  createInitialState,
  getDisplayRecord,
  markRecordStatus,
  normalizeState,
  recoverInterruptedCaptures,
  validateStateForImport,
  validateCapture,
} from '../../src/domain/records.js';
import type { AutomaticCapture } from '../../src/types.js';

const automaticCapture: AutomaticCapture = {
  balance: 125400,
  memberNumber: 'UA000001',
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
        memberNumber: 'UA000001',
        expiration: { type: 'never', date: null, note: 'No expiration' },
      },
      new Date(2026, 6, 18),
    );

    expect(getDisplayRecord(state.records.united)).toMatchObject({
      balance: 130000,
      memberNumber: 'UA000001',
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

  it('shows an automatic member number beneath a blank manual member field', () => {
    const automatic = applyAutomaticCapture(
      createInitialState(),
      'virginatlantic',
      {
        balance: 163250,
        memberNumber: 'VS000004',
        expiration: { type: 'never', date: null, note: 'No expiration' },
      },
      new Date(2026, 6, 17),
    );
    const manual = applyManualOverride(
      automatic,
      'virginatlantic',
      {
        balance: 164000,
        memberNumber: null,
        expiration: { type: 'never', date: null, note: 'No expiration' },
      },
      new Date(2026, 6, 18),
    );

    expect(getDisplayRecord(manual.records.virginatlantic)).toMatchObject({
      balance: 164000,
      memberNumber: 'VS000004',
      source: 'manual',
    });
  });

  it('rejects state with unexpected private fields during import', () => {
    const state = createInitialState();
    Reflect.set(state.records.united, 'username', 'should-not-be-here');
    expect(validateStateForImport(state)).toBe(false);
  });

  it('rejects unexpected private fields from automatic captures', () => {
    expect(
      validateCapture({
        ...automaticCapture,
        username: 'should-not-be-here',
      }),
    ).toBe(false);
  });

  it('preserves the last captured member number when a later page omits it', () => {
    const first = applyAutomaticCapture(
      createInitialState(),
      'united',
      automaticCapture,
      new Date(2026, 6, 17),
    );
    const next = applyAutomaticCapture(
      first,
      'united',
      {
        ...automaticCapture,
        balance: 126000,
        memberNumber: null,
      },
      new Date(2026, 6, 18),
    );

    expect(next.records.united.automatic).toMatchObject({
      balance: 126000,
      memberNumber: 'UA000001',
    });
  });

  it('adds a member number without replacing balance or expiration', () => {
    const captured = applyAutomaticCapture(
      createInitialState(),
      'britishairways',
      {
        balance: 42300,
        memberNumber: null,
        expiration: {
          type: 'activity_based',
          date: '2029-01-01',
          note: 'Derived from newest activity',
        },
      },
      new Date(2026, 6, 17),
    );
    const merged = applyAutomaticMemberNumber(
      captured,
      'britishairways',
      'BA000008',
      new Date(2026, 6, 18),
    );

    expect(merged.records.britishairways.automatic).toMatchObject({
      balance: 42300,
      memberNumber: 'BA000008',
      expiration: { date: '2029-01-01' },
      updatedOn: '2026-07-18',
    });
  });

  it('preserves an expiring amount with month-only precision', () => {
    const state = applyAutomaticCapture(
      createInitialState(),
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

    expect(state.records.evaair.automatic.expiration).toMatchObject({
      month: '2028-07',
      amount: 50,
    });
  });

  it('loads records written before member-number capture was added', () => {
    const legacyState = createInitialState();
    Reflect.deleteProperty(
      legacyState.records.united.automatic,
      'memberNumber',
    );

    expect(validateStateForImport(legacyState)).toBe(true);
    expect(normalizeState(legacyState).records.united.automatic.memberNumber).toBeNull();
  });

  it('recovers a persisted updating status after the background restarts', () => {
    let state = applyAutomaticCapture(
      createInitialState(),
      'united',
      automaticCapture,
      new Date(2026, 6, 17),
    );
    state = markRecordStatus(state, 'united', 'updating');
    state = markRecordStatus(state, 'cathay', 'error', 'balance_not_found');

    const recovered = recoverInterruptedCaptures(state);

    expect(recovered.records.united).toMatchObject({
      automatic: {
        balance: 125400,
        memberNumber: 'UA000001',
      },
      status: 'error',
      error: 'capture_interrupted',
    });
    expect(recovered.records.cathay).toMatchObject({
      status: 'error',
      error: 'balance_not_found',
    });
  });
});
