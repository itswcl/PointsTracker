import { describe, expect, it } from 'vitest';
import {
  inspectBilt,
  prepareBilt,
} from '../../src/adapters/bilt.js';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

const BILT_URL = 'https://www.bilt.com/rewards/neighborhood';

function pointsMenu(balance: string): string {
  return `
    <ul role="menu">
      <li>
        <div>
          <span>Your Status</span>
          <span>Blue</span>
        </div>
        <div>
          <span>Your Points</span>
          <span>${balance}</span>
        </div>
      </li>
    </ul>
  `;
}

describe('Bilt Rewards adapter', () => {
  it('captures the exact rendered balance from the points menu', () => {
    const result = inspectBilt(
      page(`
        <nav>
          <button data-testid="user-info-points-pill">24.6k pts</button>
        </nav>
        ${pointsMenu('24,680')}
      `),
      BILT_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 24680,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'Expiration does not apply to this balance-only ledger row',
        },
      },
    });
  });

  it('captures a zero balance directly from the points pill', () => {
    const result = inspectBilt(
      page(`
        <nav>
          <button data-testid="user-info-points-pill">0 pts</button>
        </nav>
      `),
      BILT_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 0,
        memberNumber: null,
      },
    });
  });

  it('captures an exact negative balance from the rendered points menu', () => {
    const result = inspectBilt(
      page(`
        <nav>
          <button data-testid="user-info-points-pill">-4.3k pts</button>
        </nav>
        ${pointsMenu('-4,321')}
      `),
      BILT_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: -4321,
        memberNumber: null,
      },
    });
  });

  it('deduplicates matching responsive points menus', () => {
    const result = inspectBilt(
      page(`
        <button data-testid="user-info-points-pill">13.5k pts</button>
        ${pointsMenu('13,579')}
        <section class="responsive-copy">
          ${pointsMenu('13,579')}
        </section>
      `),
      BILT_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: { balance: 13579 },
    });
  });

  it('ignores a hidden responsive duplicate', () => {
    const result = inspectBilt(
      page(`
        <button data-testid="user-info-points-pill">13.5k pts</button>
        ${pointsMenu('13,579')}
        <section aria-hidden="true">
          ${pointsMenu('99,999')}
        </section>
      `),
      BILT_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: { balance: 13579 },
    });
  });

  it('fails closed when visible points menus disagree', () => {
    const result = inspectBilt(
      page(`
        <button data-testid="user-info-points-pill">13.5k pts</button>
        ${pointsMenu('13,579')}
        ${pointsMenu('24,680')}
      `),
      BILT_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('does not treat rounded or promotional points as the exact balance', () => {
    const result = inspectBilt(
      page(`
        <nav>
          <button data-testid="user-info-points-pill">24.6k pts</button>
        </nav>
        <aside>Earn 100,000 Bilt Points with a qualifying offer</aside>
      `),
      BILT_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('never reads a credential input beside the points label', () => {
    const result = inspectBilt(
      page(`
        <ul role="menu">
          <li>
            <span>Your Points</span>
            <input value="999999" />
          </li>
        </ul>
        <input
          data-points-tracker="bilt-points-balance"
          value="999999"
        />
      `),
      BILT_URL,
    );

    expect(result.kind).toBe('not_found');
  });

  it('opens the points pill so the exact menu balance can render', () => {
    const document = page(`
      <nav>
        <button data-testid="user-info-points-pill">24.6k pts</button>
      </nav>
    `);
    const pill = document.querySelector<HTMLButtonElement>(
      '[data-testid="user-info-points-pill"]',
    );
    if (!pill) throw new Error('Bilt fixture is incomplete');

    pill.addEventListener('click', () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        pointsMenu('24,680'),
      );
    });

    expect(prepareBilt(document)).toBe(true);
    expect(inspectBilt(document, BILT_URL)).toMatchObject({
      kind: 'success',
      capture: { balance: 24680 },
    });
    expect(prepareBilt(document)).toBe(false);
  });

  it('recognizes a signed-out page', () => {
    const result = inspectBilt(
      page('<form action="/login"><button>Sign in</button></form>'),
      'https://www.bilt.com/login',
    );

    expect(result).toMatchObject({
      kind: 'login_required',
      authState: 'signed_out',
      reason: 'login_required',
    });
  });

  it('recognizes a verification page', () => {
    const result = inspectBilt(
      page('<iframe src="/challenge/captcha"></iframe>'),
      'https://www.bilt.com/verification',
    );

    expect(result).toMatchObject({
      kind: 'verification_required',
      reason: 'verification_required',
    });
  });
});
