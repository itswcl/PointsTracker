import { parseDisplayedDate } from '../domain/dates.js';
import type { DateKey } from '../types.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
} from './shared.js';
import { readUnitedMemberNumber } from './united.js';

const SYNTHETIC_BALANCE_SELECTOR =
  '[data-points-tracker="united-travelbank-balance"]';
const SYNTHETIC_EXPIRATION_SELECTOR =
  '[data-points-tracker="united-travelbank-expiration"]';
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
const USD_PATTERN = /^\$\s*(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})$/;
const DISPLAYED_DATE_PATTERNS = Object.freeze([
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g,
  /\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/g,
  /\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/g,
]);
const MAX_HEADINGS = 40;
const MAX_CONTAINER_ELEMENTS = 80;

const ACCOUNT_SELECTORS = Object.freeze([
  '[id="wallet-travel-bank"]',
  '[id="wallet-travel-bank-title"]',
  '[class*="TravelBank"]',
  '[data-points-tracker-auth="united"]',
  'a[href*="/account/activity"]',
  'a[href*="/account/profile"]',
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="signin"]',
  'form[action*="sign-in"]',
  '[data-testid="sign-in-form"]',
]);

function normalizedDisplayText(element: Element | null): string | null {
  if (
    !(element instanceof HTMLElement) ||
    element.isContentEditable ||
    element.closest(
      'input, textarea, select, [contenteditable="true"], [hidden]',
    )
  ) {
    return null;
  }

  return element.textContent?.replace(/\s+/g, ' ').trim() ?? null;
}

function parseUsdCents(value: string | null): number | null {
  const match = value?.match(USD_PATTERN);
  const dollarsText = match?.[1];
  const centsText = match?.[2];
  if (!dollarsText || !centsText) return null;

  const dollars = Number(dollarsText.replace(/,/g, ''));
  const cents = dollars * 100 + Number(centsText);
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

function headingText(heading: Element): string | null {
  return Array.from(heading.childNodes)
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim() || normalizedDisplayText(heading);
}

function travelBankHeadings(document: Document): HTMLElement[] {
  return Array.from(document.querySelectorAll(HEADING_SELECTOR))
    .slice(0, MAX_HEADINGS)
    .filter(
      (heading): heading is HTMLElement =>
        heading instanceof HTMLElement &&
        /^travelbank$/i.test(headingText(heading) ?? ''),
    );
}

function readSyntheticBalance(document: Document): number | null {
  return parseUsdCents(
    normalizedDisplayText(document.querySelector(SYNTHETIC_BALANCE_SELECTOR)),
  );
}

function readTravelBankBalance(document: Document): number | null {
  const syntheticBalance = readSyntheticBalance(document);
  if (syntheticBalance !== null) return syntheticBalance;

  const balances = new Set<number>();
  const summaryHeadings = travelBankHeadings(document).filter(
    (heading) => headingText(heading) === 'TRAVELBANK',
  );

  for (const heading of summaryHeadings) {
    const container = heading.parentElement;
    if (!container) continue;

    const elements = Array.from(container.querySelectorAll('span, p, div'))
      .slice(0, MAX_CONTAINER_ELEMENTS);

    for (const element of elements) {
      if (element.closest('[aria-hidden="true"]')) continue;
      const balance = parseUsdCents(normalizedDisplayText(element));
      if (balance === null) continue;
      balances.add(balance);
      break;
    }
  }

  return balances.size === 1 ? [...balances][0] ?? null : null;
}

function datesFromText(text: string | null): DateKey[] {
  if (!text) return [];

  const dates: DateKey[] = [];
  for (const pattern of DISPLAYED_DATE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const date = parseDisplayedDate(match[0]);
      if (date) dates.push(date);
    }
  }
  return dates;
}

function readEarliestTravelBankExpiration(
  document: Document,
): DateKey | null {
  const dates = new Set<DateKey>();
  const syntheticExpiration = normalizedDisplayText(
    document.querySelector(SYNTHETIC_EXPIRATION_SELECTOR),
  );
  for (const date of datesFromText(syntheticExpiration)) dates.add(date);

  for (const heading of travelBankHeadings(document)) {
    const container = heading.parentElement;
    if (!container) continue;

    const elements = Array.from(
      container.querySelectorAll('span, time'),
    ).slice(0, MAX_CONTAINER_ELEMENTS);
    for (const element of elements) {
      for (const date of datesFromText(normalizedDisplayText(element))) {
        dates.add(date);
      }
    }
  }

  return [...dates].sort()[0] ?? null;
}

export function inspectUnitedTravelBank(
  document: Document,
  rawUrl: string,
) {
  const balance = readTravelBankBalance(document);
  if (balance !== null) {
    const expirationDate = readEarliestTravelBankExpiration(document);
    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        memberNumber: readUnitedMemberNumber(document),
        expiration: expirationDate
          ? {
              type: 'fixed_date',
              date: expirationDate,
              note: 'Earliest displayed TravelBank expiration',
            }
          : {
              type: 'unknown',
              date: null,
              note: 'No TravelBank expiration displayed',
            },
      },
    });
  }

  if (pageHasVerification(document, rawUrl)) {
    return inspectionResult({
      kind: 'verification_required',
      reason: 'verification_required',
    });
  }

  if (
    pathIncludes(rawUrl, ['/login', '/signin', '/sign-in']) ||
    hasAllowedElement(document, LOGIN_PAGE_SELECTORS)
  ) {
    return inspectionResult({
      kind: 'login_required',
      authState: 'signed_out',
      reason: 'login_required',
    });
  }

  const authenticated =
    pathIncludes(rawUrl, ['/myunited', '/account/']) ||
    hasAllowedElement(document, ACCOUNT_SELECTORS);

  return inspectionResult({
    kind: 'not_found',
    authState: authenticated ? 'authenticated' : 'unknown',
    reason: 'balance_not_found',
  });
}
