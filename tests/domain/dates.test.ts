import { describe, expect, it } from 'vitest';
import {
  addMonths,
  formatDateKey,
  formatMonthKey,
  isValidDateKey,
  isValidMonthKey,
  parseDisplayedDate,
  parseDisplayedMonth,
  toDateKey,
} from '../../src/domain/dates.js';

describe('date helpers', () => {
  it('formats stored dates as MM/DD/YYYY', () => {
    expect(formatDateKey('2026-07-17')).toBe('07/17/2026');
    expect(formatDateKey(null)).toBe('—');
  });

  it('validates real calendar dates', () => {
    expect(isValidDateKey('2024-02-29')).toBe(true);
    expect(isValidDateKey('2025-02-29')).toBe(false);
  });

  it('parses supported account date formats', () => {
    expect(parseDisplayedDate('12/14/2026')).toBe('2026-12-14');
    expect(parseDisplayedDate('14 Dec 2026')).toBe('2026-12-14');
    expect(parseDisplayedDate('December 14, 2026')).toBe('2026-12-14');
  });

  it('preserves month-only expiration precision', () => {
    expect(parseDisplayedMonth('Jul. 2028')).toBe('2028-07');
    expect(parseDisplayedMonth('2029/3')).toBe('2029-03');
    expect(parseDisplayedMonth('03/2029')).toBe('2029-03');
    expect(formatMonthKey('2028-07')).toBe('07/2028');
    expect(isValidMonthKey('2028-13')).toBe(false);
  });

  it('adds activity-policy months without overflowing month end', () => {
    expect(addMonths('2025-08-31', 18)).toBe('2027-02-28');
  });

  it('uses the local calendar date for update records', () => {
    expect(toDateKey(new Date(2026, 6, 17, 23, 59))).toBe('2026-07-17');
  });
});
