import { describe, expect, it } from 'vitest';
import { inspectSouthwest } from '../../src/adapters/southwest.js';

const SOUTHWEST_URL = 'https://www.southwest.com/loyalty/myaccount/';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

function pointsSummary(balance: string): string {
  return `
    <span class="pointsOrTravelCredits__fixture">
      <div class="availableLabel__fixture">Available Points</div>
      <div class="value__fixture">
        <span class="hiddenFromScreen__fixture">${balance} Points</span>
        <span aria-hidden="true">${balance}</span>
      </div>
    </span>
  `;
}

describe('Southwest Rapid Rewards adapter', () => {
  it('captures Available Points and the rendered Rapid Rewards number', () => {
    const result = inspectSouthwest(
      page(`
        <section>
          <span class="accountNumber"><span>Rapid Rewards number 1 2 3 4 5 6 7 8</span><span aria-hidden="true">RR# 12345678</span></span>
          ${pointsSummary('20,383')}
        </section>
      `),
      SOUTHWEST_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 20383,
        memberNumber: '12345678',
        expiration: {
          type: 'never',
          date: null,
          note: 'No expiration',
        },
      },
    });
  });

  it('captures an exact zero-point balance', () => {
    const result = inspectSouthwest(
      page(pointsSummary('0')),
      SOUTHWEST_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: { balance: 0 },
    });
  });

  it('deduplicates matching responsive Available Points summaries', () => {
    const result = inspectSouthwest(
      page(`${pointsSummary('20,383')}${pointsSummary('20,383')}`),
      SOUTHWEST_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: { balance: 20383 },
    });
  });

  it('fails closed when responsive Available Points summaries disagree', () => {
    const result = inspectSouthwest(
      page(`${pointsSummary('20,383')}${pointsSummary('30,383')}`),
      SOUTHWEST_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'unknown',
      reason: 'balance_not_found',
    });
  });

  it('ignores Available Credits and promotional point values', () => {
    const result = inspectSouthwest(
      page(`
        <section id="my-flight-credits-card">
          <div>Available Credits</div><div>$900.00</div>
          <div>Earn 50,000 points</div>
        </section>
      `),
      SOUTHWEST_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('supports an isolated synthetic balance fixture', () => {
    const result = inspectSouthwest(
      page(
        '<div data-points-tracker="southwest-points-balance">42,500</div>',
      ),
      SOUTHWEST_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: { balance: 42500 },
    });
  });

  it('reports login and verification pages', () => {
    expect(
      inspectSouthwest(
        page('<form action="/login"><input value="99,999" /></form>'),
        'https://www.southwest.com/login/',
      ),
    ).toMatchObject({
      kind: 'login_required',
      authState: 'signed_out',
    });

    expect(
      inspectSouthwest(
        page('<iframe src="/challenge"></iframe>'),
        'https://www.southwest.com/verification/',
      ),
    ).toMatchObject({
      kind: 'verification_required',
    });
  });
});
