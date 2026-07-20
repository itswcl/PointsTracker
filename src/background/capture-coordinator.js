import { isPointsTrackerMessage, MESSAGE_TYPES } from '../messaging.js';
import { getProgram, PROGRAM_LIST } from '../programs.js';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_COOLDOWN_MS = 5 * 60_000;

export function createCaptureCoordinator({
  browserApi,
  stateRepository,
  sessionRepository,
  now = () => Date.now(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  cooldownMs = DEFAULT_COOLDOWN_MS,
}) {
  const activeCaptures = new Map();

  function clearCapture(programId) {
    const capture = activeCaptures.get(programId);
    if (!capture) return null;
    clearTimeout(capture.timeoutId);
    activeCaptures.delete(programId);
    return capture;
  }

  function findCaptureByTab(tabId) {
    for (const [programId, capture] of activeCaptures.entries()) {
      if (capture.tabId === tabId) return { programId, capture };
    }
    return null;
  }

  async function closeOwnedTab(programId) {
    const capture = clearCapture(programId);
    if (!capture) return;
    try {
      await browserApi.tabs.remove(capture.tabId);
    } catch {
      // The user may already have closed the extension-owned tab.
    }
  }

  async function failCapture(programId, reason, { reveal = false } = {}) {
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

  async function refreshProgram(programId, { force = false } = {}) {
    const program = getProgram(programId);
    if (!program) return { ok: false, error: 'unsupported_program' };
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

      const timeoutId = setTimeout(() => {
        void failCapture(programId, 'capture_timeout');
      }, timeoutMs);
      activeCaptures.set(programId, { tabId: tab.id, timeoutId });
      return { ok: true, tabId: tab.id };
    } catch {
      await stateRepository.setStatus(programId, 'error', 'tab_open_failed');
      return { ok: false, error: 'tab_open_failed' };
    }
  }

  async function handlePageObserved(message, sender) {
    const program = getProgram(message.programId);
    if (!program) return { ok: false, error: 'unsupported_program' };

    const senderTabId = sender?.tab?.id;
    const owned =
      typeof senderTabId === 'number' ? findCaptureByTab(senderTabId) : null;
    const result = message.result;

    if (result?.kind === 'success') {
      await stateRepository.saveAutomaticCapture(program.id, result.capture);
      if (owned?.programId === program.id) await closeOwnedTab(program.id);
      return { ok: true, captured: true };
    }

    if (owned?.programId === program.id && message.final) {
      if (result?.kind === 'login_required') {
        await failCapture(program.id, 'login_required', { reveal: true });
      } else if (result?.kind === 'verification_required') {
        await failCapture(program.id, 'verification_required', { reveal: true });
      } else {
        await failCapture(program.id, result?.reason ?? 'balance_not_found');
      }
      return { ok: false, error: result?.reason ?? 'balance_not_found' };
    }

    if (result?.authState === 'authenticated') {
      return refreshProgram(program.id);
    }

    return { ok: true, captured: false };
  }

  async function handleMessage(message, sender = {}) {
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

  function handleTabRemoved(tabId) {
    const owned = findCaptureByTab(tabId);
    if (!owned) return;
    clearCapture(owned.programId);
    void stateRepository.setStatus(owned.programId, 'error', 'capture_tab_closed');
  }

  function destroy() {
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

