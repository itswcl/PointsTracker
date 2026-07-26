const BALANCE_TOKEN = /(?:^|\s)(\d{1,3}(?:[,.\s]\d{3})+|\d+)(?:\s|$)/;
const SIGNED_BALANCE_TOKEN =
  /(?:^|\s)(-?\d{1,3}(?:[,.\s]\d{3})+|-?\d+)(?:\s|$)/;
const USD_AMOUNT_PATTERN =
  /^\s*\$?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)\s*$/;

export function parseBalance(value: unknown): number | null {
  return parseBalanceWithPolicy(value, false);
}

export function parseSignedBalance(value: unknown): number | null {
  return parseBalanceWithPolicy(value, true);
}

export function parseUsdCents(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0
      ? Math.round(value * 100)
      : null;
  }
  if (typeof value !== 'string') return null;

  const match = value.replace(/\u00a0/g, ' ').match(USD_AMOUNT_PATTERN);
  const numericText = match?.[1];
  if (!numericText) return null;

  const dollars = Number(numericText.replace(/,/g, ''));
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  const cents = Math.round(dollars * 100);
  return Number.isSafeInteger(cents) ? cents : null;
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

export function formatUsdCents(value: unknown): string {
  return isValidBalance(value)
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value / 100)
    : '—';
}

export function formatUsdCentsInput(value: unknown): string {
  return isValidBalance(value) ? (value / 100).toFixed(2) : '';
}
