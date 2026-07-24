import { describe, expect, it } from 'vitest';
import {
  isValidMemberNumber,
  normalizeMemberNumber,
} from '../../src/domain/member-numbers.js';

describe('member numbers', () => {
  it('preserves leading zeroes and normalizes harmless display formatting', () => {
    expect(normalizeMemberNumber('  # 0012 345 678  ')).toBe('0012 345 678');
    expect(normalizeMemberNumber('AA-000006')).toBe('AA-000006');
    expect(normalizeMemberNumber('****1234')).toBe('****1234');
  });

  it('rejects labels, credential-like punctuation, and invalid lengths', () => {
    expect(normalizeMemberNumber('Member number')).toBeNull();
    expect(normalizeMemberNumber('user@example.com')).toBeNull();
    expect(normalizeMemberNumber('ab')).toBeNull();
    expect(normalizeMemberNumber('A'.repeat(33) + '1')).toBeNull();
    expect(isValidMemberNumber('UA000001')).toBe(true);
  });
});
