import { parseUsdCents } from '../domain/balances.js';
import { parseDisplayedDate } from '../domain/dates.js';
import type { DateKey } from '../types.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
} from './shared.js';
import { readSouthwestMemberNumber } from './southwest.js';

const CREDIT_ROOT_SELECTOR = '#my-flight-credits-card';
const CREDIT_ENTRY_SELECTOR = 'ul > li';
const SYNTHETIC_ENTRY_SELECTOR =
  '[data-points-tracker="southwest-flight-credit"]';
const SYNTHETIC_AMOUNT_SELECTOR =
  '[data-points-tracker="southwest-flight-credit-amount"]';
const SYNTHETIC_EXPIRATION_SELECTOR =
  '[data-points-tracker="southwest-flight-credit-expiration"]';
const NO_CREDITS_PATTERN =
  /\bthere are no flight credits associated with your account\b/i;
const ENTRY_AMOUNT_PATTERN =
  /^\s*(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{2}))?\s+Dollars\b/i;
const EXPIRATION_PATTERN = /^Expiration:\s*(.+)$/i;
const MAX_CREDIT_ENTRIES = 100;
const MAX_EXPIRATION_CANDIDATES = 40;
const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="logon"]',
  'form[action*="signin"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

function normalizedText(element: Element | null | undefined): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function isAllowedDisplayElement(
  element: Element | null | undefined,
): element is HTMLElement {
  return (
    element instanceof HTMLElement &&
    !['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(element.tagName) &&
    !element.isContentEditable &&
    !element.closest('input, textarea, select, [contenteditable="true"]')
  );
}

function creditRoot(document: Document): HTMLElement | null {
  const root = document.querySelector(CREDIT_ROOT_SELECTOR);
  return isAllowedDisplayElement(root) ? root : null;
}

function creditEntries(root: HTMLElement): HTMLElement[] {
  const synthetic = Array.from(
    root.querySelectorAll(SYNTHETIC_ENTRY_SELECTOR),
  ).filter(isAllowedDisplayElement);
  if (synthetic.length > 0) return synthetic.slice(0, MAX_CREDIT_ENTRIES);

  return Array.from(root.querySelectorAll(CREDIT_ENTRY_SELECTOR))
    .filter(isAllowedDisplayElement)
    .slice(0, MAX_CREDIT_ENTRIES);
}

function readCreditAmount(entry: HTMLElement): number | null {
  const synthetic = entry.querySelector(SYNTHETIC_AMOUNT_SELECTOR);
  if (isAllowedDisplayElement(synthetic)) {
    return parseUsdCents(normalizedText(synthetic));
  }

  const match = normalizedText(entry).match(ENTRY_AMOUNT_PATTERN);
  if (!match?.[1]) return null;
  const amount = `${match[1]}${match[2] ? `.${match[2]}` : ''}`;
  return parseUsdCents(amount);
}

type CreditExpiration =
  | { kind: 'none'; date: null }
  | { kind: 'date'; date: DateKey }
  | { kind: 'missing'; date: null };

function readCreditExpiration(entry: HTMLElement): CreditExpiration {
  const synthetic = entry.querySelector(SYNTHETIC_EXPIRATION_SELECTOR);
  const candidates = synthetic
    ? [synthetic]
    : Array.from(entry.querySelectorAll('span, div, p'))
        .filter(isAllowedDisplayElement)
        .slice(0, MAX_EXPIRATION_CANDIDATES);

  for (const candidate of candidates) {
    const value = normalizedText(candidate).match(EXPIRATION_PATTERN)?.[1];
    if (!value) continue;
    if (/^none$/i.test(value)) return { kind: 'none', date: null };
    const date = parseDisplayedDate(value);
    if (date) return { kind: 'date', date };
  }

  return { kind: 'missing', date: null };
}

function hasNoCredits(root: HTMLElement): boolean {
  return NO_CREDITS_PATTERN.test(normalizedText(root));
}

function findExpandAllButton(root: HTMLElement): HTMLButtonElement | null {
  const matches = Array.from(root.querySelectorAll('button')).filter(
    (element): element is HTMLButtonElement =>
      element instanceof HTMLButtonElement &&
      normalizedText(element) === 'Expand all',
  );
  return matches.length === 1 ? matches[0] ?? null : null;
}

export function prepareSouthwestCredit(document: Document): boolean {
  const root = creditRoot(document);
  if (!root || hasNoCredits(root)) return false;

  const entries = creditEntries(root);
  if (
    entries.length > 0 &&
    entries.every((entry) => readCreditExpiration(entry).kind !== 'missing')
  ) {
    return false;
  }

  const expandAll = findExpandAllButton(root);
  if (!expandAll) return false;
  expandAll.click();
  return true;
}

export function inspectSouthwestCredit(
  document: Document,
  rawUrl: string,
) {
  const root = creditRoot(document);
  if (root) {
    if (hasNoCredits(root)) {
      return inspectionResult({
        kind: 'success',
        authState: 'authenticated',
        capture: {
          balance: 0,
          memberNumber: readSouthwestMemberNumber(document),
          expiration: {
            type: 'never',
            date: null,
            note: 'No Southwest Flight Credits',
          },
        },
      });
    }

    const entries = creditEntries(root);
    if (entries.length > 0) {
      let totalCents = 0;
      const expirationDates: DateKey[] = [];
      let hasMissingExpiration = false;

      for (const entry of entries) {
        const amount = readCreditAmount(entry);
        if (amount === null || !Number.isSafeInteger(totalCents + amount)) {
          return inspectionResult({
            kind: 'not_found',
            authState: 'authenticated',
            reason: 'balance_not_found',
          });
        }
        totalCents += amount;

        const expiration = readCreditExpiration(entry);
        if (expiration.kind === 'missing') {
          hasMissingExpiration = true;
          continue;
        }
        if (expiration.date) expirationDates.push(expiration.date);
      }

      expirationDates.sort();
      const earliestExpiration = expirationDates[0] ?? null;
      return inspectionResult({
        kind: 'success',
        authState: 'authenticated',
        capture: {
          balance: totalCents,
          memberNumber: readSouthwestMemberNumber(document),
          expiration: earliestExpiration
            ? {
                type: 'fixed_date',
                date: earliestExpiration,
                note: 'Earliest Southwest Flight Credit expiration',
              }
            : {
                type: 'never',
                date: null,
                note: hasMissingExpiration
                  ? 'No Southwest Flight Credit expiration displayed'
                  : 'All Southwest Flight Credits show no expiration',
              },
        },
      });
    }
  }

  if (pageHasVerification(document, rawUrl)) {
    return inspectionResult({
      kind: 'verification_required',
      reason: 'verification_required',
    });
  }

  if (
    pathIncludes(rawUrl, ['/login', '/logon', '/signin', '/sign-in']) ||
    hasAllowedElement(document, LOGIN_PAGE_SELECTORS)
  ) {
    return inspectionResult({
      kind: 'login_required',
      authState: 'signed_out',
      reason: 'login_required',
    });
  }

  return inspectionResult({
    kind: 'not_found',
    authState: root ? 'authenticated' : 'unknown',
    reason: 'balance_not_found',
  });
}
