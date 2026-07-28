import { parseBalance } from '../domain/balances.js';
import { addMonths, parseDisplayedDate } from '../domain/dates.js';
import {
  firstAllowedText,
  hasAllowedElement,
  inspectionResult,
  memberNumberInspection,
  pageHasVerification,
  pathIncludes,
  readMemberNumber,
} from './shared.js';

const ACCOUNT_ROOT_SELECTOR = 'div.cp-member-info-card.choice';
const BALANCE_CONTAINER_SELECTOR =
  '.cp-member-info-card.choice .points-container';
const ACTIVE_TIER_SELECTOR =
  '.cp-member-info-card.choice .member-tier-ribbon.choice span.membership-tier';
const HISTORY_TRIGGER_SELECTOR =
  'button#myStaysActivityModalBtn.choice-button.text_link_dark';
const TABLE_SELECTOR = 'table, [role="table"]';
const ROW_SELECTOR = 'tr, [role="row"]';
const CELL_SELECTOR = 'td, [role="cell"]';

const SYNTHETIC_BALANCE_SELECTORS = Object.freeze([
  '[data-points-tracker="choice-points-balance"]',
]);
const SYNTHETIC_ACTIVITY_SELECTOR =
  '[data-points-tracker="choice-activity"]';
const HISTORY_TABLE_NAMES = new Set(['Points earned', 'Points redeemed']);
const ELITE_TIER_PATTERN =
  /^(?:Gold|Platinum|Diamond|Titanium)(?:\s+Elite)?$/i;
const BALANCE_TEXT_PATTERN = /^(\d[\d,]*)\s*points?$/i;
const MAX_BALANCE_CANDIDATES = 40;
const MAX_TABLES = 16;
const MAX_ACTIVITY_ROWS = 100;
const MAX_CELLS_PER_ROW = 12;

const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="choice-member-number"]' },
  {
    selector: `${ACCOUNT_ROOT_SELECTOR} p.member-number`,
    pattern:
      /\bMember\s+number\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="signin"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

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
  return !element.closest(
    'input, textarea, select, [contenteditable="true"], [aria-hidden="true"], [hidden]',
  );
}

function normalizedText(element: Element | null | undefined): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function parseChoicePoints(text: string | null): number | null {
  if (!text) return null;
  const numericText = text.match(BALANCE_TEXT_PATTERN)?.[1];
  return numericText ? parseBalance(numericText) : null;
}

function readChoiceBalance(document: Document): number | null {
  const syntheticBalance = parseChoicePoints(
    firstAllowedText(document, SYNTHETIC_BALANCE_SELECTORS),
  );
  if (syntheticBalance !== null) return syntheticBalance;

  const container = document.querySelector(BALANCE_CONTAINER_SELECTOR);
  if (!isAllowedDisplayElement(container)) return null;

  const balances = new Set<number>();
  const candidates = Array.from(container.querySelectorAll('div')).slice(
    0,
    MAX_BALANCE_CANDIDATES,
  );
  for (const candidate of candidates) {
    if (!isAllowedDisplayElement(candidate)) continue;
    const text = normalizedText(candidate);
    const balance = parseChoicePoints(text);
    if (balance !== null) balances.add(balance);
  }

  return balances.size === 1 ? [...balances][0] ?? null : null;
}

function readActiveTier(document: Document): string | null {
  const tier = document.querySelector(ACTIVE_TIER_SELECTOR);
  return isAllowedDisplayElement(tier) ? normalizedText(tier) : null;
}

function isActiveElite(document: Document): boolean {
  const tier = readActiveTier(document);
  return tier !== null && ELITE_TIER_PATTERN.test(tier);
}

function accessibleName(
  document: Document,
  element: Element,
): string {
  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id))
      .filter((candidate): candidate is HTMLElement =>
        isAllowedDisplayElement(candidate),
      )
      .map(normalizedText)
      .join(' ')
      .trim();
    if (text) return text;
  }

  return normalizedText(element.querySelector('caption'));
}

function datesFromActivityTable(
  document: Document,
  table: HTMLElement,
): readonly string[] {
  const dates: string[] = [];
  const rows = Array.from(table.querySelectorAll(ROW_SELECTOR)).slice(
    0,
    MAX_ACTIVITY_ROWS,
  );
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll(CELL_SELECTOR)).slice(
      0,
      MAX_CELLS_PER_ROW,
    );
    for (const cell of cells) {
      if (!isAllowedDisplayElement(cell)) continue;
      const date = parseDisplayedDate(normalizedText(cell));
      if (date) {
        dates.push(date);
        break;
      }
    }
  }
  return dates;
}

function readNewestActivityDate(document: Document) {
  const dates: string[] = [];
  const syntheticRows = Array.from(
    document.querySelectorAll(SYNTHETIC_ACTIVITY_SELECTOR),
  ).slice(0, MAX_ACTIVITY_ROWS);
  for (const row of syntheticRows) {
    if (!isAllowedDisplayElement(row)) continue;
    const date = parseDisplayedDate(normalizedText(row));
    if (date) dates.push(date);
  }

  const tables = Array.from(document.querySelectorAll(TABLE_SELECTOR)).slice(
    0,
    MAX_TABLES,
  );
  for (const table of tables) {
    if (
      !isAllowedDisplayElement(table) ||
      !HISTORY_TABLE_NAMES.has(accessibleName(document, table))
    ) {
      continue;
    }
    dates.push(...datesFromActivityTable(document, table));
  }

  return dates.reduce<string | null>(
    (newest, date) => (!newest || date > newest ? date : newest),
    null,
  );
}

function historyIsOpen(document: Document): boolean {
  const dialogIsOpen = Array.from(
    document.querySelectorAll('[role="dialog"]'),
  )
    .filter(isAllowedDisplayElement)
    .some((dialog) => {
      const name = accessibleName(document, dialog);
      return (
        name === 'My stay & points statement' ||
        name === 'My statements'
      );
    });
  if (dialogIsOpen) return true;

  return Array.from(
    document.querySelectorAll('select, [role="combobox"], table, [role="table"]'),
  )
    .filter(isAllowedDisplayElement)
    .some((element) => {
      const name = accessibleName(document, element);
      return (
        name === 'Stay & point activity history' ||
        HISTORY_TABLE_NAMES.has(name)
      );
    });
}

export function prepareChoice(document: Document): boolean {
  if (isActiveElite(document) || historyIsOpen(document)) return false;

  const trigger = document.querySelector(HISTORY_TRIGGER_SELECTOR);
  if (
    !isAllowedDisplayElement(trigger) ||
    normalizedText(trigger) !== 'See points history'
  ) {
    return false;
  }

  trigger.click();
  return true;
}

export function inspectChoice(document: Document, rawUrl: string) {
  const balance = readChoiceBalance(document);
  const memberNumber = readMemberNumber(document, MEMBER_NUMBER_RULES);

  if (balance !== null) {
    if (balance === 0) {
      return inspectionResult({
        kind: 'success',
        authState: 'authenticated',
        capture: {
          balance,
          memberNumber,
          expiration: {
            type: 'never',
            date: null,
            note: 'N/A because no Choice Privileges points are available to expire',
          },
        },
      });
    }

    if (isActiveElite(document)) {
      return inspectionResult({
        kind: 'success',
        authState: 'authenticated',
        capture: {
          balance,
          memberNumber,
          expiration: {
            type: 'never',
            date: null,
            note: 'N/A while Choice Privileges Elite status is active',
          },
        },
      });
    }

    const activityDate = readNewestActivityDate(document);
    const expirationDate = activityDate
      ? addMonths(activityDate, 18)
      : null;
    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        memberNumber,
        expiration: {
          type: 'activity_based',
          date: expirationDate,
          inactivityMonths: 18,
          note: expirationDate
            ? 'Derived from the newest Choice Privileges points activity'
            : 'Expires after 18 months without qualifying activity; newest activity date not shown',
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
    pathIncludes(rawUrl, ['/login', '/signin', '/sign-in', '/auth']) ||
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
    authState: hasAllowedElement(document, [ACCOUNT_ROOT_SELECTOR])
      ? 'authenticated'
      : 'unknown',
    reason: 'balance_not_found',
  });
}
