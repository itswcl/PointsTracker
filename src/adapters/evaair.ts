import { parseBalance } from '../domain/balances.js';
import { parseDisplayedMonth } from '../domain/dates.js';
import type { MonthKey } from '../types.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
} from './shared.js';

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

interface ExpiringTranche {
  month: MonthKey;
  amount: number;
}

function isAllowedDisplayElement(element: Element | null | undefined): element is HTMLElement {
  if (!(element instanceof HTMLElement) || ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(element.tagName)) {
    return false;
  }
  if (element.isContentEditable) return false;
  return !element.closest('input, textarea, select, [contenteditable="true"]');
}

function mileageOverview(document: Document): Element | null {
  return document.querySelector('#div_Mile')?.parentElement ?? null;
}

function readSelfAwardBalance(document: Document): number | null {
  const overview = mileageOverview(document);
  const element = overview?.querySelector(
    ':scope > p.margin-b-2 span.color-green.text-2.text-medium',
  );
  return isAllowedDisplayElement(element) ? parseBalance(element.textContent) : null;
}

function readEarliestExpiration(document: Document): ExpiringTranche | null {
  const overview = mileageOverview(document);
  if (!overview) return null;

  const table = Array.from(overview.querySelectorAll(':scope > table')).find(
    (candidate) => {
      const headings = Array.from(candidate.querySelectorAll('th')).map((heading) =>
        heading.textContent?.trim().toLowerCase(),
      );
      return headings.includes('valid through') && headings.includes('mileage');
    },
  );
  if (!table) return null;

  const tranches = Array.from(table.querySelectorAll('tr'))
    .map((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return null;
      if (!isAllowedDisplayElement(cells[0]) || !isAllowedDisplayElement(cells[1])) {
        return null;
      }
      const month = parseDisplayedMonth(cells[0].textContent);
      const amount = parseBalance(cells[1].textContent);
      return month && amount !== null ? { month, amount } : null;
    })
    .filter((tranche): tranche is ExpiringTranche => tranche !== null)
    .sort((left, right) => left.month.localeCompare(right.month));

  return tranches[0] ?? null;
}

export function inspectEvaAir(document: Document, rawUrl: string) {
  const balance = readSelfAwardBalance(document);
  if (balance !== null) {
    const earliestExpiration = readEarliestExpiration(document);
    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        expiration: earliestExpiration
          ? {
              type: 'fixed_date',
              date: null,
              month: earliestExpiration.month,
              amount: earliestExpiration.amount,
              note: 'Earliest expiring mileage tranche shown by EVA Air',
            }
          : {
              type: 'unknown',
              date: null,
              month: null,
              amount: null,
              note: 'No expiring mileage tranche found',
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
    authState: hasAllowedElement(document, ['#div_Mile'])
      ? 'authenticated'
      : 'unknown',
    reason: 'balance_not_found',
  });
}
