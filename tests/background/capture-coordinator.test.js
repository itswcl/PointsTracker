import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCaptureCoordinator } from '../../src/background/capture-coordinator.js';
import { MESSAGE_TYPES } from '../../src/messaging.js';
import { SessionRepository } from '../../src/storage/session-repository.js';
import { StateRepository } from '../../src/storage/state-repository.js';
import { createFakeStorageArea } from '../helpers/fake-storage.js';

function setup() {
  let nextTabId = 40;
  const browserApi = {
    tabs: {
      create: vi.fn(async ({ url, active }) => ({ id: ++nextTabId, url, active })),
      remove: vi.fn(async () => undefined),
      update: vi.fn(async () => undefined),
    },
  };
  const stateRepository = new StateRepository(createFakeStorageArea());
  const sessionRepository = new SessionRepository(createFakeStorageArea());
  const coordinator = createCaptureCoordinator({
    browserApi,
    stateRepository,
    sessionRepository,
    timeoutMs: 30_000,
  });
  return { browserApi, coordinator, stateRepository };
}

describe('capture coordinator', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('opens an inactive owned tab and saves a valid capture', async () => {
    const { browserApi, coordinator, stateRepository } = setup();
    const refresh = await coordinator.refreshProgram('united', { force: true });

    expect(browserApi.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({ active: false }),
    );

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'united',
        final: false,
        result: {
          kind: 'success',
          authState: 'authenticated',
          capture: {
            balance: 125400,
            expiration: { type: 'never', date: null, note: 'No expiration' },
          },
        },
      },
      { tab: { id: refresh.tabId } },
    );

    const state = await stateRepository.getState();
    expect(state.records.united.automatic.balance).toBe(125400);
    expect(browserApi.tabs.remove).toHaveBeenCalledWith(refresh.tabId);
    coordinator.destroy();
  });

  it('reveals verification tabs and preserves the previous value', async () => {
    const { browserApi, coordinator, stateRepository } = setup();
    await stateRepository.saveAutomaticCapture('cathay', {
      balance: 84500,
      expiration: { type: 'activity_based', date: '2026-12-14', note: null },
    });
    const refresh = await coordinator.refreshProgram('cathay', { force: true });

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'cathay',
        final: true,
        result: {
          kind: 'verification_required',
          authState: 'unknown',
          capture: null,
          reason: 'verification_required',
        },
      },
      { tab: { id: refresh.tabId } },
    );

    const state = await stateRepository.getState();
    expect(state.records.cathay.automatic.balance).toBe(84500);
    expect(state.records.cathay.error).toBe('verification_required');
    expect(browserApi.tabs.update).toHaveBeenCalledWith(refresh.tabId, {
      active: true,
    });
    expect(browserApi.tabs.remove).not.toHaveBeenCalled();
    coordinator.destroy();
  });
});

