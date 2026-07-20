import { parseBalance } from '../domain/balances.js';
import { parseDisplayedMonth } from '../domain/dates.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
} from './shared.js';

const BALANCE_LABEL = 'Mileage balance (Total)';
const EXPIRY_LABEL = 'Expiry date';
const ACTIVITY_ROOT_SELECTOR = '#meisai';

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[id*="login"] form',
]);

function normalizedText(element) {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function matchesLabel(element, label) {
  return (
    normalizedText(element).replace(/\s+/g, '').toLowerCase() ===
    label.replace(/\s+/g, '').toLowerCase()
  );
}

function isAllowedDisplayElement(element) {
  if (!element || ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(element.tagName)) {
    return false;
  }
  if (element.isContentEditable) return false;
  return !element.closest('input, textarea, select, [contenteditable="true"]');
}

function readTotalBalance(document) {
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

function readLatestExpiryMonth(document) {
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

export function inspectAna(document, rawUrl) {
  const balance = readTotalBalance(document);
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
