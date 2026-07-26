import { describe, expect, it } from 'vitest';
import {
  SETTINGS_STORAGE_KEY,
} from '../../src/domain/settings.js';
import { SettingsRepository } from '../../src/storage/settings-repository.js';
import { createFakeStorageArea } from '../helpers/fake-storage.js';

describe('SettingsRepository', () => {
  it('starts with every program enabled', async () => {
    const storage = createFakeStorageArea();
    const repository = new SettingsRepository(storage);

    await expect(repository.ensureSettings()).resolves.toEqual({
      schemaVersion: 1,
      disabledProgramIds: [],
    });
    expect(storage.snapshot()).toEqual({
      [SETTINGS_STORAGE_KEY]: {
        schemaVersion: 1,
        disabledProgramIds: [],
      },
    });
  });

  it('persists disabled programs and preserves valid values while normalizing', async () => {
    const storage = createFakeStorageArea({
      [SETTINGS_STORAGE_KEY]: {
        schemaVersion: 99,
        disabledProgramIds: ['unitedpool', 'unknown', 'unitedpool'],
      },
    });
    const repository = new SettingsRepository(storage);

    await expect(repository.getSettings()).resolves.toEqual({
      schemaVersion: 1,
      disabledProgramIds: ['unitedpool'],
    });
    await expect(
      repository.setProgramEnabled('delta', false),
    ).resolves.toEqual({
      schemaVersion: 1,
      disabledProgramIds: ['unitedpool', 'delta'],
    });
    await expect(
      repository.setProgramEnabled('unitedpool', true),
    ).resolves.toEqual({
      schemaVersion: 1,
      disabledProgramIds: ['delta'],
    });
  });

  it('serializes rapid program changes so none are lost', async () => {
    const repository = new SettingsRepository(createFakeStorageArea());
    await repository.ensureSettings();

    await Promise.all([
      repository.setProgramEnabled('unitedpool', false),
      repository.setProgramEnabled('delta', false),
      repository.setProgramEnabled('hyatt', false),
    ]);

    await expect(repository.getSettings()).resolves.toEqual({
      schemaVersion: 1,
      disabledProgramIds: ['unitedpool', 'delta', 'hyatt'],
    });
  });
});
