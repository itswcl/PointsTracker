const SESSION_KEY = 'pointsTrackerCaptureSession';

export class SessionRepository {
  constructor(storageArea, key = SESSION_KEY) {
    this.storageArea = storageArea;
    this.key = key;
  }

  async getSession() {
    const stored = await this.storageArea.get(this.key);
    return {
      lastTriggered: stored?.[this.key]?.lastTriggered ?? {},
    };
  }

  async markTriggered(programId, timestamp) {
    const session = await this.getSession();
    session.lastTriggered[programId] = timestamp;
    await this.storageArea.set({ [this.key]: session });
  }

  async canTrigger(programId, timestamp, cooldownMs) {
    const session = await this.getSession();
    const previous = session.lastTriggered[programId];
    return typeof previous !== 'number' || timestamp - previous >= cooldownMs;
  }
}

