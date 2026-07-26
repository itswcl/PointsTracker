import { describe, expect, it } from 'vitest';
import { inspectUnitedTravelBank } from '../../src/adapters/unitedtravelbank.js';

const UNITED_URL = 'https://www.united.com/en/us/myunited';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

function summary(balance: string, expiration?: string): string {
  return `
    <section class="TravelBankComponent__travelBankContainer--fixture">
      <h3>TRAVELBANK</h3>
      <span>${balance}</span>
      ${
        expiration
          ? `<span aria-hidden="true">$25.00 expire</span><span>${expiration}</span>`
          : ''
      }
      <button>View details</button>
    </section>
  `;
}

describe('United TravelBank adapter', () => {
  it('captures total USD cents and the earliest displayed expiration', () => {
    const result = inspectUnitedTravelBank(
      page(`
        <div data-points-tracker="united-member-number">UA000001</div>
        ${summary('$125.50', '06/15/2027')}
        <section class="atm-c-card__body">
          <h3>TravelBank</h3>
          <span>$100.50</span>
          <span>Expiration:</span><span>12/31/2027</span>
          <span>$25.00</span>
          <span>Expiration:</span><span>June 15, 2027</span>
        </section>
      `),
      UNITED_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 12550,
        memberNumber: 'UA000001',
        expiration: {
          type: 'fixed_date',
          date: '2027-06-15',
          note: 'Earliest displayed TravelBank expiration',
        },
      },
    });
  });

  it('captures an exact zero-dollar balance as zero cents', () => {
    const result = inspectUnitedTravelBank(
      page(summary('$0.00')),
      UNITED_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 0,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'No TravelBank expiration displayed',
        },
      },
    });
  });

  it('deduplicates matching responsive summary balances', () => {
    const result = inspectUnitedTravelBank(
      page(`
        ${summary('$125.50', '06/15/2027')}
        ${summary('$125.50', '06/15/2027')}
      `),
      UNITED_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 12550,
        expiration: { date: '2027-06-15' },
      },
    });
  });

  it('fails closed when responsive summary balances disagree', () => {
    const result = inspectUnitedTravelBank(
      page(`
        ${summary('$125.50')}
        ${summary('$225.50')}
      `),
      UNITED_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('ignores nearby currency values and TravelBank item amounts', () => {
    const result = inspectUnitedTravelBank(
      page(`
        <section>
          <h3>MILES</h3>
          <span>$999.99 promotional value</span>
        </section>
        <section class="atm-c-card__body">
          <h3>TravelBank</h3>
          <span>$75.00</span>
          <span>Expiration:</span><span>01/31/2028</span>
        </section>
      `),
      UNITED_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('supports isolated synthetic balance and expiration fixtures', () => {
    const result = inspectUnitedTravelBank(
      page(`
        <div data-points-tracker="united-travelbank-balance">$321.09</div>
        <div data-points-tracker="united-travelbank-expiration">2028-07-04</div>
      `),
      UNITED_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 32109,
        memberNumber: null,
        expiration: {
          type: 'fixed_date',
          date: '2028-07-04',
        },
      },
    });
  });

  it('reports login pages without reading form values', () => {
    const result = inspectUnitedTravelBank(
      page(`
        <form action="/login">
          <input value="$987.65" />
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
    const result = inspectUnitedTravelBank(
      page('<iframe src="/challenge"></iframe>'),
      'https://www.united.com/en/us/verification',
    );

    expect(result).toMatchObject({
      kind: 'verification_required',
      reason: 'verification_required',
    });
  });

  it('reports an unknown page when no TravelBank balance matches', () => {
    const result = inspectUnitedTravelBank(
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
