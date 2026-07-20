import { isProgramId } from '../programs.js';
import type {
  CaptureSession,
  ProgramId,
  StorageAreaLike,
} from '../types.js';

const SESSION_KEY = 'pointsTrackerCaptureSession';

function readSession(value: unknown): CaptureSession {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { lastTriggered: {} };
  }
  const lastTriggered = Reflect.get(value, 'lastTriggered');
  if (
    lastTriggered === null ||
    typeof lastTriggered !== 'object' ||
    Array.isArray(lastTriggered)
  ) {
    return { lastTriggered: {} };
  }

  const session: CaptureSession = { lastTriggered: {} };
  for (const [programId, timestamp] of Object.entries(lastTriggered)) {
    if (isProgramId(programId) && typeof timestamp === 'number') {
      session.lastTriggered[programId] = timestamp;
    }
  }
  return session;
}

export class SessionRepository {
  readonly #storageArea: StorageAreaLike;
  readonly #key: string;

  constructor(storageArea: StorageAreaLike, key = SESSION_KEY) {
    this.#storageArea = storageArea;
    this.#key = key;
  }

  async getSession(): Promise<CaptureSession> {
    const stored = await this.#storageArea.get(this.#key);
    return readSession(stored[this.#key]);
  }

  async markTriggered(programId: ProgramId, timestamp: number): Promise<void> {
    const session = await this.getSession();
    session.lastTriggered[programId] = timestamp;
    await this.#storageArea.set({ [this.#key]: session });
  }

  async canTrigger(
    programId: ProgramId,
    timestamp: number,
    cooldownMs: number,
  ): Promise<boolean> {
    const session = await this.getSession();
    const previous = session.lastTriggered[programId];
    return typeof previous !== 'number' || timestamp - previous >= cooldownMs;
  }
}
