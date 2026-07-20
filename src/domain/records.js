import { isValidBalance } from './balances.js';
import { isValidDateKey, isValidMonthKey, toDateKey } from './dates.js';
import { PROGRAM_LIST, PROGRAMS } from '../programs.js';

export const STORAGE_KEY = 'pointsTrackerState';
export const SCHEMA_VERSION = 1;
export const EXPIRATION_TYPES = Object.freeze([
  'never',
  'fixed_date',
  'activity_based',
  'unknown',
]);

function cloneExpiration(expiration) {
  return {
    type: expiration.type,
    date: expiration.date ?? null,
    month: expiration.month ?? null,
    amount: expiration.amount ?? null,
    inactivityMonths: expiration.inactivityMonths ?? null,
    note: expiration.note ?? null,
  };
}

export function createEmptyRecord(program) {
  return {
    programId: program.id,
    automatic: {
      balance: null,
      expiration: cloneExpiration(program.defaultExpiration),
      updatedOn: null,
    },
    manualOverride: null,
    status: 'not_updated',
    error: null,
  };
}

export function createInitialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    records: Object.fromEntries(
      PROGRAM_LIST.map((program) => [program.id, createEmptyRecord(program)]),
    ),
  };
}

function validExpiration(expiration) {
  if (!expiration || !EXPIRATION_TYPES.includes(expiration.type)) return false;
  if (expiration.date !== null && !isValidDateKey(expiration.date)) return false;
  if (expiration.month != null && !isValidMonthKey(expiration.month)) return false;
  if (expiration.date != null && expiration.month != null) return false;
  if (expiration.amount != null && !isValidBalance(expiration.amount)) return false;
  if (
    expiration.inactivityMonths != null &&
    (!Number.isInteger(expiration.inactivityMonths) ||
      expiration.inactivityMonths < 1 ||
      expiration.inactivityMonths > 120)
  ) {
    return false;
  }
  if (expiration.type === 'fixed_date' && !expiration.date && !expiration.month) {
    return false;
  }
  return (
    expiration.note === null ||
    (typeof expiration.note === 'string' && expiration.note.length <= 160)
  );
}

function hasOnlyKeys(candidate, allowedKeys) {
  return (
    candidate &&
    typeof candidate === 'object' &&
    Object.keys(candidate).every((key) => allowedKeys.includes(key))
  );
}

function validAutomaticRecord(candidate) {
  return Boolean(
    hasOnlyKeys(candidate, ['balance', 'expiration', 'updatedOn']) &&
      (candidate.balance === null || isValidBalance(candidate.balance)) &&
      validExpiration(candidate.expiration) &&
      (candidate.updatedOn === null || isValidDateKey(candidate.updatedOn)),
  );
}

export function validateCapture(capture) {
  return Boolean(
    capture &&
      isValidBalance(capture.balance) &&
      validExpiration(capture.expiration),
  );
}

export function validateManualOverride(override) {
  return Boolean(
    hasOnlyKeys(override, ['balance', 'expiration', 'editedOn']) &&
      isValidBalance(override.balance) &&
      validExpiration(override.expiration) &&
      isValidDateKey(override.editedOn),
  );
}

export function validateStateForImport(candidate) {
  if (!hasOnlyKeys(candidate, ['schemaVersion', 'records'])) return false;
  if (candidate.schemaVersion !== SCHEMA_VERSION) return false;
  if (!candidate.records || typeof candidate.records !== 'object') return false;

  const candidateIds = Object.keys(candidate.records).sort();
  const expectedIds = PROGRAM_LIST.map((program) => program.id).sort();
  if (candidateIds.join('|') !== expectedIds.join('|')) return false;

  return PROGRAM_LIST.every((program) => {
    const record = candidate.records[program.id];
    return Boolean(
      hasOnlyKeys(record, [
        'programId',
        'automatic',
        'manualOverride',
        'status',
        'error',
      ]) &&
        record.programId === program.id &&
        validAutomaticRecord(record.automatic) &&
        (record.manualOverride === null ||
          validateManualOverride(record.manualOverride)) &&
        ['not_updated', 'fresh', 'updating', 'error'].includes(record.status) &&
        (record.error === null ||
          (typeof record.error === 'string' && record.error.length <= 80)),
    );
  });
}

export function normalizeState(candidate) {
  const initial = createInitialState();
  if (!candidate || candidate.schemaVersion !== SCHEMA_VERSION) return initial;

  for (const program of PROGRAM_LIST) {
    const candidateRecord = candidate.records?.[program.id];
    if (!candidateRecord || candidateRecord.programId !== program.id) continue;

    const record = createEmptyRecord(program);
    if (
      candidateRecord.automatic?.balance === null ||
      isValidBalance(candidateRecord.automatic?.balance)
    ) {
      const expiration = candidateRecord.automatic?.expiration;
      const updatedOn = candidateRecord.automatic?.updatedOn;
      if (
        validExpiration(expiration) &&
        (updatedOn === null || isValidDateKey(updatedOn))
      ) {
        record.automatic = {
          balance: candidateRecord.automatic.balance,
          expiration: cloneExpiration(expiration),
          updatedOn,
        };
      }
    }

    if (validateManualOverride(candidateRecord.manualOverride)) {
      record.manualOverride = {
        balance: candidateRecord.manualOverride.balance,
        expiration: cloneExpiration(candidateRecord.manualOverride.expiration),
        editedOn: candidateRecord.manualOverride.editedOn,
      };
    }

    if (['not_updated', 'fresh', 'updating', 'error'].includes(candidateRecord.status)) {
      record.status = candidateRecord.status;
    }
    record.error =
      typeof candidateRecord.error === 'string' ? candidateRecord.error : null;
    initial.records[program.id] = record;
  }

  return initial;
}

export function applyAutomaticCapture(state, programId, capture, date = new Date()) {
  if (!PROGRAMS[programId] || !validateCapture(capture)) {
    throw new Error('Invalid automatic capture');
  }

  const next = normalizeState(state);
  next.records[programId] = {
    ...next.records[programId],
    automatic: {
      balance: capture.balance,
      expiration: cloneExpiration(capture.expiration),
      updatedOn: toDateKey(date),
    },
    status: 'fresh',
    error: null,
  };
  return next;
}

export function applyManualOverride(state, programId, override, date = new Date()) {
  if (!PROGRAMS[programId]) throw new Error('Unknown program');
  const candidate = {
    balance: override.balance,
    expiration: cloneExpiration(override.expiration),
    editedOn: toDateKey(date),
  };
  if (!validateManualOverride(candidate)) throw new Error('Invalid manual override');

  const next = normalizeState(state);
  next.records[programId] = {
    ...next.records[programId],
    manualOverride: candidate,
  };
  return next;
}

export function clearManualOverride(state, programId) {
  if (!PROGRAMS[programId]) throw new Error('Unknown program');
  const next = normalizeState(state);
  next.records[programId] = {
    ...next.records[programId],
    manualOverride: null,
  };
  return next;
}

export function markRecordStatus(state, programId, status, error = null) {
  if (!PROGRAMS[programId]) throw new Error('Unknown program');
  if (!['not_updated', 'fresh', 'updating', 'error'].includes(status)) {
    throw new Error('Invalid record status');
  }

  const next = normalizeState(state);
  next.records[programId] = {
    ...next.records[programId],
    status,
    error: typeof error === 'string' ? error : null,
  };
  return next;
}

export function getDisplayRecord(record) {
  const source = record.manualOverride ?? record.automatic;
  return {
    balance: source.balance,
    expiration: cloneExpiration(source.expiration),
    updatedOn: record.manualOverride?.editedOn ?? record.automatic.updatedOn,
    source: record.manualOverride ? 'manual' : 'automatic',
    status: record.status,
    error: record.error,
  };
}
