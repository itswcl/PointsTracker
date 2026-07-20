import { useRef, useState } from 'react';
import {
  siAirfrance,
  siAna,
  siAmericanairlines,
  siBritishairways,
  siHilton,
  siMarriott,
  siUnitedairlines,
  siVirginatlantic,
} from 'simple-icons';
import { formatBalance, parseBalance } from '../../src/domain/balances.js';
import { formatDateKey, formatMonthKey } from '../../src/domain/dates.js';
import {
  EXPIRATION_TYPES,
  getDisplayRecord,
} from '../../src/domain/records.js';
import { MESSAGE_TYPES } from '../../src/messaging.js';
import { PROGRAM_CATEGORIES, PROGRAM_LIST } from '../../src/programs.js';
import { PROGRAM_ICON_IMAGES } from '../../src/program-icon-images.js';
import { parseBackup, serializeBackup } from '../../src/storage/backup.js';
import { usePointsState } from './use-points-state.js';

const ERROR_LABELS = Object.freeze({
  balance_not_found: 'Balance not found on the account page.',
  capture_tab_closed: 'The update tab was closed before capture finished.',
  capture_timeout: 'The account page took too long to respond.',
  expiration_not_found: 'Expiration details did not load on the account page.',
  login_required: 'Sign in is required to update this balance.',
  tab_open_failed: 'The account page could not be opened.',
  verification_required: 'Verification is required in the account tab.',
});

const PROGRAM_VECTOR_MARKS = Object.freeze({
  united: siUnitedairlines.path,
  airfrance: siAirfrance.path,
  virginatlantic: siVirginatlantic.path,
  american: siAmericanairlines.path,
  britishairways: siBritishairways.path,
  ana: siAna.path,
  hilton: siHilton.path,
  marriott: siMarriott.path,
});

function expirationLabel(expiration) {
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

const PROGRAM_GROUPS = Object.freeze([
  Object.freeze({ id: PROGRAM_CATEGORIES.AIRLINE, label: 'Airline' }),
  Object.freeze({ id: PROGRAM_CATEGORIES.HOTEL, label: 'Hotel' }),
]);

function sortedPrograms(programs, state, sortMode) {
  return programs.map((program, index) => {
    const display = getDisplayRecord(state.records[program.id]);
    const sortKey =
      sortMode === 'balance'
        ? display.balance
        : display.expiration.date
          ? display.expiration.date
          : display.expiration.month
            ? `${display.expiration.month}-31`
            : null;
    return { program, index, sortKey };
  })
    .sort((left, right) => {
      if (left.sortKey === null && right.sortKey === null) {
        return left.index - right.index;
      }
      if (left.sortKey === null) return 1;
      if (right.sortKey === null) return -1;
      const comparison =
        sortMode === 'balance'
          ? right.sortKey - left.sortKey
          : left.sortKey.localeCompare(right.sortKey);
      return comparison || left.index - right.index;
    })
    .map(({ program }) => program);
}

function totalBalanceForPrograms(programs, state) {
  return programs.reduce((total, program) => {
    const balance = getDisplayRecord(state.records[program.id]).balance;
    return typeof balance === 'number' ? total + balance : total;
  }, 0);
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

function ProgramIcon({ program }) {
  const image = PROGRAM_ICON_IMAGES[program.id];
  const vectorPath = PROGRAM_VECTOR_MARKS[program.id];

  return (
    <span
      className={`program-icon program-icon--${program.id}`}
      title={program.name}
      aria-hidden="true"
    >
      <svg
        className="program-icon__svg"
        viewBox="0 0 28 28"
        data-program-icon={program.id}
        focusable="false"
      >
        <rect className="program-icon__tile" x="1" y="1" width="26" height="26" rx="7" />
        {image ? (
          <image
            className="program-icon__image"
            href={image}
            x="3"
            y="3"
            width="22"
            height="22"
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <svg x="4" y="4" width="20" height="20" viewBox="0 0 24 24">
            <path className="program-icon__mark" d={vectorPath} />
          </svg>
        )}
      </svg>
    </span>
  );
}

function ActionButton({ label, children, ...buttonProps }) {
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

function ProgramRow({ program, record, onEdit, onRefresh, onUseAutomatic }) {
  const display = getDisplayRecord(record);
  const errorText = display.error
    ? ERROR_LABELS[display.error] ?? 'The latest update did not finish.'
    : null;

  return (
    <article className="program-row" aria-labelledby={`${program.id}-name`}>
      <h2 className="visually-hidden" id={`${program.id}-name`}>
        {program.name}
      </h2>
      <ProgramIcon program={program} />
      <strong className="program-balance">{formatBalance(display.balance)}</strong>
      <dl className="record-facts">
        <div>
          <dt className="visually-hidden">Expiration</dt>
          <dd>{expirationLabel(display.expiration)}</dd>
        </div>
      </dl>
      <div className="program-actions">
        <ActionButton
          label={`Refresh ${program.name}`}
          onClick={() => onRefresh(program.id)}
          disabled={display.status === 'updating'}
        >
          <RefreshIcon />
        </ActionButton>
        <ActionButton label={`Edit ${program.name}`} onClick={() => onEdit(program.id)}>
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
      <time className="program-updated" dateTime={display.updatedOn ?? undefined}>
        {formatDateKey(display.updatedOn)}
      </time>

      {errorText ? <p className="error-note">{errorText}</p> : null}
    </article>
  );
}

function LedgerHeader({ groupLabel, sortMode, onChangeSort }) {
  return (
    <div className="ledger-header">
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
      <span aria-hidden="true" />
      <span>Updated</span>
    </div>
  );
}

function LedgerSection({
  group,
  programs,
  sortMode,
  state,
  onChangeSort,
  onEdit,
  onRefresh,
  onUseAutomatic,
}) {
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
        <span aria-label={`${programs.length} ${programs.length === 1 ? 'program' : 'programs'}`}>
          {programs.length}
        </span>
      </div>
      <LedgerHeader
        groupLabel={group.label}
        sortMode={sortMode}
        onChangeSort={onChangeSort}
      />
      {displayedPrograms.map((program) => (
        <ProgramRow
          key={program.id}
          program={program}
          record={state.records[program.id]}
          onEdit={onEdit}
          onRefresh={onRefresh}
          onUseAutomatic={onUseAutomatic}
        />
      ))}
      <div className="ledger-total-row" aria-label={`${group.label} total balance`}>
        <strong className="ledger-total-label">Total</strong>
        <output className="ledger-total-balance">{formatBalance(totalBalance)}</output>
      </div>
    </section>
  );
}

function EditPanel({ program, record, onCancel, onSave }) {
  const display = getDisplayRecord(record);
  const [balanceText, setBalanceText] = useState(
    display.balance === null ? '' : String(display.balance),
  );
  const [expirationType, setExpirationType] = useState(display.expiration.type);
  const [expirationDate, setExpirationDate] = useState(display.expiration.date ?? '');
  const [formError, setFormError] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    const balance = parseBalance(balanceText);
    if (balance === null) {
      setFormError('Enter a whole-number balance of zero or more.');
      return;
    }
    if (expirationType === 'fixed_date' && !expirationDate) {
      setFormError('Choose an expiration date.');
      return;
    }

    void onSave(program.id, {
      balance,
      expiration: {
        type: expirationType,
        date:
          expirationType === 'never' || expirationType === 'unknown'
            ? null
            : expirationDate || null,
        note: expirationType === 'never' ? 'No expiration' : null,
      },
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

          <label>
            Expiration type
            <select
              value={expirationType}
              onChange={(event) => setExpirationType(event.target.value)}
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

          {expirationType === 'fixed_date' || expirationType === 'activity_based' ? (
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
  const [editingProgramId, setEditingProgramId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [sortModes, setSortModes] = useState({
    [PROGRAM_CATEGORIES.AIRLINE]: null,
    [PROGRAM_CATEGORIES.HOTEL]: null,
  });
  const importInputRef = useRef(null);

  async function refreshProgram(programId) {
    setNotice(null);
    try {
      const result = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.REFRESH_PROGRAM,
        programId,
      });
      if (!result?.ok) setNotice('The account page could not be opened.');
    } catch {
      setNotice('The extension background service is unavailable.');
    }
  }

  async function saveOverride(programId, override) {
    try {
      await saveManualOverride(programId, override);
      setEditingProgramId(null);
      setNotice('Manual value saved locally.');
    } catch {
      setNotice('The manual value could not be saved.');
    }
  }

  async function useAutomatic(programId) {
    await clearManualOverride(programId);
    setNotice('Automatic value restored.');
  }

  function changeGroupSort(groupId, requestedMode) {
    setSortModes((current) => ({
      ...current,
      [groupId]: current[groupId] === requestedMode ? null : requestedMode,
    }));
  }

  function exportBackup() {
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

  async function importBackup(event) {
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
            onEdit={setEditingProgramId}
            onRefresh={refreshProgram}
            onUseAutomatic={useAutomatic}
          />
        ))}
      </section>

      {notice ? <p className="notice" role="status">{notice}</p> : null}

      <footer className="app-footer">
        <p>Stored only in this Chrome profile.</p>
        <div>
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
            tabIndex="-1"
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
