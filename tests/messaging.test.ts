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
});
