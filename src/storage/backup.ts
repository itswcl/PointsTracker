import {
  normalizeState,
  SCHEMA_VERSION,
  validateStateForImport,
} from '../domain/records.js';
import type { PointsState } from '../types.js';

const BACKUP_KIND = 'points-tracker-backup';

interface Backup {
  kind: typeof BACKUP_KIND;
  schemaVersion: typeof SCHEMA_VERSION;
  exportedAt: string;
  data: PointsState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function createBackup(state: unknown, date = new Date()): Backup {
  return {
    kind: BACKUP_KIND,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: date.toISOString(),
    data: normalizeState(state),
  };
}

export function serializeBackup(state: unknown, date?: Date): string {
  return JSON.stringify(createBackup(state, date), null, 2);
}

export function parseBackup(text: string): PointsState {
  let candidate: unknown;

  try {
    candidate = JSON.parse(text) as unknown;
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (
    !isRecord(candidate) ||
    candidate.kind !== BACKUP_KIND ||
    candidate.schemaVersion !== SCHEMA_VERSION ||
    !candidate.data
  ) {
    throw new Error('This is not a compatible Points Tracker backup.');
  }

  if (!validateStateForImport(candidate.data)) {
    throw new Error('The backup contains invalid or unexpected data.');
  }

  return normalizeState(candidate.data);
}
