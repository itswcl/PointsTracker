import {
  isPointsTrackerMessage,
  MESSAGE_TYPES,
  type PageObservedMessage,
} from '../messaging.js';
import { getProgram, PROGRAM_LIST } from '../programs.js';
import type {
  AutomaticCapture,
  PointsState,
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
  saveAutomaticCapture(
    programId: ProgramId,
    capture: AutomaticCapture,
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
}

interface SessionRepositoryLike {
  canTrigger(
    programId: ProgramId,
    timestamp: number,
    cooldownMs: number,
  ): Promise<boolean>;
  markTriggered(programId: ProgramId, timestamp: number): Promise<void>;
}

interface MessageSenderLike {
  tab?: { id?: number | undefined } | undefined;
}

interface CaptureCoordinatorOptions {
  browserApi: BrowserApiLike;
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
}

interface RefreshOptions {
  force?: boolean;
}

interface FailureOptions {
  reveal?: boolean;
}

export type RefreshResult =
  | { ok: true; tabId: number }
  | { ok: true; alreadyRunning: true }
  | { ok: true; skipped: 'cooldown' }
  | { ok: false; error: string };

export function createCaptureCoordinator({
  browserApi,
  stateRepository,
  sessionRepository,
  now = () => Date.now(),
  timeoutMs = DEFAULT_CAPTURE_TIMEOUT_MS,
  loginWaitMs = LOGIN_WAIT_MS,
  cooldownMs = DEFAULT_COOLDOWN_MS,
}: CaptureCoordinatorOptions) {
  const activeCaptures = new Map<ProgramId, ActiveCapture>();

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

  async function closeOwnedTab(programId: ProgramId): Promise<void> {
    const capture = clearCapture(programId);
    if (!capture) return;
    try {
      await browserApi.tabs.remove(capture.tabId);
    } catch {
      // The user may already have closed the extension-owned tab.
    }
  }

  async function failCapture(
    programId: ProgramId,
    reason: string,
    { reveal = false }: FailureOptions = {},
  ): Promise<void> {
    const capture = clearCapture(programId);
    await stateRepository.setStatus(programId, 'error', reason);
    if (!capture) return;

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
    { force = false }: RefreshOptions = {},
  ): Promise<RefreshResult> {
    const program = getProgram(requestedProgramId);
    if (!program) return { ok: false, error: 'unsupported_program' };
    const programId = program.id;
    if (activeCaptures.has(programId)) return { ok: true, alreadyRunning: true };

    const timestamp = now();
    if (
      !force &&
      !(await sessionRepository.canTrigger(programId, timestamp, cooldownMs))
    ) {
      return { ok: true, skipped: 'cooldown' };
    }

    await sessionRepository.markTriggered(programId, timestamp);
    await stateRepository.setStatus(programId, 'updating');

    try {
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
      };
      activeCaptures.set(programId, capture);
      return { ok: true, tabId: tab.id };
    } catch {
      await stateRepository.setStatus(programId, 'error', 'tab_open_failed');
      return { ok: false, error: 'tab_open_failed' };
    }
  }

  async function handlePageObserved(
    message: PageObservedMessage,
    sender: MessageSenderLike,
  ) {
    const program = getProgram(message.programId);
    if (!program) return { ok: false, error: 'unsupported_program' };

    const senderTabId = sender.tab?.id;
    const owned =
      typeof senderTabId === 'number' ? findCaptureByTab(senderTabId) : null;
    const result = message.result;

    if (result.kind === 'success') {
      if (
        owned?.programId === program.id &&
        owned.capture.stage === 'member_number'
      ) {
        if (result.capture.memberNumber) {
          await stateRepository.saveAutomaticMemberNumber(
            program.id,
            result.capture.memberNumber,
          );
        }
        await closeOwnedTab(program.id);
        return { ok: true, captured: true };
      }

      await stateRepository.saveAutomaticCapture(program.id, result.capture);
      if (
        owned?.programId === program.id &&
        result.capture.memberNumber === null &&
        program.memberNumberUrl
      ) {
        owned.capture.stage = 'member_number';
        resetCaptureTimeout(program.id, owned.capture);
        await stateRepository.setStatus(program.id, 'updating');
        try {
          await browserApi.tabs.update(owned.capture.tabId, {
            url: program.memberNumberUrl,
            active: false,
          });
          return {
            ok: true,
            captured: true,
            continued: 'member_number',
          };
        } catch {
          await failCapture(program.id, 'tab_open_failed');
          return { ok: false, error: 'tab_open_failed' };
        }
      }

      if (
        owned?.programId === program.id &&
        result.capture.memberNumber === null &&
        !message.final
      ) {
        await stateRepository.setStatus(program.id, 'updating');
        return {
          ok: true,
          captured: true,
          continued: 'member_number_wait',
        };
      }

      if (owned?.programId === program.id) await closeOwnedTab(program.id);
      return { ok: true, captured: true };
    }

    if (result.kind === 'member_number_found') {
      await stateRepository.saveAutomaticMemberNumber(
        program.id,
        result.capture.memberNumber,
      );
      if (owned?.programId === program.id) await closeOwnedTab(program.id);
      return { ok: true, captured: true };
    }

    if (
      owned?.programId === program.id &&
      result.kind === 'login_required'
    ) {
      if (!owned.capture.waitingForLogin) {
        owned.capture.waitingForLogin = true;
        resetCaptureTimeout(
          program.id,
          owned.capture,
          loginWaitMs,
          'login_required',
          true,
        );
        await stateRepository.setStatus(program.id, 'updating');
        try {
          await browserApi.tabs.update(owned.capture.tabId, { active: true });
        } catch {
          await failCapture(program.id, 'login_required', { reveal: true });
          return { ok: false, error: 'login_required' };
        }
      }
      return {
        ok: true,
        captured: false,
        continued: 'login_wait',
      };
    }

    if (owned?.programId === program.id && message.final) {
      if (result.kind === 'verification_required') {
        await failCapture(program.id, 'verification_required', { reveal: true });
      } else {
        await failCapture(program.id, result.reason ?? 'balance_not_found');
      }
      return { ok: false, error: result.reason ?? 'balance_not_found' };
    }

    if (result.authState === 'authenticated') {
      return refreshProgram(program.id);
    }

    return { ok: true, captured: false };
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
      return refreshProgram(message.programId, { force: true });
    }
    if (message.type === MESSAGE_TYPES.REFRESH_ALL) {
      const results = await Promise.all(
        PROGRAM_LIST.map((program) =>
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
    clearCapture(owned.programId);
    void stateRepository.setStatus(owned.programId, 'error', 'capture_tab_closed');
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
