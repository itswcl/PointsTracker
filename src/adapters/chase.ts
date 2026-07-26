import {
  isValidBalance,
  parseBalance,
} from '../domain/balances.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
} from './shared.js';

const REWARDS_LIST_SELECTOR =
  'mds-list.mds-list--cmb[list-type="navigational"]';
const CARD_ROW_SELECTOR = 'li.list-item--navigational';
const BALANCE_SELECTOR =
  '.list-item__description.list-item__description--subdued';
const AVAILABLE_POINTS_PATTERN =
  /^Available Points:\s*([\d,]+)\s+pts$/i;
const MAX_SHADOW_ROOTS = 24;
const MAX_SCANNED_ELEMENTS = 2_000;
const MAX_REWARDS_LISTS = 4;
const MAX_CARD_ROWS = 32;
const MAX_BALANCE_CANDIDATES_PER_ROW = 8;
const FORM_CONTROLS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION']);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="logon"]',
  'form[action*="signin"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

function parentElementAcrossShadow(element: Element): Element | null {
  if (element.parentElement) return element.parentElement;
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

function isRendered(
  element: Element,
  respectAriaHidden = true,
): boolean {
  for (
    let current: Element | null = element;
    current;
    current = parentElementAcrossShadow(current)
  ) {
    if (
      current.hasAttribute('hidden') ||
      current.hasAttribute('inert') ||
      (respectAriaHidden &&
        current.getAttribute('aria-hidden') === 'true')
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

function normalizedDisplayText(element: Element): string | null {
  if (
    !(element instanceof HTMLElement) ||
    FORM_CONTROLS.has(element.tagName) ||
    element.isContentEditable ||
    element.closest('input, textarea, select, [contenteditable="true"]') ||
    !isRendered(element, false)
  ) {
    return null;
  }

  return element.textContent?.replace(/\s+/g, ' ').trim() ?? null;
}

function findRewardsLists(document: Document): HTMLElement[] {
  const roots: ParentNode[] = [document];
  const lists = new Set<HTMLElement>();
  let scannedElements = 0;
  let scannedRoots = 0;

  while (
    roots.length > 0 &&
    scannedRoots < MAX_SHADOW_ROOTS &&
    scannedElements < MAX_SCANNED_ELEMENTS
  ) {
    const root = roots.shift();
    if (!root) break;
    scannedRoots += 1;

    const elements = Array.from(root.querySelectorAll('*'));
    for (const element of elements) {
      scannedElements += 1;
      if (scannedElements > MAX_SCANNED_ELEMENTS) break;

      if (
        element instanceof HTMLElement &&
        element.matches(REWARDS_LIST_SELECTOR)
      ) {
        lists.add(element);
        if (lists.size > MAX_REWARDS_LISTS) return [];
      }

      if (
        element.shadowRoot &&
        scannedRoots + roots.length < MAX_SHADOW_ROOTS
      ) {
        roots.push(element.shadowRoot);
      }
    }
  }

  return [...lists];
}

function readCardBalance(row: Element): number | null {
  const candidates = Array.from(
    row.querySelectorAll(BALANCE_SELECTOR),
  ).slice(0, MAX_BALANCE_CANDIDATES_PER_ROW);
  const balances = new Set<number>();

  for (const candidate of candidates) {
    const numericText = normalizedDisplayText(candidate)?.match(
      AVAILABLE_POINTS_PATTERN,
    )?.[1];
    if (!numericText) continue;

    const balance = parseBalance(numericText);
    if (balance !== null) balances.add(balance);
  }

  return balances.size === 1 ? [...balances][0] ?? null : null;
}

function readRewardsListTotal(list: HTMLElement): number | null {
  const shadowRoot = list.shadowRoot;
  if (!shadowRoot) return null;

  const allRows = Array.from(shadowRoot.querySelectorAll(CARD_ROW_SELECTOR));
  if (allRows.length === 0 || allRows.length > MAX_CARD_ROWS) return null;

  const rows = allRows.filter((row) => isRendered(row));
  if (rows.length === 0) return null;

  let total = 0;
  for (const row of rows) {
    const balance = readCardBalance(row);
    if (balance === null) return null;

    total += balance;
    if (!isValidBalance(total)) return null;
  }

  return total;
}

function readCombinedBalance(document: Document): number | null {
  const lists = findRewardsLists(document).filter((list) => isRendered(list));
  if (lists.length === 0) return null;

  const totals = new Set<number>();
  for (const list of lists) {
    const total = readRewardsListTotal(list);
    if (total === null) return null;
    totals.add(total);
  }

  return totals.size === 1 ? [...totals][0] ?? null : null;
}

export function inspectChase(document: Document, rawUrl: string) {
  const balance = readCombinedBalance(document);
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
    authState:
      findRewardsLists(document).length > 0 ? 'authenticated' : 'unknown',
    reason: 'balance_not_found',
  });
}
