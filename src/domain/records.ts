import { isProgramId, PROGRAM_LIST } from '../programs.js';
import type {
  AutomaticCapture,
  DateKey,
  DisplayRecord,
  Expiration,
  ExpirationType,
  ManualOverrideInput,
  NormalizedExpiration,
  PointsState,
  ProgramDefinition,
  ProgramId,
  ProgramRecord,
  RecordStatus,
} from '../types.js';
import { EXPIRATION_TYPES } from '../types.js';
import { isValidBalance } from './balances.js';
import { isValidDateKey, isValidMonthKey, toDateKey } from './dates.js';

export const STORAGE_KEY = 'pointsTrackerState';
export const SCHEMA_VERSION = 1;
export { EXPIRATION_TYPES };

const RECORD_STATUSES = [
  'not_updated',
  'fresh',
  'updating',
  'error',
] as const satisfies readonly RecordStatus[];

const EXPIRATION_TYPE_VALUES: ReadonlySet<string> = new Set(EXPIRATION_TYPES);
const RECORD_STATUS_VALUES: ReadonlySet<string> = new Set(RECORD_STATUSES);

interface ValidAutomaticRecord {
  balance: number | null;
  expiration: Expiration;
  updatedOn: DateKey | null;
}

interface ValidManualOverride {
  balance: number;
  expiration: Expiration;
  editedOn: DateKey;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isExpirationType(value: unknown): value is ExpirationType {
  return typeof value === 'string' && EXPIRATION_TYPE_VALUES.has(value);
}

function isRecordStatus(value: unknown): value is RecordStatus {
  return typeof value === 'string' && RECORD_STATUS_VALUES.has(value);
}

function cloneExpiration(expiration: Expiration): NormalizedExpiration {
  return {
    type: expiration.type,
    date: expiration.date ?? null,
    month: expiration.month ?? null,
    amount: expiration.amount ?? null,
    inactivityMonths: expiration.inactivityMonths ?? null,
    note: expiration.note ?? null,
  };
}

export function createEmptyRecord(program: ProgramDefinition): ProgramRecord {
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

export function createInitialState(): PointsState {
  const records = {} as Record<ProgramId, ProgramRecord>;
  for (const program of PROGRAM_LIST) {
    records[program.id] = createEmptyRecord(program);
  }
  return { schemaVersion: SCHEMA_VERSION, records };
}

function validExpiration(candidate: unknown): candidate is Expiration {
  if (!isPlainRecord(candidate) || !isExpirationType(candidate.type)) return false;

  const date = candidate.date ?? null;
  const month = candidate.month ?? null;
  const amount = candidate.amount ?? null;
  const inactivityMonths = candidate.inactivityMonths ?? null;
  const note = candidate.note ?? null;

  if (date !== null && !isValidDateKey(date)) return false;
  if (month !== null && !isValidMonthKey(month)) return false;
  if (date !== null && month !== null) return false;
  if (amount !== null && !isValidBalance(amount)) return false;
  if (
    inactivityMonths !== null &&
    (typeof inactivityMonths !== 'number' ||
      !Number.isInteger(inactivityMonths) ||
      inactivityMonths < 1 ||
      inactivityMonths > 120)
  ) {
    return false;
  }
  if (candidate.type === 'fixed_date' && date === null && month === null) {
    return false;
  }
  return note === null || (typeof note === 'string' && note.length <= 160);
}

function hasOnlyKeys(
  candidate: unknown,
  allowedKeys: readonly string[],
): candidate is Record<string, unknown> {
  return (
    isPlainRecord(candidate) &&
    Object.keys(candidate).every((key) => allowedKeys.includes(key))
  );
}

function validAutomaticRecord(candidate: unknown): candidate is ValidAutomaticRecord {
  return Boolean(
    hasOnlyKeys(candidate, ['balance', 'expiration', 'updatedOn']) &&
      (candidate.balance === null || isValidBalance(candidate.balance)) &&
      validExpiration(candidate.expiration) &&
      (candidate.updatedOn === null || isValidDateKey(candidate.updatedOn)),
  );
}

export function validateCapture(capture: unknown): capture is AutomaticCapture {
  return Boolean(
    isPlainRecord(capture) &&
      isValidBalance(capture.balance) &&
      validExpiration(capture.expiration),
  );
}

export function validateManualOverride(
  override: unknown,
): override is ValidManualOverride {
  return Boolean(
    hasOnlyKeys(override, ['balance', 'expiration', 'editedOn']) &&
      isValidBalance(override.balance) &&
      validExpiration(override.expiration) &&
      isValidDateKey(override.editedOn),
  );
}

export function validateStateForImport(candidate: unknown): boolean {
  if (!hasOnlyKeys(candidate, ['schemaVersion', 'records'])) return false;
  if (candidate.schemaVersion !== SCHEMA_VERSION) return false;
  if (!isPlainRecord(candidate.records)) return false;
  const candidateRecords = candidate.records;

  const candidateIds = Object.keys(candidateRecords).sort();
  const expectedIds = PROGRAM_LIST.map((program) => program.id).sort();
  if (candidateIds.join('|') !== expectedIds.join('|')) return false;

  return PROGRAM_LIST.every((program) => {
    const record = candidateRecords[program.id];
    if (
      !hasOnlyKeys(record, [
        'programId',
        'automatic',
        'manualOverride',
        'status',
        'error',
      ])
    ) {
      return false;
    }
    return Boolean(
      record.programId === program.id &&
        validAutomaticRecord(record.automatic) &&
        (record.manualOverride === null ||
          validateManualOverride(record.manualOverride)) &&
        isRecordStatus(record.status) &&
        (record.error === null ||
          (typeof record.error === 'string' && record.error.length <= 80)),
    );
  });
}

export function normalizeState(candidate: unknown): PointsState {
  const initial = createInitialState();
  if (
    !isPlainRecord(candidate) ||
    candidate.schemaVersion !== SCHEMA_VERSION ||
    !isPlainRecord(candidate.records)
  ) {
    return initial;
  }

  for (const program of PROGRAM_LIST) {
    const candidateRecord = candidate.records[program.id];
    if (
      !isPlainRecord(candidateRecord) ||
      candidateRecord.programId !== program.id
    ) {
      continue;
    }

    const record = createEmptyRecord(program);
    if (validAutomaticRecord(candidateRecord.automatic)) {
      record.automatic = {
        balance: candidateRecord.automatic.balance,
        expiration: cloneExpiration(candidateRecord.automatic.expiration),
        updatedOn: candidateRecord.automatic.updatedOn,
      };
    }

    if (validateManualOverride(candidateRecord.manualOverride)) {
      record.manualOverride = {
        balance: candidateRecord.manualOverride.balance,
        expiration: cloneExpiration(candidateRecord.manualOverride.expiration),
        editedOn: candidateRecord.manualOverride.editedOn,
      };
    }

    if (isRecordStatus(candidateRecord.status)) {
      record.status = candidateRecord.status;
    }
    record.error =
      typeof candidateRecord.error === 'string' ? candidateRecord.error : null;
    initial.records[program.id] = record;
  }

  return initial;
}

export function applyAutomaticCapture(
  state: unknown,
  programId: ProgramId,
  capture: AutomaticCapture,
  date = new Date(),
): PointsState {
  if (!isProgramId(programId) || !validateCapture(capture)) {
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

export function applyManualOverride(
  state: unknown,
  programId: ProgramId,
  override: ManualOverrideInput,
  date = new Date(),
): PointsState {
  if (!isProgramId(programId)) throw new Error('Unknown program');
  const candidate: ValidManualOverride = {
    balance: override.balance,
    expiration: override.expiration,
    editedOn: toDateKey(date),
  };
  if (!validateManualOverride(candidate)) {
    throw new Error('Invalid manual override');
  }

  const next = normalizeState(state);
  next.records[programId] = {
    ...next.records[programId],
    manualOverride: {
      balance: candidate.balance,
      expiration: cloneExpiration(candidate.expiration),
      editedOn: candidate.editedOn,
    },
  };
  return next;
}

export function clearManualOverride(
  state: unknown,
  programId: ProgramId,
): PointsState {
  if (!isProgramId(programId)) throw new Error('Unknown program');
  const next = normalizeState(state);
  next.records[programId] = {
    ...next.records[programId],
    manualOverride: null,
  };
  return next;
}

export function markRecordStatus(
  state: unknown,
  programId: ProgramId,
  status: RecordStatus,
  error: string | null = null,
): PointsState {
  if (!isProgramId(programId)) throw new Error('Unknown program');
  if (!isRecordStatus(status)) throw new Error('Invalid record status');

  const next = normalizeState(state);
  next.records[programId] = {
    ...next.records[programId],
    status,
    error: typeof error === 'string' ? error : null,
  };
  return next;
}

export function getDisplayRecord(record: ProgramRecord): DisplayRecord {
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
