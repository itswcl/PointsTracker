import { parseBalance } from '../domain/balances.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
  readBalance,
} from './shared.js';

const SYNTHETIC_BALANCE_SELECTORS = Object.freeze([
  '[data-points-tracker="citi-thankyou-total"]',
]);

const TOTAL_POINTS_LABEL = 'Total ThankYou® Points';
const REWARDS_CONTAINER_SELECTOR = '.reward-wrapper.clubbed-wrapper';
const HEADING_SELECTOR =
  '.reward-heading[role="heading"], h1, h2, h3, h4, [role="heading"]';
const AMOUNT_SELECTOR = '.reward-amount';
const POINTS_AMOUNT_PATTERN = /^\d{1,3}(?:,\d{3})*$|^\d+$/;
const MAX_REWARDS_CONTAINERS = 12;

const ACCOUNT_SELECTORS = Object.freeze([
  REWARDS_CONTAINER_SELECTOR,
  '.reward-heading[role="heading"]',
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="logon"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

function normalizedDisplayText(
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

function readRenderedThankYouTotal(document: Document): number | null {
  const syntheticBalance = readBalance(
    document,
    SYNTHETIC_BALANCE_SELECTORS,
  );
  if (syntheticBalance !== null) return syntheticBalance;

  const balances = new Set<number>();
  const containers = Array.from(
    document.querySelectorAll(REWARDS_CONTAINER_SELECTOR),
  ).slice(0, MAX_REWARDS_CONTAINERS);

  for (const container of containers) {
    const hasExactLabel = Array.from(
      container.querySelectorAll(HEADING_SELECTOR),
    ).some(
      (heading) =>
        normalizedDisplayText(heading) === TOTAL_POINTS_LABEL,
    );
    if (!hasExactLabel) continue;

    for (const amountElement of container.querySelectorAll(AMOUNT_SELECTOR)) {
      const candidates =
        amountElement.children.length > 0
          ? Array.from(amountElement.children)
          : [amountElement];

      for (const candidate of candidates) {
        const text = normalizedDisplayText(candidate);
        if (!text || !POINTS_AMOUNT_PATTERN.test(text)) continue;

        const balance = parseBalance(text);
        if (balance !== null) balances.add(balance);
      }
    }
  }

  return balances.size === 1 ? [...balances][0] ?? null : null;
}

export function inspectCiti(document: Document, rawUrl: string) {
  const balance = readRenderedThankYouTotal(document);
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
