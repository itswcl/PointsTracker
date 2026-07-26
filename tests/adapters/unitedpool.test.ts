import { describe, expect, it } from 'vitest';
import { inspectUnitedPool } from '../../src/adapters/unitedpool.js';

const UNITED_URL = 'https://www.united.com/en/us/myunited';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

describe('United pooled miles adapter', () => {
  it('captures the balance labeled Pooled miles without a member number', () => {
    const result = inspectUnitedPool(
      page(`
        <div data-points-tracker="united-member-number">UA000001</div>
        <header role="banner">
          <button>Hi, Example | 25 miles | 12,345 pooled miles</button>
        </header>
      `),
      UNITED_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 12345,
        memberNumber: 'UA000001',
        expiration: {
          type: 'never',
          date: null,
          note: 'No expiration',
        },
      },
    });
  });

  it('captures an exact zero pooled-miles balance', () => {
    const result = inspectUnitedPool(
      page(`
        <header role="banner">
          <button>Hi, Example | 25 miles | 0 pooled miles</button>
        </header>
      `),
      UNITED_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: { balance: 0, memberNumber: null },
    });
  });

  it('deduplicates matching responsive header balances', () => {
    const result = inspectUnitedPool(
      page(`
        <header role="banner">
          <button>12,345 pooled miles</button>
          <button>12,345 pooled miles</button>
        </header>
      `),
      UNITED_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: { balance: 12345 },
    });
  });

  it('fails closed when responsive header balances disagree', () => {
    const result = inspectUnitedPool(
      page(`
        <header role="banner">
          <button>12,345 pooled miles</button>
          <button>54,321 pooled miles</button>
        </header>
      `),
      UNITED_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('ignores nearby personal miles and transfer activity values', () => {
    const result = inspectUnitedPool(
      page(`
        <main>
          <div>999,999 miles</div>
          <div>Transfer to miles pool -88,888 miles</div>
          <div>Earn 75,000 bonus miles</div>
        </main>
      `),
      UNITED_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('supports an isolated synthetic selector fixture', () => {
    const result = inspectUnitedPool(
      page(
        '<div data-points-tracker="united-pool-balance">32,100</div>',
      ),
      UNITED_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: { balance: 32100, memberNumber: null },
    });
  });

  it('reports login pages without reading form values', () => {
    const result = inspectUnitedPool(
      page(`
        <form action="/login">
          <input value="98,765 pooled miles" />
        </form>
      `),
      'https://www.united.com/en/us/signin',
    );

    expect(result).toMatchObject({
      kind: 'login_required',
      authState: 'signed_out',
      reason: 'login_required',
    });
  });

  it('reports verification pages', () => {
    const result = inspectUnitedPool(
      page('<iframe src="/challenge"></iframe>'),
      'https://www.united.com/en/us/verification',
    );

    expect(result).toMatchObject({
      kind: 'verification_required',
      reason: 'verification_required',
    });
  });

  it('reports an unknown page when no pooled balance matches', () => {
    const result = inspectUnitedPool(
      page('<main>Public United page</main>'),
      'https://www.united.com/en/us/',
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'unknown',
      reason: 'balance_not_found',
    });
  });
});
