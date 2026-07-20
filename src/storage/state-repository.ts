import {
  STORAGE_KEY,
  applyAutomaticCapture,
  applyManualOverride,
  clearManualOverride,
  createInitialState,
  markRecordStatus,
  normalizeState,
} from '../domain/records.js';
import type {
  AutomaticCapture,
  ManualOverrideInput,
  PointsState,
  ProgramId,
  RecordStatus,
  StorageAreaLike,
} from '../types.js';

export class StateRepository {
  readonly #storageArea: StorageAreaLike;
  readonly #key: string;

  constructor(storageArea: StorageAreaLike, key = STORAGE_KEY) {
    this.#storageArea = storageArea;
    this.#key = key;
  }

  async getState(): Promise<PointsState> {
    const stored = await this.#storageArea.get(this.#key);
    return normalizeState(stored[this.#key]);
  }

  async setState(state: unknown): Promise<PointsState> {
    const normalized = normalizeState(state);
    await this.#storageArea.set({ [this.#key]: normalized });
    return normalized;
  }

  async ensureState(): Promise<PointsState> {
    const stored = await this.#storageArea.get(this.#key);
    if (stored[this.#key]) return normalizeState(stored[this.#key]);
    return this.setState(createInitialState());
  }

  async update(
    mutator: (current: PointsState) => PointsState,
  ): Promise<PointsState> {
    const current = await this.getState();
    return this.setState(mutator(current));
  }

  saveAutomaticCapture(
    programId: ProgramId,
    capture: AutomaticCapture,
    date?: Date,
  ): Promise<PointsState> {
    return this.update((state) =>
      applyAutomaticCapture(state, programId, capture, date),
    );
  }

  saveManualOverride(
    programId: ProgramId,
    override: ManualOverrideInput,
    date?: Date,
  ): Promise<PointsState> {
    return this.update((state) =>
      applyManualOverride(state, programId, override, date),
    );
  }

  clearManualOverride(programId: ProgramId): Promise<PointsState> {
    return this.update((state) => clearManualOverride(state, programId));
  }

  setStatus(
    programId: ProgramId,
    status: RecordStatus,
    error: string | null = null,
  ): Promise<PointsState> {
    return this.update((state) =>
      markRecordStatus(state, programId, status, error),
    );
  }
}
