import { describe, expect, it } from 'vitest';
import { inspectWyndham } from '../../src/adapters/wyndham.js';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

describe('Wyndham Rewards adapter', () => {
  it('captures the rendered balance and member number', () => {
    const result = inspectWyndham(
      page(`
        <div class="img-container">
          <div class="text">
            <p class="text-number">Member #WR000016</p>
          </div>
        </div>
        <div class="details">
          <p class="details-points headline-d member-level-color">
            You have 42,500 points
          </p>
          <p class="details-number headline-g member-level-color member-attribute">
            BLUE member #WR000016
          </p>
        </div>
        <aside>Earn up to 100,000 bonus points</aside>
      `),
      'https://www.wyndhamhotels.com/wyndham-rewards/my-account/activity',
    );

    expect(result).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 42500,
        memberNumber: 'WR000016',
        expiration: {
          type: 'activity_based',
          date: null,
          inactivityMonths: 18,
          note: 'Points may expire after 18 months of inactivity and four years after posting',
        },
      },
    });
  });

  it('uses N/A when zero balance and the exact empty state are both visible', () => {
    const result = inspectWyndham(
      page(`
        <p class="details-points headline-d member-level-color">
          You have 0 points
        </p>
        <div class="img-container">
          <p class="text-number">Member #WR000016</p>
        </div>
        <div class="row no-activity">
          <div class="component-wrapper">
            <div class="no-activity-headline headline-g">
              You have no recent activity.
            </div>
          </div>
        </div>
      `),
      'https://www.wyndhamhotels.com/wyndham-rewards/my-account/activity',
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 0,
        memberNumber: 'WR000016',
        expiration: {
          type: 'never',
          date: null,
          note: 'N/A because the account shows zero points and no recent activity',
        },
      },
    });
  });

  it('waits for exact empty-state proof before treating zero points as N/A', () => {
    const result = inspectWyndham(
      page(`
        <p class="details-points headline-d member-level-color">
          You have 0 points
        </p>
        <div class="no-activity-headline headline-g">
          Loading recent activity...
        </div>
      `),
      'https://www.wyndhamhotels.com/wyndham-rewards/my-account/activity',
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      capture: null,
      reason: 'expiration_not_found',
    });
  });

  it('does not treat no recent activity as a non-expiration exemption', () => {
    const result = inspectWyndham(
      page(`
        <p class="details-points headline-d member-level-color">
          You have 42,500 points
        </p>
        <div class="row no-activity">
          <div class="component-wrapper">
            <div class="no-activity-headline headline-g">
              You have no recent activity.
            </div>
          </div>
        </div>
        <aside>
          With the NEW Wyndham Rewards Earner Plus Card.
          See if you pre-qualify.
        </aside>
      `),
      'https://www.wyndhamhotels.com/wyndham-rewards/my-account/activity',
    );

    expect(result).toMatchObject({
      kind: 'success',
      capture: {
        balance: 42500,
        expiration: {
          type: 'activity_based',
          date: null,
          inactivityMonths: 18,
        },
      },
    });
  });

  it('does not treat nearby promotional points as the account balance', () => {
    const result = inspectWyndham(
      page(`
        <p class="details-points headline-d member-level-color">
          Limited-time offer: Earn 100,000 bonus points
        </p>
      `),
      'https://www.wyndhamhotels.com/wyndham-rewards/my-account/activity',
    );

    expect(result).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('never reads matching credential inputs', () => {
    const result = inspectWyndham(
      page(`
        <input
          class="details-points member-level-color"
          value="You have 999,999 points"
        />
        <input class="text-number" value="Member #WR999999" />
      `),
      'https://www.wyndhamhotels.com/wyndham-rewards/my-account/activity',
    );

    expect(result.kind).toBe('not_found');
  });

  it('recognizes a signed-out account page', () => {
    const result = inspectWyndham(
      page('<form action="/wyndham-rewards/login"><button>Sign in</button></form>'),
      'https://www.wyndhamhotels.com/wyndham-rewards/login',
    );

    expect(result).toMatchObject({
      kind: 'login_required',
      authState: 'signed_out',
      reason: 'login_required',
    });
  });

  it('recognizes a verification page', () => {
    const result = inspectWyndham(
      page('<iframe src="/challenge/captcha"></iframe>'),
      'https://www.wyndhamhotels.com/wyndham-rewards/verification',
    );

    expect(result).toMatchObject({
      kind: 'verification_required',
      reason: 'verification_required',
    });
  });
});
