import { describe, expect, it } from 'vitest';
import { shouldFinishObservation } from '../../src/background/observation-policy.js';
import type { InspectionResult } from '../../src/types.js';

const balanceOnly: InspectionResult = {
  kind: 'success',
  authState: 'authenticated',
  capture: {
    balance: 163250,
    memberNumber: null,
    expiration: { type: 'never', date: null, note: 'No expiration' },
  },
  reason: null,
};

describe('content-script observation policy', () => {
  it('keeps observing a one-page program until its member number renders', () => {
    expect(shouldFinishObservation(balanceOnly, false, false)).toBe(false);
  });

  it('finishes after the member number appears', () => {
    const complete: InspectionResult = {
      ...balanceOnly,
      capture: {
        ...balanceOnly.capture,
        memberNumber: 'VS000004',
      },
    };

    expect(shouldFinishObservation(complete, false, false)).toBe(true);
  });

  it('finishes a balance-only observation at the end of the window', () => {
    expect(shouldFinishObservation(balanceOnly, true, false)).toBe(true);
  });

  it('lets split-page programs navigate to their member-number page', () => {
    expect(shouldFinishObservation(balanceOnly, false, true)).toBe(true);
  });
});
