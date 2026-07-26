import {
  createDefaultSettings,
  normalizeSettings,
  SETTINGS_STORAGE_KEY,
  setProgramEnabled,
} from '../domain/settings.js';
import type {
  PointsTrackerSettings,
  ProgramId,
  StorageAreaLike,
} from '../types.js';

export class SettingsRepository {
  readonly #storageArea: StorageAreaLike;
  readonly #key: string;
  #pendingUpdate: Promise<void> = Promise.resolve();

  constructor(
    storageArea: StorageAreaLike,
    key = SETTINGS_STORAGE_KEY,
  ) {
    this.#storageArea = storageArea;
    this.#key = key;
  }

  async getSettings(): Promise<PointsTrackerSettings> {
    const stored = await this.#storageArea.get(this.#key);
    return normalizeSettings(stored[this.#key]);
  }

  async setSettings(value: unknown): Promise<PointsTrackerSettings> {
    const settings = normalizeSettings(value);
    await this.#storageArea.set({ [this.#key]: settings });
    return settings;
  }

  async ensureSettings(): Promise<PointsTrackerSettings> {
    const stored = await this.#storageArea.get(this.#key);
    if (stored[this.#key]) return normalizeSettings(stored[this.#key]);
    return this.setSettings(createDefaultSettings());
  }

  async setProgramEnabled(
    programId: ProgramId,
    enabled: boolean,
  ): Promise<PointsTrackerSettings> {
    let nextSettings: PointsTrackerSettings | null = null;
    const operation = this.#pendingUpdate.then(async () => {
      const settings = await this.getSettings();
      nextSettings = await this.setSettings(
        setProgramEnabled(settings, programId, enabled),
      );
    });
    this.#pendingUpdate = operation.catch(() => undefined);
    await operation;
    if (!nextSettings) throw new Error('settings_update_failed');
    return nextSettings;
  }
}
