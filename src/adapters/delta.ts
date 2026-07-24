import { parseBalance } from '../domain/balances.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readBalance,
  readMemberNumber,
} from './shared.js';

const BALANCE_SELECTORS = Object.freeze([
  '[data-testid="skymiles-balance"]',
  '[data-points-tracker="delta-balance"]',
]);

const AVAILABLE_MILES_CONTAINER =
  '.skymiles-landing-page-tracker__container__wrap__content';
const AVAILABLE_MILES_SUBHEADING =
  '.skymiles-landing-page-tracker__container__wrap__content__subheading';
const AVAILABLE_MILES_NUMBER =
  '.skymiles-landing-page-tracker__container__wrap__content__number';

const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="delta-member-number"]' },
  { selector: '[data-testid="skymiles-number"]' },
  {
    selector: '.skymiles-medallion-banner__details__container__right',
    pattern:
      /\bSKYMILES(?:®)?\s*(?:number|no\.?|#)\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
]);

const AUTHENTICATED_SELECTORS = Object.freeze([
  '.skymiles-landing-page-tracker__container__wrap__content',
  'a[href*="/myskymiles/accountactivity"]',
  'a[href*="/myskymiles/overview"]',
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="signin"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

function readAvailableMiles(document: Document): number | null {
  for (const container of document.querySelectorAll(AVAILABLE_MILES_CONTAINER)) {
    const subheading = container.querySelector(
      `:scope > ${AVAILABLE_MILES_SUBHEADING}`,
    );
    if (
      subheading?.textContent?.replace(/\s+/g, ' ').trim().toUpperCase() !==
      'MILES AVAILABLE'
    ) {
      continue;
    }

    const number = container.querySelector(AVAILABLE_MILES_NUMBER);
    if (
      !(number instanceof HTMLElement) ||
      number.isContentEditable ||
      number.closest('input, textarea, select, [contenteditable="true"]')
    ) {
      continue;
    }
    const balance = parseBalance(number.textContent);
    if (balance !== null) return balance;
  }
  return null;
}

export function inspectDelta(document: Document, rawUrl: string) {
  const balance =
    readAvailableMiles(document) ??
    readBalance(document, BALANCE_SELECTORS);
  if (balance !== null) {
    const memberNumber = readMemberNumber(document, MEMBER_NUMBER_RULES);
    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        memberNumber,
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

  return inspectionResult({
    kind: 'not_found',
    authState: hasAllowedElement(document, AUTHENTICATED_SELECTORS)
      ? 'authenticated'
      : 'unknown',
    reason: 'balance_not_found',
  });
}
