import { parseBalance } from '../domain/balances.js';
import { parseDisplayedMonth } from '../domain/dates.js';
import { normalizeMemberNumber } from '../domain/member-numbers.js';
import type { MonthKey } from '../types.js';
import {
  hasAllowedElement,
  inspectionResult,
  memberNumberInspection,
  pageHasVerification,
  pathIncludes,
  readMemberNumber,
} from './shared.js';

const BALANCE_LABEL = 'Mileage balance (Total)';
const EXPIRY_LABEL = 'Expiry date';
const ACTIVITY_ROOT_SELECTOR = '#meisai';

const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="ana-member-number"]' },
  { selector: '[data-testid="membership-number"]' },
  {
    selector: 'dl',
    pattern:
      /\b(?:ANA\s+Mileage\s+Club|AMC|membership|member)\s*(?:number|no\.?|#)\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[id*="login"] form',
]);

interface ExpiryReadiness {
  ready: boolean;
  month: MonthKey | null;
}

function normalizedText(element: Node | null): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function matchesLabel(element: Node | null, label: string): boolean {
  return (
    normalizedText(element).replace(/\s+/g, '').toLowerCase() ===
    label.replace(/\s+/g, '').toLowerCase()
  );
}

function isAllowedDisplayElement(element: Element | null | undefined): element is HTMLElement {
  if (!(element instanceof HTMLElement) || ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(element.tagName)) {
    return false;
  }
  if (element.isContentEditable) return false;
  return !element.closest('input, textarea, select, [contenteditable="true"]');
}

function readTotalBalance(document: Document): number | null {
  const label = Array.from(document.querySelectorAll('dt')).find(
    (candidate) => normalizedText(candidate) === BALANCE_LABEL,
  );
  const value = label?.nextElementSibling;
  if (value?.tagName !== 'DD' || !isAllowedDisplayElement(value)) return null;

  // ANA renders `<strong>123,456<span>miles</span></strong>`, so textContent
  // becomes `123,456miles` without the boundary required by the shared parser.
  // Read only the strong element's direct text node and ignore its unit span.
  const balanceContainer = value.querySelector(':scope > strong') ?? value;
  const numericText = Array.from(balanceContainer.childNodes)
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent)
    .join(' ');
  return parseBalance(numericText);
}

function readMainCardNumber(document: Document): string | null {
  const mainCardLabels = new Set(['メインカード', 'Main card']);
  const numberLabels = new Set(['お客様番号', 'ANA Number']);
  const root = document.querySelector('#camContentsArea');
  const heading = root
    ? Array.from(root.querySelectorAll('h2')).find(
        (candidate) => mainCardLabels.has(normalizedText(candidate)),
      )
    : null;
  const table =
    heading?.nextElementSibling?.tagName === 'TABLE'
      ? heading.nextElementSibling
      : null;
  if (table) {
    const headings = Array.from(table.querySelectorAll('th'));
    const numberIndex = headings.findIndex(
      (candidate) => numberLabels.has(normalizedText(candidate)),
    );
    if (numberIndex >= 0) {
      for (const row of table.querySelectorAll('tr')) {
        const value = row.querySelectorAll('td')[numberIndex];
        if (!isAllowedDisplayElement(value)) continue;
        const memberNumber = normalizeMemberNumber(normalizedText(value));
        if (memberNumber) return memberNumber;
      }
    }
  }

  for (const label of document.querySelectorAll(
    'dl.mw2025_code > dt, dl.mw1803_code > dt',
  )) {
    if (!numberLabels.has(normalizedText(label))) continue;
    const value = label.nextElementSibling;
    if (value?.tagName !== 'DD' || !isAllowedDisplayElement(value)) continue;
    const memberNumber = normalizeMemberNumber(normalizedText(value));
    if (memberNumber) return memberNumber;
  }

  return null;
}

function readLatestExpiryMonth(document: Document): ExpiryReadiness {
  const root = document.querySelector(ACTIVITY_ROOT_SELECTOR);
  if (!root) return { ready: false, month: null };

  const table = Array.from(root.querySelectorAll('table')).find((candidate) =>
    Array.from(candidate.querySelectorAll('th')).some(
      (heading) => matchesLabel(heading, EXPIRY_LABEL),
    ),
  );
  if (!table) return { ready: false, month: null };

  const headings = Array.from(table.querySelectorAll('th'));
  const expiryIndex = headings.findIndex(
    (heading) => matchesLabel(heading, EXPIRY_LABEL),
  );
  if (expiryIndex < 0) return { ready: false, month: null };

  for (const row of table.querySelectorAll('tr')) {
    const cells = row.querySelectorAll('td');
    const expiryCell = cells[expiryIndex];
    if (!isAllowedDisplayElement(expiryCell)) continue;
    const month = parseDisplayedMonth(normalizedText(expiryCell));
    if (month) return { ready: true, month };
  }

  return { ready: true, month: null };
}

export function inspectAna(document: Document, rawUrl: string) {
  const balance = readTotalBalance(document);
  const memberNumber =
    readMainCardNumber(document) ??
    readMemberNumber(document, MEMBER_NUMBER_RULES);
  if (balance !== null) {
    const expiration = readLatestExpiryMonth(document);
    if (!expiration.ready) {
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
        expiration: expiration.month
          ? {
              type: 'fixed_date',
              date: null,
              month: expiration.month,
              note: 'Expiry month shown for the latest ANA activity',
            }
          : {
              type: 'unknown',
              date: null,
              month: null,
              note: 'Latest activity expiry date not found',
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
    authState: hasAllowedElement(document, [ACTIVITY_ROOT_SELECTOR])
      ? 'authenticated'
      : 'unknown',
    reason: 'balance_not_found',
  });
}
