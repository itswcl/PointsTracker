import { describe, expect, it, vi } from 'vitest';
import {
  inspectSouthwestCredit,
  prepareSouthwestCredit,
} from '../../src/adapters/southwestcredit.js';

const SOUTHWEST_URL = 'https://www.southwest.com/loyalty/myaccount/';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

function creditEntry(amount: string, expiration: string): string {
  return `
    <li>
      <button aria-expanded="true">
        <span>${amount} Dollars</span>
        <span>$${amount}</span>
      </button>
      <span>Expiration: ${expiration}</span>
    </li>
  `;
}

describe('Southwest Flight Credit adapter', () => {
  it('sums every Flight Credit in exact cents and selects the earliest date', () => {
    const result = inspectSouthwestCredit(
      page(`
        <span class="accountNumber"><span aria-hidden="true">RR# 12345678</span></span>
        <section id="my-flight-credits-card">
          <h2>My Flight Credits</h2>
          <ul>
            ${creditEntry('391.38', 'None')}
            ${creditEntry('294.03', '07/30/2028')}
            ${creditEntry('12.55', '01/15/2028')}
          </ul>
        </section>
      `),
      SOUTHWEST_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 69796,
        memberNumber: '12345678',
        expiration: {
          type: 'fixed_date',
          date: '2028-01-15',
          note: 'Earliest Southwest Flight Credit expiration',
        },
      },
    });
  });

  it('shows N/A when every Flight Credit expiration is None', () => {
    const result = inspectSouthwestCredit(
      page(`
        <section id="my-flight-credits-card">
          <ul>
            ${creditEntry('10.00', 'None')}
            ${creditEntry('0.25', 'None')}
          </ul>
        </section>
      `),
      SOUTHWEST_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 1025,
        expiration: {
          type: 'never',
          date: null,
          note: 'All Southwest Flight Credits show no expiration',
        },
      },
    });
  });

  it('captures zero dollars and an empty credit list as $0.00 with N/A expiration', () => {
    expect(
      inspectSouthwestCredit(
        page(`
          <section id="my-flight-credits-card">
            <ul>${creditEntry('0.00', 'None')}</ul>
          </section>
        `),
        SOUTHWEST_URL,
      ),
    ).toMatchObject({
      kind: 'success',
      capture: { balance: 0, expiration: { type: 'never' } },
    });

    expect(
      inspectSouthwestCredit(
        page(`
          <section id="my-flight-credits-card">
            There are no flight credits associated with your account.
          </section>
        `),
        SOUTHWEST_URL,
      ),
    ).toMatchObject({
      kind: 'success',
      capture: {
        balance: 0,
        expiration: {
          type: 'never',
          note: 'No Southwest Flight Credits',
        },
      },
    });
  });

  it('expands the Flight Credit group before expiration inspection', () => {
    const expand = vi.fn();
    const creditPage = page(`
      <section id="my-flight-credits-card">
        <button id="expand-all">Expand all</button>
        <ul><li><span>15.50 Dollars</span></li></ul>
      </section>
    `);
    const button = creditPage.querySelector('#expand-all');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Expand all fixture is missing');
    }
    button.click = expand;

    expect(prepareSouthwestCredit(creditPage)).toBe(true);
    expect(expand).toHaveBeenCalledOnce();
  });

  it('shows N/A when rendered credit expiration details are missing', () => {
    const result = inspectSouthwestCredit(
      page(`
        <section id="my-flight-credits-card">
          <ul><li><span>15.50 Dollars</span></li></ul>
        </section>
      `),
      SOUTHWEST_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 1550,
        expiration: {
          type: 'never',
          date: null,
          note: 'No Southwest Flight Credit expiration displayed',
        },
      },
    });
  });

  it('keeps a real date when another credit has no expiration details', () => {
    const result = inspectSouthwestCredit(
      page(`
        <section id="my-flight-credits-card">
          <ul>
            <li><span>15.50 Dollars</span></li>
            ${creditEntry('20.00', '06/05/2028')}
          </ul>
        </section>
      `),
      SOUTHWEST_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 3550,
        expiration: {
          type: 'fixed_date',
          date: '2028-06-05',
        },
      },
    });
  });

  it('ignores the header Available Credits total and nearby dollar values', () => {
    const result = inspectSouthwestCredit(
      page(`
        <div>Available Credits $999.99</div>
        <section id="my-flight-credits-card">
          <div>Earn a $500 statement credit</div>
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

  it('supports isolated synthetic credit entries', () => {
    const result = inspectSouthwestCredit(
      page(`
        <section id="my-flight-credits-card">
          <div data-points-tracker="southwest-flight-credit">
            <span data-points-tracker="southwest-flight-credit-amount">$25.75</span>
            <span data-points-tracker="southwest-flight-credit-expiration">
              Expiration: June 5, 2028
            </span>
          </div>
        </section>
      `),
      SOUTHWEST_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 2575,
        expiration: { date: '2028-06-05' },
      },
    });
  });

  it('reports login and verification pages without reading form values', () => {
    expect(
      inspectSouthwestCredit(
        page('<form action="/login"><input value="$987.65" /></form>'),
        'https://www.southwest.com/login/',
      ),
    ).toMatchObject({
      kind: 'login_required',
      authState: 'signed_out',
    });

    expect(
      inspectSouthwestCredit(
        page('<iframe src="/challenge"></iframe>'),
        'https://www.southwest.com/verification/',
      ),
    ).toMatchObject({
      kind: 'verification_required',
    });
  });
});
