import { describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../../src/domain/records.js';
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
          manualOverride: { balance: 84500 },
        },
      },
    });
  });
});
