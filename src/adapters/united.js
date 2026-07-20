import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readBalance,
} from './shared.js';

const BALANCE_SELECTORS = Object.freeze([
  '[aria-labelledby="accountBalanceAriaLabel"] [data-test-name="balance_value"]',
  '[data-testid="mileageplus-balance"]',
  '[data-testid="mileage-balance"]',
  '[data-testid="account-summary-mileage-balance"]',
  '[data-points-tracker="united-balance"]',
  '.account-summary__mileage-balance',
  '[aria-label*="MileagePlus miles"]',
]);

const AUTHENTICATED_SELECTORS = Object.freeze([
  '#accountBalanceAriaLabel',
  '[data-testid="account-summary"]',
  '[data-testid="account-menu-button"]',
  '[data-points-tracker-auth="united"]',
  'a[href*="/account/activity"]',
  'a[href*="/account/profile"]',
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  '[data-testid="sign-in-form"]',
]);

export function inspectUnited(document, rawUrl) {
  const balance = readBalance(document, BALANCE_SELECTORS);
  if (balance !== null) {
    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
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
    pathIncludes(rawUrl, ['/account/']) ||
    hasAllowedElement(document, AUTHENTICATED_SELECTORS);

  return inspectionResult({
    kind: 'not_found',
    authState: authenticated ? 'authenticated' : 'unknown',
    reason: 'balance_not_found',
  });
}
