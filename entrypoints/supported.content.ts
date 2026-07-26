import {
  inspectProgramPage,
  prepareProgramPage,
} from '../src/adapters/index.js';
import {
  isProgramEnabled,
  normalizeSettings,
  SETTINGS_STORAGE_KEY,
} from '../src/domain/settings.js';
import { MESSAGE_TYPES } from '../src/messaging.js';
import { detectProgramsFromUrl } from '../src/programs.js';
import {
  observationWindowFor,
  shouldFinishObservation,
} from '../src/background/observation-policy.js';
import { DEFAULT_OBSERVATION_WINDOW_MS } from '../src/background/capture-timing.js';

const MUTATION_DEBOUNCE_MS = 300;

async function observeEnabledPrograms(): Promise<void> {
  const detectedPrograms = detectProgramsFromUrl(window.location.href);
  if (detectedPrograms.length === 0) return;
  const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  const settings = normalizeSettings(stored[SETTINGS_STORAGE_KEY]);
  const activePrograms = detectedPrograms.filter((program) =>
    isProgramEnabled(settings, program.id),
  );
  if (activePrograms.length === 0) return;
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
    if (
      !final &&
      activePrograms.some((program) =>
        prepareProgramPage(program.id, document),
      )
    ) {
      return;
    }
    const observations = activePrograms.map((program) => ({
      programId: program.id,
      result: inspectProgramPage(
        program.id,
        document,
        window.location.href,
      ),
    }));
    const signature = JSON.stringify(observations);
    if (!final && signature === lastSignature) return;
    lastSignature = signature;

    try {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        pageUrl: window.location.href,
        observations,
        final,
      });
    } catch {
      // Extension reloads can invalidate an existing content script context.
    }

    if (!final) {
      scheduleFinalInspection(
        Math.max(
          ...observations.map(({ result }) => observationWindowFor(result)),
        ),
      );
    }

    if (
      observations.every(({ programId, result }) =>
        shouldFinishObservation(
          result,
          final,
          activePrograms.find((program) => program.id === programId)
            ?.memberNumberUrl !== undefined,
        ),
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

void observeEnabledPrograms().catch(() => undefined);
