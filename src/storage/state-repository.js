import {
  STORAGE_KEY,
  applyAutomaticCapture,
  applyManualOverride,
  clearManualOverride,
  createInitialState,
  markRecordStatus,
  normalizeState,
} from '../domain/records.js';

export class StateRepository {
  constructor(storageArea, key = STORAGE_KEY) {
    this.storageArea = storageArea;
    this.key = key;
  }

  async getState() {
    const stored = await this.storageArea.get(this.key);
    return normalizeState(stored?.[this.key]);
  }

  async setState(state) {
    const normalized = normalizeState(state);
    await this.storageArea.set({ [this.key]: normalized });
    return normalized;
  }

  async ensureState() {
    const stored = await this.storageArea.get(this.key);
    if (stored?.[this.key]) return normalizeState(stored[this.key]);
    return this.setState(createInitialState());
  }

  async update(mutator) {
    const current = await this.getState();
    return this.setState(mutator(current));
  }

  saveAutomaticCapture(programId, capture, date) {
    return this.update((state) =>
      applyAutomaticCapture(state, programId, capture, date),
    );
  }

  saveManualOverride(programId, override, date) {
    return this.update((state) =>
      applyManualOverride(state, programId, override, date),
    );
  }

  clearManualOverride(programId) {
    return this.update((state) => clearManualOverride(state, programId));
  }

  setStatus(programId, status, error = null) {
    return this.update((state) =>
      markRecordStatus(state, programId, status, error),
    );
  }
}

