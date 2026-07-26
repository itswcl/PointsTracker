import { describe, expect, it } from 'vitest';
import { inspectAmex } from '../../src/adapters/amex.js';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

describe('American Express Membership Rewards adapter', () => {
  it('captures Available Points from the desktop rewards tile', () => {
    const result = inspectAmex(
      page(`
        <section id="overview-amex">
          <div data-testid="desktop-tile">
            <h2 id="available-header-lg">
              <span>Available Points</span>
              <button>available</button>
            </h2>
            <p class="heading-sans-medium-bold color-text-emphasis">
              112,233
            </p>
          </div>
          <div data-testid="desktop-tile">
            <h2><span>Points Earned</span></h2>
            <p class="heading-sans-medium-bold color-text-emphasis">
              654,321
            </p>
          </div>
        </section>
      `),
      'https://global.americanexpress.com/rewards',
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 112233,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'Expiration does not apply to this balance-only ledger row',
        },
      },
    });
  });

  it('captures zero Available Points from the responsive tile', () => {
    const result = inspectAmex(
      page(`
        <section id="overview-amex">
          <div data-testid="small-tile">
            <div>
              <h2 id="available-header-md-sm">
                <span>Available Points</span>
              </h2>
              <p class="heading-sans-medium-bold">0</p>
            </div>
          </div>
        </section>
      `),
      'https://global.americanexpress.com/rewards',
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 0,
        memberNumber: null,
      },
    });
  });

  it('does not treat promotional or points-earned values as the balance', () => {
    const result = inspectAmex(
      page(`
        <section id="overview-amex">
          <div data-testid="desktop-tile">
            <h2 id="available-header-lg">
              <span>Points Earned in 2026</span>
            </h2>
            <p class="heading-sans-medium-bold color-text-emphasis">
              654,321
            </p>
          </div>
          <aside>Congratulations, you earned 150,000 points!</aside>
        </section>
      `),
      'https://global.americanexpress.com/rewards',
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('never reads a credential input as Available Points', () => {
    const result = inspectAmex(
      page(`
        <input
          data-points-tracker="amex-available-points"
          value="999999"
        />
      `),
      'https://global.americanexpress.com/rewards',
    );

    expect(result.kind).toBe('not_found');
  });

  it('recognizes a signed-out page', () => {
    const result = inspectAmex(
      page('<form action="/account/logon"><button>Log In</button></form>'),
      'https://global.americanexpress.com/logon',
    );

    expect(result).toMatchObject({
      kind: 'login_required',
      authState: 'signed_out',
      reason: 'login_required',
    });
  });

  it('recognizes a verification page', () => {
    const result = inspectAmex(
      page('<iframe src="/challenge/captcha"></iframe>'),
      'https://global.americanexpress.com/verification',
    );

    expect(result).toMatchObject({
      kind: 'verification_required',
      reason: 'verification_required',
    });
  });
});
