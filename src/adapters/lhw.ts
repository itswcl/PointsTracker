import { parseBalance } from "../domain/balances.js";
import { addMonths, parseDisplayedDate } from "../domain/dates.js";
import {
  firstAllowedText,
  hasAllowedElement,
  inspectionResult,
  memberNumberInspection,
  pageHasVerification,
  pathIncludes,
  readMemberNumber,
} from "./shared.js";

const BALANCE_SELECTORS = Object.freeze([
  '[data-points-tracker="lhw-points-balance"]',
  "#point-counter",
]);

const ACCOUNT_SELECTORS = Object.freeze([
  "#rewards-activity-title",
  "#rewardsActivityApp",
  "section.reward-activity",
]);

const ACTIVITY_ROW_SELECTORS = Object.freeze([
  '[data-points-tracker="lhw-activity"]',
  "#rewardsActivityApp .reward-list-table tbody tr",
]);

const MEMBER_NUMBER_RULES = Object.freeze([
  { selector: '[data-points-tracker="lhw-member-number"]' },
  {
    selector: ".col.user-info",
    pattern: /\bMember\s+ID\s*:?\s*([A-Z0-9*][A-Z0-9*-]{2,31})\b/i,
  },
]);

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

const MAX_ACTIVITY_ROWS = 100;
const NON_QUALIFYING_ACTIVITY_PATTERN =
  /\b(?:expired?|expiration|forfeit(?:ed|ure)?)\b/i;

function isAllowedDisplayElement(
  element: Element | null,
): element is HTMLElement {
  if (
    !(element instanceof HTMLElement) ||
    ["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(element.tagName)
  ) {
    return false;
  }
  if (element.isContentEditable) return false;
  return !element.closest('input, textarea, select, [contenteditable="true"]');
}

function activityDateFromRow(element: HTMLElement) {
  if (element.matches('[data-points-tracker="lhw-activity"]')) {
    return parseDisplayedDate(element.textContent);
  }

  const cells = Array.from(
    element.querySelectorAll('td, [role="cell"]'),
  );
  const rowText = cells
    .map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .join(' ');
  if (NON_QUALIFYING_ACTIVITY_PATTERN.test(rowText)) {
    return null;
  }

  const dateCell = cells[0] ?? null;
  if (!isAllowedDisplayElement(dateCell)) return null;
  return parseDisplayedDate(dateCell.textContent);
}

function readNewestActivityDate(document: Document) {
  const dates = ACTIVITY_ROW_SELECTORS.flatMap((selector) =>
    Array.from(document.querySelectorAll(selector))
      .slice(0, MAX_ACTIVITY_ROWS)
      .filter(isAllowedDisplayElement)
      .map(activityDateFromRow)
      .filter((date) => date !== null),
  );

  return dates.reduce<(typeof dates)[number] | null>(
    (newest, date) => (!newest || date > newest ? date : newest),
    null,
  );
}

export function inspectLhw(document: Document, rawUrl: string) {
  const balance = parseBalance(firstAllowedText(document, BALANCE_SELECTORS));
  const memberNumber = readMemberNumber(document, MEMBER_NUMBER_RULES);

  if (balance !== null) {
    if (balance === 0) {
      return inspectionResult({
        kind: "success",
        authState: "authenticated",
        capture: {
          balance,
          memberNumber,
          expiration: {
            type: "never",
            date: null,
            note: "N/A because no LHW points are available to expire",
          },
        },
      });
    }

    const activityDate = readNewestActivityDate(document);
    const expirationDate = activityDate ? addMonths(activityDate, 24) : null;

    return inspectionResult({
      kind: "success",
      authState: "authenticated",
      capture: {
        balance,
        memberNumber,
        expiration: {
          type: "activity_based",
          date: expirationDate,
          inactivityMonths: 24,
          note: expirationDate
            ? "Derived from the newest qualifying points activity shown by LHW"
            : "Expires after 24 months without qualifying earn or redeem activity; newest activity date not shown",
        },
      },
    });
  }

  if (memberNumber) return memberNumberInspection(memberNumber);

  if (pageHasVerification(document, rawUrl)) {
    return inspectionResult({
      kind: "verification_required",
      reason: "verification_required",
    });
  }

  if (
    pathIncludes(rawUrl, ["/login", "/signin", "/sign-in"]) ||
    hasAllowedElement(document, LOGIN_PAGE_SELECTORS)
  ) {
    return inspectionResult({
      kind: "login_required",
      authState: "signed_out",
      reason: "login_required",
    });
  }

  return inspectionResult({
    kind: "not_found",
    authState: hasAllowedElement(document, ACCOUNT_SELECTORS)
      ? "authenticated"
      : "unknown",
    reason: "balance_not_found",
  });
}
