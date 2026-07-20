import { parseBalance } from '../domain/balances.js';
import { parseDisplayedDate } from '../domain/dates.js';

const FORM_CONTROLS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION']);
const DATE_CANDIDATES = [
  /\b\d{4}-\d{2}-\d{2}\b/,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/,
  /\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/,
  /\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/,
];

function isAllowedDisplayElement(element) {
  if (!element || FORM_CONTROLS.has(element.tagName)) return false;
  if (element.isContentEditable) return false;
  return !element.closest('input, textarea, select, [contenteditable="true"]');
}

export function firstAllowedElement(document, selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (isAllowedDisplayElement(element)) return element;
  }
  return null;
}

export function firstAllowedText(document, selectors) {
  const text = firstAllowedElement(document, selectors)?.textContent;
  return typeof text === 'string' ? text.trim() : null;
}

export function readBalance(document, selectors) {
  return parseBalance(firstAllowedText(document, selectors));
}

export function readDate(document, selectors) {
  const text = firstAllowedText(document, selectors);
  if (!text) return null;

  for (const pattern of DATE_CANDIDATES) {
    const candidate = text.match(pattern)?.[0];
    const date = candidate ? parseDisplayedDate(candidate) : null;
    if (date) return date;
  }
  return null;
}

export function hasAllowedElement(document, selectors) {
  return Boolean(firstAllowedElement(document, selectors));
}

export function pathIncludes(rawUrl, fragments) {
  try {
    const path = new URL(rawUrl).pathname.toLowerCase();
    return fragments.some((fragment) => path.includes(fragment));
  } catch {
    return false;
  }
}

export function pageHasVerification(document, rawUrl) {
  if (pathIncludes(rawUrl, ['/verify', '/verification', '/challenge', '/captcha'])) {
    return true;
  }

  return Boolean(
    document.querySelector(
      'iframe[src*="captcha"], iframe[src*="challenge"], [data-testid*="verification"], [data-testid*="challenge"]',
    ),
  );
}

export function inspectionResult({
  kind,
  authState = 'unknown',
  capture = null,
  reason = null,
}) {
  return { kind, authState, capture, reason };
}

