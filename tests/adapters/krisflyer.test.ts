import { describe, expect, it } from 'vitest';
import { inspectKrisFlyer } from '../../src/adapters/krisflyer.js';

const VALIDITY_URL =
  'https://www.singaporeair.com/krisflyer/miles/expiring-miles/';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

function header(
  balance: string,
  membership = 'KRISFLYER SQ000019',
): string {
  return `
    <div class="KFMastHead_kfType__fixture">${membership}</div>
    <div class="KFMastHead_kfMiles__fixture">${balance} KrisFlyer Miles</div>
  `;
}

describe('Singapore Airlines KrisFlyer adapter', () => {
  it('captures the balance, member number, and earliest expiring tranche', () => {
    const result = inspectKrisFlyer(
      page(`
        ${header('52,400')}
        <section>
          <div id="typeInfoText">
            <div id="typeInfoTextTitle">Miles validity</div>
          </div>
          <table>
            <thead>
              <tr><th>Expiring month</th><th>KrisFlyer miles</th></tr>
            </thead>
            <tbody>
              <tr><td>02/2028</td><td>1,750 miles</td></tr>
              <tr><td>November 2027</td><td>900 miles</td></tr>
            </tbody>
          </table>
        </section>
      `),
      VALIDITY_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 52400,
        memberNumber: 'SQ000019',
        expiration: {
          type: 'fixed_date',
          date: null,
          month: '2027-11',
          amount: 900,
        },
      },
    });
  });

  it('uses N/A for a zero-mile account even if stale expiry markup remains', () => {
    const result = inspectKrisFlyer(
      page(`
        ${header('0')}
        <section>
          <div id="typeInfoText">
            <div id="typeInfoTextTitle">Miles validity</div>
            <strong>You don't have KrisFlyer miles expiring in the next 6 months.</strong>
          </div>
          <table>
            <tbody><tr><td>November 2027</td><td>900 miles</td></tr></tbody>
          </table>
        </section>
      `),
      VALIDITY_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 0,
        expiration: {
          type: 'unknown',
          date: null,
          month: null,
          amount: null,
        },
      },
    });
  });

  it('uses N/A while PPS Club status remains active', () => {
    const result = inspectKrisFlyer(
      page(`
        ${header('88,000', 'PPS CLUB SQ000019')}
        <div id="typeInfoText">
          <div id="typeInfoTextTitle">Miles validity</div>
          <strong>No expiring miles</strong>
        </div>
      `),
      VALIDITY_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 88000,
        expiration: { type: 'never', date: null },
      },
    });
  });

  it('waits for the Miles validity details before saving an early balance', () => {
    const result = inspectKrisFlyer(
      page(header('52,400')),
      VALIDITY_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      capture: null,
      reason: 'expiration_not_found',
    });
  });

  it('captures only the member number from the statements page', () => {
    const result = inspectKrisFlyer(
      page(header('52,400')),
      'https://www.singaporeair.com/krisflyer/miles/statements/',
    );

    expect(result).toMatchObject({
      kind: 'member_number_found',
      capture: { memberNumber: 'SQ000019' },
    });
  });

  it('never reads credential inputs as account data', () => {
    const result = inspectKrisFlyer(
      page(`
        <form action="/login">
          <input
            data-points-tracker="krisflyer-balance"
            value="999999"
          />
          <input
            data-points-tracker="krisflyer-member-number"
            value="PASSWORD123"
          />
        </form>
      `),
      VALIDITY_URL,
    );

    expect(result).toMatchObject({
      kind: 'login_required',
      authState: 'signed_out',
    });
  });
});
