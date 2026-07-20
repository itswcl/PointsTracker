import {
  firstAllowedText,
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readDate,
} from './shared.js';
import { parseBalance } from '../domain/balances.js';

const BALANCE_SELECTORS = Object.freeze([
  '[data-testid="award-miles-balance-text"]',
  '[data-points-tracker="american-balance"]',
]);

const EXPIRATION_SELECTORS = Object.freeze([
  '[data-testid="award-miles-balance-section"] [class*="miles-expiring"]',
  '[data-testid="award-miles-expiration"]',
  '[data-points-tracker="american-expiration"]',
]);

const AUTHENTICATED_SELECTORS = Object.freeze([
  '[data-testid="award-miles-balance-section"]',
  '[data-points-tracker-auth="american"]',
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

const INLINE_BALANCE_PATTERN = /\d{1,3}(?:[,.]\d{3})+|\d+/;

function readAmericanBalance(document) {
  const text = firstAllowedText(document, BALANCE_SELECTORS);
  const candidate = text?.match(INLINE_BALANCE_PATTERN)?.[0];
  return candidate ? parseBalance(candidate) : null;
}

function hasCardholderExpirationExemption(text) {
  if (!text) return false;
  const normalized = text.toLowerCase();
  return (
    normalized.includes('primary') &&
    normalized.includes('credit cardholder') &&
    normalized.includes('no miles expiration') &&
    normalized.includes('open card account')
  );
}

export function inspectAmerican(document, rawUrl) {
  const balance = readAmericanBalance(document);
  if (balance !== null) {
    const expirationDate = readDate(document, EXPIRATION_SELECTORS);
    const expirationText = firstAllowedText(document, EXPIRATION_SELECTORS);
    const cardholderExemption = hasCardholderExpirationExemption(expirationText);

    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        expiration: expirationDate
          ? {
              type: 'activity_based',
              date: expirationDate,
              note: 'Expiration date shown by American',
            }
          : cardholderExemption
            ? {
                type: 'never',
                date: null,
                note: 'No expiration with an open primary credit card account',
              }
            : {
                type: 'unknown',
                date: null,
                note: 'Expiration date not found',
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
    pathIncludes(rawUrl, ['/aadvantage-program/profile/']) ||
    hasAllowedElement(document, AUTHENTICATED_SELECTORS);

  return inspectionResult({
    kind: 'not_found',
    authState: authenticated ? 'authenticated' : 'unknown',
    reason: 'balance_not_found',
  });
}
