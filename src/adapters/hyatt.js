import { parseBalance } from '../domain/balances.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
} from './shared.js';

const BALANCE_LABEL = 'Current Point Balance';

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

function normalizedText(element) {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function isAllowedDisplayElement(element) {
  if (!element || ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(element.tagName)) {
    return false;
  }
  if (element.isContentEditable) return false;
  return !element.closest('input, textarea, select, [contenteditable="true"]');
}

function readCurrentPointBalance(document) {
  const labels = Array.from(document.querySelectorAll('span')).filter(
    (candidate) => normalizedText(candidate) === BALANCE_LABEL,
  );

  for (const label of labels) {
    const container = label.parentElement;
    if (!container) continue;

    for (const candidate of container.children) {
      if (candidate === label || !isAllowedDisplayElement(candidate)) continue;
      const balance = parseBalance(normalizedText(candidate));
      if (balance !== null) return balance;
    }
  }

  return null;
}

export function inspectHyatt(document, rawUrl) {
  const balance = readCurrentPointBalance(document);
  if (balance !== null) {
    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        expiration: {
          type: 'never',
          date: null,
          note: 'N/A for the cardholder profile configured in this local ledger',
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
    authState: pathIncludes(rawUrl, ['/profile/']) ? 'authenticated' : 'unknown',
    reason: 'balance_not_found',
  });
}
