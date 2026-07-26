import { describe, expect, it } from 'vitest';
import {
  formatBalance,
  formatUsdCents,
  formatUsdCentsInput,
  parseBalance,
  parseSignedBalance,
  parseUsdCents,
} from '../../src/domain/balances.js';

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

  it('parses and formats signed balances only when explicitly allowed', () => {
    expect(parseSignedBalance('-1,250 points')).toBe(-1250);
    expect(parseSignedBalance('−75')).toBe(-75);
    expect(formatBalance(-1250, true)).toBe('-1,250');
    expect(formatBalance(-1250)).toBe('—');
  });

  it('parses and formats USD values as exact integer cents', () => {
    expect(parseUsdCents('$1,234.56')).toBe(123456);
    expect(parseUsdCents('0')).toBe(0);
    expect(parseUsdCents('12.5')).toBe(1250);
    expect(parseUsdCents('12.345')).toBeNull();
    expect(parseUsdCents('-1.00')).toBeNull();
    expect(formatUsdCents(123456)).toBe('$1,234.56');
    expect(formatUsdCents(null)).toBe('—');
    expect(formatUsdCentsInput(123456)).toBe('1234.56');
  });
});
