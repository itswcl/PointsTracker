const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;
const US_DATE_PATTERN = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
const MONTH_NAME_PATTERN =
  /^(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})$|^([a-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/i;
const DISPLAYED_MONTH_PATTERN = /^([a-z]{3,9})\.?\s+(\d{4})$/i;
const YEAR_MONTH_SLASH_PATTERN = /^(\d{4})\/(\d{1,2})$/;

const MONTHS = new Map([
  ['jan', 1],
  ['january', 1],
  ['feb', 2],
  ['february', 2],
  ['mar', 3],
  ['march', 3],
  ['apr', 4],
  ['april', 4],
  ['may', 5],
  ['jun', 6],
  ['june', 6],
  ['jul', 7],
  ['july', 7],
  ['aug', 8],
  ['august', 8],
  ['sep', 9],
  ['sept', 9],
  ['september', 9],
  ['oct', 10],
  ['october', 10],
  ['nov', 11],
  ['november', 11],
  ['dec', 12],
  ['december', 12],
]);

function pad(value) {
  return String(value).padStart(2, '0');
}

function partsToDateKey(year, month, day) {
  const key = `${year}-${pad(month)}-${pad(day)}`;
  return isValidDateKey(key) ? key : null;
}

export function toDateKey(date = new Date()) {
  return partsToDateKey(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

export function isValidDateKey(value) {
  if (typeof value !== 'string') return false;
  const match = value.match(DATE_KEY_PATTERN);
  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function formatDateKey(value) {
  if (!isValidDateKey(value)) return '—';
  const [year, month, day] = value.split('-');
  return `${month}/${day}/${year}`;
}

export function isValidMonthKey(value) {
  if (typeof value !== 'string') return false;
  const match = value.match(MONTH_KEY_PATTERN);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export function formatMonthKey(value) {
  if (!isValidMonthKey(value)) return '—';
  const [year, month] = value.split('-');
  return `${month}/${year}`;
}

export function parseDisplayedMonth(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (isValidMonthKey(normalized)) return normalized;

  const slashMatch = normalized.match(YEAR_MONTH_SLASH_PATTERN);
  if (slashMatch) {
    const month = Number(slashMatch[2]);
    return month >= 1 && month <= 12 ? `${slashMatch[1]}-${pad(month)}` : null;
  }

  const match = normalized.match(DISPLAYED_MONTH_PATTERN);
  if (!match) return null;
  const month = MONTHS.get(match[1].toLowerCase());
  return month ? `${match[2]}-${pad(month)}` : null;
}

export function parseDisplayedDate(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');

  if (isValidDateKey(normalized)) return normalized;

  const usMatch = normalized.match(US_DATE_PATTERN);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return partsToDateKey(Number(year), Number(month), Number(day));
  }

  const monthNameMatch = normalized.match(MONTH_NAME_PATTERN);
  if (!monthNameMatch) return null;

  const day = Number(monthNameMatch[1] ?? monthNameMatch[5]);
  const monthName = (monthNameMatch[2] ?? monthNameMatch[4]).toLowerCase();
  const year = Number(monthNameMatch[3] ?? monthNameMatch[6]);
  const month = MONTHS.get(monthName);

  return month ? partsToDateKey(year, month, day) : null;
}

export function addMonths(value, monthCount) {
  if (!isValidDateKey(value) || !Number.isInteger(monthCount)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const monthIndex = month - 1 + monthCount;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  const finalDay = Math.min(
    day,
    new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate(),
  );

  return partsToDateKey(targetYear, targetMonthIndex + 1, finalDay);
}
