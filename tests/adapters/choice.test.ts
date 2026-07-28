import { describe, expect, it, vi } from 'vitest';
import {
  inspectChoice,
  prepareChoice,
} from '../../src/adapters/choice.js';

const ACCOUNT_URL =
  'https://www.choicehotels.com/choice-privileges/account';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

function accountCard(
  {
    balance = '12,450',
    memberNumber = 'CP123456',
    tier = 'Member',
  }: {
    balance?: string;
    memberNumber?: string;
    tier?: string;
  } = {},
): string {
  return `
    <div class="cp-member-info-card choice">
      <div class="points-container">
        <div><span>${balance}</span><span>points</span></div>
        <p>${balance}</p>
        <p>points</p>
      </div>
      <p class="member-number">Member number: ${memberNumber}</p>
      <div class="member-tier-ribbon choice">
        <span class="membership-tier">${tier}</span>
      </div>
      <div class="member-level-label">Member Gold Platinum Diamond Titanium</div>
      <button
        id="myStaysActivityModalBtn"
        class="choice-button text_link_dark"
      >See points history</button>
    </div>
  `;
}

function activityTable(
  name: 'Points earned' | 'Points redeemed' | 'Points adjusted',
  dates: readonly string[],
): string {
  return `
    <table aria-label="${name}">
      <thead><tr><th>Date</th><th>Activity</th></tr></thead>
      <tbody>
        ${dates
          .map(
            (date) =>
              `<tr><td>${date}</td><td>${name} activity</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

describe('Choice Privileges adapter', () => {
  it('captures balance, member number, and newest earn or redeem activity', () => {
    const result = inspectChoice(
      page(`
        ${accountCard()}
        <div role="dialog" aria-label="My stay & points statement">
          <div role="dialog" aria-label="My statements">
            ${activityTable('Points earned', ['May 20, 2026'])}
            ${activityTable('Points redeemed', ['07/31/2026'])}
            ${activityTable('Points adjusted', ['December 31, 2030'])}
          </div>
        </div>
      `),
      ACCOUNT_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 12450,
        memberNumber: 'CP123456',
        expiration: {
          type: 'activity_based',
          date: '2028-01-31',
          inactivityMonths: 18,
          note: 'Derived from the newest Choice Privileges points activity',
        },
      },
    });
  });

  it.each(['Gold', 'Platinum', 'Diamond', 'Titanium'])(
    'treats active %s status as expiration exempt',
    (tier) => {
      const result = inspectChoice(
        page(`
          ${accountCard({ tier })}
          ${activityTable('Points earned', ['May 20, 2026'])}
        `),
        ACCOUNT_URL,
      );

      expect(result).toMatchObject({
        kind: 'success',
        capture: {
          balance: 12450,
          expiration: {
            type: 'never',
            date: null,
            note: 'N/A while Choice Privileges Elite status is active',
          },
        },
      });
    },
  );

  it('does not treat the tier progress labels as active Elite status', () => {
    const result = inspectChoice(
      page(accountCard({ balance: '0', tier: 'Member' })),
      ACCOUNT_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 0,
        expiration: {
          type: 'never',
          date: null,
        },
      },
    });
  });

  it('returns N/A for zero points and empty history', () => {
    const result = inspectChoice(
      page(`
        ${accountCard({ balance: '0' })}
        <table aria-label="Points earned">
          <tbody><tr><td>No points earned for this time period.</td></tr></tbody>
        </table>
        <table aria-label="Points redeemed">
          <tbody><tr><td>No points redeemed for this time period.</td></tr></tbody>
        </table>
      `),
      ACCOUNT_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 0,
        expiration: {
          type: 'never',
          date: null,
          note: 'N/A because no Choice Privileges points are available to expire',
        },
      },
    });
  });

  it('keeps the 18-month policy without inventing a date for positive points', () => {
    const result = inspectChoice(
      page(accountCard({ balance: '12,450', tier: 'Member' })),
      ACCOUNT_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 12450,
        expiration: {
          type: 'activity_based',
          date: null,
          inactivityMonths: 18,
        },
      },
    });
  });

  it('opens the exact history control for a non-elite account', () => {
    const document = page(accountCard());
    const trigger = document.querySelector(
      '#myStaysActivityModalBtn',
    ) as HTMLButtonElement;
    const click = vi.spyOn(trigger, 'click');

    expect(prepareChoice(document)).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it('does not open history for Elite status or when the dialog is open', () => {
    const eliteDocument = page(accountCard({ tier: 'Gold' }));
    const eliteTrigger = eliteDocument.querySelector(
      '#myStaysActivityModalBtn',
    ) as HTMLButtonElement;
    const eliteClick = vi.spyOn(eliteTrigger, 'click');
    expect(prepareChoice(eliteDocument)).toBe(false);
    expect(eliteClick).not.toHaveBeenCalled();

    const dialogDocument = page(`
      ${accountCard()}
      <div role="dialog" aria-label="My statements"></div>
    `);
    expect(prepareChoice(dialogDocument)).toBe(false);
  });

  it('supports bounded fixture hooks without scanning unrelated page text', () => {
    const result = inspectChoice(
      page(`
        <div data-points-tracker="choice-points-balance">8,001 points</div>
        <div data-points-tracker="choice-member-number">CP8001</div>
        <div data-points-tracker="choice-activity">June 15, 2026</div>
        <aside>Earn 100,000 points. Activity December 31, 2030.</aside>
      `),
      ACCOUNT_URL,
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 8001,
        memberNumber: 'CP8001',
        expiration: {
          date: '2027-12-15',
          inactivityMonths: 18,
        },
      },
    });
  });

  it('fails closed for conflicting rendered balance candidates', () => {
    const result = inspectChoice(
      page(`
        <div class="cp-member-info-card choice">
          <div class="points-container">
            <div>12,450 points</div>
            <div>22,450 points</div>
          </div>
        </div>
      `),
      ACCOUNT_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('never reads matching form controls or unrelated promotions', () => {
    const result = inspectChoice(
      page(`
        <div class="cp-member-info-card choice">
          <div class="points-container">
            <input value="999,999 points" />
          </div>
        </div>
        <aside>Earn 100,000 Choice Privileges points.</aside>
      `),
      ACCOUNT_URL,
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('returns member-number-only, signed-out, and verification states', () => {
    expect(
      inspectChoice(
        page(`
          <div class="cp-member-info-card choice">
            <p class="member-number">Member number: CP123456</p>
          </div>
        `),
        ACCOUNT_URL,
      ),
    ).toMatchObject({
      kind: 'member_number_found',
      capture: { memberNumber: 'CP123456' },
    });

    expect(
      inspectChoice(
        page('<form action="/login"><input type="password" /></form>'),
        'https://www.choicehotels.com/login',
      ),
    ).toMatchObject({
      kind: 'login_required',
      authState: 'signed_out',
      reason: 'login_required',
    });

    expect(
      inspectChoice(
        page('<iframe src="/challenge/captcha"></iframe>'),
        'https://www.choicehotels.com/verification',
      ),
    ).toMatchObject({
      kind: 'verification_required',
      reason: 'verification_required',
    });
  });
});
