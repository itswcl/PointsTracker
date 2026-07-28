import type { InspectionResult } from '../types.js';
import {
  DEFAULT_OBSERVATION_WINDOW_MS,
  LOGIN_WAIT_MS,
} from './capture-timing.js';

export function observationWindowFor(
  result: InspectionResult,
): number {
  return result.kind === 'login_required'
    ? LOGIN_WAIT_MS
    : DEFAULT_OBSERVATION_WINDOW_MS;
}

export function shouldFinishObservation(
  result: InspectionResult,
  final: boolean,
  hasSecondaryMemberPage: boolean,
): boolean {
  if (result.kind === 'member_number_found') {
    return final || hasSecondaryMemberPage;
  }
  if (result.kind !== 'success') return false;

  return (
    final ||
    result.capture.memberNumber !== null ||
    hasSecondaryMemberPage
  );
}
