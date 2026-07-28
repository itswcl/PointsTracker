import {
  isPointsTrackerMessage,
  MESSAGE_TYPES,
  observationsFromMessage,
  type LegacyPageObservedMessage,
  type PageObservedMessage,
} from '../messaging.js';
import {
  getProgram,
  PROGRAM_LIST,
  programShowsMemberNumber,
  programsInCaptureGroup,
} from '../programs.js';
import { isProgramEnabled } from '../domain/settings.js';
import type {
  PointsTrackerSettings,
  PointsState,
  ManualOverride,
  ProgramCapture,
  ProgramId,
  RecordStatus,
} from '../types.js';
import {
  DEFAULT_CAPTURE_TIMEOUT_MS,
  LOGIN_WAIT_MS,
} from './capture-timing.js';

const DEFAULT_COOLDOWN_MS = 5 * 60_000;

interface BrowserApiLike {
  tabs: {
    create(
      properties: chrome.tabs.CreateProperties,
    ): Promise<{ id?: number | undefined }>;
    remove(tabId: number): Promise<void>;
    update(
      tabId: number,
      properties: chrome.tabs.UpdateProperties,
    ): Promise<unknown>;
  };
}

interface StateRepositoryLike {
  getState(): Promise<PointsState>;
  saveAutomaticCaptures(
    captures: readonly ProgramCapture[],
  ): Promise<PointsState>;
  saveAutomaticMemberNumber(
    programId: ProgramId,
    memberNumber: string,
  ): Promise<PointsState>;
  setStatus(
    programId: ProgramId,
    status: RecordStatus,
    error?: string | null,
  ): Promise<PointsState>;
  setStatuses(
    programIds: readonly ProgramId[],
    status: RecordStatus,
    error?: string | null,
  ): Promise<PointsState>;
  clearManualOverrides(
    programIds: readonly ProgramId[],
  ): Promise<PointsState>;
  clearManualOverridesIfUnchanged(
    replacements: readonly {
      programId: ProgramId;
      manualOverride: ManualOverride;
    }[],
  ): Promise<PointsState>;
}

interface SessionRepositoryLike {
  canTrigger(
    programId: ProgramId,
    timestamp: number,
    cooldownMs: number,
  ): Promise<boolean>;
  markTriggered(programId: ProgramId, timestamp: number): Promise<void>;
}

interface SettingsRepositoryLike {
  getSettings(): Promise<PointsTrackerSettings>;
}

interface MessageSenderLike {
  tab?: { id?: number | undefined } | undefined;
}

interface CaptureCoordinatorOptions {
  browserApi: BrowserApiLike;
  settingsRepository?: SettingsRepositoryLike;
  stateRepository: StateRepositoryLike;
  sessionRepository: SessionRepositoryLike;
  now?: () => number;
  timeoutMs?: number;
  loginWaitMs?: number;
  cooldownMs?: number;
}

interface ActiveCapture {
  tabId: number;
  timeoutId: ReturnType<typeof setTimeout>;
  stage: 'primary' | 'member_number';
  waitingForLogin: boolean;
  pendingProgramIds: Set<ProgramId>;
  replaceManualOverrideProgramIds: Set<ProgramId>;
  replacedManualOverrides: Map<ProgramId, ManualOverride>;
  successfulReplacementProgramIds: Set<ProgramId>;
}

interface RefreshOptions {
  force?: boolean;
  replaceManualOverride?: boolean;
}

interface FailureOptions {
  reveal?: boolean;
}

export type RefreshResult =
  | { ok: true; tabId: number }
  | { ok: true; alreadyRunning: true }
  | {
      ok: true;
      skipped: 'cooldown' | 'disabled' | 'manual_override';
    }
  | { ok: false; error: string };

export function createCaptureCoordinator({
  browserApi,
  settingsRepository,
  stateRepository,
  sessionRepository,
  now = () => Date.now(),
  timeoutMs = DEFAULT_CAPTURE_TIMEOUT_MS,
  loginWaitMs = LOGIN_WAIT_MS,
  cooldownMs = DEFAULT_COOLDOWN_MS,
}: CaptureCoordinatorOptions) {
  const activeCaptures = new Map<ProgramId, ActiveCapture>();
  const openingCaptureGroups = new Set<string>();

  function captureGroupKey(programId: ProgramId): string {
    const program = getProgram(programId);
    return program?.captureGroup ?? programId;
  }

  async function enabledProgramIds(
    programIds: readonly ProgramId[],
  ): Promise<ProgramId[]> {
    if (!settingsRepository) return [...programIds];
    const settings = await settingsRepository.getSettings();
    return programIds.filter((programId) =>
      isProgramEnabled(settings, programId),
    );
  }

  function resetCaptureTimeout(
    programId: ProgramId,
    capture: ActiveCapture,
    delayMs = timeoutMs,
    reason = 'capture_timeout',
    reveal = false,
  ): void {
    clearTimeout(capture.timeoutId);
    capture.timeoutId = setTimeout(() => {
      void failCapture(programId, reason, { reveal });
    }, delayMs);
  }

  function clearCapture(programId: ProgramId): ActiveCapture | null {
    const capture = activeCaptures.get(programId);
    if (!capture) return null;
    clearTimeout(capture.timeoutId);
    activeCaptures.delete(programId);
    return capture;
  }

  function findCaptureByTab(
    tabId: number,
  ): { programId: ProgramId; capture: ActiveCapture } | null {
    for (const [programId, capture] of activeCaptures.entries()) {
      if (capture.tabId === tabId) return { programId, capture };
    }
    return null;
  }

  async function clearSuccessfulManualOverrides(
    capture: ActiveCapture,
    excludedProgramIds: ReadonlySet<ProgramId> = new Set(),
  ): Promise<void> {
    const replacements = [...capture.successfulReplacementProgramIds]
      .filter((programId) => !excludedProgramIds.has(programId))
      .flatMap((programId) => {
        const manualOverride = capture.replacedManualOverrides.get(programId);
        return manualOverride ? [{ programId, manualOverride }] : [];
      });
    if (replacements.length > 0) {
      await stateRepository.clearManualOverridesIfUnchanged(replacements);
    }
  }

  async function closeOwnedTab(programId: ProgramId): Promise<void> {
    const capture = clearCapture(programId);
    if (!capture) return;
    try {
      await clearSuccessfulManualOverrides(capture);
    } finally {
      try {
        await browserApi.tabs.remove(capture.tabId);
      } catch {
        // The user may already have closed the extension-owned tab.
      }
    }
  }

  async function failCapture(
    programId: ProgramId,
    reason: string,
    { reveal = false }: FailureOptions = {},
  ): Promise<void> {
    const capture = clearCapture(programId);
    const program = getProgram(programId);
    const pendingProgramIds =
      capture && capture.pendingProgramIds.size > 0
        ? [...capture.pendingProgramIds]
        : program
          ? programsInCaptureGroup(program).map((candidate) => candidate.id)
          : [programId];
    await stateRepository.setStatuses(
      pendingProgramIds,
      'error',
      reason,
    );
    if (!capture) return;
    await clearSuccessfulManualOverrides(
      capture,
      capture.pendingProgramIds,
    );

    if (reveal) {
      try {
        await browserApi.tabs.update(capture.tabId, { active: true });
      } catch {
        // The tab may have been closed before the failure was handled.
      }
      return;
    }

    try {
      await browserApi.tabs.remove(capture.tabId);
    } catch {
      // The tab may have been closed before the failure was handled.
    }
  }

  async function refreshProgram(
    requestedProgramId: unknown,
    {
      force = false,
      replaceManualOverride = false,
    }: RefreshOptions = {},
  ): Promise<RefreshResult> {
    const program = getProgram(requestedProgramId);
    if (!program) return { ok: false, error: 'unsupported_program' };
    const programId = program.id;
    if ((await enabledProgramIds([programId])).length === 0) {
      return { ok: true, skipped: 'disabled' };
    }
    const captureGroupProgramIds = await enabledProgramIds(
      programsInCaptureGroup(program).map((candidate) => candidate.id),
    );
    const currentState = await stateRepository.getState();
    const replaceManualOverrideProgramIds = new Set<ProgramId>();
    const replacedManualOverrides = new Map<ProgramId, ManualOverride>();
    if (currentState.records[programId].manualOverride) {
      if (!replaceManualOverride) {
        return { ok: true, skipped: 'manual_override' };
      }
      replaceManualOverrideProgramIds.add(programId);
      replacedManualOverrides.set(
        programId,
        currentState.records[programId].manualOverride,
      );
    }
    const writableProgramIds = captureGroupProgramIds.filter(
      (candidateProgramId) =>
        !currentState.records[candidateProgramId].manualOverride ||
        replaceManualOverrideProgramIds.has(candidateProgramId),
    );
    const groupKey = captureGroupKey(programId);
    if (
      openingCaptureGroups.has(groupKey) ||
      programsInCaptureGroup(program).some((candidate) =>
        activeCaptures.has(candidate.id),
      )
    ) {
      return { ok: true, alreadyRunning: true };
    }

    openingCaptureGroups.add(groupKey);
    try {
      const timestamp = now();
      if (
        !force &&
        !(await sessionRepository.canTrigger(programId, timestamp, cooldownMs))
      ) {
        return { ok: true, skipped: 'cooldown' };
      }

      await sessionRepository.markTriggered(programId, timestamp);
      await stateRepository.setStatuses(writableProgramIds, 'updating');

      const tab = await browserApi.tabs.create({
        url: program.accountUrl,
        active: false,
      });
      if (typeof tab.id !== 'number') throw new Error('missing_tab_id');

      const capture: ActiveCapture = {
        tabId: tab.id,
        timeoutId: setTimeout(() => {
          void failCapture(programId, 'capture_timeout');
        }, timeoutMs),
        stage: 'primary',
        waitingForLogin: false,
        pendingProgramIds: new Set(writableProgramIds),
        replaceManualOverrideProgramIds,
        replacedManualOverrides,
        successfulReplacementProgramIds: new Set(),
      };
      activeCaptures.set(programId, capture);
      return { ok: true, tabId: tab.id };
    } catch {
      await stateRepository.setStatuses(
        writableProgramIds,
        'error',
        'tab_open_failed',
      );
      return { ok: false, error: 'tab_open_failed' };
    } finally {
      openingCaptureGroups.delete(groupKey);
    }
  }

  async function handlePageObserved(
    message: PageObservedMessage | LegacyPageObservedMessage,
    sender: MessageSenderLike,
  ) {
    const receivedObservations = observationsFromMessage(message);
    const enabledIds = new Set(
      await enabledProgramIds(
        receivedObservations.map(({ programId }) => programId),
      ),
    );
    const enabledObservations = receivedObservations.filter(({ programId }) =>
      enabledIds.has(programId),
    );
    if (enabledObservations.length === 0) {
      return { ok: true, captured: false, skipped: 'disabled' };
    }
    const observedPrograms = enabledObservations.map(({ programId }) =>
      getProgram(programId),
    );
    if (observedPrograms.some((program) => !program)) {
      return { ok: false, error: 'unsupported_program' };
    }

    const senderTabId = sender.tab?.id;
    const owned =
      typeof senderTabId === 'number' ? findCaptureByTab(senderTabId) : null;
    const currentState = await stateRepository.getState();
    const observations = enabledObservations.filter(
      ({ programId }) =>
        !currentState.records[programId].manualOverride ||
        owned?.capture.replaceManualOverrideProgramIds.has(programId),
    );
    if (observations.length === 0) {
      return {
        ok: true,
        captured: false,
        skipped: 'manual_override',
      };
    }
    const ownerObservation = owned
      ? observations.find(
          (observation) => observation.programId === owned.programId,
        )
      : null;

    if (owned?.capture.stage === 'member_number' && ownerObservation) {
      const result = ownerObservation.result;
      if (result.kind === 'success') {
        if (result.capture.memberNumber) {
          await stateRepository.saveAutomaticMemberNumber(
            owned.programId,
            result.capture.memberNumber,
          );
        }
        await closeOwnedTab(owned.programId);
        return { ok: true, captured: true };
      }
      if (result.kind === 'member_number_found') {
        await stateRepository.saveAutomaticMemberNumber(
          owned.programId,
          result.capture.memberNumber,
        );
        await closeOwnedTab(owned.programId);
        return { ok: true, captured: true };
      }
    }

    const successfulCaptures = observations.flatMap(
      ({ programId, result }): ProgramCapture[] =>
        result.kind === 'success'
          ? [{ programId, capture: result.capture }]
          : [],
    );
    if (successfulCaptures.length > 0) {
      await stateRepository.saveAutomaticCaptures(successfulCaptures);
      if (owned) {
        for (const { programId } of successfulCaptures) {
          if (
            owned.capture.replaceManualOverrideProgramIds.has(programId)
          ) {
            owned.capture.successfulReplacementProgramIds.add(programId);
          }
        }
      }
      if (owned) {
        for (const { programId } of successfulCaptures) {
          owned.capture.pendingProgramIds.delete(programId);
        }
      }
    }

    for (const observation of observations) {
      if (observation.result.kind !== 'member_number_found') continue;
      await stateRepository.saveAutomaticMemberNumber(
        observation.programId,
        observation.result.capture.memberNumber,
      );
    }

    const failedObservations = observations.filter(
      ({ result }) =>
        result.kind !== 'success' &&
        result.kind !== 'member_number_found',
    );
    const loginObservation = failedObservations.find(
      ({ result }) => result.kind === 'login_required',
    );

    if (owned && loginObservation) {
      if (!owned.capture.waitingForLogin) {
        owned.capture.waitingForLogin = true;
        resetCaptureTimeout(
          owned.programId,
          owned.capture,
          loginWaitMs,
          'login_required',
          true,
        );
        await stateRepository.setStatuses(
          [...owned.capture.pendingProgramIds],
          'updating',
        );
        try {
          await browserApi.tabs.update(owned.capture.tabId, { active: true });
        } catch {
          await failCapture(owned.programId, 'login_required', {
            reveal: true,
          });
          return { ok: false, error: 'login_required' };
        }
      }
      return {
        ok: true,
        captured: false,
        continued: 'login_wait',
      };
    }

    if (!owned) {
      const authenticatedFailure = failedObservations.find(
        ({ result }) => result.authState === 'authenticated',
      );
      if (authenticatedFailure) {
        return refreshProgram(authenticatedFailure.programId);
      }
      return {
        ok: true,
        captured:
          successfulCaptures.length > 0 ||
          observations.some(
            ({ result }) => result.kind === 'member_number_found',
          ),
      };
    }

    const ownerProgram = getProgram(owned.programId);
    const ownerResult = ownerObservation?.result;
    if (!ownerProgram || !ownerResult) {
      if (message.final) {
        await failCapture(owned.programId, 'balance_not_found');
        return { ok: false, error: 'balance_not_found' };
      }
      return { ok: true, captured: successfulCaptures.length > 0 };
    }

    if (ownerResult.kind === 'member_number_found') {
      if (message.final) {
        await failCapture(owned.programId, 'balance_not_found');
        return { ok: false, error: 'balance_not_found' };
      }
      await stateRepository.setStatus(owned.programId, 'updating');
      return {
        ok: true,
        captured: true,
        continued: 'balance_wait',
      };
    }

    if (
      ownerResult.kind === 'success' &&
      ownerResult.capture.memberNumber === null &&
      ownerProgram.memberNumberUrl
    ) {
      owned.capture.stage = 'member_number';
      owned.capture.pendingProgramIds.add(owned.programId);
      resetCaptureTimeout(owned.programId, owned.capture);
      await stateRepository.setStatus(owned.programId, 'updating');
      try {
        await browserApi.tabs.update(owned.capture.tabId, {
          url: ownerProgram.memberNumberUrl,
          active: false,
        });
        return {
          ok: true,
          captured: true,
          continued: 'member_number',
        };
      } catch {
        await failCapture(owned.programId, 'tab_open_failed');
        return { ok: false, error: 'tab_open_failed' };
      }
    }

    if (
      ownerResult.kind === 'success' &&
      ownerResult.capture.memberNumber === null &&
      programShowsMemberNumber(ownerProgram) &&
      !message.final
    ) {
      owned.capture.pendingProgramIds.add(owned.programId);
      await stateRepository.setStatus(owned.programId, 'updating');
      return {
        ok: true,
        captured: true,
        continued: 'member_number_wait',
      };
    }

    if (failedObservations.length > 0 && !message.final) {
      await stateRepository.setStatuses(
        failedObservations.map(({ programId }) => programId),
        'updating',
      );
      return {
        ok: true,
        captured: successfulCaptures.length > 0,
        continued: 'shared_page_wait',
      };
    }

    if (failedObservations.length > 0) {
      for (const { programId, result } of failedObservations) {
        await stateRepository.setStatus(
          programId,
          'error',
          result.reason ?? 'balance_not_found',
        );
      }

      const capture = clearCapture(owned.programId);
      const reveal = failedObservations.some(
        ({ result }) => result.kind === 'verification_required',
      );
      if (capture) {
        try {
          await clearSuccessfulManualOverrides(
            capture,
            new Set(failedObservations.map(({ programId }) => programId)),
          );
          if (reveal) {
            await browserApi.tabs.update(capture.tabId, { active: true });
          } else {
            await browserApi.tabs.remove(capture.tabId);
          }
        } catch {
          // The tab may have been closed while final failures were saved.
        }
      }
      return {
        ok: false,
        error:
          failedObservations[0]?.result.reason ?? 'balance_not_found',
      };
    }

    await closeOwnedTab(owned.programId);
    return {
      ok: true,
      captured:
        successfulCaptures.length > 0 ||
        observations.some(
          ({ result }) => result.kind === 'member_number_found',
        ),
    };
  }

  async function handleMessage(
    message: unknown,
    sender: MessageSenderLike = {},
  ) {
    if (!isPointsTrackerMessage(message)) return undefined;

    if (message.type === MESSAGE_TYPES.PAGE_OBSERVED) {
      return handlePageObserved(message, sender);
    }
    if (message.type === MESSAGE_TYPES.REFRESH_PROGRAM) {
      return refreshProgram(message.programId, {
        force: true,
        replaceManualOverride: message.replaceManualOverride === true,
      });
    }
    if (message.type === MESSAGE_TYPES.REFRESH_ALL) {
      const enabledIds = new Set(
        await enabledProgramIds(PROGRAM_LIST.map((program) => program.id)),
      );
      const seenCaptureGroups = new Set<string>();
      const refreshTargets = PROGRAM_LIST.filter((program) => {
        if (!enabledIds.has(program.id)) return false;
        const groupKey = captureGroupKey(program.id);
        if (seenCaptureGroups.has(groupKey)) return false;
        seenCaptureGroups.add(groupKey);
        return true;
      });
      const results = await Promise.all(
        refreshTargets.map((program) =>
          refreshProgram(program.id, { force: true }),
        ),
      );
      return { ok: results.every((result) => result.ok), results };
    }
    return undefined;
  }

  function handleTabRemoved(tabId: number): void {
    const owned = findCaptureByTab(tabId);
    if (!owned) return;
    const capture = clearCapture(owned.programId);
    const program = getProgram(owned.programId);
    const pendingProgramIds =
      capture && capture.pendingProgramIds.size > 0
        ? [...capture.pendingProgramIds]
        : program
          ? programsInCaptureGroup(program).map((candidate) => candidate.id)
          : [owned.programId];
    void (async () => {
      await stateRepository.setStatuses(
        pendingProgramIds,
        'error',
        'capture_tab_closed',
      );
      if (capture) {
        await clearSuccessfulManualOverrides(
          capture,
          capture.pendingProgramIds,
        );
      }
    })();
  }

  function destroy(): void {
    for (const programId of activeCaptures.keys()) clearCapture(programId);
  }

  return {
    destroy,
    handleMessage,
    handlePageObserved,
    handleTabRemoved,
    refreshProgram,
  };
}
