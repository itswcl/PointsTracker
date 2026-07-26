import { describe, expect, it } from 'vitest';
import {
  markRecordStatus,
  STORAGE_KEY,
} from '../../src/domain/records.js';
import { StateRepository } from '../../src/storage/state-repository.js';
import { createFakeStorageArea } from '../helpers/fake-storage.js';

describe('StateRepository', () => {
  it('initializes and updates only the versioned state key', async () => {
    const storage = createFakeStorageArea();
    const repository = new StateRepository(storage);
    await repository.ensureState();
    await repository.saveManualOverride(
      'cathay',
      {
        balance: 84500,
        memberNumber: 'CX000002',
        expiration: {
          type: 'activity_based',
          date: '2026-12-14',
          note: null,
        },
      },
      new Date(2026, 6, 17),
    );

    const snapshot = storage.snapshot();
    expect(Object.keys(snapshot)).toEqual([STORAGE_KEY]);
    expect(snapshot[STORAGE_KEY]).toMatchObject({
      records: {
        cathay: {
          manualOverride: {
            balance: 84500,
            memberNumber: 'CX000002',
          },
        },
      },
    });
  });

  it('persists recovery for a refresh interrupted by a worker restart', async () => {
    const storage = createFakeStorageArea();
    const repository = new StateRepository(storage);
    const initial = await repository.ensureState();
    await repository.setState(markRecordStatus(initial, 'united', 'updating'));

    const recovered = await repository.recoverInterruptedCaptures();

    expect(recovered.records.united).toMatchObject({
      status: 'error',
      error: 'capture_interrupted',
    });
    expect(storage.snapshot()[STORAGE_KEY]).toMatchObject(recovered);
  });

  it('saves shared-page captures in one state update', async () => {
    const storage = createFakeStorageArea();
    const repository = new StateRepository(storage);

    await repository.saveAutomaticCaptures(
      [
        {
          programId: 'southwest',
          capture: {
            balance: 20383,
            memberNumber: 'RR000016',
            expiration: {
              type: 'never',
              date: null,
              note: 'No expiration',
            },
          },
        },
        {
          programId: 'southwestcredit',
          capture: {
            balance: 69796,
            memberNumber: 'RR000016',
            expiration: {
              type: 'fixed_date',
              date: '2028-01-15',
              note: 'Earliest Southwest Flight Credit expiration',
            },
          },
        },
      ],
      new Date(2026, 6, 17),
    );

    expect(storage.snapshot()[STORAGE_KEY]).toMatchObject({
      records: {
        southwest: {
          automatic: {
            balance: 20383,
            memberNumber: 'RR000016',
            updatedOn: '2026-07-17',
          },
          status: 'fresh',
        },
        southwestcredit: {
          automatic: {
            balance: 69796,
            memberNumber: 'RR000016',
            expiration: { date: '2028-01-15' },
            updatedOn: '2026-07-17',
          },
          status: 'fresh',
        },
      },
    });
  });
});
