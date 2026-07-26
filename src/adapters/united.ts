import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readBalance,
  readMemberNumber,
} from './shared.js';

const BALANCE_SELECTORS = Object.freeze([
  '[class*="MileageBalance__milesContainer"] [class*="MileageBalance__totalMiles"]',
  '[class*="MileageBalance__totalMiles"]',
  '[aria-labelledby="accountBalanceAriaLabel"] [data-test-name="balance_value"]',
  '[data-testid="mileageplus-balance"]',
  '[data-testid="mileage-balance"]',
  '[data-testid="account-summary-mileage-balance"]',
  '[data-points-tracker="united-balance"]',
  '.account-summary__mileage-balance',
  '[aria-label*="MileagePlus miles"]',
]);

const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="united-member-number"]' },
  { selector: '[data-testid="mileageplus-number"]' },
  { selector: '[data-test-name="member_number"]' },
  {
    selector: '[class*="AccountSummary-accountSummary__mpNumber"]',
    pattern:
      /\bMileagePlus(?:®)?\s*(?:number|no\.?|#)\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
  {
    selector: '[class*="MileagePlusNumber"]',
    pattern:
      /\bMileagePlus(?:®)?(?:\s+member(?:ship)?)?\s*(?:number|no\.?|#)\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
  {
    selector: '[data-testid="account-summary"]',
    pattern:
      /\bMileagePlus(?:®)?(?:\s+member(?:ship)?)?\s*(?:number|no\.?|#)\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
]);

const AUTHENTICATED_SELECTORS = Object.freeze([
  '[class*="MileageBalance__milesContainer"]',
  '[class*="MileageBalance__milesNeverExpire"]',
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

export function readUnitedMemberNumber(document: Document): string | null {
  return readMemberNumber(document, MEMBER_NUMBER_RULES);
}

export function inspectUnited(document: Document, rawUrl: string) {
  const balance = readBalance(document, BALANCE_SELECTORS);
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
    pathIncludes(rawUrl, ['/account/']) ||
    hasAllowedElement(document, AUTHENTICATED_SELECTORS);

  return inspectionResult({
    kind: 'not_found',
    authState: authenticated ? 'authenticated' : 'unknown',
    reason: 'balance_not_found',
  });
}
