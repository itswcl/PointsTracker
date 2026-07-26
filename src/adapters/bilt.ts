import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
} from './shared.js';

const SYNTHETIC_BALANCE_SELECTOR =
  '[data-points-tracker="bilt-points-balance"]';

const POINTS_PILL_SELECTOR =
  'button[data-testid="user-info-points-pill"]';
const POINTS_MENU_SELECTOR = '[role="menu"]';
const POINTS_LABEL = 'Your Points';
const SIGNED_WHOLE_POINTS_PATTERN =
  /^(-?(?:\d{1,3}(?:,\d{3})*|\d+))(?:\s+pts)?$/i;
const MAX_POINTS_PILLS = 4;
const MAX_POINTS_MENUS = 4;
const MAX_MENU_TEXT_ELEMENTS = 160;
const FORM_CONTROLS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION']);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="logon"]',
  'form[action*="signin"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
  '[data-testid="sign-in-form"]',
]);

function normalizedText(
  element: Element | null | undefined,
): string | null {
  if (
    !(element instanceof HTMLElement) ||
    FORM_CONTROLS.has(element.tagName) ||
    element.isContentEditable ||
    element.closest('input, textarea, select, [contenteditable="true"]')
  ) {
    return null;
  }

  return element.textContent?.replace(/\s+/g, ' ').trim() ?? null;
}

function isRendered(element: Element): boolean {
  for (
    let current: Element | null = element;
    current;
    current = current.parentElement
  ) {
    if (
      current.hasAttribute('hidden') ||
      current.hasAttribute('inert') ||
      current.getAttribute('aria-hidden') === 'true'
    ) {
      return false;
    }

    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (
      style?.display === 'none' ||
      style?.visibility === 'hidden' ||
      style?.visibility === 'collapse'
    ) {
      return false;
    }
  }

  return true;
}

function parseWholePoints(
  element: Element | null | undefined,
): number | null {
  if (!element || !isRendered(element)) return null;
  const numericText = normalizedText(element)?.match(
    SIGNED_WHOLE_POINTS_PATTERN,
  )?.[1];
  if (!numericText) return null;

  const balance = Number(numericText.replace(/,/g, ''));
  return Number.isSafeInteger(balance) ? balance : null;
}

function findPointsLabels(document: Document): HTMLElement[] {
  const labels: HTMLElement[] = [];
  const menus = Array.from(
    document.querySelectorAll(POINTS_MENU_SELECTOR),
  ).slice(0, MAX_POINTS_MENUS);

  for (const menu of menus) {
    if (!isRendered(menu)) continue;
    const candidates = Array.from(menu.querySelectorAll('*')).slice(
      0,
      MAX_MENU_TEXT_ELEMENTS,
    );
    for (const candidate of candidates) {
      if (
        normalizedText(candidate) === POINTS_LABEL &&
        candidate instanceof HTMLElement
      ) {
        labels.push(candidate);
      }
    }
  }

  return labels;
}

function readExactMenuBalance(document: Document): number | null {
  const balances = new Set<number>();

  for (const label of findPointsLabels(document)) {
    const balance = parseWholePoints(label.nextElementSibling);
    if (balance !== null) balances.add(balance);
  }

  return balances.size === 1 ? [...balances][0] ?? null : null;
}

function readWholePointsPill(document: Document): number | null {
  const balances = new Set<number>();
  const pills = Array.from(
    document.querySelectorAll(POINTS_PILL_SELECTOR),
  ).slice(0, MAX_POINTS_PILLS);

  for (const pill of pills) {
    const balance = parseWholePoints(pill);
    if (balance !== null) balances.add(balance);
  }

  return balances.size === 1 ? [...balances][0] ?? null : null;
}

function readBiltBalance(document: Document): number | null {
  const syntheticBalance = parseWholePoints(
    document.querySelector(SYNTHETIC_BALANCE_SELECTOR),
  );
  if (syntheticBalance !== null) return syntheticBalance;

  return readExactMenuBalance(document) ?? readWholePointsPill(document);
}

export function prepareBilt(document: Document): boolean {
  if (findPointsLabels(document).length > 0) return false;

  const pills = Array.from(
    document.querySelectorAll(POINTS_PILL_SELECTOR),
  )
    .slice(0, MAX_POINTS_PILLS)
    .filter(
      (element): element is HTMLButtonElement =>
        element instanceof HTMLButtonElement && isRendered(element),
    );

  if (pills.length !== 1) return false;
  pills[0]?.click();
  return true;
}

export function inspectBilt(document: Document, rawUrl: string) {
  const balance = readBiltBalance(document);
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
    authState: hasAllowedElement(document, [POINTS_PILL_SELECTOR])
      ? 'authenticated'
      : 'unknown',
    reason: 'balance_not_found',
  });
}
