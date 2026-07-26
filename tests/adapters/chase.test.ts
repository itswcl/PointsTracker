import { describe, expect, it } from 'vitest';
import { inspectChase } from '../../src/adapters/chase.js';

const CHASE_URL =
  'https://ultimaterewardspoints.chase.com/account-selector';

function page(html = ''): Document {
  document.body.innerHTML = html;
  return document;
}

function appendRewardsList(
  parent: ParentNode,
  balanceTexts: readonly string[],
): HTMLElement {
  const list = document.createElement('mds-list');
  list.className = 'mds-list--cmb';
  list.setAttribute('list-type', 'navigational');
  const root = list.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <ul>
      ${balanceTexts
        .map(
          (text) => `
            <li class="list-item--navigational">
              <span class="list-item__description list-item__description--subdued">
                Synthetic account
              </span>
              <div aria-hidden="true">
                <span class="list-item__description list-item__description--subdued">
                  ${text}
                </span>
              </div>
              <span class="list-item__description list-item__description--subdued"></span>
            </li>
          `,
        )
        .join('')}
    </ul>
  `;
  parent.append(list);
  return list;
}

describe('Chase Ultimate Rewards adapter', () => {
  it('sums every rendered card balance from the account selector', () => {
    appendRewardsList(
      page('<main><h1>Choose the card you would like to see.</h1></main>')
        .querySelector('main')!,
      [
        'Available Points: 1,250 pts',
        'Available Points: 2,500 pts',
        'Available Points: 0 pts',
      ],
    );

    expect(inspectChase(document, CHASE_URL)).toMatchObject({
      kind: 'success',
      authState: 'authenticated',
      capture: {
        balance: 3750,
        memberNumber: null,
        expiration: {
          type: 'unknown',
          date: null,
          note: 'Expiration does not apply to this balance-only ledger row',
        },
      },
    });
  });

  it('finds the rewards list inside open nested shadow roots', () => {
    page();
    const shell = document.createElement('chase-account-selector');
    const shellRoot = shell.attachShadow({ mode: 'open' });
    appendRewardsList(shellRoot, ['Available Points: 4,200 pts']);
    document.body.append(shell);

    expect(inspectChase(document, CHASE_URL)).toMatchObject({
      kind: 'success',
      capture: { balance: 4200 },
    });
  });

  it('captures a zero balance from a single card', () => {
    appendRewardsList(page().body, ['Available Points: 0 pts']);

    expect(inspectChase(document, CHASE_URL)).toMatchObject({
      kind: 'success',
      capture: {
        balance: 0,
        memberNumber: null,
      },
    });
  });

  it('does not double count a hidden responsive copy', () => {
    const visible = document.createElement('section');
    const hidden = document.createElement('section');
    hidden.setAttribute('aria-hidden', 'true');
    page().body.append(visible, hidden);

    appendRewardsList(visible, [
      'Available Points: 1,000 pts',
      'Available Points: 2,000 pts',
    ]);
    appendRewardsList(hidden, [
      'Available Points: 1,000 pts',
      'Available Points: 2,000 pts',
    ]);

    expect(inspectChase(document, CHASE_URL)).toMatchObject({
      kind: 'success',
      capture: { balance: 3000 },
    });
  });

  it('deduplicates consistent rendered responsive lists', () => {
    page();
    appendRewardsList(document.body, [
      'Available Points: 1,000 pts',
      'Available Points: 2,000 pts',
    ]);
    appendRewardsList(document.body, [
      'Available Points: 1,000 pts',
      'Available Points: 2,000 pts',
    ]);

    expect(inspectChase(document, CHASE_URL)).toMatchObject({
      kind: 'success',
      capture: { balance: 3000 },
    });
  });

  it('fails closed when rendered card lists conflict', () => {
    page();
    appendRewardsList(document.body, ['Available Points: 1,000 pts']);
    appendRewardsList(document.body, ['Available Points: 2,000 pts']);

    expect(inspectChase(document, CHASE_URL)).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('does not treat promotional points as card balances', () => {
    appendRewardsList(page().body, [
      'Earn 100,000 bonus points after qualifying purchases',
    ]);

    expect(inspectChase(document, CHASE_URL)).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('fails closed when any rendered card lacks an exact balance', () => {
    appendRewardsList(page().body, [
      'Available Points: 1,000 pts',
      'Points are loading',
    ]);

    expect(inspectChase(document, CHASE_URL)).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('returns not found when no rewards list is rendered', () => {
    page('<main><h1>Choose a card</h1><p>Loading accounts...</p></main>');

    expect(inspectChase(document, CHASE_URL)).toMatchObject({
      kind: 'not_found',
      authState: 'unknown',
      reason: 'balance_not_found',
    });
  });

  it('never reads matching credential inputs', () => {
    page();
    const list = appendRewardsList(document.body, []);
    const root = list.shadowRoot!;
    root.innerHTML = `
      <li class="list-item--navigational">
        <input
          class="list-item__description list-item__description--subdued"
          value="Available Points: 999,999 pts"
        />
        <input type="password" value="Available Points: 999,999 pts" />
      </li>
    `;

    expect(inspectChase(document, CHASE_URL)).toMatchObject({
      kind: 'not_found',
      authState: 'authenticated',
      reason: 'balance_not_found',
    });
  });

  it('recognizes a signed-out page', () => {
    const result = inspectChase(
      page('<form action="/account/logon"><button>Sign in</button></form>'),
      'https://ultimaterewardspoints.chase.com/logon',
    );

    expect(result).toMatchObject({
      kind: 'login_required',
      authState: 'signed_out',
      reason: 'login_required',
    });
  });

  it('recognizes a verification page', () => {
    const result = inspectChase(
      page('<iframe src="/challenge/captcha"></iframe>'),
      'https://ultimaterewardspoints.chase.com/verification',
    );

    expect(result).toMatchObject({
      kind: 'verification_required',
      reason: 'verification_required',
    });
  });
});
