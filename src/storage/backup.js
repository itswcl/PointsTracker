import {
  normalizeState,
  SCHEMA_VERSION,
  validateStateForImport,
} from '../domain/records.js';

const BACKUP_KIND = 'points-tracker-backup';

export function createBackup(state, date = new Date()) {
  return {
    kind: BACKUP_KIND,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: date.toISOString(),
    data: normalizeState(state),
  };
}

export function serializeBackup(state, date) {
  return JSON.stringify(createBackup(state, date), null, 2);
}

export function parseBackup(text) {
  let candidate;

  try {
    candidate = JSON.parse(text);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (
    candidate?.kind !== BACKUP_KIND ||
    candidate?.schemaVersion !== SCHEMA_VERSION ||
    !candidate?.data
  ) {
    throw new Error('This is not a compatible Points Tracker backup.');
  }

  if (!validateStateForImport(candidate.data)) {
    throw new Error('The backup contains invalid or unexpected data.');
  }

  return normalizeState(candidate.data);
}
