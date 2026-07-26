import { parseBalance } from '../domain/balances.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readBalance,
} from './shared.js';

const SYNTHETIC_BALANCE_SELECTORS = Object.freeze([
  '[data-points-tracker="amex-available-points"]',
]);

const AVAILABLE_POINTS_LABEL = 'Available Points';
const AVAILABLE_POINTS_LAYOUTS = Object.freeze([
  {
    headerSelector: '#available-header-lg',
    containerSelector: '[data-testid="desktop-tile"]',
    balanceSelector:
      'p.heading-sans-medium-bold.color-text-emphasis',
  },
  {
    headerSelector: '#available-header-md-sm',
    containerSelector: '[data-testid="small-tile"]',
    balanceSelector: 'p.heading-sans-medium-bold',
  },
]);

const ACCOUNT_SELECTORS = Object.freeze([
  '#available-header-lg',
  '#available-header-md-sm',
  '#overview-amex',
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="logon"]',
  '[data-testid="login-form"]',
]);

function normalizedText(
  element: Element | null | undefined,
): string | null {
  if (
    !(element instanceof HTMLElement) ||
    element.isContentEditable ||
    element.closest('input, textarea, select, [contenteditable="true"]')
  ) {
    return null;
  }

  return element.textContent?.replace(/\s+/g, ' ').trim() ?? null;
}

function readRenderedAvailablePoints(document: Document): number | null {
  const syntheticBalance = readBalance(
    document,
    SYNTHETIC_BALANCE_SELECTORS,
  );
  if (syntheticBalance !== null) return syntheticBalance;

  for (const layout of AVAILABLE_POINTS_LAYOUTS) {
    const header = document.querySelector(layout.headerSelector);
    const label = Array.from(header?.querySelectorAll('span') ?? []).find(
      (element) => normalizedText(element) === AVAILABLE_POINTS_LABEL,
    );
    if (!label) continue;

    const container = header?.closest(layout.containerSelector);
    const balanceElement = container?.querySelector(layout.balanceSelector);
    const balanceText = normalizedText(balanceElement);
    const balance = parseBalance(balanceText);
    if (balance !== null) return balance;
  }

  return null;
}

export function inspectAmex(document: Document, rawUrl: string) {
  const balance = readRenderedAvailablePoints(document);
  if (balance !== null) {
    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'Expiration does not apply to this balance-only ledger row',
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
    pathIncludes(rawUrl, ['/login', '/logon', '/signin', '/sign-in']) ||
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
