import { parseBalance } from '../domain/balances.js';
import { parseDisplayedDate } from '../domain/dates.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readBalance,
} from './shared.js';

const BALANCE_SELECTORS = Object.freeze([
  '[data-testid="honorsPointsBlock"]',
  '[data-points-tracker="hilton-points-balance"]',
]);

const ACCOUNT_SELECTORS = Object.freeze([
  '[data-testid="pointsBlock"]',
  '[data-testid="memberInfoBlock"]',
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function childRecord(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const child = value[key];
  return isRecord(child) ? child : null;
}

function readAccountSummary(
  document: Document,
): Record<string, unknown> | null {
  const dataScript = document.querySelector('script#__NEXT_DATA__');
  if (!dataScript?.textContent) return null;

  try {
    const pageData = JSON.parse(dataScript.textContent) as unknown;
    if (!isRecord(pageData)) return null;
    const props = childRecord(pageData, 'props');
    const pageProps = props ? childRecord(props, 'pageProps') : null;
    const dehydratedState = pageProps
      ? childRecord(pageProps, 'dehydratedState')
      : null;
    const queries = dehydratedState?.queries;
    if (!Array.isArray(queries)) return null;

    for (const query of queries) {
      if (!isRecord(query)) continue;
      const state = childRecord(query, 'state');
      const data = state ? childRecord(state, 'data') : null;
      const guest = data ? childRecord(data, 'guest') : null;
      const hhonors = guest ? childRecord(guest, 'hhonors') : null;
      const summary = hhonors ? childRecord(hhonors, 'summary') : null;
      if (summary) return summary;
    }
  } catch {
    return null;
  }

  return null;
}

export function inspectHilton(document: Document, rawUrl: string) {
  const accountSummary = readAccountSummary(document);
  const balance =
    parseBalance(accountSummary?.totalPointsFmt) ??
    readBalance(document, BALANCE_SELECTORS);
  if (balance !== null) {
    const expirationDate = parseDisplayedDate(accountSummary?.pointsExpiration);

    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        expiration: {
          type: 'activity_based',
          date: expirationDate,
          inactivityMonths: 24,
          note: expirationDate
            ? 'Provided by Hilton account data'
            : 'Expires after 24 consecutive months without eligible activity',
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
