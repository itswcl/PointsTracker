import { describe, expect, it } from 'vitest';
import { formatBalance, parseBalance } from '../../src/domain/balances.js';

describe('balance helpers', () => {
  it('parses formatted balances from display text', () => {
    expect(parseBalance('Balance 125,400 miles')).toBe(125400);
    expect(parseBalance('84500')).toBe(84500);
    expect(parseBalance('0 miles')).toBe(0);
  });

  it('rejects negative, decimal, and missing balances', () => {
    expect(parseBalance('-10')).toBeNull();
    expect(parseBalance('12.5 miles')).toBeNull();
    expect(parseBalance('not available')).toBeNull();
  });

  it('formats a valid balance for the popup', () => {
    expect(formatBalance(125400)).toBe('125,400');
    expect(formatBalance(null)).toBe('—');
  });
});

