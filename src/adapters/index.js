import { PROGRAM_IDS } from '../programs.js';
import { inspectAirFrance } from './airfrance.js';
import { inspectAlaska } from './alaska.js';
import { inspectAmerican } from './american.js';
import { inspectAna } from './ana.js';
import { inspectBritishAirways } from './britishairways.js';
import { inspectCathay } from './cathay.js';
import { inspectEvaAir } from './evaair.js';
import { inspectHyatt } from './hyatt.js';
import { inspectHilton } from './hilton.js';
import { inspectMarriott, prepareMarriott } from './marriott.js';
import { inspectUnited } from './united.js';
import { inspectVirginAtlantic } from './virginatlantic.js';

const INSPECTORS = Object.freeze({
  [PROGRAM_IDS.UNITED]: inspectUnited,
  [PROGRAM_IDS.CATHAY]: inspectCathay,
  [PROGRAM_IDS.AIR_FRANCE]: inspectAirFrance,
  [PROGRAM_IDS.VIRGIN_ATLANTIC]: inspectVirginAtlantic,
  [PROGRAM_IDS.ALASKA]: inspectAlaska,
  [PROGRAM_IDS.AMERICAN]: inspectAmerican,
  [PROGRAM_IDS.EVA_AIR]: inspectEvaAir,
  [PROGRAM_IDS.BRITISH_AIRWAYS]: inspectBritishAirways,
  [PROGRAM_IDS.ANA]: inspectAna,
  [PROGRAM_IDS.HYATT]: inspectHyatt,
  [PROGRAM_IDS.HILTON]: inspectHilton,
  [PROGRAM_IDS.MARRIOTT]: inspectMarriott,
});

const PREPARERS = Object.freeze({
  [PROGRAM_IDS.MARRIOTT]: prepareMarriott,
});

export function prepareProgramPage(programId, document) {
  return PREPARERS[programId]?.(document) ?? false;
}

export function inspectProgramPage(programId, document, rawUrl) {
  const inspect = INSPECTORS[programId];
  if (!inspect) {
    return {
      kind: 'not_found',
      authState: 'unknown',
      capture: null,
      reason: 'unsupported_program',
    };
  }
  return inspect(document, rawUrl);
}
