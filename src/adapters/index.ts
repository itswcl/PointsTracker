import { isProgramId, PROGRAM_IDS } from '../programs.js';
import type {
  ProgramId,
  ProgramInspector,
  ProgramPreparer,
} from '../types.js';
import { inspectAirFrance } from './airfrance.js';
import { inspectAlaska } from './alaska.js';
import { inspectAmerican } from './american.js';
import { inspectAna } from './ana.js';
import { inspectBritishAirways } from './britishairways.js';
import { inspectCathay } from './cathay.js';
import { inspectDelta } from './delta.js';
import { inspectEvaAir } from './evaair.js';
import { inspectHyatt } from './hyatt.js';
import { inspectHilton } from './hilton.js';
import { inspectMarriott, prepareMarriott } from './marriott.js';
import { inspectUnited } from './united.js';
import { inspectVirginAtlantic } from './virginatlantic.js';
import { inspectionResult } from './shared.js';

const INSPECTORS = {
  [PROGRAM_IDS.UNITED]: inspectUnited,
  [PROGRAM_IDS.CATHAY]: inspectCathay,
  [PROGRAM_IDS.AIR_FRANCE]: inspectAirFrance,
  [PROGRAM_IDS.VIRGIN_ATLANTIC]: inspectVirginAtlantic,
  [PROGRAM_IDS.ALASKA]: inspectAlaska,
  [PROGRAM_IDS.AMERICAN]: inspectAmerican,
  [PROGRAM_IDS.EVA_AIR]: inspectEvaAir,
  [PROGRAM_IDS.BRITISH_AIRWAYS]: inspectBritishAirways,
  [PROGRAM_IDS.ANA]: inspectAna,
  [PROGRAM_IDS.DELTA]: inspectDelta,
  [PROGRAM_IDS.HYATT]: inspectHyatt,
  [PROGRAM_IDS.HILTON]: inspectHilton,
  [PROGRAM_IDS.MARRIOTT]: inspectMarriott,
} satisfies Record<ProgramId, ProgramInspector>;

const PREPARERS: Partial<Record<ProgramId, ProgramPreparer>> = {
  [PROGRAM_IDS.MARRIOTT]: prepareMarriott,
};

export function prepareProgramPage(programId: unknown, document: Document): boolean {
  return isProgramId(programId) ? PREPARERS[programId]?.(document) ?? false : false;
}

export function inspectProgramPage(
  programId: unknown,
  document: Document,
  rawUrl: string,
) {
  if (!isProgramId(programId)) {
    return inspectionResult({
      kind: 'not_found',
      authState: 'unknown',
      reason: 'unsupported_program',
    });
  }
  return INSPECTORS[programId](document, rawUrl);
}
