import { parseBalance } from '../domain/balances.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readBalance,
} from './shared.js';
import { readUnitedMemberNumber } from './united.js';

const SYNTHETIC_BALANCE_SELECTORS = Object.freeze([
  '[data-points-tracker="united-pool-balance"]',
]);

const POOLED_MILES_CANDIDATE_SELECTOR = [
  'header button',
  '[role="banner"] button',
  '[class*="GlobalHeader"] button',
  '[class*="GreetingMessage"]',
  '[class*="atm-l-linelength-container"]',
].join(', ');

const POOLED_MILES_PATTERN =
  /(?:^|\|)\s*(\d{1,3}(?:,\d{3})*|\d+)\s+pooled miles\b/i;
const MAX_POOLED_MILES_CANDIDATES = 80;

const ACCOUNT_SELECTORS = Object.freeze([
  '[class*="GlobalHeader"]',
  '[class*="GreetingMessage"]',
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

function normalizedDisplayText(element: Element): string | null {
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

function readPooledMilesBalance(document: Document): number | null {
  const syntheticBalance = readBalance(
    document,
    SYNTHETIC_BALANCE_SELECTORS,
  );
  if (syntheticBalance !== null) return syntheticBalance;

  const balances = new Set<number>();
  const candidates = Array.from(
    document.querySelectorAll(POOLED_MILES_CANDIDATE_SELECTOR),
  ).slice(0, MAX_POOLED_MILES_CANDIDATES);

  for (const candidate of candidates) {
    const text = normalizedDisplayText(candidate);
    const numericText = text?.match(POOLED_MILES_PATTERN)?.[1];
    const balance = parseBalance(numericText);
    if (balance !== null) balances.add(balance);
  }

  return balances.size === 1 ? [...balances][0] ?? null : null;
}

export function inspectUnitedPool(document: Document, rawUrl: string) {
  const balance = readPooledMilesBalance(document);
  if (balance !== null) {
    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        memberNumber: readUnitedMemberNumber(document),
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
