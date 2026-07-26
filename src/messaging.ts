import { isProgramId } from './programs.js';
import type { InspectionResult, ProgramId } from './types.js';
import { validateCapture } from './domain/records.js';
import { isValidMemberNumber } from './domain/member-numbers.js';

export const MESSAGE_TYPES = {
  PAGE_OBSERVED: 'points-tracker/page-observed',
  REFRESH_PROGRAM: 'points-tracker/refresh-program',
  REFRESH_ALL: 'points-tracker/refresh-all',
} as const;

export interface PageObservation {
  programId: ProgramId;
  result: InspectionResult;
}

export interface PageObservedMessage {
  type: typeof MESSAGE_TYPES.PAGE_OBSERVED;
  pageUrl: string;
  observations: readonly PageObservation[];
  final: boolean;
}

export interface LegacyPageObservedMessage {
  type: typeof MESSAGE_TYPES.PAGE_OBSERVED;
  programId: ProgramId;
  pageUrl: string;
  result: InspectionResult;
  final: boolean;
}

export interface RefreshProgramMessage {
  type: typeof MESSAGE_TYPES.REFRESH_PROGRAM;
  programId: ProgramId;
}

export interface RefreshAllMessage {
  type: typeof MESSAGE_TYPES.REFRESH_ALL;
}

export type PointsTrackerMessage =
  | PageObservedMessage
  | LegacyPageObservedMessage
  | RefreshProgramMessage
  | RefreshAllMessage;

interface UnknownRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isInspectionResult(
  value: unknown,
  programId: ProgramId,
): value is InspectionResult {
  if (!isRecord(value)) return false;
  if (!['authenticated', 'signed_out', 'unknown'].includes(String(value.authState))) {
    return false;
  }
  if (value.kind === 'success') {
    return (
      validateCapture(value.capture, programId) &&
      value.reason === null
    );
  }
  if (value.kind === 'member_number_found') {
    return (
      value.authState === 'authenticated' &&
      isRecord(value.capture) &&
      Object.keys(value.capture).length === 1 &&
      isValidMemberNumber(value.capture.memberNumber) &&
      value.reason === null
    );
  }
  return (
    ['login_required', 'not_found', 'verification_required'].includes(
      String(value.kind),
    ) &&
    value.capture === null &&
    (value.reason === null || typeof value.reason === 'string')
  );
}

export function isPointsTrackerMessage(
  message: unknown,
): message is PointsTrackerMessage {
  if (!isRecord(message) || typeof message.type !== 'string') return false;

  if (message.type === MESSAGE_TYPES.REFRESH_ALL) return true;
  if (message.type === MESSAGE_TYPES.REFRESH_PROGRAM) {
    return isProgramId(message.programId);
  }
  if (message.type !== MESSAGE_TYPES.PAGE_OBSERVED) return false;

  if (
    typeof message.pageUrl !== 'string' ||
    typeof message.final !== 'boolean'
  ) {
    return false;
  }

  if (Array.isArray(message.observations)) {
    if (message.observations.length === 0) return false;
    const programIds = new Set<ProgramId>();
    for (const observation of message.observations) {
      if (
        !isRecord(observation) ||
        !isProgramId(observation.programId) ||
        !isInspectionResult(observation.result, observation.programId) ||
        programIds.has(observation.programId)
      ) {
        return false;
      }
      programIds.add(observation.programId);
    }
    return true;
  }

  return (
    isProgramId(message.programId) &&
    isInspectionResult(message.result, message.programId)
  );
}

export function observationsFromMessage(
  message: PageObservedMessage | LegacyPageObservedMessage,
): readonly PageObservation[] {
  return 'observations' in message
    ? message.observations
    : [{ programId: message.programId, result: message.result }];
}
