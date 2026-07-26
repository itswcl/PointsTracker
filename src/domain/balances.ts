const BALANCE_TOKEN = /(?:^|\s)(\d{1,3}(?:[,.\s]\d{3})+|\d+)(?:\s|$)/;
const SIGNED_BALANCE_TOKEN =
  /(?:^|\s)(-?\d{1,3}(?:[,.\s]\d{3})+|-?\d+)(?:\s|$)/;

export function parseBalance(value: unknown): number | null {
  return parseBalanceWithPolicy(value, false);
}

export function parseSignedBalance(value: unknown): number | null {
  return parseBalanceWithPolicy(value, true);
}

function parseBalanceWithPolicy(
  value: unknown,
  allowNegative: boolean,
): number | null {
  const validator = allowNegative ? isValidSignedBalance : isValidBalance;
  if (typeof value === 'number') {
    return validator(value) ? value : null;
  }

  if (typeof value !== 'string') return null;
  const normalized = value
    .replace(/\u00a0/g, ' ')
    .replace(/\u2212/g, '-')
    .trim();
  const match = normalized.match(
    allowNegative ? SIGNED_BALANCE_TOKEN : BALANCE_TOKEN,
  );
  if (!match) return null;

  const numericText = match[1];
  if (!numericText) return null;
  const numeric = Number(numericText.replace(/[,.\s]/g, ''));
  return validator(numeric) ? numeric : null;
}

export function isValidBalance(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function isValidSignedBalance(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function formatBalance(
  value: unknown,
  allowNegative = false,
): string {
  if (allowNegative) {
    return isValidSignedBalance(value)
      ? new Intl.NumberFormat('en-US').format(value)
      : '—';
  }
  return isValidBalance(value)
    ? new Intl.NumberFormat('en-US').format(value)
    : '—';
}
