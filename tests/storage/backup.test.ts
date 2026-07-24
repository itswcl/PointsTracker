import { describe, expect, it } from 'vitest';
import {
  applyAutomaticCapture,
  createInitialState,
} from '../../src/domain/records.js';
import { parseBackup, serializeBackup } from '../../src/storage/backup.js';

describe('JSON backups', () => {
  it('round trips approved local state', () => {
    const state = applyAutomaticCapture(
      createInitialState(),
      'united',
      {
        balance: 125400,
        memberNumber: 'UA000001',
        expiration: { type: 'never', date: null, note: 'No expiration' },
      },
      new Date(2026, 6, 17),
    );
    const text = serializeBackup(state, new Date('2026-07-17T12:00:00.000Z'));
    expect(parseBackup(text)).toEqual(state);
    expect(JSON.parse(text).data.records.united.automatic.memberNumber).toBe(
      'UA000001',
    );
    expect(text).not.toMatch(/password|username|cookie/i);
  });

  it('rejects malformed and unexpected fields', () => {
    expect(() => parseBackup('{')).toThrow('not valid JSON');

    const candidate = JSON.parse(serializeBackup(createInitialState()));
    candidate.data.records.cathay.password = 'x';
    expect(() => parseBackup(JSON.stringify(candidate))).toThrow(
      'invalid or unexpected data',
    );

    const nestedCandidate = JSON.parse(
      serializeBackup(createInitialState()),
    );
    nestedCandidate.data.records.cathay.automatic.expiration.password = 'x';
    expect(() => parseBackup(JSON.stringify(nestedCandidate))).toThrow(
      'invalid or unexpected data',
    );
  });

  it('adds newly supported programs when importing an older backup', () => {
    const candidate = JSON.parse(serializeBackup(createInitialState()));
    Reflect.deleteProperty(candidate.data.records, 'delta');

    const imported = parseBackup(JSON.stringify(candidate));

    expect(imported.records.delta).toMatchObject({
      programId: 'delta',
      automatic: { balance: null },
      manualOverride: null,
      status: 'not_updated',
    });
  });
});
