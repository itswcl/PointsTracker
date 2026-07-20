import { describe, expect, it } from 'vitest';
import { inspectAirFrance } from '../../src/adapters/airfrance.js';
import { inspectAlaska } from '../../src/adapters/alaska.js';
import { inspectAmerican } from '../../src/adapters/american.js';
import { inspectAna } from '../../src/adapters/ana.js';
import { inspectBritishAirways } from '../../src/adapters/britishairways.js';
import { inspectCathay } from '../../src/adapters/cathay.js';
import { inspectEvaAir } from '../../src/adapters/evaair.js';
import { inspectHyatt } from '../../src/adapters/hyatt.js';
import { inspectHilton } from '../../src/adapters/hilton.js';
import { inspectMarriott, prepareMarriott } from '../../src/adapters/marriott.js';
import { inspectUnited } from '../../src/adapters/united.js';
import { inspectVirginAtlantic } from '../../src/adapters/virginatlantic.js';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

describe('United adapter', () => {
  it('captures the current My United MileageBalance component', () => {
    const result = inspectUnited(
      page(`
        <div class="app-components-MyUnited-AccountSummaryDetails-MileageBalance-MileageBalance__milesContainer--hash">
          <h3>MILES</h3>
          <div class="app-components-MyUnited-AccountSummaryDetails-MileageBalance-MileageBalance__totalMiles--hash">
            <span>45</span>
          </div>
          <div class="app-components-MyUnited-AccountSummaryDetails-MileageBalance-MileageBalance__milesNeverExpire--hash">
            Miles never expire
          </div>
        </div>
      `),
      'https://www.united.com/en/us/myunited',
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: { balance: 45 },
    });
  });

  it('captures the scoped account balance instead of pooled miles', () => {
    const result = inspectUnited(
      page(`
        <button aria-label="Hi, member | 45 miles | 10,687 pooled miles">
          45 miles 10,687 pooled miles
        </button>
        <span id="accountBalanceAriaLabel">Account balance</span>
        <ul aria-labelledby="accountBalanceAriaLabel">
          <li>
            <p>miles</p>
            <p data-test-name="balance_value"><span>45</span></p>
          </li>
        </ul>
      `),
      'https://www.united.com/en/us/account/activity/',
    );
    if (result.kind !== 'success') throw new Error('Expected United capture');

    expect(result.capture.balance).toBe(45);
  });

  it('captures a balance and applies the no-expiration policy', () => {
    const result = inspectUnited(
      page('<div data-testid="mileageplus-balance">125,400 miles</div>'),
      'https://www.united.com/en/us/account/activity/',
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 125400,
        expiration: { type: 'never', date: null },
      },
    });
  });

  it('never reads a matching credential input', () => {
    const result = inspectUnited(
      page('<input data-testid="mileageplus-balance" value="999999" />'),
      'https://www.united.com/en/us/account/activity/',
    );
    expect(result.kind).toBe('not_found');
  });

  it('recognizes the signed-out My United page', () => {
    const result = inspectUnited(
      page('<form action="/login"><button>Sign in</button></form>'),
      'https://www.united.com/en/us/myunited',
    );

    expect(result).toMatchObject({
      kind: 'login_required',
      authState: 'signed_out',
      reason: 'login_required',
    });
  });
});

describe('Cathay adapter', () => {
  it('captures the scoped Asia Miles values instead of header or Status Points values', () => {
    const result = inspectCathay(
      page(`
        <div class="member-panel">99,999 miles</div>
        <div class="mpo_miles-details">
          <div class="mpo_miles-details-cur-points"><b>84,500</b></div>
          <div class="mpo_miles-details-activity-base-message-box">
            Earn or use miles before <b>31 Aug 2027</b> to keep them active
          </div>
        </div>
        <div class="mpo_points-details">
          Your Status Points will expire on 31 Dec 2026
        </div>
      `),
      'https://www.cathaypacific.com/cx/en_HK/membership/my-account/miles-and-points/membership-summary.html',
    );

    expect(result.capture).toMatchObject({
      balance: 84500,
      expiration: { type: 'activity_based', date: '2027-08-31' },
    });
  });

  it('captures an exact displayed expiry date', () => {
    const result = inspectCathay(
      page(`
        <div data-testid="asia-miles-balance">84,500 Asia Miles</div>
        <div data-testid="asia-miles-expiry-date">Expires 12/14/2026</div>
      `),
      'https://www.cathaypacific.com/cx/en_US/membership/account/summary.html',
    );

    expect(result.capture).toMatchObject({
      balance: 84500,
      expiration: { type: 'activity_based', date: '2026-12-14' },
    });
  });

  it('safely derives 18 months from an eligible activity date', () => {
    const result = inspectCathay(
      page(`
        <div data-testid="asia-miles-balance">84,500 Asia Miles</div>
        <div data-testid="last-eligible-activity-date">31 Aug 2025</div>
      `),
      'https://www.cathaypacific.com/cx/en_US/membership/account/summary.html',
    );
    if (result.kind !== 'success') throw new Error('Expected Cathay capture');
    expect(result.capture.expiration.date).toBe('2027-02-28');
  });

  it('reports verification without extracting unrelated page data', () => {
    const result = inspectCathay(
      page('<iframe src="https://verify.example/captcha"></iframe>'),
      'https://www.cathaypacific.com/cx/en_US/challenge',
    );
    expect(result.kind).toBe('verification_required');
    expect(result.capture).toBeNull();
  });
});

describe('Air France adapter', () => {
  it('captures the scoped Flying Blue totals instead of profile or transaction miles', () => {
    const result = inspectAirFrance(
      page(`
        <div class="bw-profile-recognition-box">Member 999,999 Miles</div>
        <div class="bw-fb-miles-overview__totals">
          <div class="bw-fb-miles-overview__totals-miles">
            <h2 class="bw-fb-miles-overview__totals-title">210,500 Miles</h2>
            <h5 class="bw-fb-miles-overview__totals-label">
              210,500 valid until 15 May 2027
            </h5>
          </div>
        </div>
        <div class="bw-fb-transaction__info-earnings--miles">+12,000 Miles</div>
      `),
      'https://wwws.airfrance.us/profile/flying-blue/miles-overview',
    );

    expect(result.capture).toMatchObject({
      balance: 210500,
      expiration: { type: 'fixed_date', date: '2027-05-15' },
    });
  });

  it('never reads a matching credential input', () => {
    const result = inspectAirFrance(
      page('<input data-testid="flying-blue-balance" value="999999" />'),
      'https://wwws.airfrance.us/profile/flying-blue/miles-overview',
    );

    expect(result.kind).toBe('not_found');
  });
});

describe('Virgin Atlantic adapter', () => {
  it('captures only the logged-in Flying Club balance', () => {
    const result = inspectVirginAtlantic(
      page(`
        <div>Book a flight with 8,000 points</div>
        <li id="logged-in-menu-item">
          <menu id="sign-in-menu">
            <div class="logged-in-menu__accountOverviewPoints__fixture">
              <span>Virgin Points</span>
              <span>163,250</span>
            </div>
            <div>Tier Points 900</div>
          </menu>
        </li>
      `),
      'https://www.virginatlantic.com/en-US',
    );

    expect(result.capture).toMatchObject({
      balance: 163250,
      expiration: { type: 'never', date: null },
    });
  });

  it('never reads a matching credential input', () => {
    const result = inspectVirginAtlantic(
      page('<input data-testid="flying-club-balance" value="999999" />'),
      'https://www.virginatlantic.com/en-US',
    );

    expect(result.kind).toBe('not_found');
  });
});

describe('Alaska adapter', () => {
  it('captures available Atmos points without reading the adjacent account number', () => {
    const header = document.createElement('borealis-header');
    header.id = 'borealis-header';
    document.body.replaceChildren(header);

    const headerRoot = header.attachShadow({ mode: 'open' });
    const guestInfo = document.createElement('borealis-guest-info-section');
    headerRoot.append(guestInfo);

    const guestRoot = guestInfo.attachShadow({ mode: 'open' });
    guestRoot.innerHTML = `
      <div class="guest-datapoint four-px-gap">
        <p>Atmos Rewards Number:</p>
        <p>999999999</p>
      </div>
      <div class="guest-datapoint">
        <p>Available points:</p>
        <p>422,100</p>
      </div>
    `;

    const result = inspectAlaska(document, 'https://www.alaskaair.com/');

    expect(result.capture).toMatchObject({
      balance: 422100,
      expiration: { type: 'never', date: null },
    });
  });
});

describe('American adapter', () => {
  it('captures an explicit expiration date before applying any exemption', () => {
    const result = inspectAmerican(
      page(`
        <div data-testid="member-details-section">AAdvantage number 999999999</div>
        <section data-testid="award-miles-balance-section">
          <div data-testid="award-miles-balance-text">Award miles balance176,400Award Miles</div>
          <div class="_miles-expiring_fixture">Miles expire on September 30, 2027</div>
        </section>
        <div>Million Miler balance 875,000</div>
      `),
      'https://www.aa.com/aadvantage-program/profile/account-summary',
    );

    expect(result.capture).toMatchObject({
      balance: 176400,
      expiration: { type: 'activity_based', date: '2027-09-30' },
    });
  });

  it('uses N/A only when the primary cardholder exemption is displayed', () => {
    const result = inspectAmerican(
      page(`
        <section data-testid="award-miles-balance-section">
          <div data-testid="award-miles-balance-text">Award miles balance176,400Award Miles</div>
          <div class="_miles-expiring_fixture">
            Primary AAdvantage® credit cardholder - no miles expiration with open card account
          </div>
        </section>
      `),
      'https://www.aa.com/aadvantage-program/profile/account-summary',
    );

    expect(result.capture).toMatchObject({
      balance: 176400,
      expiration: { type: 'never', date: null },
    });
  });

  it('never reads a matching credential input', () => {
    const result = inspectAmerican(
      page('<input data-testid="award-miles-balance-text" value="999999" />'),
      'https://www.aa.com/aadvantage-program/profile/account-summary',
    );

    expect(result.kind).toBe('not_found');
  });
});

describe('EVA Air adapter', () => {
  it('captures the self-award balance and earliest expiring mileage tranche', () => {
    const result = inspectEvaAir(
      page(`
        <div>Status Miles 888,888</div>
        <div class="container-3">
          <h2>Overview of Award Miles</h2>
          <div><h3>Self Award Miles</h3></div>
          <p class="margin-b-2">
            <span class="color-green text-2 text-medium">96,575</span>
            <span>Earned</span>
          </p>
          <div><h3>Mileage received from other membership account</h3></div>
          <dl><span>777,777</span></dl>
          <div id="div_Mile"><h3>Miles which will expire within 36 months</h3></div>
          <button id="btn_MileMoreInfoClient">More Information</button>
          <table>
            <thead><tr><th>Valid Through</th><th>Mileage</th><th>Type</th></tr></thead>
            <tbody>
              <tr><td>Aug. 2029</td><td>125</td><td>Own Earned Miles</td></tr>
              <tr><td>Jul. 2028</td><td>50</td><td>Own Earned Miles</td></tr>
            </tbody>
          </table>
        </div>
      `),
      'https://eservice.evaair.com/flyeva/eva/ffp/frequent-flyer.aspx',
    );

    expect(result.capture).toMatchObject({
      balance: 96575,
      expiration: {
        type: 'fixed_date',
        date: null,
        month: '2028-07',
        amount: 50,
      },
    });
  });
});

describe('British Airways adapter', () => {
  it('captures Avios and derives expiration from the newest statement month', () => {
    const result = inspectBritishAirways(
      page(`
        <div data-testid="executive-statements">
          <div><span>Avios</span><div><span data-testid="avios-card-value">42,300</span></div></div>
          <div>
            <span>Tier points</span>
            <div><span data-testid="avios-card-value">900</span></div>
          </div>
          <section>
            <div><span data-testid="text-custom--text-custom">January 2026</span></div>
            <div><span data-testid="text-custom--text-custom">August 2025</span></div>
          </section>
        </div>
      `),
      'https://www.britishairways.com/nx/b/customerhub/en/usa/your-account/executive-statements/',
    );

    expect(result.capture).toMatchObject({
      balance: 42300,
      expiration: { type: 'activity_based', date: '2029-01-01' },
    });
  });
});

describe('ANA adapter', () => {
  it('captures the total mileage and latest activity expiry month only', () => {
    const result = inspectAna(
      page(`
        <div>Premium Points 888,888</div>
        <dl class="ffp_2021_valid_mileage_balance_total">
          <dt>Mileage balance (Total)</dt>
          <dd class="ffp_2021_valid_mileage_balance_number"><strong>77,500<span>miles</span></strong></dd>
          <dd>Mileage Account Group 1 Miles 66,000 miles</dd>
        </dl>
        <div id="meisai">
          <table>
            <thead>
              <tr>
                <th>Used date</th><th>Flight number</th><th>Details</th>
                <th>Boarding class</th><th>Fare type</th><th>Earned miles</th>
                <th>Bonus miles</th><th>Redeem miles</th><th>Total</th>
                <th>Premium Points</th><th>Expiry<br>date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2026/07/01</td><td>NH999</td><td>Distracting activity 123,456</td>
                <td>Y</td><td>Fixture</td><td>1,000</td><td>100</td>
                <td>0</td><td>0</td><td>500</td><td>2029/03</td>
              </tr>
              <tr>
                <td colspan="10">Non-expiring summary row</td><td></td>
              </tr>
            </tbody>
          </table>
        </div>
      `),
      'https://stmt.cam.ana.co.jp/psz/amcj/jsp/renew/mile/reference_e.jsp#month',
    );

    expect(result.capture).toMatchObject({
      balance: 77500,
      expiration: {
        type: 'fixed_date',
        date: null,
        month: '2029-03',
      },
    });
  });

  it('waits for the activity table instead of saving an early unknown date', () => {
    const result = inspectAna(
      page(`
        <dl>
          <dt>Mileage balance (Total)</dt>
          <dd><strong>77,500<span>miles</span></strong></dd>
        </dl>
      `),
      'https://stmt.cam.ana.co.jp/psz/amcj/jsp/renew/mile/reference_e.jsp#month',
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      capture: null,
      reason: 'expiration_not_found',
    });
  });
});

describe('World of Hyatt adapter', () => {
  it('captures the point balance from either responsive label layout', () => {
    const result = inspectHyatt(
      page(`
        <div>Base Points 999,999</div>
        <section>
          <span>Current Point Balance</span>
          <div>57,250</div>
        </section>
        <section>
          <div>57,250</div>
          <span>Current Point Balance</span>
        </section>
      `),
      'https://www.hyatt.com/profile/en-US/account-overview',
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 57250,
        expiration: { type: 'never', date: null },
      },
    });
  });

  it('never reads a matching credential input', () => {
    const result = inspectHyatt(
      page(`
        <section>
          <span>Current Point Balance</span>
          <input value="999999" />
        </section>
      `),
      'https://www.hyatt.com/profile/en-US/account-overview',
    );

    expect(result.kind).toBe('not_found');
  });
});

describe('Hilton Honors adapter', () => {
  it('captures Hilton balance and expiration from the account summary without relying on query order', () => {
    const result = inspectHilton(
      page(`
        <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "dehydratedState": {
                  "queries": [
                    { "state": { "data": { "unrelated": true } } },
                    {
                      "state": {
                        "data": {
                          "guest": {
                            "hhonors": {
                              "summary": {
                                "totalPointsFmt": "187,250",
                                "pointsExpiration": "2028-07-18"
                              }
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        </script>
      `),
      'https://www.hilton.com/en/hilton-honors/guest/my-account/',
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 187250,
        expiration: {
          type: 'activity_based',
          date: '2028-07-18',
          inactivityMonths: 24,
          note: 'Provided by Hilton account data',
        },
      },
    });
  });

  it('captures the scoped total and preserves the 24-month inactivity rule', () => {
    const result = inspectHilton(
      page(`
        <div data-testid="pointsBlock">
          <div>Status nights 88</div>
          <div data-testid="honorsPointsBlock">187,250</div>
        </div>
        <article data-testid="usePointsWrapper"><strong>999,999 Points</strong></article>
      `),
      'https://www.hilton.com/en/hilton-honors/guest/my-account/',
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 187250,
        expiration: {
          type: 'activity_based',
          date: null,
          inactivityMonths: 24,
        },
      },
    });
  });

  it('never reads a credential input as the point balance', () => {
    const result = inspectHilton(
      page('<input data-testid="honorsPointsBlock" value="999999" />'),
      'https://www.hilton.com/en/hilton-honors/guest/my-account/',
    );

    expect(result.kind).toBe('not_found');
  });
});

describe('Marriott Bonvoy adapter', () => {
  it('captures the member total and derives expiration from newest qualifying activity', () => {
    const result = inspectMarriott(
      page(`
        <div class="member-status-outer-container">
          <h3>Platinum Elite</h3>
          <h3>340,000 Points</h3>
        </div>
        <div id="dropdown-selected-valueactivity-filter">All Qualifying</div>
        <div role="table">
          <div role="row"><div role="columnheader">POSTED</div></div>
          <div role="row">
            <div role="cell">Jul 05, 2026</div>
            <div role="cell">Bonus</div>
            <div role="cell">Fixture activity</div>
          </div>
        </div>
      `),
      'https://www.marriott.com/loyalty/myAccount/activity.mi',
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 340000,
        expiration: {
          type: 'activity_based',
          date: '2028-07-05',
          inactivityMonths: 24,
        },
      },
    });
  });

  it('uses N/A for a scoped Lifetime Elite account', () => {
    const result = inspectMarriott(
      page(`
        <div class="member-status-outer-container">
          <h3>Lifetime Platinum Elite</h3>
          <h3>340,000 Points</h3>
        </div>
      `),
      'https://www.marriott.com/loyalty/myAccount/activity.mi',
    );
    if (result.kind !== 'success') throw new Error('Expected Marriott capture');

    expect(result.capture.expiration).toMatchObject({ type: 'never', date: null });
  });

  it('selects All Qualifying before inspection', () => {
    const document = page(`
      <div id="dropdownactivity-filter">
        <div id="dropdown-selected-valueactivity-filter">All Types</div>
        <div class="dropdown__container d-none">
          <li id="option-9" role="option">All Qualifying</li>
        </div>
      </div>
    `);
    const selected = document.querySelector<HTMLElement>(
      '#dropdown-selected-valueactivity-filter',
    );
    const menu = document.querySelector<HTMLElement>('.dropdown__container');
    const control = document.querySelector<HTMLElement>('#dropdownactivity-filter');
    const option = document.querySelector<HTMLElement>('#option-9');
    if (!selected || !menu || !control || !option) {
      throw new Error('Marriott fixture is incomplete');
    }
    control.addEventListener('click', () => {
      menu.classList.remove('d-none');
    });
    option.addEventListener('click', () => {
      selected.textContent = 'All Qualifying';
    });

    expect(prepareMarriott(document)).toBe(true);
    expect(selected).toHaveTextContent('All Types');
    expect(menu).not.toHaveClass('d-none');
    expect(prepareMarriott(document)).toBe(true);
    expect(selected).toHaveTextContent('All Qualifying');
    expect(prepareMarriott(document)).toBe(false);
  });
});
