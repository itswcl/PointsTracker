import { describe, expect, it } from 'vitest';
import { getProgram, PROGRAM_IDS } from '../src/programs.js';

describe('program account targets', () => {
  it('opens the confirmed My United account page', () => {
    const united = getProgram(PROGRAM_IDS.UNITED);

    expect(united.accountUrl).toBe('https://www.united.com/en/us/myunited');
    expect(united.loginUrl).toBe('https://www.united.com/en/us/myunited');
  });
});
