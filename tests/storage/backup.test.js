import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../src/domain/records.js';
import { parseBackup, serializeBackup } from '../../src/storage/backup.js';

describe('JSON backups', () => {
  it('round trips approved local state', () => {
    const state = createInitialState();
    const text = serializeBackup(state, new Date('2026-07-17T12:00:00.000Z'));
    expect(parseBackup(text)).toEqual(state);
  });

  it('rejects malformed and unexpected fields', () => {
    expect(() => parseBackup('{')).toThrow('not valid JSON');

    const candidate = JSON.parse(serializeBackup(createInitialState()));
    candidate.data.records.cathay.password = 'do-not-import';
    expect(() => parseBackup(JSON.stringify(candidate))).toThrow(
      'invalid or unexpected data',
    );
  });
});

