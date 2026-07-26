import { describe, expect, it } from 'vitest';
import { inspectCiti } from '../../src/adapters/citi.js';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

function rewardsWidget(balance: string): string {
  return `
    <section class="reward-wrapper clubbed-wrapper">
      <span class="reward-content">
        <span class="reward-heading" role="heading">
          Total ThankYou® Points
        </span>
        <a>View Linked Accounts &amp; Redeem Points</a>
      </span>
      <span class="reward-amount tooltipAlign">
        <span>${balance}</span>
        <span><button>Learn more about your rewards</button></span>
      </span>
    </section>
  `;
}

describe('Citi ThankYou Rewards adapter', () => {
  it('captures the rendered Total ThankYou Points balance', () => {
    const result = inspectCiti(
      page(rewardsWidget('246,810')),
      'https://online.citi.com/US/ag/dashboard/summary',
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 246810,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'Expiration does not apply to this balance-only ledger row',
        },
      },
    });
  });

  it('captures a zero balance', () => {
    const result = inspectCiti(
      page(rewardsWidget('0')),
      'https://online.citi.com/US/ag/dashboard/summary',
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 0,
        memberNumber: null,
      },
    });
  });

  it('deduplicates matching desktop and responsive rewards widgets', () => {
    const result = inspectCiti(
      page(`
        ${rewardsWidget('135,790')}
        <div class="responsive-copy">
          ${rewardsWidget('135,790')}
        </div>
      `),
      'https://online.citi.com/US/ag/dashboard/summary',
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: { balance: 135790 },
    });
  });

  it('fails closed when duplicate rewards widgets disagree', () => {
    const result = inspectCiti(
      page(`
        ${rewardsWidget('135,790')}
        ${rewardsWidget('246,801')}
      `),
      'https://online.citi.com/US/ag/dashboard/summary',
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('rejects promotional points and unrelated airline miles', () => {
    const result = inspectCiti(
      page(`
        <section class="reward-wrapper clubbed-wrapper">
          <span class="reward-content">
            <span class="reward-heading" role="heading">
              Earn additional ThankYou® Points
            </span>
          </span>
          <span class="reward-amount"><span>150,000</span></span>
        </section>
        <section class="reward-wrapper clubbed-wrapper">
          <span class="reward-content">
            <span class="reward-heading" role="heading">
              Total Available Miles
            </span>
          </span>
          <span class="reward-amount"><span>765,432</span></span>
        </section>
      `),
      'https://online.citi.com/US/ag/dashboard/summary',
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('never reads a matching credential input', () => {
    const result = inspectCiti(
      page(`
        <input
          data-points-tracker="citi-thankyou-total"
          value="999999"
        />
      `),
      'https://online.citi.com/US/ag/dashboard/summary',
    );

    expect(result.kind).toBe('not_found');
  });

  it('recognizes a signed-out page', () => {
    const result = inspectCiti(
      page('<form action="/US/ag/login"><button>Sign On</button></form>'),
      'https://online.citi.com/US/ag/login',
    );

    expect(result).toMatchObject({
      kind: 'login_required',
      authState: 'signed_out',
      reason: 'login_required',
    });
  });

  it('recognizes a verification page', () => {
    const result = inspectCiti(
      page('<iframe src="/challenge/captcha"></iframe>'),
      'https://online.citi.com/US/ag/verification',
    );

    expect(result).toMatchObject({
      kind: 'verification_required',
      reason: 'verification_required',
    });
  });
});
