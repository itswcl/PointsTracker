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
  parseBalance,
  parseSignedBalance,
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
import { normalizeMemberNumber } from '../../src/domain/member-numbers.js';
import { MESSAGE_TYPES } from '../../src/messaging.js';
import {
  PROGRAM_CATEGORIES,
  PROGRAM_LIST,
  programAllowsSignedBalance,
  programShowsExpiration,
  programShowsMemberNumber,
} from '../../src/programs.js';
import { parseBackup, serializeBackup } from '../../src/storage/backup.js';
import type {
  ExpirationType,
  ManualOverrideInput,
  NormalizedExpiration,
  PointsState,
  ProgramCategory,
  ProgramDefinition,
  ProgramId,
  ProgramRecord,
} from '../../src/types.js';
import { LATEST_RELEASE_URL } from '../../src/update-check.js';
import { usePointsState } from './use-points-state.js';
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
      (program) => getDisplayRecord(state.records[program.id]).balance,
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
    const balance = getDisplayRecord(state.records[program.id]).balance;
    return typeof balance === 'number' ? total + balance : total;
  }, 0);
}

function memberNumberSuffix(memberNumber: string | null): string {
  if (!memberNumber) return '—';
  const compactNumber = memberNumber.replace(/[^A-Za-z0-9]/g, '');
  return compactNumber.slice(-4) || '—';
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

function RestoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 8V4M5 4h4" />
      <path d="M5.5 4.5A8 8 0 1 1 4 14" />
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
  onUseAutomatic: ProgramAction;
}

function ProgramRow({
  program,
  record,
  onCopyMemberNumber,
  onEdit,
  onRefresh,
  onUseAutomatic,
}: ProgramRowProps) {
  const display = getDisplayRecord(record);
  const memberNumber = display.memberNumber;
  const [memberNumberCopied, setMemberNumberCopied] = useState(false);
  const showsMemberNumber = programShowsMemberNumber(program);
  const showsExpiration = programShowsExpiration(program);
  const isBalanceOnly = !showsMemberNumber && !showsExpiration;
  const errorText = display.error
    ? ERROR_LABELS[display.error] ?? 'The latest update did not finish.'
    : null;

  async function handleCopyMemberNumber(): Promise<void> {
    if (!memberNumber) return;
    setMemberNumberCopied(await onCopyMemberNumber(memberNumber));
  }

  return (
    <article
      className={`program-row${isBalanceOnly ? ' program-row--balance-only' : ''}`}
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
        {formatBalance(
          display.balance,
          programAllowsSignedBalance(program),
        )}
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
        {record.manualOverride ? (
          <ActionButton
            label={`Use automatic value for ${program.name}`}
            onClick={() => onUseAutomatic(program.id)}
          >
            <RestoreIcon />
          </ActionButton>
        ) : null}
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
  onUseAutomatic: ProgramAction;
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
  onUseAutomatic,
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
          onUseAutomatic={onUseAutomatic}
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
    display.balance === null ? '' : String(display.balance),
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
    const balance = programAllowsSignedBalance(program)
      ? parseSignedBalance(balanceText)
      : parseBalance(balanceText);
    if (balance === null) {
      setFormError(
        programAllowsSignedBalance(program)
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
            Balance
            <input
              autoFocus
              inputMode="numeric"
              value={balanceText}
              onChange={(event) => setBalanceText(event.target.value)}
              placeholder="0"
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

export function App() {
  const {
    clearManualOverride,
    loadError,
    replaceState,
    saveManualOverride,
    state,
  } = usePointsState();
  const [editingProgramId, setEditingProgramId] = useState<ProgramId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sortModes, setSortModes] = useState<SortModes>({
    [PROGRAM_CATEGORIES.AIRLINE]: null,
    [PROGRAM_CATEGORIES.HOTEL]: null,
    [PROGRAM_CATEGORIES.CREDIT_CARD]: null,
  });
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const extensionVersion = chrome.runtime.getManifest().version;
  const availableUpdateVersion = useUpdateCheck(extensionVersion);

  async function refreshProgram(programId: ProgramId): Promise<void> {
    setNotice(null);
    try {
      const result: unknown = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.REFRESH_PROGRAM,
        programId,
      });
      if (
        result === null ||
        typeof result !== 'object' ||
        Reflect.get(result, 'ok') !== true
      ) {
        setNotice('The account page could not be opened.');
      }
    } catch {
      setNotice('The extension background service is unavailable.');
    }
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

  async function useAutomatic(programId: ProgramId): Promise<void> {
    await clearManualOverride(programId);
    setNotice('Automatic value restored.');
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

  if (loadError) {
    return <main className="fatal-state">{loadError}</main>;
  }

  if (!state) {
    return <main className="loading-state">Opening local ledger…</main>;
  }

  const editingProgram = PROGRAM_LIST.find(
    (program) => program.id === editingProgramId,
  );
  const groupedPrograms = PROGRAM_GROUPS.map((group) => ({
    group,
    programs: PROGRAM_LIST.filter((program) => program.category === group.id),
  }));
  return (
    <main className="app-shell">
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
            onRefresh={refreshProgram}
            onUseAutomatic={useAutomatic}
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

      <footer className="app-footer">
        <p>Stored only in this Chrome profile. · v{extensionVersion}</p>
        <div>
          <a
            className="footer-button"
            href={LATEST_RELEASE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Check updates
          </a>
          <button className="footer-button" type="button" onClick={exportBackup}>
            Export
          </button>
          <button
            className="footer-button"
            type="button"
            onClick={() => importInputRef.current?.click()}
          >
            Import
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
      </footer>

      {editingProgram ? (
        <EditPanel
          program={editingProgram}
          record={state.records[editingProgram.id]}
          onCancel={() => setEditingProgramId(null)}
          onSave={saveOverride}
        />
      ) : null}
    </main>
  );
}
