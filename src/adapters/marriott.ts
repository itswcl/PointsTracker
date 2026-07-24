import { parseBalance } from '../domain/balances.js';
import { addMonths, parseDisplayedDate } from '../domain/dates.js';
import { normalizeMemberNumber } from '../domain/member-numbers.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readMemberNumber,
} from './shared.js';

const STATUS_ROOT_SELECTOR = '.member-status-outer-container';
const ACTIVITY_FILTER_SELECTOR = '#dropdownactivity-filter';
const SELECTED_FILTER_SELECTOR = '#dropdown-selected-valueactivity-filter';
const QUALIFYING_OPTION_SELECTOR = '#option-9';
const ACTIVITY_ROW_SELECTOR = '[role="table"] [role="row"]';

const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="marriott-member-number"]' },
  { selector: '[data-testid="bonvoy-number"]' },
  { selector: '[data-testid="member-number"]' },
  {
    selector: STATUS_ROOT_SELECTOR,
    pattern:
      /\b(?:Marriott\s+Bonvoy|Bonvoy|membership|member)\s*(?:number|no\.?|#)\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
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

function statusRoot(document: Document): Element | null {
  return document.querySelector(STATUS_ROOT_SELECTOR);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function childRecord(
  value: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null {
  if (!value) return null;
  const child = value[key];
  return isRecord(child) ? child : null;
}

function readHydratedMemberNumber(document: Document): string | null {
  const script = document.querySelector('script#__NEXT_DATA__');
  if (!script?.textContent) return null;

  try {
    const pageData = JSON.parse(script.textContent) as unknown;
    if (!isRecord(pageData)) return null;
    const props = childRecord(pageData, 'props');
    const pageProps = childRecord(props, 'pageProps');
    const sessionData = childRecord(pageProps, 'sessionData');
    const cacheData = childRecord(sessionData, 'cacheData');
    const cache = childRecord(cacheData, 'data');
    const primary = normalizeMemberNumber(cache?.rewardsId);
    if (primary) return primary;

    const dataLayer = childRecord(pageProps, 'dataLayer');
    const rows = dataLayer?.data;
    if (!Array.isArray(rows)) return null;
    for (const row of rows) {
      if (!isRecord(row)) continue;
      const fallback = normalizeMemberNumber(row.mr_id);
      if (fallback) return fallback;
    }
  } catch {
    return null;
  }

  return null;
}

function readMemberBalance(document: Document): number | null {
  const root = statusRoot(document);
  if (!root) return null;

  const heading = Array.from(root.querySelectorAll('h3')).find((candidate) =>
    /^\d[\d,]*\s+Points$/i.test(normalizedText(candidate)),
  );
  return isAllowedDisplayElement(heading) ? parseBalance(heading.textContent) : null;
}

function hasLifetimeEliteStatus(document: Document): boolean {
  const root = statusRoot(document);
  return Boolean(
    root &&
      Array.from(root.querySelectorAll('h1, h2, h3, [data-testid="ui-library-Text"]')).some(
        (candidate) => /\bLifetime\s+(?:Silver|Gold|Platinum|Titanium)?\s*Elite\b/i.test(
          normalizedText(candidate),
        ),
      ),
  );
}

function isQualifyingFilterSelected(document: Document): boolean {
  return normalizedText(document.querySelector(SELECTED_FILTER_SELECTOR)) === 'All Qualifying';
}

function readNewestQualifyingActivity(document: Document) {
  if (!isQualifyingFilterSelected(document)) return null;

  for (const row of document.querySelectorAll(ACTIVITY_ROW_SELECTOR)) {
    const cells = row.querySelectorAll('[role="cell"]');
    if (!cells.length || !isAllowedDisplayElement(cells[0])) continue;
    const date = parseDisplayedDate(normalizedText(cells[0]));
    if (date) return date;
  }
  return null;
}

export function prepareMarriott(document: Document): boolean {
  if (isQualifyingFilterSelected(document)) return false;

  const control = document.querySelector(ACTIVITY_FILTER_SELECTOR);
  const option = document.querySelector(QUALIFYING_OPTION_SELECTOR);
  if (!isAllowedDisplayElement(control) || !isAllowedDisplayElement(option)) return false;
  if (normalizedText(option) !== 'All Qualifying') return false;

  const menu = option.closest('.dropdown__container');
  if (menu?.classList.contains('d-none')) {
    control.click();
    return true;
  }

  option.click();
  return true;
}

export function inspectMarriott(document: Document, rawUrl: string) {
  const balance = readMemberBalance(document);
  if (balance !== null) {
    const memberNumber =
      readHydratedMemberNumber(document) ??
      readMemberNumber(document, MEMBER_NUMBER_RULES);
    if (hasLifetimeEliteStatus(document)) {
      return inspectionResult({
        kind: 'success',
        authState: 'authenticated',
        capture: {
          balance,
          memberNumber,
          expiration: {
            type: 'never',
            date: null,
            note: 'N/A for Marriott Bonvoy Lifetime Elite status',
          },
        },
      });
    }

    const activityDate = readNewestQualifyingActivity(document);
    const expirationDate = activityDate ? addMonths(activityDate, 24) : null;
    if (!expirationDate) {
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
        memberNumber,
        expiration: {
          type: 'activity_based',
          date: expirationDate,
          inactivityMonths: 24,
          note: 'Derived from the newest All Qualifying Marriott activity',
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
    authState: hasAllowedElement(document, [STATUS_ROOT_SELECTOR])
      ? 'authenticated'
      : 'unknown',
    reason: 'balance_not_found',
  });
}
