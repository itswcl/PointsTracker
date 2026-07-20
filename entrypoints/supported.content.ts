import {
  inspectProgramPage,
  prepareProgramPage,
} from '../src/adapters/index.js';
import { MESSAGE_TYPES } from '../src/messaging.js';
import { detectProgramFromUrl } from '../src/programs.js';

const OBSERVATION_WINDOW_MS = 12_000;
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

    if (result.kind === 'success') {
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
  observer.observe(document.documentElement, { childList: true, subtree: true });

  void inspectAndSend(false);

  finalTimerId = setTimeout(() => {
    observer?.disconnect();
    void inspectAndSend(true);
  }, OBSERVATION_WINDOW_MS);

  window.addEventListener('pagehide', cleanup, { once: true });
}
