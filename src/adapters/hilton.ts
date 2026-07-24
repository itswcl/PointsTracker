import { parseBalance } from '../domain/balances.js';
import { parseDisplayedDate } from '../domain/dates.js';
import { normalizeMemberNumber } from '../domain/member-numbers.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readBalance,
  readMemberNumber,
} from './shared.js';

const BALANCE_SELECTORS = Object.freeze([
  '[data-testid="honorsPointsBlock"]',
  '[data-points-tracker="hilton-points-balance"]',
]);

const ACCOUNT_SELECTORS = Object.freeze([
  '[data-testid="pointsBlock"]',
  '[data-testid="memberInfoBlock"]',
]);

const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="hilton-member-number"]' },
  { selector: '[data-testid="honors-number"]' },
  {
    selector: '[data-testid="honorsNumberBlock"]',
    pattern:
      /\bHilton\s+Honors\s*#\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
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

interface HiltonAccountData {
  summary: Record<string, unknown> | null;
  memberNumber: string | null;
}

function memberNumberFromRecord(
  record: Record<string, unknown> | null,
): string | null {
  if (!record) return null;
  for (const key of [
    'hhonorsNumber',
    'honorsNumber',
    'memberNumber',
    'membershipNumber',
  ]) {
    const memberNumber = normalizeMemberNumber(record[key]);
    if (memberNumber) return memberNumber;
  }
  return null;
}

function readAccountData(
  document: Document,
): HiltonAccountData {
  const dataScript = document.querySelector('script#__NEXT_DATA__');
  if (!dataScript?.textContent) {
    return { summary: null, memberNumber: null };
  }

  try {
    const pageData = JSON.parse(dataScript.textContent) as unknown;
    if (!isRecord(pageData)) {
      return { summary: null, memberNumber: null };
    }
    const props = childRecord(pageData, 'props');
    const pageProps = props ? childRecord(props, 'pageProps') : null;
    const dehydratedState = pageProps
      ? childRecord(pageProps, 'dehydratedState')
      : null;
    const queries = dehydratedState?.queries;
    if (!Array.isArray(queries)) {
      return { summary: null, memberNumber: null };
    }

    let memberNumber: string | null = null;
    for (const query of queries) {
      if (!isRecord(query)) continue;
      const state = childRecord(query, 'state');
      const data = state ? childRecord(state, 'data') : null;
      const guest = data ? childRecord(data, 'guest') : null;
      const hhonors = guest ? childRecord(guest, 'hhonors') : null;
      const summary = hhonors ? childRecord(hhonors, 'summary') : null;
      memberNumber ??=
        memberNumberFromRecord(hhonors) ??
        memberNumberFromRecord(summary);
      if (summary) {
        return {
          summary,
          memberNumber,
        };
      }
    }
    return { summary: null, memberNumber };
  } catch {
    return { summary: null, memberNumber: null };
  }

  return { summary: null, memberNumber: null };
}

export function inspectHilton(document: Document, rawUrl: string) {
  const accountData = readAccountData(document);
  const accountSummary = accountData.summary;
  const balance =
    parseBalance(accountSummary?.totalPointsFmt) ??
    readBalance(document, BALANCE_SELECTORS);
  if (balance !== null) {
    const expirationDate = parseDisplayedDate(accountSummary?.pointsExpiration);
    const memberNumber =
      accountData.memberNumber ??
      readMemberNumber(document, MEMBER_NUMBER_RULES);

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
