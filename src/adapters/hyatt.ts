import { parseBalance } from '../domain/balances.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readMemberNumber,
} from './shared.js';

const BALANCE_LABEL = 'Current Point Balance';

const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="hyatt-member-number"]' },
  {
    selector:
      '[class*="MemberCard_memberInfoContainer__"] > .be-text-section-3',
  },
  { selector: '[data-testid="world-of-hyatt-number"]' },
  { selector: '[data-testid="member-number"]' },
  {
    selector: '[data-testid="account-overview"], [class*="memberNumber"]',
    pattern:
      /\b(?:World\s+of\s+Hyatt|membership|member)\s*(?:number|no\.?|#)\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

function normalizedText(element: Element | null | undefined): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function isAllowedDisplayElement(element: Element | null | undefined): element is HTMLElement {
  if (!(element instanceof HTMLElement) || ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(element.tagName)) {
    return false;
  }
  if (element.isContentEditable) return false;
  return !element.closest('input, textarea, select, [contenteditable="true"]');
}

function readCurrentPointBalance(document: Document): number | null {
  const labels = Array.from(document.querySelectorAll('span')).filter(
    (candidate) => normalizedText(candidate) === BALANCE_LABEL,
  );

  for (const label of labels) {
    const container = label.parentElement;
    if (!container) continue;

    for (const candidate of container.children) {
      if (candidate === label || !isAllowedDisplayElement(candidate)) continue;
      const balance = parseBalance(normalizedText(candidate));
      if (balance !== null) return balance;
    }
  }

  return null;
}

export function inspectHyatt(document: Document, rawUrl: string) {
  const balance = readCurrentPointBalance(document);
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
          note: 'N/A for the cardholder profile configured in this local ledger',
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
    authState: pathIncludes(rawUrl, ['/profile/']) ? 'authenticated' : 'unknown',
    reason: 'balance_not_found',
  });
}
