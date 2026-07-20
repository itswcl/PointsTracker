import { addMonths } from '../domain/dates.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readBalance,
  readDate,
} from './shared.js';

const BALANCE_SELECTORS = Object.freeze([
  '.mpo_miles-details .mpo_miles-details-cur-points',
  '[data-testid="asia-miles-balance"]',
  '[data-testid="miles-balance"]',
  '[data-points-tracker="cathay-balance"]',
  '.asia-miles-balance',
  '.miles-balance',
  '[aria-label*="Asia Miles"]',
]);

const EXPIRATION_SELECTORS = Object.freeze([
  '.mpo_miles-details .mpo_miles-details-activity-base-message-box',
  '[data-testid="asia-miles-expiry-date"]',
  '[data-testid="miles-expiry-date"]',
  '[data-points-tracker="cathay-expiration"]',
  '.asia-miles-expiry-date',
  '.miles-expiry-date',
]);

const LAST_ACTIVITY_SELECTORS = Object.freeze([
  '[data-testid="last-eligible-activity-date"]',
  '[data-testid="last-credit-or-debit-date"]',
  '[data-points-tracker="cathay-last-activity"]',
]);

const AUTHENTICATED_SELECTORS = Object.freeze([
  '.mpo_miles-details',
  '[data-testid="member-account-summary"]',
  '[data-testid="member-profile"]',
  '[data-points-tracker-auth="cathay"]',
  'a[href*="/membership/account/"]',
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="sign-in"]',
  'form[action*="login"]',
  '[data-testid="sign-in-form"]',
]);

export function inspectCathay(document, rawUrl) {
  const balance = readBalance(document, BALANCE_SELECTORS);
  if (balance !== null) {
    const displayedExpiration = readDate(document, EXPIRATION_SELECTORS);
    const lastActivity = readDate(document, LAST_ACTIVITY_SELECTORS);
    const derivedExpiration = lastActivity ? addMonths(lastActivity, 18) : null;

    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        expiration: {
          type: 'activity_based',
          date: displayedExpiration ?? derivedExpiration,
          note: displayedExpiration
            ? 'Activity based'
            : derivedExpiration
              ? 'Derived from the last eligible activity shown by Cathay'
              : 'Activity based; exact date not found',
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
    pathIncludes(rawUrl, ['/membership/account/']) ||
    hasAllowedElement(document, AUTHENTICATED_SELECTORS);

  return inspectionResult({
    kind: 'not_found',
    authState: authenticated ? 'authenticated' : 'unknown',
    reason: 'balance_not_found',
  });
}
