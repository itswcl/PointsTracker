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
