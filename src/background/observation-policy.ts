import type { InspectionResult } from '../types.js';

export function shouldFinishObservation(
  result: InspectionResult,
  final: boolean,
  hasSecondaryMemberPage: boolean,
): boolean {
  if (result.kind === 'member_number_found') return true;
  if (result.kind !== 'success') return false;

  return (
    final ||
    result.capture.memberNumber !== null ||
    hasSecondaryMemberPage
  );
}
