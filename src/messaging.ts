import { isProgramId } from './programs.js';
import type { InspectionResult, ProgramId } from './types.js';
import { validateCapture } from './domain/records.js';

export const MESSAGE_TYPES = {
  PAGE_OBSERVED: 'points-tracker/page-observed',
  REFRESH_PROGRAM: 'points-tracker/refresh-program',
  REFRESH_ALL: 'points-tracker/refresh-all',
} as const;

export interface PageObservedMessage {
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
  | RefreshProgramMessage
  | RefreshAllMessage;

interface UnknownRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isInspectionResult(value: unknown): value is InspectionResult {
  if (!isRecord(value)) return false;
  if (!['authenticated', 'signed_out', 'unknown'].includes(String(value.authState))) {
    return false;
  }
  if (value.kind === 'success') {
    return validateCapture(value.capture) && value.reason === null;
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
  if (!isProgramId(message.programId)) return false;
  if (message.type === MESSAGE_TYPES.REFRESH_PROGRAM) return true;
  if (message.type !== MESSAGE_TYPES.PAGE_OBSERVED) return false;

  return (
    typeof message.pageUrl === 'string' &&
    typeof message.final === 'boolean' &&
    isInspectionResult(message.result)
  );
}
