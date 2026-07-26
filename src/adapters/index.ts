import { isProgramId, PROGRAM_IDS } from '../programs.js';
import type {
  ProgramId,
  ProgramInspector,
  ProgramPreparer,
} from '../types.js';
import { inspectAirFrance } from './airfrance.js';
import { inspectAlaska } from './alaska.js';
import { inspectAmex } from './amex.js';
import { inspectAmerican } from './american.js';
import { inspectAna } from './ana.js';
import { inspectBritishAirways } from './britishairways.js';
import { inspectBilt, prepareBilt } from './bilt.js';
import { inspectCapitalOne } from './capitalone.js';
import { inspectCathay } from './cathay.js';
import { inspectChase } from './chase.js';
import { inspectCiti } from './citi.js';
import { inspectDelta } from './delta.js';
import { inspectEvaAir } from './evaair.js';
import { inspectHyatt } from './hyatt.js';
import { inspectHilton } from './hilton.js';
import { inspectIhg } from './ihg.js';
import { inspectMarriott, prepareMarriott } from './marriott.js';
import { inspectSouthwest } from './southwest.js';
import {
  inspectSouthwestCredit,
  prepareSouthwestCredit,
} from './southwestcredit.js';
import { inspectUnited } from './united.js';
import { inspectUnitedPool } from './unitedpool.js';
import { inspectUnitedTravelBank } from './unitedtravelbank.js';
import { inspectVirginAtlantic } from './virginatlantic.js';
import { inspectWyndham } from './wyndham.js';
import { inspectionResult } from './shared.js';

const INSPECTORS = {
  [PROGRAM_IDS.UNITED]: inspectUnited,
  [PROGRAM_IDS.UNITED_POOL]: inspectUnitedPool,
  [PROGRAM_IDS.UNITED_TRAVELBANK]: inspectUnitedTravelBank,
  [PROGRAM_IDS.CATHAY]: inspectCathay,
  [PROGRAM_IDS.AIR_FRANCE]: inspectAirFrance,
  [PROGRAM_IDS.VIRGIN_ATLANTIC]: inspectVirginAtlantic,
  [PROGRAM_IDS.ALASKA]: inspectAlaska,
  [PROGRAM_IDS.AMERICAN]: inspectAmerican,
  [PROGRAM_IDS.EVA_AIR]: inspectEvaAir,
  [PROGRAM_IDS.BRITISH_AIRWAYS]: inspectBritishAirways,
  [PROGRAM_IDS.ANA]: inspectAna,
  [PROGRAM_IDS.DELTA]: inspectDelta,
  [PROGRAM_IDS.SOUTHWEST]: inspectSouthwest,
  [PROGRAM_IDS.SOUTHWEST_CREDIT]: inspectSouthwestCredit,
  [PROGRAM_IDS.HYATT]: inspectHyatt,
  [PROGRAM_IDS.HILTON]: inspectHilton,
  [PROGRAM_IDS.MARRIOTT]: inspectMarriott,
  [PROGRAM_IDS.IHG]: inspectIhg,
  [PROGRAM_IDS.WYNDHAM]: inspectWyndham,
  [PROGRAM_IDS.AMEX]: inspectAmex,
  [PROGRAM_IDS.CAPITAL_ONE]: inspectCapitalOne,
  [PROGRAM_IDS.CHASE]: inspectChase,
  [PROGRAM_IDS.CITI]: inspectCiti,
  [PROGRAM_IDS.BILT]: inspectBilt,
} satisfies Record<ProgramId, ProgramInspector>;

const PREPARERS: Partial<Record<ProgramId, ProgramPreparer>> = {
  [PROGRAM_IDS.MARRIOTT]: prepareMarriott,
  [PROGRAM_IDS.BILT]: prepareBilt,
  [PROGRAM_IDS.SOUTHWEST_CREDIT]: prepareSouthwestCredit,
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
