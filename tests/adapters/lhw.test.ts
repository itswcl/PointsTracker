import { describe, expect, it } from "vitest";
import { inspectLhw } from "../../src/adapters/lhw.js";

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

const ACCOUNT_URL = "https://www.lhw.com/account/points-activity";

describe("Leading Hotels of the World adapter", () => {
  it("captures the balance, member number, and newest activity-based expiration", () => {
    const result = inspectLhw(
      page(`
        <section class="page reward-activity">
          <h1 id="rewards-activity-title">My Points Activity</h1>
          <h2 id="point-counter">12,450</h2>
          <div id="rewardsActivityApp">
            <table class="table reward-list-table">
              <thead>
                <tr><th>Date</th><th>Activity</th><th>Type</th><th>Points</th></tr>
              </thead>
              <tbody>
                <tr><td>May 20, 2026</td><td>Hotel stay</td><td>Awarded</td><td>2,000</td></tr>
                <tr><td>07/31/2026</td><td>Points redemption</td><td>Redeemed</td><td>-500</td></tr>
                <tr><td>December 31, 2030</td><td>Points expired</td><td>Expired</td><td>-200</td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <div class="col user-info">
          Leaders Club Member
          Member ID LC123456
          Member Since 2024
        </div>
      `),
      ACCOUNT_URL,
    );

    expect(result).toMatchObject({
      kind: "success",
      authState: "authenticated",
      capture: {
        balance: 12450,
        memberNumber: "LC123456",
        expiration: {
          type: "activity_based",
          date: "2028-07-31",
          inactivityMonths: 24,
          note: "Derived from the newest qualifying points activity shown by LHW",
        },
      },
    });
  });

  it("returns N/A when zero points and no activity are rendered", () => {
    const result = inspectLhw(
      page(`
        <section class="page reward-activity">
          <h1 id="rewards-activity-title">My Points Activity</h1>
          <h2 id="point-counter">0</h2>
          <div id="rewardsActivityApp">
            <table class="table reward-list-table">
              <tbody></tbody>
            </table>
            <p>You have no points activity.</p>
          </div>
        </section>
      `),
      ACCOUNT_URL,
    );

    expect(result).toMatchObject({
      kind: "success",
      authState: "authenticated",
      capture: {
        balance: 0,
        memberNumber: null,
        expiration: {
          type: "never",
          date: null,
          note: "N/A because no LHW points are available to expire",
        },
      },
    });
  });

  it("keeps the 24-month policy without inventing a date for positive points", () => {
    const result = inspectLhw(
      page(`
        <section class="page reward-activity">
          <h1 id="rewards-activity-title">My Points Activity</h1>
          <h2 id="point-counter">12,450</h2>
          <div id="rewardsActivityApp">
            <table class="table reward-list-table"><tbody></tbody></table>
          </div>
        </section>
      `),
      ACCOUNT_URL,
    );

    expect(result).toMatchObject({
      kind: "success",
      capture: {
        balance: 12450,
        expiration: {
          type: "activity_based",
          date: null,
          inactivityMonths: 24,
        },
      },
    });
  });

  it("supports deterministic fixture hooks without scanning unrelated page text", () => {
    const result = inspectLhw(
      page(`
        <main>
          <div data-points-tracker="lhw-points-balance">8,001 points</div>
          <div data-points-tracker="lhw-member-number">LC8001</div>
          <div data-points-tracker="lhw-activity">June 15, 2026</div>
        </main>
        <aside>
          Earn 100,000 promotional points.
          Previous activity: December 31, 2030.
        </aside>
      `),
      ACCOUNT_URL,
    );

    expect(result).toMatchObject({
      kind: "success",
      capture: {
        balance: 8001,
        memberNumber: "LC8001",
        expiration: {
          date: "2028-06-15",
          inactivityMonths: 24,
        },
      },
    });
  });

  it("does not treat promotional text as the account balance", () => {
    const result = inspectLhw(
      page(`
        <section class="page reward-activity">
          <h1 id="rewards-activity-title">My Points Activity</h1>
          <p>Earn 100,000 promotional points.</p>
        </section>
      `),
      ACCOUNT_URL,
    );

    expect(result).toMatchObject({
      kind: "not_found",
      authState: "authenticated",
      reason: "balance_not_found",
    });
  });

  it("never reads matching credential controls", () => {
    const result = inspectLhw(
      page(`
        <input id="point-counter" value="999,999" />
        <input data-points-tracker="lhw-member-number" value="LC999999" />
        <input data-points-tracker="lhw-activity" value="July 1, 2026" />
      `),
      ACCOUNT_URL,
    );

    expect(result.kind).toBe("not_found");
  });

  it("returns a member-number-only result while the balance is still loading", () => {
    const result = inspectLhw(
      page(`
        <section class="page reward-activity">
          <h1 id="rewards-activity-title">My Points Activity</h1>
          <div class="col user-info">
            Leaders Club Member · Member ID LC123456 · Member Since 2024
          </div>
        </section>
      `),
      ACCOUNT_URL,
    );

    expect(result).toMatchObject({
      kind: "member_number_found",
      authState: "authenticated",
      capture: {
        memberNumber: "LC123456",
      },
    });
  });

  it("recognizes a signed-out account page", () => {
    const result = inspectLhw(
      page('<form action="/account/login"><button>Sign in</button></form>'),
      "https://www.lhw.com/account/login",
    );

    expect(result).toMatchObject({
      kind: "login_required",
      authState: "signed_out",
      reason: "login_required",
    });
  });

  it("recognizes a verification page", () => {
    const result = inspectLhw(
      page('<iframe src="/challenge/captcha"></iframe>'),
      "https://www.lhw.com/account/verification",
    );

    expect(result).toMatchObject({
      kind: "verification_required",
      reason: "verification_required",
    });
  });
});
