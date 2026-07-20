import { parseBalance } from '../domain/balances.js';
import {
  hasAllowedElement,
  inspectionResult,
  pageHasVerification,
  pathIncludes,
} from './shared.js';

const LOGIN_PAGE_SELECTORS = Object.freeze([
  'form[action*="login"]',
  'form[action*="sign-in"]',
  '[data-testid="login-form"]',
]);

function guestInfoSections(document) {
  const headerRoot = document.querySelector('#borealis-header')?.shadowRoot;
  if (!headerRoot) return [];

  const sections = Array.from(
    headerRoot.querySelectorAll('borealis-guest-info-section'),
  );
  const profileMenuRoot = headerRoot.querySelector('borealis-profile-menu')?.shadowRoot;
  if (profileMenuRoot) {
    sections.push(
      ...profileMenuRoot.querySelectorAll('borealis-guest-info-section'),
    );
  }
  return sections;
}

function readAtmosBalance(document) {
  for (const section of guestInfoSections(document)) {
    const rows = section.shadowRoot?.querySelectorAll('.guest-datapoint') ?? [];
    for (const row of rows) {
      const paragraphs = Array.from(row.children).filter(
        (child) => child.tagName === 'P',
      );
      const label = paragraphs[0]?.textContent?.trim().toLowerCase();
      if (label !== 'available points:') continue;

      const valueElement = paragraphs.at(-1);
      if (!valueElement || valueElement.isContentEditable) return null;
      return parseBalance(valueElement.textContent);
    }
  }
  return null;
}

export function inspectAlaska(document, rawUrl) {
  const balance = readAtmosBalance(document);
  if (balance !== null) {
    return inspectionResult({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance,
        expiration: {
          type: 'never',
          date: null,
          note: 'No expiration',
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
    authState: guestInfoSections(document).length > 0 ? 'authenticated' : 'unknown',
    reason: 'balance_not_found',
  });
}
