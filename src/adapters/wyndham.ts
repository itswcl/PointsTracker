import { parseBalance } from '../domain/balances.js';
import {
  firstAllowedText,
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readMemberNumber,
} from './shared.js';

const BALANCE_SELECTORS = Object.freeze([
  '[data-points-tracker="wyndham-points-balance"]',
  '.details-points.member-level-color',
]);

const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="wyndham-member-number"]' },
  {
    selector: '.img-container .text-number',
    pattern: /\bMember\s*#\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
  {
    selector: '.details-number.member-attribute',
    pattern:
      /\b(?:Blue|Gold|Platinum|Diamond|Titanium)\s+member\s*#\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
]);

const ACCOUNT_SELECTORS = Object.freeze([
  '.details-points.member-level-color',
  '.img-container .text-number',
  '.details-number.member-attribute',
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

const NO_ACTIVITY_LABEL = 'You have no recent activity.';
const NO_ACTIVITY_SELECTORS = Object.freeze([
  '[data-points-tracker="wyndham-no-activity"]',
  '.no-activity .no-activity-headline.headline-g',
]);

const BALANCE_PATTERN = /^You have\s+([\d,]+)\s+points$/i;

function readWyndhamBalance(document: Document): number | null {
  for (const selector of BALANCE_SELECTORS) {
    const text = firstAllowedText(document, [selector]);
    if (!text) continue;

    if (selector.startsWith('[data-points-tracker=')) {
      const balance = parseBalance(text);
      if (balance !== null) return balance;
      continue;
    }

    const candidate = text.replace(/\s+/g, ' ').trim().match(BALANCE_PATTERN)?.[1];
    const balance = parseBalance(candidate);
    if (balance !== null) return balance;
  }

  return null;
}

function hasNoRecentActivityProof(document: Document): boolean {
  return NO_ACTIVITY_SELECTORS.some(
    (selector) => firstAllowedText(document, [selector]) === NO_ACTIVITY_LABEL,
  );
}

export function inspectWyndham(document: Document, rawUrl: string) {
  const balance = readWyndhamBalance(document);
  if (balance !== null) {
    if (balance === 0) {
      if (!hasNoRecentActivityProof(document)) {
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
            note: 'N/A because the account shows zero points and no recent activity',
          },
        },
      });
    }

    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        memberNumber: readMemberNumber(document, MEMBER_NUMBER_RULES),
        expiration: {
          type: 'activity_based',
          date: null,
          inactivityMonths: 18,
          note: 'Points may expire after 18 months of inactivity and four years after posting',
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
