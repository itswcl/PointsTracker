import { describe, expect, it } from 'vitest';
import {
  getProgram,
  PROGRAM_CATEGORIES,
  PROGRAM_IDS,
  programShowsExpiration,
  programShowsMemberNumber,
} from '../src/programs.js';

describe('program account targets', () => {
  it('opens the confirmed My United account page', () => {
    const united = getProgram(PROGRAM_IDS.UNITED);
    if (!united) throw new Error('United program is missing');

    expect(united.accountUrl).toBe('https://www.united.com/en/us/myunited');
    expect(united.loginUrl).toBe('https://www.united.com/en/us/myunited');
  });

  it('opens the confirmed Delta SkyMiles overview page', () => {
    const delta = getProgram(PROGRAM_IDS.DELTA);
    if (!delta) throw new Error('Delta program is missing');

    expect(delta.accountUrl).toBe('https://www.delta.com/myskymiles/overview');
    expect(delta.loginUrl).toBe('https://www.delta.com/myskymiles/overview');
  });

  it('opens the confirmed IHG One Rewards account page', () => {
    const ihg = getProgram(PROGRAM_IDS.IHG);
    if (!ihg) throw new Error('IHG program is missing');

    expect(ihg.accountUrl).toBe(
      'https://www.ihg.com/rewardsclub/us/en/account-mgmt/home',
    );
    expect(ihg.loginUrl).toBe(
      'https://www.ihg.com/rewardsclub/us/en/account-mgmt/home',
    );
    expect(ihg.hosts).toEqual(['www.ihg.com']);
    expect(ihg.defaultExpiration.type).toBe('unknown');
  });

  it('opens the confirmed Wyndham Rewards activity page', () => {
    const wyndham = getProgram(PROGRAM_IDS.WYNDHAM);
    if (!wyndham) throw new Error('Wyndham program is missing');

    expect(wyndham.accountUrl).toBe(
      'https://www.wyndhamhotels.com/wyndham-rewards/my-account/activity',
    );
    expect(wyndham.loginUrl).toBe(
      'https://www.wyndhamhotels.com/wyndham-rewards/my-account/activity',
    );
    expect(wyndham.hosts).toEqual(['www.wyndhamhotels.com']);
    expect(wyndham.defaultExpiration).toMatchObject({
      type: 'activity_based',
      date: null,
      inactivityMonths: 18,
    });
  });

  it('registers Amex as a balance-only Credit Card program', () => {
    const amex = getProgram(PROGRAM_IDS.AMEX);
    if (!amex) throw new Error('Amex program is missing');

    expect(amex.accountUrl).toBe(
      'https://global.americanexpress.com/rewards',
    );
    expect(amex.loginUrl).toBe(
      'https://global.americanexpress.com/rewards',
    );
    expect(amex.hosts).toEqual(['global.americanexpress.com']);
    expect(amex.category).toBe(PROGRAM_CATEGORIES.CREDIT_CARD);
    expect(programShowsMemberNumber(amex)).toBe(false);
    expect(programShowsExpiration(amex)).toBe(false);
  });

  it('registers Capital One, Chase, Citi, and Bilt as balance-only Credit Card programs', () => {
    const capitalOne = getProgram(PROGRAM_IDS.CAPITAL_ONE);
    const chase = getProgram(PROGRAM_IDS.CHASE);
    const citi = getProgram(PROGRAM_IDS.CITI);
    const bilt = getProgram(PROGRAM_IDS.BILT);
    if (!capitalOne || !chase || !citi || !bilt) {
      throw new Error('A Credit Card program is missing');
    }

    expect(capitalOne.accountUrl).toBe(
      'https://myaccounts.capitalone.com/accountSummary',
    );
    expect(capitalOne.hosts).toEqual(['myaccounts.capitalone.com']);
    expect(chase.accountUrl).toBe(
      'https://ultimaterewardspoints.chase.com/account-selector',
    );
    expect(chase.hosts).toEqual(['ultimaterewardspoints.chase.com']);
    expect(citi.accountUrl).toBe(
      'https://online.citi.com/US/ag/dashboard/summary',
    );
    expect(citi.hosts).toEqual(['online.citi.com']);
    expect(bilt.accountUrl).toBe(
      'https://www.bilt.com/rewards/neighborhood',
    );
    expect(bilt.hosts).toEqual(['www.bilt.com']);

    for (const program of [capitalOne, chase, citi, bilt]) {
      expect(program.category).toBe(PROGRAM_CATEGORIES.CREDIT_CARD);
      expect(programShowsMemberNumber(program)).toBe(false);
      expect(programShowsExpiration(program)).toBe(false);
    }
  });

  it('uses secondary member-number pages only where account data is split', () => {
    const flyingBlue = getProgram(PROGRAM_IDS.AIR_FRANCE);
    const britishAirways = getProgram(PROGRAM_IDS.BRITISH_AIRWAYS);
    const ana = getProgram(PROGRAM_IDS.ANA);
    if (!flyingBlue || !britishAirways || !ana) {
      throw new Error('A split-page program is missing');
    }

    expect(flyingBlue.memberNumberUrl).toBe(
      'https://wwws.airfrance.us/profile/flying-blue/dashboard',
    );
    expect(britishAirways.memberNumberUrl).toBe(
      'https://www.britishairways.com/nx/b/customerhub/en/usa/your-account/',
    );
    expect(ana.memberNumberUrl).toBe(
      'https://cam.ana.co.jp/psz/amcj/jsp/renew/amcMemberReference/amcMemberReferenceOS_e.jsp',
    );
  });
});
