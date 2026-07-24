import { parseBalance } from '../domain/balances.js';
import { addMonths, parseDisplayedMonth } from '../domain/dates.js';
import {
  hasAllowedElement,
  inspectionResult,
  memberNumberInspection,
  pageHasVerification,
  pathIncludes,
  readMemberNumber,
} from './shared.js';

const STATEMENTS_SELECTOR = '[data-testid="executive-statements"]';
const BALANCE_SELECTOR = '[data-testid="avios-card-value"]';
const MONTH_SELECTOR = 'span[data-testid="text-custom--text-custom"]';
const FULL_MONTH_YEAR =
  /^(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i;

const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="british-airways-member-number"]' },
  { selector: '[data-testid="membership-number"]' },
  {
    selector: '[data-testid="executive-statements"]',
    pattern:
      /\b(?:British\s+Airways\s+Club|membership|member)\s*(?:number|no\.?|#)\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

function isAllowedDisplayElement(element: Element | null | undefined): element is HTMLElement {
  if (!(element instanceof HTMLElement) || ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(element.tagName)) {
    return false;
  }
  if (element.isContentEditable) return false;
  return !element.closest('input, textarea, select, [contenteditable="true"]');
}

function statementRoot(document: Document): Element | null {
  return document.querySelector(STATEMENTS_SELECTOR);
}

function readAviosBalance(document: Document): number | null {
  const root = statementRoot(document);
  if (!root) return null;

  const element = Array.from(root.querySelectorAll(BALANCE_SELECTOR)).find(
    (candidate) => {
      const cardText = candidate.parentElement?.parentElement?.textContent
        ?.replace(/\s+/g, ' ')
        .trim();
      return (
        cardText?.toLowerCase().startsWith('avios') &&
        !/Tier points/i.test(cardText)
      );
    },
  );

  return isAllowedDisplayElement(element) ? parseBalance(element.textContent) : null;
}

function readNewestActivityMonth(document: Document) {
  const root = statementRoot(document);
  if (!root) return null;

  const element = Array.from(root.querySelectorAll(MONTH_SELECTOR)).find(
    (candidate) => FULL_MONTH_YEAR.test(candidate.textContent?.trim() ?? ''),
  );
  if (!isAllowedDisplayElement(element)) return null;
  return parseDisplayedMonth(element.textContent);
}

export function inspectBritishAirways(document: Document, rawUrl: string) {
  const balance = readAviosBalance(document);
  const memberNumber = readMemberNumber(document, MEMBER_NUMBER_RULES);
  if (balance !== null) {
    const activityMonth = readNewestActivityMonth(document);
    const expirationDate = activityMonth
      ? addMonths(`${activityMonth}-01`, 36)
      : null;
    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        memberNumber,
        expiration: {
          type: 'activity_based',
          date: expirationDate,
          note: expirationDate
            ? 'Derived from the newest activity month shown by British Airways'
            : 'Activity based; newest activity month not found',
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

  return inspectionResult({
    kind: 'not_found',
    authState: hasAllowedElement(document, [STATEMENTS_SELECTOR])
      ? 'authenticated'
      : 'unknown',
    reason: 'balance_not_found',
  });
}
