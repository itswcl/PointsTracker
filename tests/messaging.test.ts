import { describe, expect, it } from 'vitest';
import {
  isPointsTrackerMessage,
  MESSAGE_TYPES,
} from '../src/messaging.js';

describe('typed extension messaging', () => {
  it('accepts a supported refresh command', () => {
    expect(
      isPointsTrackerMessage({
        type: MESSAGE_TYPES.REFRESH_PROGRAM,
        programId: 'united',
      }),
    ).toBe(true);
  });

  it('rejects unknown programs and incomplete page observations', () => {
    expect(
      isPointsTrackerMessage({
        type: MESSAGE_TYPES.REFRESH_PROGRAM,
        programId: 'unknown-airline',
      }),
    ).toBe(false);
    expect(
      isPointsTrackerMessage({
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'united',
      }),
    ).toBe(false);
  });

  it('accepts a complete discriminated success message', () => {
    expect(
      isPointsTrackerMessage({
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'united',
        pageUrl: 'https://www.united.com/en/us/myunited',
        final: false,
        result: {
          kind: 'success',
          authState: 'authenticated',
          capture: {
            balance: 125400,
            memberNumber: 'UA000001',
            expiration: {
              type: 'never',
              date: null,
              note: 'No expiration',
            },
          },
          reason: null,
        },
      }),
    ).toBe(true);
  });

  it('accepts one validated batch for programs sharing an account page', () => {
    expect(
      isPointsTrackerMessage({
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        pageUrl: 'https://www.united.com/en/us/myunited',
        final: false,
        observations: [
          {
            programId: 'united',
            result: {
              kind: 'success',
              authState: 'authenticated',
              capture: {
                balance: 125400,
                memberNumber: 'UA000001',
                expiration: {
                  type: 'never',
                  date: null,
                  note: 'No expiration',
                },
              },
              reason: null,
            },
          },
          {
            programId: 'unitedpool',
            result: {
              kind: 'success',
              authState: 'authenticated',
              capture: {
                balance: 22000,
                memberNumber: null,
                expiration: {
                  type: 'never',
                  date: null,
                  note: 'No expiration',
                },
              },
              reason: null,
            },
          },
          {
            programId: 'unitedtravelbank',
            result: {
              kind: 'success',
              authState: 'authenticated',
              capture: {
                balance: 12550,
                memberNumber: null,
                expiration: {
                  type: 'fixed_date',
                  date: '2027-06-15',
                  note: 'Earliest displayed TravelBank expiration',
                },
              },
              reason: null,
            },
          },
        ],
      }),
    ).toBe(true);
  });

  it('rejects empty, duplicate, or invalid shared-page observations', () => {
    const validObservation = {
      programId: 'southwest',
      result: {
        kind: 'success',
        authState: 'authenticated',
        capture: {
          balance: 20383,
          memberNumber: 'RR000016',
          expiration: {
            type: 'never',
            date: null,
            note: 'No expiration',
          },
        },
        reason: null,
      },
    };

    expect(
      isPointsTrackerMessage({
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        pageUrl: 'https://www.southwest.com/loyalty/myaccount/',
        final: false,
        observations: [],
      }),
    ).toBe(false);
    expect(
      isPointsTrackerMessage({
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        pageUrl: 'https://www.southwest.com/loyalty/myaccount/',
        final: false,
        observations: [validObservation, validObservation],
      }),
    ).toBe(false);
    expect(
      isPointsTrackerMessage({
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        pageUrl: 'https://www.southwest.com/loyalty/myaccount/',
        final: false,
        observations: [
          validObservation,
          {
            programId: 'southwestcredit',
            result: {
              kind: 'success',
              authState: 'authenticated',
              capture: {
                balance: -1,
                memberNumber: null,
                expiration: {
                  type: 'never',
                  date: null,
                  note: 'No expiration',
                },
              },
              reason: null,
            },
          },
        ],
      }),
    ).toBe(false);
  });

  it('accepts negative Credit Card balances but rejects them for loyalty programs', () => {
    const result = {
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: -4321,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'Expiration does not apply to this balance-only ledger row',
        },
      },
      reason: null,
    };

    expect(
      isPointsTrackerMessage({
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'bilt',
        pageUrl: 'https://www.bilt.com/rewards/neighborhood',
        final: false,
        result,
      }),
    ).toBe(true);
    expect(
      isPointsTrackerMessage({
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'united',
        pageUrl: 'https://www.united.com/en/us/myunited',
        final: false,
        result,
      }),
    ).toBe(false);
  });

  it('accepts a member-number-only observation from a secondary account page', () => {
    expect(
      isPointsTrackerMessage({
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'ana',
        pageUrl:
          'https://cam.ana.co.jp/psz/amcj/jsp/renew/amcMemberReference/amcMemberReferenceOS_e.jsp',
        final: false,
        result: {
          kind: 'member_number_found',
          authState: 'authenticated',
          capture: { memberNumber: 'NH000009' },
          reason: null,
        },
      }),
    ).toBe(true);
  });
});
