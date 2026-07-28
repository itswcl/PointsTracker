import { parseBalance } from '../domain/balances.js';
import {
  parseDisplayedDate,
  parseDisplayedMonth,
} from '../domain/dates.js';
import type { MonthKey } from '../types.js';
import {
  firstAllowedText,
  hasAllowedElement,
  inspectionResult,
  memberNumberInspection,
  pageHasVerification,
  pathIncludes,
  readMemberNumber,
} from './shared.js';

const VALIDITY_PATH = '/krisflyer/miles/expiring-miles';
const VALIDITY_ROOT_SELECTORS = Object.freeze([
  '[data-points-tracker="krisflyer-miles-validity"]',
  '#typeInfoText',
]);
const BALANCE_SELECTORS = Object.freeze([
  '[data-points-tracker="krisflyer-balance"]',
  '[class*="KFMastHead_kfMiles"]',
]);
const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="krisflyer-member-number"]' },
  {
    selector: '[class*="KFMastHead_kfType"]',
    pattern:
      /\b(?:KRISFLYER|(?:SOLITAIRE\s+)?PPS\s+CLUB)\s+([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
]);
const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);
const MONTH_TOKEN_PATTERNS = Object.freeze([
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}\b/i,
  /\b\d{4}\/(?:0?[1-9]|1[0-2])\b/,
  /\b(?:0?[1-9]|1[0-2])\/\d{4}\b/,
  /\b\d{4}-(?:0[1-9]|1[0-2])\b/,
]);
const DATE_TOKEN_PATTERNS = Object.freeze([
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/,
  /\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/,
  /\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/,
]);

interface ExpiringTranche {
  month: MonthKey;
  amount: number;
}

function normalizedText(node: Node | null | undefined): string {
  return node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function isAllowedDisplayElement(
  element: Element | null | undefined,
): element is HTMLElement {
  if (
    !(element instanceof HTMLElement) ||
    ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(element.tagName)
  ) {
    return false;
  }
  if (element.isContentEditable) return false;
  return !element.closest('input, textarea, select, [contenteditable="true"]');
}

function readBalance(document: Document): number | null {
  return parseBalance(firstAllowedText(document, BALANCE_SELECTORS));
}

function readMonthToken(value: string): {
  month: MonthKey;
  token: string;
} | null {
  for (const pattern of MONTH_TOKEN_PATTERNS) {
    const token = value.match(pattern)?.[0];
    const month = token ? parseDisplayedMonth(token) : null;
    if (token && month) return { month, token };
  }

  for (const pattern of DATE_TOKEN_PATTERNS) {
    const token = value.match(pattern)?.[0];
    const date = token ? parseDisplayedDate(token) : null;
    if (token && date) {
      return { month: date.slice(0, 7) as MonthKey, token };
    }
  }

  return null;
}

function readTrancheFromCells(cells: readonly HTMLElement[]): ExpiringTranche | null {
  const monthCellIndex = cells.findIndex((cell) =>
    Boolean(readMonthToken(normalizedText(cell))),
  );
  if (monthCellIndex < 0) return null;

  const month = readMonthToken(normalizedText(cells[monthCellIndex]))?.month;
  if (!month) return null;

  for (let index = 0; index < cells.length; index += 1) {
    if (index === monthCellIndex) continue;
    const amount = parseBalance(normalizedText(cells[index]));
    if (amount !== null) return { month, amount };
  }

  return null;
}

function readTrancheFromText(element: HTMLElement): ExpiringTranche | null {
  const text = normalizedText(element);
  const monthToken = readMonthToken(text);
  if (!monthToken) return null;

  const amount = parseBalance(text.replace(monthToken.token, ' '));
  return amount === null ? null : { month: monthToken.month, amount };
}

function readEarliestExpiration(document: Document): ExpiringTranche | null {
  const root = VALIDITY_ROOT_SELECTORS.map((selector) =>
    document.querySelector(selector),
  ).find(isAllowedDisplayElement);
  const scope = root?.parentElement ?? root;
  if (!scope) return null;

  const tranches: ExpiringTranche[] = [];
  const rows = Array.from(scope.querySelectorAll('tr, [role="row"]')).slice(
    0,
    60,
  );
  for (const row of rows) {
    if (!isAllowedDisplayElement(row)) continue;
    const cells = Array.from(
      row.querySelectorAll(
        ':scope > th, :scope > td, :scope > [role="cell"], :scope > [role="gridcell"]',
      ),
    ).filter(isAllowedDisplayElement);
    const tranche = readTrancheFromCells(cells);
    if (tranche) tranches.push(tranche);
  }

  const cardSelector =
    '[data-points-tracker="krisflyer-expiration"], [class*="KFMilesValidityDetails_"]';
  const cards = Array.from(scope.querySelectorAll(cardSelector))
    .filter(isAllowedDisplayElement)
    .filter(
      (candidate) =>
        !Array.from(candidate.querySelectorAll(cardSelector)).some(
          (descendant) =>
            descendant !== candidate &&
            isAllowedDisplayElement(descendant) &&
            Boolean(readMonthToken(normalizedText(descendant))),
        ),
    )
    .slice(0, 60);
  for (const card of cards) {
    const tranche = readTrancheFromText(card);
    if (tranche) tranches.push(tranche);
  }

  tranches.sort((left, right) => left.month.localeCompare(right.month));
  return tranches[0] ?? null;
}

function hasPpsStatus(document: Document): boolean {
  const text = firstAllowedText(document, [
    '[data-points-tracker="krisflyer-tier"]',
    '[class*="KFMastHead_kfType"]',
  ]);
  return Boolean(text && /\b(?:SOLITAIRE\s+)?PPS\s+CLUB\b/i.test(text));
}

function validityDetailsReady(document: Document): boolean {
  const title = firstAllowedText(document, [
    '[data-points-tracker="krisflyer-validity-title"]',
    '#typeInfoTextTitle',
  ]);
  return title?.toLowerCase() === 'miles validity';
}

export function inspectKrisFlyer(document: Document, rawUrl: string) {
  const memberNumber = readMemberNumber(document, MEMBER_NUMBER_RULES);
  const isValidityPage = pathIncludes(rawUrl, [VALIDITY_PATH]);

  if (isValidityPage) {
    const balance = readBalance(document);
    if (balance !== null) {
      if (!validityDetailsReady(document)) {
        return inspectionResult({
          kind: 'not_found',
          authState: 'authenticated',
          reason: 'expiration_not_found',
        });
      }

      const earliestExpiration = readEarliestExpiration(document);
      return inspectionResult({
        kind: 'success',
        authState: 'authenticated',
        capture: {
          balance,
          memberNumber,
          expiration:
            balance === 0
              ? {
                  type: 'unknown',
                  date: null,
                  month: null,
                  amount: null,
                  note: 'N/A because no KrisFlyer miles are available to expire',
                }
              : earliestExpiration
                ? {
                type: 'fixed_date',
                date: null,
                month: earliestExpiration.month,
                amount: earliestExpiration.amount,
                note: 'Earliest expiring mileage tranche shown by KrisFlyer',
                  }
                : hasPpsStatus(document)
                  ? {
                  type: 'never',
                  date: null,
                  month: null,
                  amount: null,
                  note: 'N/A while PPS Club status remains active',
                    }
                  : {
                      type: 'unknown',
                      date: null,
                      month: null,
                      amount: null,
                      note:
                        'No expiring KrisFlyer mileage tranche is displayed',
                    },
        },
      });
    }
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
    authState: hasAllowedElement(document, BALANCE_SELECTORS)
      ? 'authenticated'
      : 'unknown',
    reason: 'balance_not_found',
  });
}
