import {
  hasAllowedElement,
  inspectionResult,
  memberNumberInspection,
  pageHasVerification,
  pathIncludes,
  readBalance,
  readDate,
  readMemberNumber,
} from './shared.js';

const BALANCE_SELECTORS = Object.freeze([
  '.bw-fb-miles-overview__totals .bw-fb-miles-overview__totals-title',
  '[data-testid="flying-blue-balance"]',
  '[data-points-tracker="airfrance-balance"]',
]);

const EXPIRATION_SELECTORS = Object.freeze([
  '.bw-fb-miles-overview__totals .bw-fb-miles-overview__totals-label',
  '[data-testid="flying-blue-expiration"]',
  '[data-points-tracker="airfrance-expiration"]',
]);

const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="airfrance-member-number"]' },
  {
    selector:
      '[data-testid="bwpr-flyingblue-membership__card"] .bw-fb-membership-card__number-text strong',
  },
  { selector: '[data-testid="flying-blue-number"]' },
  {
    selector: '[class*="flying-blue-number"], [class*="flyingBlueNumber"]',
    pattern:
      /\bFlying\s+Blue\s*(?:number|no\.?|#)\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
  {
    selector: '.bw-profile-recognition-box',
    pattern:
      /\bFlying\s+Blue\s*(?:number|no\.?|#)\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
]);

const AUTHENTICATED_SELECTORS = Object.freeze([
  '.bw-fb-miles-overview__totals',
  'bw-profile-flyingblue-miles-overview',
  '[data-points-tracker-auth="airfrance"]',
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

export function inspectAirFrance(document: Document, rawUrl: string) {
  const balance = readBalance(document, BALANCE_SELECTORS);
  const memberNumber = readMemberNumber(document, MEMBER_NUMBER_RULES);
  if (balance !== null) {
    const expirationDate = readDate(document, EXPIRATION_SELECTORS);

    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        memberNumber,
        expiration: {
          type: expirationDate ? 'fixed_date' : 'unknown',
          date: expirationDate,
          note: expirationDate
            ? 'Valid until date shown by Flying Blue'
            : 'Expiration date not found',
        },
      },
    });
  }

  if (memberNumber) return memberNumberInspection(memberNumber);

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
    pathIncludes(rawUrl, ['/profile/flying-blue/']) ||
    hasAllowedElement(document, AUTHENTICATED_SELECTORS);

  return inspectionResult({
    kind: 'not_found',
    authState: authenticated ? 'authenticated' : 'unknown',
    reason: 'balance_not_found',
  });
}
