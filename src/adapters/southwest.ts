import { parseBalance } from '../domain/balances.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readMemberNumber,
} from './shared.js';

const SYNTHETIC_BALANCE_SELECTOR =
  '[data-points-tracker="southwest-points-balance"]';
const ACCOUNT_NUMBER_SELECTOR = '.accountNumber';
const AVAILABLE_POINTS_LABEL = 'Available Points';
const ACCOUNT_PAGE_SELECTORS = Object.freeze([
  ACCOUNT_NUMBER_SELECTOR,
  '#my-flight-credits-card',
]);
const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="logon"]',
  'form[action*="signin"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);
const MEMBER_NUMBER_RULES = Object.freeze([
  {
    selector: `${ACCOUNT_NUMBER_SELECTOR} > span[aria-hidden="true"]`,
    pattern: /^RR#\s*([0-9][0-9\s-]{2,31})$/i,
  },
  {
    selector: `${ACCOUNT_NUMBER_SELECTOR} > span:not([aria-hidden="true"])`,
    pattern: /^Rapid Rewards number\s*([0-9][0-9\s-]{2,31})$/i,
  },
]);
const WHOLE_POINTS_PATTERN = /^(?:\d{1,3}(?:,\d{3})*|\d+)$/;
const MAX_LABEL_CANDIDATES = 16;
const MAX_VALUE_CANDIDATES = 24;

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

function readSyntheticBalance(document: Document): number | null {
  const element = document.querySelector(SYNTHETIC_BALANCE_SELECTOR);
  return isAllowedDisplayElement(element)
    ? parseBalance(normalizedText(element))
    : null;
}

function readAvailablePoints(document: Document): number | null {
  const synthetic = readSyntheticBalance(document);
  if (synthetic !== null) return synthetic;

  const balances = new Set<number>();
  const labels = Array.from(document.querySelectorAll('div, span'))
    .filter(
      (element) =>
        isAllowedDisplayElement(element) &&
        normalizedText(element) === AVAILABLE_POINTS_LABEL,
    )
    .slice(0, MAX_LABEL_CANDIDATES);

  for (const label of labels) {
    const container = label.parentElement;
    if (!container) continue;
    const candidates = Array.from(container.querySelectorAll('span, div'))
      .filter(
        (element) =>
          isAllowedDisplayElement(element) &&
          WHOLE_POINTS_PATTERN.test(normalizedText(element)),
      )
      .slice(0, MAX_VALUE_CANDIDATES);

    for (const candidate of candidates) {
      const balance = parseBalance(normalizedText(candidate));
      if (balance !== null) balances.add(balance);
    }
  }

  return balances.size === 1 ? [...balances][0] ?? null : null;
}

export function readSouthwestMemberNumber(
  document: Document,
): string | null {
  return readMemberNumber(document, MEMBER_NUMBER_RULES);
}

export function inspectSouthwest(document: Document, rawUrl: string) {
  const balance = readAvailablePoints(document);
  if (balance !== null) {
    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        memberNumber: readSouthwestMemberNumber(document),
        expiration: {
          type: 'never',
          date: null,
          note: 'No expiration',
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
    authState: hasAllowedElement(document, ACCOUNT_PAGE_SELECTORS)
      ? 'authenticated'
      : 'unknown',
    reason: 'balance_not_found',
  });
}
