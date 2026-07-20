import { parseBalance } from '../domain/balances.js';
import { parseDisplayedDate } from '../domain/dates.js';
import type {
  AuthState,
  AutomaticCapture,
  CaptureError,
  DateKey,
  InspectionFailure,
  InspectionFailureKind,
  InspectionSuccess,
} from '../types.js';

const FORM_CONTROLS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION']);
const DATE_CANDIDATES = [
  /\b\d{4}-\d{2}-\d{2}\b/,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/,
  /\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/,
  /\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/,
] as const;

function isAllowedDisplayElement(
  element: Element | null,
): element is HTMLElement {
  if (!(element instanceof HTMLElement) || FORM_CONTROLS.has(element.tagName)) {
    return false;
  }
  if (element.isContentEditable) return false;
  return !element.closest('input, textarea, select, [contenteditable="true"]');
}

export function firstAllowedElement(
  document: Document,
  selectors: readonly string[],
): HTMLElement | null {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (isAllowedDisplayElement(element)) return element;
  }
  return null;
}

export function firstAllowedText(
  document: Document,
  selectors: readonly string[],
): string | null {
  const text = firstAllowedElement(document, selectors)?.textContent;
  return typeof text === 'string' ? text.trim() : null;
}

export function readBalance(
  document: Document,
  selectors: readonly string[],
): number | null {
  return parseBalance(firstAllowedText(document, selectors));
}

export function readDate(
  document: Document,
  selectors: readonly string[],
): DateKey | null {
  const text = firstAllowedText(document, selectors);
  if (!text) return null;

  for (const pattern of DATE_CANDIDATES) {
    const candidate = text.match(pattern)?.[0];
    const date = candidate ? parseDisplayedDate(candidate) : null;
    if (date) return date;
  }
  return null;
}

export function hasAllowedElement(
  document: Document,
  selectors: readonly string[],
): boolean {
  return Boolean(firstAllowedElement(document, selectors));
}

export function pathIncludes(rawUrl: string, fragments: readonly string[]): boolean {
  try {
    const path = new URL(rawUrl).pathname.toLowerCase();
    return fragments.some((fragment) => path.includes(fragment));
  } catch {
    return false;
  }
}

export function pageHasVerification(document: Document, rawUrl: string): boolean {
  if (pathIncludes(rawUrl, ['/verify', '/verification', '/challenge', '/captcha'])) {
    return true;
  }

  return Boolean(
    document.querySelector(
      'iframe[src*="captcha"], iframe[src*="challenge"], [data-testid*="verification"], [data-testid*="challenge"]',
    ),
  );
}

interface SuccessInput {
  kind: 'success';
  authState?: AuthState;
  capture: AutomaticCapture;
  reason?: null;
}

interface FailureInput {
  kind: InspectionFailureKind;
  authState?: AuthState;
  capture?: null;
  reason?: CaptureError | null;
}

export function inspectionResult(input: SuccessInput): InspectionSuccess;
export function inspectionResult(input: FailureInput): InspectionFailure;
export function inspectionResult(
  input: SuccessInput | FailureInput,
): InspectionSuccess | InspectionFailure {
  if (input.kind === 'success') {
    return {
      kind: input.kind,
      authState: input.authState ?? 'unknown',
      capture: input.capture,
      reason: null,
    };
  }

  return {
    kind: input.kind,
    authState: input.authState ?? 'unknown',
    capture: null,
    reason: input.reason ?? null,
  };
}
