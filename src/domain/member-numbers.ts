const MEMBER_NUMBER_MAX_LENGTH = 32;
const MEMBER_NUMBER_PATTERN = /^[A-Za-z0-9*][A-Za-z0-9* -]*$/;

export function normalizeMemberNumber(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value
    .trim()
    .replace(/^#\s*/, '')
    .replace(/\s+/g, ' ');

  if (
    normalized.length < 3 ||
    normalized.length > MEMBER_NUMBER_MAX_LENGTH ||
    !MEMBER_NUMBER_PATTERN.test(normalized) ||
    !/\d/.test(normalized)
  ) {
    return null;
  }

  return normalized;
}

export function isValidMemberNumber(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    normalizeMemberNumber(value) === value
  );
}
