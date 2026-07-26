import { describe, expect, it } from 'vitest';
import { inspectIhg } from '../../src/adapters/ihg.js';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

describe('IHG One Rewards adapter', () => {
  it('captures the rendered balance and member number for an Elite member', () => {
    const result = inspectIhg(
      page(`
        <section>
          <p data-testid="yourPointsLabelSID">Your Points</p>
          <p data-testid="pointsToRedeemSID">25,000</p>
          <h2>
            Member #
            <span data-testid="memberNumberSID">IHG000014</span>
          </h2>
          <p
            class="header-member-program my-0"
            data-testid="memberProgram0SID"
          >
            IHG Business Rewards
          </p>
          <p
            class="header-member-program my-0"
            data-testid="memberProgram1SID"
          >
            IHG One Rewards Credit Cardmember
          </p>
          <h2 class="header-member-level-name capitalize">
            platinum elite Member
          </h2>
        </section>
      `),
      'https://www.ihg.com/rewardsclub/us/en/account-mgmt/home',
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 25000,
        memberNumber: 'IHG000014',
        expiration: {
          type: 'never',
          date: null,
          note:
            'N/A while IHG One Rewards Platinum Elite status is active',
        },
      },
    });
  });

  it('does not treat the credit cardmember label alone as N/A proof', () => {
    const result = inspectIhg(
      page(`
        <p data-testid="pointsToRedeemSID">25,000</p>
        <span data-testid="memberNumberSID">IHG000014</span>
        <p class="header-member-program">
          IHG One Rewards Credit Cardmember
        </p>
      `),
      'https://www.ihg.com/rewardsclub/us/en/account-mgmt/home',
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      capture: null,
      reason: 'expiration_not_found',
    });
  });

  it('does not treat a generic Club membership as N/A proof', () => {
    const result = inspectIhg(
      page(`
        <p data-testid="pointsToRedeemSID">25,000</p>
        <span data-testid="memberNumberSID">IHG000014</span>
        <h2 class="header-member-level-name">Club Member</h2>
      `),
      'https://www.ihg.com/rewardsclub/us/en/account-mgmt/home',
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      capture: null,
      reason: 'expiration_not_found',
    });
  });

  it('never reads a matching credential input', () => {
    const result = inspectIhg(
      page(`
        <input data-testid="pointsToRedeemSID" value="999999" />
        <input data-testid="memberNumberSID" value="IHG999999" />
        <h2 class="header-member-level-name">Diamond Elite Member</h2>
      `),
      'https://www.ihg.com/rewardsclub/us/en/account-mgmt/home',
    );

    expect(result.kind).toBe('not_found');
  });

  it('recognizes a signed-out account page', () => {
    const result = inspectIhg(
      page('<form action="/rewardsclub/us/en/login"><button>Sign in</button></form>'),
      'https://www.ihg.com/rewardsclub/us/en/login',
    );

    expect(result).toMatchObject({
      kind: 'login_required',
      authState: 'signed_out',
      reason: 'login_required',
    });
  });

  it('recognizes an IHG verification page', () => {
    const result = inspectIhg(
      page('<iframe src="/challenge/captcha"></iframe>'),
      'https://www.ihg.com/rewardsclub/us/en/verification',
    );

    expect(result).toMatchObject({
      kind: 'verification_required',
      reason: 'verification_required',
    });
  });
});
