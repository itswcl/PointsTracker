const BALANCE_TOKEN = /(?:^|\s)(\d{1,3}(?:[,.\s]\d{3})+|\d+)(?:\s|$)/;

export function parseBalance(value: unknown): number | null {
  if (typeof value === 'number') {
    return isValidBalance(value) ? value : null;
  }

  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\u00a0/g, ' ').trim();
  const match = normalized.match(BALANCE_TOKEN);
  if (!match) return null;

  const numericText = match[1];
  if (!numericText) return null;
  const numeric = Number(numericText.replace(/[,.\s]/g, ''));
  return isValidBalance(numeric) ? numeric : null;
}

export function isValidBalance(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function formatBalance(value: unknown): string {
  return isValidBalance(value) ? new Intl.NumberFormat('en-US').format(value) : '—';
}
