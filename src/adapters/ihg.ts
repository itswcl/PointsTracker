import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readBalance,
  readMemberNumber,
} from './shared.js';

const BALANCE_SELECTORS = Object.freeze([
  '[data-points-tracker="ihg-points-balance"]',
  '[data-testid="pointsToRedeemSID"]',
]);

const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="ihg-member-number"]' },
  { selector: '[data-testid="memberNumberSID"]' },
]);

const ELITE_STATUS_SELECTORS = Object.freeze([
  '[data-points-tracker="ihg-elite-status"]',
  '.header-member-level-name',
]);
const ELITE_STATUS_NAMES = Object.freeze(
  new Map([
    ['silver elite member', 'Silver Elite'],
    ['gold elite member', 'Gold Elite'],
    ['platinum elite member', 'Platinum Elite'],
    ['diamond elite member', 'Diamond Elite'],
  ]),
);
const MAX_ELITE_STATUS_MATCHES = 8;

const ACCOUNT_SELECTORS = Object.freeze([
  '[data-testid="yourPointsLabelSID"]',
  '[data-testid="pointsToRedeemSID"]',
  '[data-testid="memberNumberSID"]',
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

function readEliteStatus(document: Document): string | null {
  for (const selector of ELITE_STATUS_SELECTORS) {
    const elements = Array.from(document.querySelectorAll(selector)).slice(
      0,
      MAX_ELITE_STATUS_MATCHES,
    );

    for (const element of elements) {
      if (
        !(element instanceof HTMLElement) ||
        element.isContentEditable ||
        element.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        continue;
      }

      const text = element.textContent?.replace(/\s+/g, ' ').trim().toLowerCase();
      const eliteStatus = text ? ELITE_STATUS_NAMES.get(text) : null;
      if (eliteStatus) return eliteStatus;
    }
  }

  return null;
}

export function inspectIhg(document: Document, rawUrl: string) {
  const balance = readBalance(document, BALANCE_SELECTORS);
  if (balance !== null) {
    const eliteStatus = readEliteStatus(document);
    if (!eliteStatus) {
      return inspectionResult({
        kind: 'not_found',
        authState: 'authenticated',
        reason: 'expiration_not_found',
      });
    }

    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        memberNumber: readMemberNumber(document, MEMBER_NUMBER_RULES),
        expiration: {
          type: 'never',
          date: null,
          note: `N/A while IHG One Rewards ${eliteStatus} status is active`,
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
    authState: hasAllowedElement(document, ACCOUNT_SELECTORS)
      ? 'authenticated'
      : 'unknown',
    reason: 'balance_not_found',
  });
}
