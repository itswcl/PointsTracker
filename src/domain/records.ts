import {
  getProgram,
  isProgramId,
  PROGRAM_LIST,
  programAllowsSignedBalance,
} from '../programs.js';
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
  ProgramCapture,
  ProgramId,
  ProgramRecord,
  RecordStatus,
} from '../types.js';
import { EXPIRATION_TYPES } from '../types.js';
import {
  isValidBalance,
  isValidSignedBalance,
} from './balances.js';
import { isValidDateKey, isValidMonthKey, toDateKey } from './dates.js';
import {
  isValidMemberNumber,
  normalizeMemberNumber,
} from './member-numbers.js';

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
const ZERO_BALANCE_EXPIRATION = Object.freeze({
  type: 'never',
  date: null,
  note: 'N/A because a zero balance has nothing to expire',
} as const satisfies Expiration);

interface ValidAutomaticRecord {
  balance: number | null;
  memberNumber?: string | null;
  expiration: Expiration;
  updatedOn: DateKey | null;
}

interface ValidManualOverride {
  balance: number;
  memberNumber?: string | null;
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

function normalizeExpirationForBalance(
  balance: number | null,
  expiration: Expiration,
): NormalizedExpiration {
  return cloneExpiration(
    balance === 0 ? ZERO_BALANCE_EXPIRATION : expiration,
  );
}

export function createEmptyRecord(program: ProgramDefinition): ProgramRecord {
  return {
    programId: program.id,
    automatic: {
      balance: null,
      memberNumber: null,
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
  if (
    !hasOnlyKeys(candidate, [
      'type',
      'date',
      'month',
      'amount',
      'inactivityMonths',
      'note',
    ]) ||
    !isExpirationType(candidate.type)
  ) {
    return false;
  }

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

function isValidProgramBalance(
  value: unknown,
  programId?: ProgramId,
): value is number {
  const program = getProgram(programId);
  return program && programAllowsSignedBalance(program)
    ? isValidSignedBalance(value)
    : isValidBalance(value);
}

function validAutomaticRecord(
  candidate: unknown,
  programId?: ProgramId,
): candidate is ValidAutomaticRecord {
  return Boolean(
    hasOnlyKeys(candidate, [
      'balance',
      'memberNumber',
      'expiration',
      'updatedOn',
    ]) &&
      (candidate.balance === null ||
        isValidProgramBalance(candidate.balance, programId)) &&
      (candidate.memberNumber === undefined ||
        candidate.memberNumber === null ||
        isValidMemberNumber(candidate.memberNumber)) &&
      validExpiration(candidate.expiration) &&
      (candidate.updatedOn === null || isValidDateKey(candidate.updatedOn)),
  );
}

export function validateCapture(
  capture: unknown,
  programId?: ProgramId,
): capture is AutomaticCapture {
  return Boolean(
    hasOnlyKeys(capture, ['balance', 'memberNumber', 'expiration']) &&
      isValidProgramBalance(capture.balance, programId) &&
      (capture.memberNumber === null ||
        isValidMemberNumber(capture.memberNumber)) &&
      validExpiration(capture.expiration),
  );
}

export function validateManualOverride(
  override: unknown,
  programId?: ProgramId,
): override is ValidManualOverride {
  return Boolean(
    hasOnlyKeys(override, [
      'balance',
      'memberNumber',
      'expiration',
      'editedOn',
    ]) &&
      isValidProgramBalance(override.balance, programId) &&
      (override.memberNumber === undefined ||
        override.memberNumber === null ||
        isValidMemberNumber(override.memberNumber)) &&
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
  if (!candidateIds.every(isProgramId)) return false;

  return candidateIds.every((programId) => {
    const record = candidateRecords[programId];
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
      record.programId === programId &&
        validAutomaticRecord(record.automatic, programId) &&
        (record.manualOverride === null ||
          validateManualOverride(record.manualOverride, programId)) &&
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
    if (validAutomaticRecord(candidateRecord.automatic, program.id)) {
      record.automatic = {
        balance: candidateRecord.automatic.balance,
        memberNumber: normalizeMemberNumber(
          candidateRecord.automatic.memberNumber,
        ),
        expiration: normalizeExpirationForBalance(
          candidateRecord.automatic.balance,
          candidateRecord.automatic.expiration,
        ),
        updatedOn: candidateRecord.automatic.updatedOn,
      };
    }

    if (validateManualOverride(candidateRecord.manualOverride, program.id)) {
      record.manualOverride = {
        balance: candidateRecord.manualOverride.balance,
        memberNumber: normalizeMemberNumber(
          candidateRecord.manualOverride.memberNumber,
        ),
        expiration: normalizeExpirationForBalance(
          candidateRecord.manualOverride.balance,
          candidateRecord.manualOverride.expiration,
        ),
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
  if (!isProgramId(programId) || !validateCapture(capture, programId)) {
    throw new Error('Invalid automatic capture');
  }

  const next = normalizeState(state);
  const previousMemberNumber =
    next.records[programId].automatic.memberNumber;
  next.records[programId] = {
    ...next.records[programId],
    automatic: {
      balance: capture.balance,
      memberNumber: capture.memberNumber ?? previousMemberNumber,
      expiration: normalizeExpirationForBalance(
        capture.balance,
        capture.expiration,
      ),
      updatedOn: toDateKey(date),
    },
    status: 'fresh',
    error: null,
  };
  return next;
}

export function applyAutomaticCaptures(
  state: PointsState,
  captures: readonly ProgramCapture[],
  date = new Date(),
): PointsState {
  let next = state;
  const programIds = new Set<ProgramId>();
  for (const { programId, capture } of captures) {
    if (programIds.has(programId)) {
      throw new Error('Duplicate automatic capture');
    }
    programIds.add(programId);
    next = applyAutomaticCapture(next, programId, capture, date);
  }
  return next;
}

export function applyAutomaticMemberNumber(
  state: unknown,
  programId: ProgramId,
  memberNumber: string,
  date = new Date(),
): PointsState {
  if (!isProgramId(programId) || !isValidMemberNumber(memberNumber)) {
    throw new Error('Invalid automatic member number');
  }

  const next = normalizeState(state);
  next.records[programId] = {
    ...next.records[programId],
    automatic: {
      ...next.records[programId].automatic,
      memberNumber,
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
    memberNumber: override.memberNumber,
    expiration: override.expiration,
    editedOn: toDateKey(date),
  };
  if (!validateManualOverride(candidate, programId)) {
    throw new Error('Invalid manual override');
  }

  const next = normalizeState(state);
  next.records[programId] = {
    ...next.records[programId],
    manualOverride: {
      balance: candidate.balance,
      memberNumber: normalizeMemberNumber(candidate.memberNumber),
      expiration: normalizeExpirationForBalance(
        candidate.balance,
        candidate.expiration,
      ),
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

export function markRecordStatuses(
  state: PointsState,
  programIds: readonly ProgramId[],
  status: RecordStatus,
  error: string | null = null,
): PointsState {
  let next = state;
  const uniqueProgramIds = new Set<ProgramId>();
  for (const programId of programIds) {
    if (uniqueProgramIds.has(programId)) continue;
    uniqueProgramIds.add(programId);
    next = markRecordStatus(next, programId, status, error);
  }
  return next;
}

export function recoverInterruptedCaptures(state: unknown): PointsState {
  const next = normalizeState(state);
  for (const program of PROGRAM_LIST) {
    const record = next.records[program.id];
    if (record.status !== 'updating') continue;
    record.status = 'error';
    record.error = 'capture_interrupted';
  }
  return next;
}

export function getDisplayRecord(record: ProgramRecord): DisplayRecord {
  const source = record.manualOverride ?? record.automatic;
  return {
    balance: source.balance,
    memberNumber:
      record.manualOverride?.memberNumber ??
      record.automatic.memberNumber,
    expiration: normalizeExpirationForBalance(
      source.balance,
      source.expiration,
    ),
    updatedOn: record.manualOverride?.editedOn ?? record.automatic.updatedOn,
    source: record.manualOverride ? 'manual' : 'automatic',
    status: record.status,
    error: record.error,
  };
}
