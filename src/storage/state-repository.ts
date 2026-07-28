import {
  STORAGE_KEY,
  applyAutomaticCapture,
  applyAutomaticCaptures,
  applyAutomaticMemberNumber,
  applyManualOverride,
  clearManualOverride,
  createInitialState,
  markRecordStatus,
  markRecordStatuses,
  normalizeState,
  recoverInterruptedCaptures,
} from '../domain/records.js';
import type {
  AutomaticCapture,
  ManualOverrideInput,
  ManualOverride,
  PointsState,
  ProgramCapture,
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

  recoverInterruptedCaptures(): Promise<PointsState> {
    return this.update((state) => recoverInterruptedCaptures(state));
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

  saveAutomaticCaptures(
    captures: readonly ProgramCapture[],
    date?: Date,
  ): Promise<PointsState> {
    return this.update((state) =>
      applyAutomaticCaptures(state, captures, date),
    );
  }

  saveAutomaticMemberNumber(
    programId: ProgramId,
    memberNumber: string,
    date?: Date,
  ): Promise<PointsState> {
    return this.update((state) =>
      applyAutomaticMemberNumber(state, programId, memberNumber, date),
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
    return this.clearManualOverrides([programId]);
  }

  clearManualOverrides(
    programIds: readonly ProgramId[],
  ): Promise<PointsState> {
    return this.update((state) => {
      let next = state;
      for (const programId of new Set(programIds)) {
        next = clearManualOverride(next, programId);
      }
      return next;
    });
  }

  clearManualOverridesIfUnchanged(
    replacements: readonly {
      programId: ProgramId;
      manualOverride: ManualOverride;
    }[],
  ): Promise<PointsState> {
    return this.update((state) => {
      let next = state;
      for (const { programId, manualOverride } of replacements) {
        if (
          JSON.stringify(next.records[programId].manualOverride) ===
          JSON.stringify(manualOverride)
        ) {
          next = clearManualOverride(next, programId);
        }
      }
      return next;
    });
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

  setStatuses(
    programIds: readonly ProgramId[],
    status: RecordStatus,
    error: string | null = null,
  ): Promise<PointsState> {
    return this.update((state) =>
      markRecordStatuses(state, programIds, status, error),
    );
  }
}
