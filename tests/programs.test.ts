import { describe, expect, it } from 'vitest';
import { getProgram, PROGRAM_IDS } from '../src/programs.js';

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
