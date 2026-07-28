import {
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  formatBalance,
  formatUsdCents,
  formatUsdCentsInput,
  parseBalance,
  parseSignedBalance,
  parseUsdCents,
} from '../../src/domain/balances.js';
import {
  formatDateKey,
  formatMonthKey,
  isValidDateKey,
} from '../../src/domain/dates.js';
import {
  EXPIRATION_TYPES,
  getDisplayRecord,
  isExpirationType,
} from '../../src/domain/records.js';
import { isProgramEnabled } from '../../src/domain/settings.js';
import { normalizeMemberNumber } from '../../src/domain/member-numbers.js';
import { MESSAGE_TYPES } from '../../src/messaging.js';
import {
  PROGRAM_CATEGORIES,
  PROGRAM_LIST,
  programAllowsSignedBalance,
  programIncludedInBalanceSort,
  programIncludedInCategoryTotal,
  programShowsExpiration,
  programShowsMemberNumber,
  programUsesUsdCents,
} from '../../src/programs.js';
import { parseBackup, serializeBackup } from '../../src/storage/backup.js';
import type {
  ExpirationType,
  ManualOverrideInput,
  NormalizedExpiration,
  PointsState,
  PointsTrackerSettings,
  ProgramCategory,
  ProgramDefinition,
  ProgramId,
  ProgramRecord,
} from '../../src/types.js';
import { LATEST_RELEASE_URL } from '../../src/update-check.js';
import { usePointsState } from './use-points-state.js';
import { usePointsSettings } from './use-points-settings.js';
import { useUpdateCheck } from './use-update-check.js';

const ERROR_LABELS: Readonly<Record<string, string>> = Object.freeze({
  balance_not_found: 'Balance not found on the account page.',
  capture_interrupted: 'The previous refresh was interrupted. Try again.',
  capture_tab_closed: 'The update tab was closed before capture finished.',
  capture_timeout: 'The account page took too long to respond.',
  expiration_not_found: 'Expiration details did not load on the account page.',
  login_required: 'Sign in is required to update this balance.',
  tab_open_failed: 'The account page could not be opened.',
  verification_required: 'Verification is required in the account tab.',
});

function expirationLabel(expiration: NormalizedExpiration): string {
  let dateLabel = 'Unknown';
  if (expiration.date) dateLabel = formatDateKey(expiration.date);
  else if (expiration.month) dateLabel = formatMonthKey(expiration.month);
  else if (expiration.type === 'never') dateLabel = 'N/A';
  else if (expiration.inactivityMonths) {
    dateLabel = `${expiration.inactivityMonths} mo inactivity`;
  }

  return expiration.amount !== null && expiration.amount !== undefined
    ? `${formatBalance(expiration.amount)} · ${dateLabel}`
    : dateLabel;
}

interface LedgerGroup {
  id: ProgramCategory;
  label: string;
}

type SortMode = 'balance' | 'expiration';
type SortModes = Record<ProgramCategory, SortMode | null>;

const PROGRAM_GROUPS: readonly LedgerGroup[] = Object.freeze([
  { id: PROGRAM_CATEGORIES.CREDIT_CARD, label: 'Credit Card' },
  { id: PROGRAM_CATEGORIES.AIRLINE, label: 'Airline' },
  { id: PROGRAM_CATEGORIES.HOTEL, label: 'Hotel' },
]);

function stableSortPrograms<T extends number | string>(
  programs: readonly ProgramDefinition[],
  getSortKey: (program: ProgramDefinition) => T | null,
  compare: (left: T, right: T) => number,
): ProgramDefinition[] {
  return programs
    .map((program, index) => ({
      program,
      index,
      sortKey: getSortKey(program),
    }))
    .sort((left, right) => {
      if (left.sortKey === null && right.sortKey === null) {
        return left.index - right.index;
      }
      if (left.sortKey === null) return 1;
      if (right.sortKey === null) return -1;
      const comparison = compare(left.sortKey, right.sortKey);
      return comparison || left.index - right.index;
    })
    .map(({ program }) => program);
}

function sortedPrograms(
  programs: readonly ProgramDefinition[],
  state: PointsState,
  sortMode: SortMode,
): ProgramDefinition[] {
  if (sortMode === 'balance') {
    return stableSortPrograms(
      programs,
      (program) =>
        programIncludedInBalanceSort(program)
          ? getDisplayRecord(state.records[program.id]).balance
          : null,
      (left, right) => right - left,
    );
  }

  return stableSortPrograms(
    programs,
    (program) => {
      const expiration = getDisplayRecord(state.records[program.id]).expiration;
      if (expiration.date) return expiration.date;
      return expiration.month ? `${expiration.month}-31` : null;
    },
    (left, right) => left.localeCompare(right),
  );
}

function totalBalanceForPrograms(
  programs: readonly ProgramDefinition[],
  state: PointsState,
): number {
  return programs.reduce((total, program) => {
    if (!programIncludedInCategoryTotal(program)) return total;
    const balance = getDisplayRecord(state.records[program.id]).balance;
    return typeof balance === 'number' ? total + balance : total;
  }, 0);
}

function formatProgramBalance(
  program: ProgramDefinition,
  balance: number | null,
): string {
  return programUsesUsdCents(program)
    ? formatUsdCents(balance)
    : formatBalance(balance, programAllowsSignedBalance(program));
}

function cashProgramsLast(
  programs: readonly ProgramDefinition[],
): ProgramDefinition[] {
  return [
    ...programs.filter((program) => !programUsesUsdCents(program)),
    ...programs.filter(programUsesUsdCents),
  ];
}

function memberNumberSuffix(memberNumber: string | null): string {
  if (!memberNumber) return '—';
  const compactNumber = memberNumber.replace(/[^A-Za-z0-9]/g, '');
  return compactNumber.slice(-4) || '—';
}

function programDisplayName(programId: ProgramId): string {
  return (
    PROGRAM_LIST.find((program) => program.id === programId)?.displayName ??
    'Program'
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11a8 8 0 0 0-14.9-4M4 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14.9 4M20 20v-5h-5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14.5 5.5 4 4M6 18l2.2-5.2L16.5 4.5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2l-8.3 8.3L6 18Z" />
      <path d="m8.2 12.8 3 3" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

function UpdateIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11a8 8 0 0 0-14.9-4M4 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14.9 4M20 20v-5h-5" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15V3M8 7l4-4 4 4" />
      <path d="M5 11v8h14v-8" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12M8 11l4 4 4-4" />
      <path d="M5 11v8h14v-8" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

interface ActionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  children: ReactNode;
}

function ActionButton({ label, children, ...buttonProps }: ActionButtonProps) {
  return (
    <button
      className="action-button"
      type="button"
      aria-label={label}
      title={label}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

type ProgramAction = (programId: ProgramId) => void | Promise<void>;
type MemberNumberCopyAction = (memberNumber: string) => Promise<boolean>;

interface ProgramRowProps {
  program: ProgramDefinition;
  record: ProgramRecord;
  onCopyMemberNumber: MemberNumberCopyAction;
  onEdit: ProgramAction;
  onRefresh: ProgramAction;
}

function ProgramRow({
  program,
  record,
  onCopyMemberNumber,
  onEdit,
  onRefresh,
}: ProgramRowProps) {
  const display = getDisplayRecord(record);
  const memberNumber = display.memberNumber;
  const [memberNumberCopied, setMemberNumberCopied] = useState(false);
  const showsMemberNumber = programShowsMemberNumber(program);
  const showsExpiration = programShowsExpiration(program);
  const isBalanceOnly = !showsMemberNumber && !showsExpiration;
  const usesUsdCents = programUsesUsdCents(program);
  const errorText = display.error
    ? ERROR_LABELS[display.error] ?? 'The latest update did not finish.'
    : null;

  async function handleCopyMemberNumber(): Promise<void> {
    if (!memberNumber) return;
    setMemberNumberCopied(await onCopyMemberNumber(memberNumber));
  }

  return (
    <article
      className={`program-row${isBalanceOnly ? ' program-row--balance-only' : ''}${usesUsdCents ? ' program-row--usd' : ''}`}
      aria-labelledby={`${program.id}-name`}
    >
      <h2
        className="program-name"
        id={`${program.id}-name`}
        title={program.name}
        aria-label={program.name}
      >
        {program.displayName}
      </h2>
      <strong className="program-balance">
        {formatProgramBalance(program, display.balance)}
      </strong>
      {showsMemberNumber ? (
        memberNumber ? (
          <button
            className="program-member-suffix program-member-suffix--copy"
            type="button"
            aria-label={
              memberNumberCopied
                ? `Copied ${program.name} member number`
                : `Copy ${program.name} member number`
            }
            title=""
            data-tooltip={
              memberNumberCopied ? 'Copied' : 'Copy member#'
            }
            onClick={() => void handleCopyMemberNumber()}
            onMouseLeave={() => setMemberNumberCopied(false)}
            onBlur={() => setMemberNumberCopied(false)}
          >
            {memberNumberSuffix(memberNumber)}
          </button>
        ) : (
          <span
            className="program-member-suffix"
            aria-label={`${program.name} member number not captured`}
          >
            —
          </span>
        )
      ) : null}
      {showsExpiration ? (
        <dl className="record-facts">
          <div>
            <dt className="visually-hidden">Expiration</dt>
            <dd>{expirationLabel(display.expiration)}</dd>
          </div>
        </dl>
      ) : null}
      <div className="program-actions">
        <ActionButton
          label={`Refresh ${program.name}`}
          title=""
          data-tooltip="Refresh"
          onClick={() => onRefresh(program.id)}
          disabled={display.status === 'updating'}
        >
          <RefreshIcon />
        </ActionButton>
        <ActionButton
          label={`Edit ${program.name}`}
          title=""
          data-tooltip="Edit"
          onClick={() => onEdit(program.id)}
        >
          <EditIcon />
        </ActionButton>
      </div>

      {errorText ? <p className="error-note">{errorText}</p> : null}
    </article>
  );
}

interface LedgerHeaderProps {
  groupLabel: string;
  showsExpiration: boolean;
  showsMemberNumber: boolean;
  sortMode: SortMode | null;
  onChangeSort: (mode: SortMode) => void;
}

function LedgerHeader({
  groupLabel,
  showsExpiration,
  showsMemberNumber,
  sortMode,
  onChangeSort,
}: LedgerHeaderProps) {
  const isBalanceOnly = !showsMemberNumber && !showsExpiration;
  return (
    <div
      className={`ledger-header${isBalanceOnly ? ' ledger-header--balance-only' : ''}`}
    >
      <span aria-hidden="true" />
      <button
        className="ledger-sort-button"
        type="button"
        aria-label={
          sortMode === 'balance'
            ? `Restore original ${groupLabel} order`
            : `Sort ${groupLabel} by balance, highest first`
        }
        aria-pressed={sortMode === 'balance'}
        onClick={() => onChangeSort('balance')}
      >
        Balance
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="m2 3.5 3 3 3-3" />
        </svg>
      </button>
      {showsMemberNumber ? <span aria-hidden="true" /> : null}
      {showsExpiration ? (
        <button
          className="ledger-sort-button"
          type="button"
          aria-label={
            sortMode === 'expiration'
              ? `Restore original ${groupLabel} order`
              : `Sort ${groupLabel} by expiration, earliest first`
          }
          aria-pressed={sortMode === 'expiration'}
          onClick={() => onChangeSort('expiration')}
        >
          Expiration
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <path d="m2 6.5 3-3 3 3" />
          </svg>
        </button>
      ) : null}
      <span aria-hidden="true" />
    </div>
  );
}

interface LedgerSectionProps {
  group: LedgerGroup;
  programs: readonly ProgramDefinition[];
  sortMode: SortMode | null;
  state: PointsState;
  onChangeSort: (mode: SortMode) => void;
  onCopyMemberNumber: MemberNumberCopyAction;
  onEdit: ProgramAction;
  onRefresh: ProgramAction;
}

function LedgerSection({
  group,
  programs,
  sortMode,
  state,
  onChangeSort,
  onCopyMemberNumber,
  onEdit,
  onRefresh,
}: LedgerSectionProps) {
  const showsMemberNumber = programs.some(programShowsMemberNumber);
  const showsExpiration = programs.some(programShowsExpiration);
  const displayedPrograms = sortMode
    ? sortedPrograms(programs, state, sortMode)
    : programs;
  const totalBalance = totalBalanceForPrograms(programs, state);

  return (
    <section
      className={`ledger-section ledger-section--${group.id}`}
      aria-labelledby={`${group.id}-section-title`}
      data-ledger-section={group.id}
    >
      <div className="ledger-section-heading">
        <h2 id={`${group.id}-section-title`}>{group.label}</h2>
      </div>
      <LedgerHeader
        groupLabel={group.label}
        showsExpiration={showsExpiration}
        showsMemberNumber={showsMemberNumber}
        sortMode={sortMode}
        onChangeSort={onChangeSort}
      />
      {displayedPrograms.map((program) => (
        <ProgramRow
          key={program.id}
          program={program}
          record={state.records[program.id]}
          onCopyMemberNumber={onCopyMemberNumber}
          onEdit={onEdit}
          onRefresh={onRefresh}
        />
      ))}
      <div className="ledger-total-row" aria-label={`${group.label} total balance`}>
        <strong className="ledger-total-label">Total</strong>
        <output className="ledger-total-balance">
          {formatBalance(
            totalBalance,
            group.id === PROGRAM_CATEGORIES.CREDIT_CARD,
          )}
        </output>
      </div>
    </section>
  );
}

interface EditPanelProps {
  program: ProgramDefinition;
  record: ProgramRecord;
  onCancel: () => void;
  onSave: (
    programId: ProgramId,
    override: ManualOverrideInput,
  ) => void | Promise<void>;
}

function EditPanel({
  program,
  record,
  onCancel,
  onSave,
}: EditPanelProps) {
  const display = getDisplayRecord(record);
  const showsMemberNumber = programShowsMemberNumber(program);
  const showsExpiration = programShowsExpiration(program);
  const [balanceText, setBalanceText] = useState(
    programUsesUsdCents(program)
      ? formatUsdCentsInput(display.balance)
      : display.balance === null
        ? ''
        : String(display.balance),
  );
  const [memberNumberText, setMemberNumberText] = useState(
    display.memberNumber ?? '',
  );
  const [expirationType, setExpirationType] = useState<ExpirationType>(
    display.expiration.type,
  );
  const [expirationDate, setExpirationDate] = useState(display.expiration.date ?? '');
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const balance = programUsesUsdCents(program)
      ? parseUsdCents(balanceText)
      : programAllowsSignedBalance(program)
        ? parseSignedBalance(balanceText)
        : parseBalance(balanceText);
    if (balance === null) {
      setFormError(
        programUsesUsdCents(program)
          ? 'Enter a dollar balance of zero or more, with up to two decimal places.'
          : programAllowsSignedBalance(program)
          ? 'Enter a whole-number balance.'
          : 'Enter a whole-number balance of zero or more.',
      );
      return;
    }
    const memberNumber =
      showsMemberNumber && memberNumberText.trim()
        ? normalizeMemberNumber(memberNumberText)
        : null;
    if (
      showsMemberNumber &&
      memberNumberText.trim() &&
      memberNumber === null
    ) {
      setFormError(
        'Enter a member number using letters, numbers, spaces, hyphens, or *.',
      );
      return;
    }
    const validExpirationDate = isValidDateKey(expirationDate)
      ? expirationDate
      : null;
    if (
      showsExpiration &&
      expirationType === 'fixed_date' &&
      !validExpirationDate
    ) {
      setFormError('Choose an expiration date.');
      return;
    }

    void onSave(program.id, {
      balance,
      memberNumber,
      expiration: showsExpiration
        ? {
            type: expirationType,
            date:
              expirationType === 'never' || expirationType === 'unknown'
                ? null
                : validExpirationDate,
            note: expirationType === 'never' ? 'No expiration' : null,
          }
        : program.defaultExpiration,
    });
  }

  return (
    <div className="sheet-backdrop" role="presentation">
      <section className="edit-sheet" role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <div className="sheet-heading">
          <div>
            <p className="eyebrow">Manual override</p>
            <h2 id="edit-title">{program.name}</h2>
          </div>
          <button className="sheet-close-button" type="button" onClick={onCancel} aria-label="Close editor">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            {programUsesUsdCents(program) ? 'Balance (USD)' : 'Balance'}
            <input
              autoFocus
              inputMode={
                programUsesUsdCents(program) ? 'decimal' : 'numeric'
              }
              value={balanceText}
              onChange={(event) => setBalanceText(event.target.value)}
              placeholder={programUsesUsdCents(program) ? '0.00' : '0'}
            />
          </label>

          {showsMemberNumber ? (
            <label>
              Member number
              <input
                autoComplete="off"
                value={memberNumberText}
                onChange={(event) => setMemberNumberText(event.target.value)}
                placeholder="Optional"
                maxLength={32}
              />
            </label>
          ) : null}

          {showsExpiration ? (
            <>
              <label>
                Expiration type
                <select
                  value={expirationType}
                  onChange={(event) => {
                    if (isExpirationType(event.target.value)) {
                      setExpirationType(event.target.value);
                    }
                  }}
                >
                  {EXPIRATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type === 'never'
                        ? 'N/A (does not expire)'
                        : type === 'fixed_date'
                          ? 'Fixed date'
                          : type === 'activity_based'
                            ? 'Activity based'
                            : 'Unknown'}
                    </option>
                  ))}
                </select>
              </label>

              {expirationType === 'fixed_date' ||
              expirationType === 'activity_based' ? (
                <label>
                  Expiration date
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(event) => setExpirationDate(event.target.value)}
                    required={expirationType === 'fixed_date'}
                  />
                </label>
              ) : null}
            </>
          ) : null}

          {formError ? <p className="form-error">{formError}</p> : null}

          <div className="sheet-actions">
            <button className="secondary-button" type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="primary-button" type="submit">
              Save override
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

interface RefreshConfirmationProps {
  program: ProgramDefinition;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

function RefreshConfirmation({
  program,
  onCancel,
  onConfirm,
}: RefreshConfirmationProps) {
  return (
    <div className="sheet-backdrop" role="presentation">
      <section
        className="edit-sheet confirmation-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="refresh-confirmation-title"
      >
        <div className="sheet-heading">
          <div>
            <p className="eyebrow">Manual value</p>
            <h2 id="refresh-confirmation-title">Replace {program.displayName}?</h2>
          </div>
          <button
            className="sheet-close-button"
            type="button"
            onClick={onCancel}
            aria-label="Close replacement confirmation"
          >
            ×
          </button>
        </div>
        <p className="confirmation-copy">
          Refresh will replace the manually entered value only after a new
          automatic update succeeds.
        </p>
        <div className="sheet-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Keep manual value
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => void onConfirm()}
          >
            Replace and refresh
          </button>
        </div>
      </section>
    </div>
  );
}

interface SettingsViewProps {
  settings: PointsTrackerSettings;
  onChange: (programId: ProgramId, enabled: boolean) => void | Promise<void>;
  onBack: () => void;
}

function SettingsView({
  settings,
  onChange,
  onBack,
}: SettingsViewProps) {
  return (
    <section
      className="settings-view"
      aria-labelledby="settings-title"
      aria-describedby="settings-description"
    >
      <header className="settings-view-header">
        <button
          className="settings-back-button"
          type="button"
          onClick={onBack}
          aria-label="Back to ledger"
          data-tooltip="Back"
        >
          <BackIcon />
        </button>
        <div>
          <p className="eyebrow">Ledger display</p>
          <h1 id="settings-title">Settings</h1>
          <p id="settings-description">
            Choose which programs appear. Changes save automatically.
          </p>
        </div>
      </header>

      <div className="settings-columns">
        {PROGRAM_GROUPS.map((group) => (
          <section
            className={`settings-category settings-category--${group.id}`}
            key={group.id}
            aria-labelledby={`${group.id}-settings-title`}
          >
            <div className="settings-category-heading">
              <h2 id={`${group.id}-settings-title`}>{group.label}</h2>
              <span aria-hidden="true">Show</span>
            </div>
            <div className="settings-programs">
              {cashProgramsLast(
                PROGRAM_LIST.filter(
                  (program) => program.category === group.id,
                ),
              ).map((program) => {
                const enabled = isProgramEnabled(settings, program.id);
                return (
                  <button
                    className="settings-program"
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Show ${program.name}`}
                    key={program.id}
                    onClick={() => void onChange(program.id, !enabled)}
                  >
                    <span className="settings-program-name">
                      {program.displayName}
                    </span>
                    <span className="settings-program-state" aria-hidden="true">
                      {enabled ? 'Shown' : 'Hidden'}
                    </span>
                    <span className="settings-toggle" aria-hidden="true">
                      <span />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

interface SettingsPageProps extends SettingsViewProps {
  notice: string | null;
}

function SettingsPage({
  notice,
  ...settingsViewProps
}: SettingsPageProps) {
  return (
    <main className="app-shell app-shell--settings">
      <SettingsView {...settingsViewProps} />
      {notice ? (
        <p className="notice settings-notice" role="status">
          {notice}
        </p>
      ) : null}
    </main>
  );
}

export function App() {
  const {
    loadError,
    replaceState,
    saveManualOverride,
    state,
  } = usePointsState();
  const {
    changeProgramEnabled,
    settings,
    settingsError,
  } = usePointsSettings();
  const [editingProgramId, setEditingProgramId] = useState<ProgramId | null>(null);
  const [refreshConfirmationProgramId, setRefreshConfirmationProgramId] =
    useState<ProgramId | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sortModes, setSortModes] = useState<SortModes>({
    [PROGRAM_CATEGORIES.AIRLINE]: null,
    [PROGRAM_CATEGORIES.HOTEL]: null,
    [PROGRAM_CATEGORIES.CREDIT_CARD]: null,
  });
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const extensionVersion = chrome.runtime.getManifest().version;
  const availableUpdateVersion = useUpdateCheck(extensionVersion);

  async function refreshProgram(
    programId: ProgramId,
    replaceManualOverride = false,
  ): Promise<void> {
    setNotice(null);
    try {
      const result: unknown = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.REFRESH_PROGRAM,
        programId,
        ...(replaceManualOverride ? { replaceManualOverride: true } : {}),
      });
      if (
        result === null ||
        typeof result !== 'object' ||
        Reflect.get(result, 'ok') !== true
      ) {
        setNotice('The account page could not be opened.');
      } else if (Reflect.get(result, 'skipped') === 'manual_override') {
        setNotice('Manual value kept.');
      }
    } catch {
      setNotice('The extension background service is unavailable.');
    }
  }

  function requestRefresh(programId: ProgramId): void {
    setNotice(null);
    if (state?.records[programId].manualOverride) {
      setRefreshConfirmationProgramId(programId);
      return;
    }
    void refreshProgram(programId);
  }

  async function saveOverride(
    programId: ProgramId,
    override: ManualOverrideInput,
  ): Promise<void> {
    try {
      await saveManualOverride(programId, override);
      setEditingProgramId(null);
      setNotice('Manual value saved locally.');
    } catch {
      setNotice('The manual value could not be saved.');
    }
  }

  async function copyMemberNumber(memberNumber: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(memberNumber);
      return true;
    } catch {
      setNotice('The member number could not be copied.');
      return false;
    }
  }

  async function changeProgramVisibility(
    programId: ProgramId,
    enabled: boolean,
  ): Promise<void> {
    try {
      await changeProgramEnabled(programId, enabled);
      setNotice(
        enabled
          ? `${programDisplayName(programId)} enabled.`
          : `${programDisplayName(programId)} disabled.`,
      );
    } catch {
      setNotice('The setting could not be saved.');
    }
  }

  function changeGroupSort(
    groupId: ProgramCategory,
    requestedMode: SortMode,
  ): void {
    setSortModes((current) => ({
      ...current,
      [groupId]: current[groupId] === requestedMode ? null : requestedMode,
    }));
  }

  function exportBackup(): void {
    if (!state) return;
    const blob = new Blob([serializeBackup(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `points-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setNotice('Backup exported.');
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const imported = parseBackup(await file.text());
      await replaceState(imported);
      setNotice('Backup imported.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Backup import failed.');
    }
  }

  if (loadError || settingsError) {
    return <main className="fatal-state">{loadError ?? settingsError}</main>;
  }

  if (!state || !settings) {
    return <main className="loading-state">Opening local ledger…</main>;
  }

  if (settingsOpen) {
    return (
      <SettingsPage
        settings={settings}
        notice={notice}
        onChange={changeProgramVisibility}
        onBack={() => {
          setNotice(null);
          setSettingsOpen(false);
        }}
      />
    );
  }

  const editingProgram = PROGRAM_LIST.find(
    (program) => program.id === editingProgramId,
  );
  const refreshConfirmationProgram = PROGRAM_LIST.find(
    (program) => program.id === refreshConfirmationProgramId,
  );
  const groupedPrograms = PROGRAM_GROUPS.map((group) => ({
    group,
    programs: cashProgramsLast(
      PROGRAM_LIST.filter(
        (program) =>
          program.category === group.id &&
          isProgramEnabled(settings, program.id),
      ),
    ),
  }));
  return (
    <main className="app-shell">
      <header className="utility-bar">
        <span
          className="utility-version"
          aria-label={`Version ${extensionVersion}`}
        >
          v{extensionVersion}
        </span>
        <div className="utility-actions">
          <button
            className="global-icon-button"
            type="button"
            aria-label="Setting"
            data-tooltip="Setting"
            onClick={() => {
              setEditingProgramId(null);
              setRefreshConfirmationProgramId(null);
              setSettingsOpen(true);
            }}
          >
            <SettingsIcon />
          </button>
          <a
            className="global-icon-button"
            href={LATEST_RELEASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Update"
            data-tooltip="Update"
          >
            <UpdateIcon />
          </a>
          <button
            className="global-icon-button"
            type="button"
            aria-label="Export"
            data-tooltip="Export"
            onClick={exportBackup}
          >
            <ExportIcon />
          </button>
          <button
            className="global-icon-button"
            type="button"
            aria-label="Import"
            data-tooltip="Import"
            onClick={() => importInputRef.current?.click()}
          >
            <ImportIcon />
          </button>
          <input
            ref={importInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={importBackup}
            tabIndex={-1}
          />
        </div>
      </header>

      <section className="program-list" aria-label="Loyalty balances">
        {groupedPrograms.map(({ group, programs }) => (
          <LedgerSection
            key={group.id}
            group={group}
            programs={programs}
            sortMode={sortModes[group.id]}
            state={state}
            onChangeSort={(mode) => changeGroupSort(group.id, mode)}
            onCopyMemberNumber={copyMemberNumber}
            onEdit={setEditingProgramId}
            onRefresh={requestRefresh}
          />
        ))}
      </section>

      {notice ? <p className="notice" role="status">{notice}</p> : null}

      {availableUpdateVersion ? (
        <aside
          className="update-alert"
          role="status"
          aria-label="Update available"
        >
          <p>Version {availableUpdateVersion} is available.</p>
          <a
            className="update-alert-action"
            href={LATEST_RELEASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Update to version ${availableUpdateVersion}`}
          >
            Update
          </a>
        </aside>
      ) : null}

      {editingProgram ? (
        <EditPanel
          program={editingProgram}
          record={state.records[editingProgram.id]}
          onCancel={() => setEditingProgramId(null)}
          onSave={saveOverride}
        />
      ) : null}

      {refreshConfirmationProgram ? (
        <RefreshConfirmation
          program={refreshConfirmationProgram}
          onCancel={() => setRefreshConfirmationProgramId(null)}
          onConfirm={async () => {
            const programId = refreshConfirmationProgram.id;
            setRefreshConfirmationProgramId(null);
            await refreshProgram(programId, true);
          }}
        />
      ) : null}
    </main>
  );
}
