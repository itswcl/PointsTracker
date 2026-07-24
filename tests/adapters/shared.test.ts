import { describe, expect, it } from 'vitest';
import { readMemberNumber } from '../../src/adapters/shared.js';

describe('shared member-number reader', () => {
  it('reads only allowlisted rendered text and preserves leading zeroes', () => {
    document.body.innerHTML = `
      <span data-member-number>0012345678</span>
      <input data-member-number value="9999999999" />
    `;

    expect(
      readMemberNumber(document, [{ selector: '[data-member-number]' }]),
    ).toBe('0012345678');
  });

  it('does not read credential or editable controls', () => {
    document.body.innerHTML = `
      <input data-member-number value="9999999999" />
      <span data-member-number contenteditable="true">8888888888</span>
    `;

    expect(
      readMemberNumber(document, [{ selector: '[data-member-number]' }]),
    ).toBeNull();
  });
});
