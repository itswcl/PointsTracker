import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readBalance,
  readMemberNumber,
} from './shared.js';

const BALANCE_SELECTORS = Object.freeze([
  '#sign-in-menu [class*="accountOverviewPoints"] span:last-child',
  '[data-testid="flying-club-balance"]',
  '[data-points-tracker="virgin-atlantic-balance"]',
]);

const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="virgin-atlantic-member-number"]' },
  {
    selector:
      '[data-testid="membership-number"], [data-testid="flying-club-number"]',
    pattern:
      /\b(?:Flying\s+Club|membership|member)\s*(?:number|no\.?|#)\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
  {
    selector: '#sign-in-menu',
    pattern:
      /\b(?:Flying\s+Club|membership|member)\s*(?:number|no\.?|#)\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
]);

const AUTHENTICATED_SELECTORS = Object.freeze([
  '#logged-in-menu-item',
  '#sign-in-menu [class*="accountOverviewPoints"]',
  'a[href*="/flying-club/account/overview"]',
  '[data-points-tracker-auth="virgin-atlantic"]',
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

export function inspectVirginAtlantic(document: Document, rawUrl: string) {
  const balance = readBalance(document, BALANCE_SELECTORS);
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
