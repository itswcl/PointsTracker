import {
  inspectProgramPage,
  prepareProgramPage,
} from '../src/adapters/index.js';
import { MESSAGE_TYPES } from '../src/messaging.js';
import { detectProgramFromUrl } from '../src/programs.js';
import {
  observationWindowFor,
  shouldFinishObservation,
} from '../src/background/observation-policy.js';
import { DEFAULT_OBSERVATION_WINDOW_MS } from '../src/background/capture-timing.js';

const MUTATION_DEBOUNCE_MS = 300;

const program = detectProgramFromUrl(window.location.href);

if (program) {
  const activeProgram = program;
  let lastSignature: string | null = null;
  let debounceId: ReturnType<typeof setTimeout> | null = null;
  let finalTimerId: ReturnType<typeof setTimeout> | null = null;
  let observer: MutationObserver | null = null;
  let finished = false;

  function cleanup(): void {
    observer?.disconnect();
    if (debounceId) clearTimeout(debounceId);
    if (finalTimerId) clearTimeout(finalTimerId);
  }

  function scheduleFinalInspection(delayMs: number): void {
    if (finalTimerId) clearTimeout(finalTimerId);
    finalTimerId = setTimeout(() => {
      observer?.disconnect();
      void inspectAndSend(true);
    }, delayMs);
  }

  async function inspectAndSend(final = false): Promise<void> {
    if (finished) return;
    if (!final && prepareProgramPage(activeProgram.id, document)) return;
    const result = inspectProgramPage(
      activeProgram.id,
      document,
      window.location.href,
    );
    const signature = JSON.stringify(result);
    if (!final && signature === lastSignature) return;
    lastSignature = signature;

    try {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: activeProgram.id,
        pageUrl: window.location.href,
        result,
        final,
      });
    } catch {
      // Extension reloads can invalidate an existing content script context.
    }

    if (!final) {
      scheduleFinalInspection(observationWindowFor(result));
    }

    if (
      shouldFinishObservation(
        result,
        final,
        activeProgram.memberNumberUrl !== undefined,
      )
    ) {
      finished = true;
      cleanup();
    }
  }

  observer = new MutationObserver(() => {
    if (debounceId) clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      void inspectAndSend(false);
    }, MUTATION_DEBOUNCE_MS);
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  void inspectAndSend(false);

  scheduleFinalInspection(DEFAULT_OBSERVATION_WINDOW_MS);

  window.addEventListener('pagehide', cleanup, { once: true });
}
