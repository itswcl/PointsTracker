export const PROGRAM_IDS = {
  UNITED: 'united',
  UNITED_POOL: 'unitedpool',
  UNITED_TRAVELBANK: 'unitedtravelbank',
  CATHAY: 'cathay',
  AIR_FRANCE: 'airfrance',
  VIRGIN_ATLANTIC: 'virginatlantic',
  ALASKA: 'alaska',
  AMERICAN: 'american',
  EVA_AIR: 'evaair',
  BRITISH_AIRWAYS: 'britishairways',
  ANA: 'ana',
  KRISFLYER: 'krisflyer',
  DELTA: 'delta',
  SOUTHWEST: 'southwest',
  SOUTHWEST_CREDIT: 'southwestcredit',
  HYATT: 'hyatt',
  HILTON: 'hilton',
  MARRIOTT: 'marriott',
  IHG: 'ihg',
  WYNDHAM: 'wyndham',
  CHOICE: 'choice',
  LHW: 'lhw',
  AMEX: 'amex',
  CAPITAL_ONE: 'capitalone',
  CHASE: 'chase',
  CITI: 'citi',
  BILT: 'bilt',
} as const;

export type ProgramId = (typeof PROGRAM_IDS)[keyof typeof PROGRAM_IDS];

export const PROGRAM_CATEGORIES = {
  AIRLINE: 'airline',
  HOTEL: 'hotel',
  CREDIT_CARD: 'credit_card',
} as const;

export type ProgramCategory =
  (typeof PROGRAM_CATEGORIES)[keyof typeof PROGRAM_CATEGORIES];

export type DateKey = `${number}-${number}-${number}`;
export type MonthKey = `${number}-${number}`;

export const EXPIRATION_TYPES = [
  'never',
  'fixed_date',
  'activity_based',
  'unknown',
] as const;

export type ExpirationType = (typeof EXPIRATION_TYPES)[number];

export interface Expiration {
  readonly type: ExpirationType;
  readonly date?: DateKey | null;
  readonly month?: MonthKey | null;
  readonly amount?: number | null;
  readonly inactivityMonths?: number | null;
  readonly note?: string | null;
}

export interface NormalizedExpiration {
  type: ExpirationType;
  date: DateKey | null;
  month: MonthKey | null;
  amount: number | null;
  inactivityMonths: number | null;
  note: string | null;
}

export interface ProgramDefinition {
  readonly id: ProgramId;
  readonly category: ProgramCategory;
  readonly name: string;
  readonly displayName: string;
  readonly currencyName: string;
  readonly balanceFormat?: 'whole_number' | 'usd_cents';
  readonly captureGroup?: string;
  readonly includeInBalanceSort?: boolean;
  readonly includeInCategoryTotal?: boolean;
  readonly accountUrl: string;
  readonly loginUrl: string;
  readonly memberNumberUrl?: string;
  readonly hosts: readonly string[];
  readonly defaultExpiration: Expiration;
  readonly visibleFields?: {
    readonly memberNumber?: boolean;
    readonly expiration?: boolean;
  };
}

export interface AutomaticCapture {
  readonly balance: number;
  readonly memberNumber: string | null;
  readonly expiration: Expiration;
}

export interface ProgramCapture {
  readonly programId: ProgramId;
  readonly capture: AutomaticCapture;
}

export interface AutomaticRecord {
  balance: number | null;
  memberNumber: string | null;
  expiration: NormalizedExpiration;
  updatedOn: DateKey | null;
}

export interface ManualOverride {
  balance: number;
  memberNumber: string | null;
  expiration: NormalizedExpiration;
  editedOn: DateKey;
}

export interface ManualOverrideInput {
  readonly balance: number;
  readonly memberNumber: string | null;
  readonly expiration: Expiration;
}

export type RecordStatus = 'not_updated' | 'fresh' | 'updating' | 'error';

export type CaptureError =
  | 'balance_not_found'
  | 'capture_interrupted'
  | 'capture_tab_closed'
  | 'capture_timeout'
  | 'expiration_not_found'
  | 'login_required'
  | 'tab_open_failed'
  | 'unexpected_error'
  | 'unsupported_program'
  | 'verification_required';

export interface ProgramRecord {
  programId: ProgramId;
  automatic: AutomaticRecord;
  manualOverride: ManualOverride | null;
  status: RecordStatus;
  error: string | null;
}

export interface PointsState {
  schemaVersion: 1;
  records: Record<ProgramId, ProgramRecord>;
}

export interface PointsTrackerSettings {
  schemaVersion: 1;
  disabledProgramIds: ProgramId[];
}

export interface DisplayRecord {
  balance: number | null;
  memberNumber: string | null;
  expiration: NormalizedExpiration;
  updatedOn: DateKey | null;
  source: 'manual' | 'automatic';
  status: RecordStatus;
  error: string | null;
}

export type AuthState = 'authenticated' | 'signed_out' | 'unknown';
export type InspectionFailureKind =
  | 'login_required'
  | 'not_found'
  | 'verification_required';

export interface InspectionSuccess {
  kind: 'success';
  authState: AuthState;
  capture: AutomaticCapture;
  reason: null;
}

export interface InspectionMemberNumber {
  kind: 'member_number_found';
  authState: 'authenticated';
  capture: {
    memberNumber: string;
  };
  reason: null;
}

export interface InspectionFailure {
  kind: InspectionFailureKind;
  authState: AuthState;
  capture: null;
  reason: CaptureError | null;
}

export type InspectionResult =
  | InspectionSuccess
  | InspectionMemberNumber
  | InspectionFailure;
export type ProgramInspector = (
  document: Document,
  rawUrl: string,
) => InspectionResult;
export type ProgramPreparer = (document: Document) => boolean;

export interface StorageAreaLike {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface CaptureSession {
  lastTriggered: Partial<Record<ProgramId, number>>;
}
