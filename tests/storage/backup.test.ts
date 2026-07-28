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
    Reflect.deleteProperty(candidate.data.records, 'unitedpool');
    Reflect.deleteProperty(candidate.data.records, 'unitedtravelbank');
    Reflect.deleteProperty(candidate.data.records, 'delta');
    Reflect.deleteProperty(candidate.data.records, 'southwest');
    Reflect.deleteProperty(candidate.data.records, 'southwestcredit');
    Reflect.deleteProperty(candidate.data.records, 'krisflyer');
    Reflect.deleteProperty(candidate.data.records, 'ihg');
    Reflect.deleteProperty(candidate.data.records, 'wyndham');
    Reflect.deleteProperty(candidate.data.records, 'choice');
    Reflect.deleteProperty(candidate.data.records, 'lhw');
    Reflect.deleteProperty(candidate.data.records, 'amex');
    Reflect.deleteProperty(candidate.data.records, 'capitalone');
    Reflect.deleteProperty(candidate.data.records, 'chase');
    Reflect.deleteProperty(candidate.data.records, 'citi');
    Reflect.deleteProperty(candidate.data.records, 'bilt');

    const imported = parseBackup(JSON.stringify(candidate));

    expect(imported.records.unitedpool).toMatchObject({
      programId: 'unitedpool',
      automatic: {
        balance: null,
        memberNumber: null,
        expiration: { type: 'never', date: null },
      },
      manualOverride: null,
      status: 'not_updated',
    });
    expect(imported.records.unitedtravelbank).toMatchObject({
      programId: 'unitedtravelbank',
      automatic: {
        balance: null,
        memberNumber: null,
        expiration: { type: 'unknown', date: null },
      },
      manualOverride: null,
      status: 'not_updated',
    });
    expect(imported.records.delta).toMatchObject({
      programId: 'delta',
      automatic: { balance: null },
      manualOverride: null,
      status: 'not_updated',
    });
    expect(imported.records.southwest).toMatchObject({
      programId: 'southwest',
      automatic: {
        balance: null,
        memberNumber: null,
        expiration: { type: 'never', date: null },
      },
      manualOverride: null,
      status: 'not_updated',
    });
    expect(imported.records.southwestcredit).toMatchObject({
      programId: 'southwestcredit',
      automatic: {
        balance: null,
        memberNumber: null,
        expiration: { type: 'unknown', date: null },
      },
      manualOverride: null,
      status: 'not_updated',
    });
    expect(imported.records.krisflyer).toMatchObject({
      programId: 'krisflyer',
      automatic: {
        balance: null,
        memberNumber: null,
        expiration: { type: 'unknown', date: null },
      },
      manualOverride: null,
      status: 'not_updated',
    });
    expect(imported.records.ihg).toMatchObject({
      programId: 'ihg',
      automatic: {
        balance: null,
        expiration: { type: 'unknown', date: null },
      },
      manualOverride: null,
      status: 'not_updated',
    });
    expect(imported.records.wyndham).toMatchObject({
      programId: 'wyndham',
      automatic: {
        balance: null,
        expiration: {
          type: 'activity_based',
          date: null,
          inactivityMonths: 18,
        },
      },
      manualOverride: null,
      status: 'not_updated',
    });
    expect(imported.records.choice).toMatchObject({
      programId: 'choice',
      automatic: {
        balance: null,
        expiration: {
          type: 'activity_based',
          date: null,
          inactivityMonths: 18,
        },
      },
      manualOverride: null,
      status: 'not_updated',
    });
    expect(imported.records.lhw).toMatchObject({
      programId: 'lhw',
      automatic: {
        balance: null,
        expiration: {
          type: 'activity_based',
          date: null,
          inactivityMonths: 24,
        },
      },
      manualOverride: null,
      status: 'not_updated',
    });
    expect(imported.records.amex).toMatchObject({
      programId: 'amex',
      automatic: {
        balance: null,
        memberNumber: null,
        expiration: { type: 'unknown', date: null },
      },
      manualOverride: null,
      status: 'not_updated',
    });
    for (const programId of [
      'capitalone',
      'chase',
      'citi',
      'bilt',
    ] as const) {
      expect(imported.records[programId]).toMatchObject({
        programId,
        automatic: {
          balance: null,
          memberNumber: null,
          expiration: { type: 'unknown', date: null },
        },
        manualOverride: null,
        status: 'not_updated',
      });
    }
  });
});
