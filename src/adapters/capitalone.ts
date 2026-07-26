import { parseBalance } from '../domain/balances.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readBalance,
} from './shared.js';

const SYNTHETIC_BALANCE_SELECTORS = Object.freeze([
  '[data-points-tracker="capitalone-miles"]',
]);

const BALANCE_CONTAINER_SELECTOR = '.primary-detail__balances-container';
const BALANCE_NUMBER_SELECTOR = '.primary-detail__balances-number-container';
const BALANCE_LABEL_SELECTOR = '.labels';
const MILES_LABEL = 'Miles';
const WHOLE_NUMBER_PATTERN = /^\d{1,3}(?:,\d{3})*$|^\d+$/;
const MAX_BALANCE_CONTAINERS = 20;

const ACCOUNT_SELECTORS = Object.freeze([
  '.primary-detail__balances',
  BALANCE_CONTAINER_SELECTOR,
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="signin"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

function normalizedDisplayText(
  element: Element | null | undefined,
): string | null {
  if (
    !(element instanceof HTMLElement) ||
    element.isContentEditable ||
    element.closest(
      'input, textarea, select, [contenteditable="true"], [aria-hidden="true"], [hidden]',
    )
  ) {
    return null;
  }

  return element.textContent?.replace(/\s+/g, ' ').trim() ?? null;
}

function readRenderedMilesBalance(document: Document): number | null {
  const syntheticBalance = readBalance(
    document,
    SYNTHETIC_BALANCE_SELECTORS,
  );
  if (syntheticBalance !== null) return syntheticBalance;

  const balances = new Set<number>();
  const containers = Array.from(
    document.querySelectorAll(BALANCE_CONTAINER_SELECTOR),
  ).slice(0, MAX_BALANCE_CONTAINERS);

  for (const container of containers) {
    const label = normalizedDisplayText(
      container.querySelector(BALANCE_LABEL_SELECTOR),
    );
    if (label !== MILES_LABEL) continue;

    const numberText = normalizedDisplayText(
      container.querySelector(BALANCE_NUMBER_SELECTOR),
    );
    if (!numberText || !WHOLE_NUMBER_PATTERN.test(numberText)) continue;

    const balance = parseBalance(numberText);
    if (balance !== null) balances.add(balance);
  }

  return balances.size === 1 ? [...balances][0] ?? null : null;
}

export function inspectCapitalOne(document: Document, rawUrl: string) {
  const balance = readRenderedMilesBalance(document);
  if (balance !== null) {
    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'Expiration does not apply to this balance-only ledger row',
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
    pathIncludes(rawUrl, ['/login', '/signin', '/sign-in', '/auth']) ||
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
    authState: hasAllowedElement(document, ACCOUNT_SELECTORS)
      ? 'authenticated'
      : 'unknown',
    reason: 'balance_not_found',
  });
}
