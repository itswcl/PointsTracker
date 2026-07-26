import { isProgramId } from '../programs.js';
import type { PointsTrackerSettings, ProgramId } from '../types.js';

export const SETTINGS_STORAGE_KEY = 'pointsTrackerSettings';

export function createDefaultSettings(): PointsTrackerSettings {
  return {
    schemaVersion: 1,
    disabledProgramIds: [],
  };
}

export function normalizeSettings(value: unknown): PointsTrackerSettings {
  if (!value || typeof value !== 'object') return createDefaultSettings();
  const disabledProgramIds = Reflect.get(value, 'disabledProgramIds');
  if (!Array.isArray(disabledProgramIds)) return createDefaultSettings();

  return {
    schemaVersion: 1,
    disabledProgramIds: [
      ...new Set(disabledProgramIds.filter(isProgramId)),
    ],
  };
}

export function isProgramEnabled(
  settings: PointsTrackerSettings,
  programId: ProgramId,
): boolean {
  return !settings.disabledProgramIds.includes(programId);
}

export function setProgramEnabled(
  settings: PointsTrackerSettings,
  programId: ProgramId,
  enabled: boolean,
): PointsTrackerSettings {
  const disabledProgramIds = new Set(settings.disabledProgramIds);
  if (enabled) disabledProgramIds.delete(programId);
  else disabledProgramIds.add(programId);

  return {
    schemaVersion: 1,
    disabledProgramIds: [...disabledProgramIds],
  };
}
