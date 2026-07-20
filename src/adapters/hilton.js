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

function readAccountSummary(document) {
  const dataScript = document.querySelector('script#__NEXT_DATA__');
  if (!dataScript?.textContent) return null;

  try {
    const pageData = JSON.parse(dataScript.textContent);
    const queries = pageData?.props?.pageProps?.dehydratedState?.queries;
    if (!Array.isArray(queries)) return null;

    for (const query of queries) {
      const summary = query?.state?.data?.guest?.hhonors?.summary;
      if (summary && typeof summary === 'object') return summary;
    }
  } catch {
    return null;
  }

  return null;
}

export function inspectHilton(document, rawUrl) {
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
