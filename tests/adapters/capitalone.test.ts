import { describe, expect, it } from 'vitest';
import { inspectCapitalOne } from '../../src/adapters/capitalone.js';

const CAPITAL_ONE_URL =
  'https://myaccounts.capitalone.com/accountSummary';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

function balanceContainer(label: string, value: string): string {
  return `
    <div class="primary-detail__balances-container">
      <div class="primary-detail__balances-number-container">${value}</div>
      <div class="labels">${label}</div>
    </div>
  `;
}

describe('Capital One Miles adapter', () => {
  it('captures the rendered Miles balance and ignores Rewards cash', () => {
    const result = inspectCapitalOne(
      page(`
        <section class="primary-detail__balances">
          ${balanceContainer('Miles', '445,566')}
          ${balanceContainer('Rewards cash', '$12.34')}
        </section>
      `),
      CAPITAL_ONE_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 445566,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'Expiration does not apply to this balance-only ledger row',
        },
      },
    });
  });

  it('captures an exact zero Miles balance', () => {
    const result = inspectCapitalOne(
      page(balanceContainer('Miles', '0')),
      CAPITAL_ONE_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: { balance: 0, memberNumber: null },
    });
  });

  it('captures a negative Miles balance when the sign is rendered separately', () => {
    const result = inspectCapitalOne(
      page(
        balanceContainer(
          'Miles',
          `
            <span class="primary-detail__balances-balance--sign">−</span>
            <span class="primary-detail__balances-balance-dollar">424</span>
          `,
        ),
      ),
      CAPITAL_ONE_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: { balance: -424, memberNumber: null },
    });
  });

  it('deduplicates matching responsive balance containers', () => {
    const result = inspectCapitalOne(
      page(`
        ${balanceContainer('Miles', '123,456')}
        ${balanceContainer('Miles', '123,456')}
      `),
      CAPITAL_ONE_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: { balance: 123456 },
    });
  });

  it('fails closed when multiple Miles balances disagree', () => {
    const result = inspectCapitalOne(
      page(`
        ${balanceContainer('Miles', '123,456')}
        ${balanceContainer('Miles', '234,567')}
      `),
      CAPITAL_ONE_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('rejects rewards cash, promotional values, and non-exact labels', () => {
    const result = inspectCapitalOne(
      page(`
        <section class="primary-detail__balances">
          ${balanceContainer('Rewards cash', '$45.67')}
          ${balanceContainer('Bonus Miles', '150,000')}
          <aside>Earn 75,000 bonus miles</aside>
        </section>
      `),
      CAPITAL_ONE_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('rejects decimal Miles values', () => {
    const result = inspectCapitalOne(
      page(balanceContainer('Miles', '424.50')),
      CAPITAL_ONE_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('never reads a matching value from form controls', () => {
    const result = inspectCapitalOne(
      page(`
        <section class="primary-detail__balances">
          <div class="primary-detail__balances-container">
            <input
              class="primary-detail__balances-number-container"
              value="987,654"
            />
            <div class="labels">Miles</div>
          </div>
        </section>
      `),
      CAPITAL_ONE_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('supports synthetic selector fixtures without broad page scanning', () => {
    const result = inspectCapitalOne(
      page(
        '<div data-points-tracker="capitalone-miles">321,654</div>',
      ),
      CAPITAL_ONE_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: { balance: 321654 },
    });
  });

  it('detects signed-out and verification pages', () => {
    expect(
      inspectCapitalOne(
        page('<form action="/signin"><input type="password" /></form>'),
        'https://myaccounts.capitalone.com/signin',
      ),
    ).toMatchObject({
      kind: 'login_required',
      authState: 'signed_out',
      reason: 'login_required',
    });

    expect(
      inspectCapitalOne(
        page('<iframe src="/challenge"></iframe>'),
        'https://myaccounts.capitalone.com/verification',
      ),
    ).toMatchObject({
      kind: 'verification_required',
      reason: 'verification_required',
    });
  });
});
