import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCaptureCoordinator,
  type RefreshResult,
} from '../../src/background/capture-coordinator.js';
import { MESSAGE_TYPES } from '../../src/messaging.js';
import { SessionRepository } from '../../src/storage/session-repository.js';
import { StateRepository } from '../../src/storage/state-repository.js';
import { createFakeStorageArea } from '../helpers/fake-storage.js';

function setup({
  timeoutMs = 30_000,
  loginWaitMs = 180_000,
}: {
  timeoutMs?: number;
  loginWaitMs?: number;
} = {}) {
  let nextTabId = 40;
  const browserApi = {
    tabs: {
      create: vi.fn(async ({ url, active }: chrome.tabs.CreateProperties) => ({
        id: ++nextTabId,
        url,
        active,
      })),
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
    timeoutMs,
    loginWaitMs,
  });
  return { browserApi, coordinator, stateRepository };
}

function tabIdFrom(result: RefreshResult): number {
  if ('tabId' in result) return result.tabId;
  throw new Error('Expected refresh to create a tab');
}

describe('capture coordinator', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('opens an inactive owned tab and saves a valid capture', async () => {
    const { browserApi, coordinator, stateRepository } = setup();
    const refresh = await coordinator.refreshProgram('united', { force: true });
    const tabId = tabIdFrom(refresh);

    expect(browserApi.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({ active: false }),
    );

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'united',
        pageUrl: 'https://www.united.com/en/us/myunited',
        final: false,
        result: {
          kind: 'success',
          authState: 'authenticated',
          capture: {
            balance: 125400,
            memberNumber: 'UA000001',
            expiration: { type: 'never', date: null, note: 'No expiration' },
          },
          reason: null,
        },
      },
      { tab: { id: tabId } },
    );

    const state = await stateRepository.getState();
    expect(state.records.united.automatic.balance).toBe(125400);
    expect(browserApi.tabs.remove).toHaveBeenCalledWith(tabId);
    coordinator.destroy();
  });

  it('reveals a login page and keeps the capture active for the longer login window', async () => {
    const { browserApi, coordinator, stateRepository } = setup({
      timeoutMs: 30_000,
      loginWaitMs: 180_000,
    });
    const refresh = await coordinator.refreshProgram('united', { force: true });
    const tabId = tabIdFrom(refresh);

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'united',
        pageUrl: 'https://www.united.com/en/us/myunited',
        final: false,
        result: {
          kind: 'login_required',
          authState: 'signed_out',
          capture: null,
          reason: 'login_required',
        },
      },
      { tab: { id: tabId } },
    );

    expect(browserApi.tabs.update).toHaveBeenCalledWith(tabId, {
      active: true,
    });
    expect(await stateRepository.getState()).toMatchObject({
      records: {
        united: {
          status: 'updating',
          error: null,
        },
      },
    });

    await vi.advanceTimersByTimeAsync(30_000);
    expect(await stateRepository.getState()).toMatchObject({
      records: {
        united: {
          status: 'updating',
          error: null,
        },
      },
    });

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'united',
        pageUrl: 'https://www.united.com/en/us/myunited',
        final: false,
        result: {
          kind: 'success',
          authState: 'authenticated',
          capture: {
            balance: 125400,
            memberNumber: 'UA000001',
            expiration: { type: 'never', date: null, note: 'No expiration' },
          },
          reason: null,
        },
      },
      { tab: { id: tabId } },
    );

    expect(await stateRepository.getState()).toMatchObject({
      records: {
        united: {
          automatic: { balance: 125400, memberNumber: 'UA000001' },
          status: 'fresh',
          error: null,
        },
      },
    });
    expect(browserApi.tabs.remove).toHaveBeenCalledWith(tabId);
    coordinator.destroy();
  });

  it('leaves the login page open when the longer login window expires', async () => {
    const { browserApi, coordinator, stateRepository } = setup({
      loginWaitMs: 180_000,
    });
    const refresh = await coordinator.refreshProgram('united', { force: true });
    const tabId = tabIdFrom(refresh);

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'united',
        pageUrl: 'https://www.united.com/en/us/myunited',
        final: true,
        result: {
          kind: 'login_required',
          authState: 'signed_out',
          capture: null,
          reason: 'login_required',
        },
      },
      { tab: { id: tabId } },
    );

    await vi.advanceTimersByTimeAsync(179_999);
    expect((await stateRepository.getState()).records.united.status).toBe(
      'updating',
    );

    await vi.advanceTimersByTimeAsync(1);
    expect(await stateRepository.getState()).toMatchObject({
      records: {
        united: {
          status: 'error',
          error: 'login_required',
        },
      },
    });
    expect(browserApi.tabs.update).toHaveBeenCalledWith(tabId, {
      active: true,
    });
    expect(browserApi.tabs.remove).not.toHaveBeenCalled();
    coordinator.destroy();
  });

  it('keeps a one-page capture open until its member number renders', async () => {
    const { browserApi, coordinator, stateRepository } = setup();
    const refresh = await coordinator.refreshProgram('virginatlantic', {
      force: true,
    });
    const tabId = tabIdFrom(refresh);

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'virginatlantic',
        pageUrl:
          'https://www.virginatlantic.com/flying-club/account/overview',
        final: false,
        result: {
          kind: 'success',
          authState: 'authenticated',
          capture: {
            balance: 163250,
            memberNumber: null,
            expiration: { type: 'never', date: null, note: 'No expiration' },
          },
          reason: null,
        },
      },
      { tab: { id: tabId } },
    );

    expect(await stateRepository.getState()).toMatchObject({
      records: {
        virginatlantic: {
          automatic: { balance: 163250, memberNumber: null },
          status: 'updating',
        },
      },
    });
    expect(browserApi.tabs.remove).not.toHaveBeenCalled();

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'virginatlantic',
        pageUrl:
          'https://www.virginatlantic.com/flying-club/account/overview',
        final: false,
        result: {
          kind: 'success',
          authState: 'authenticated',
          capture: {
            balance: 163250,
            memberNumber: 'VS000004',
            expiration: { type: 'never', date: null, note: 'No expiration' },
          },
          reason: null,
        },
      },
      { tab: { id: tabId } },
    );

    expect(await stateRepository.getState()).toMatchObject({
      records: {
        virginatlantic: {
          automatic: { balance: 163250, memberNumber: 'VS000004' },
          status: 'fresh',
        },
      },
    });
    expect(browserApi.tabs.remove).toHaveBeenCalledWith(tabId);
    coordinator.destroy();
  });

  it('reveals verification tabs and preserves the previous value', async () => {
    const { browserApi, coordinator, stateRepository } = setup();
    await stateRepository.saveAutomaticCapture('cathay', {
      balance: 84500,
      memberNumber: 'CX000002',
      expiration: { type: 'activity_based', date: '2026-12-14', note: null },
    });
    const refresh = await coordinator.refreshProgram('cathay', { force: true });
    const tabId = tabIdFrom(refresh);

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'cathay',
        pageUrl: 'https://www.cathaypacific.com/cx/en_HK/membership/my-account/miles-and-points/membership-summary.html',
        final: true,
        result: {
          kind: 'verification_required',
          authState: 'unknown',
          capture: null,
          reason: 'verification_required',
        },
      },
      { tab: { id: tabId } },
    );

    const state = await stateRepository.getState();
    expect(state.records.cathay.automatic.balance).toBe(84500);
    expect(state.records.cathay.error).toBe('verification_required');
    expect(browserApi.tabs.update).toHaveBeenCalledWith(tabId, {
      active: true,
    });
    expect(browserApi.tabs.remove).not.toHaveBeenCalled();
    coordinator.destroy();
  });

  it('reuses one owned tab to merge a secondary member-number page', async () => {
    const { browserApi, coordinator, stateRepository } = setup();
    const refresh = await coordinator.refreshProgram('britishairways', {
      force: true,
    });
    const tabId = tabIdFrom(refresh);

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'britishairways',
        pageUrl:
          'https://www.britishairways.com/nx/b/customerhub/en/usa/your-account/executive-statements/',
        final: false,
        result: {
          kind: 'success',
          authState: 'authenticated',
          capture: {
            balance: 42300,
            memberNumber: null,
            expiration: {
              type: 'activity_based',
              date: '2029-01-01',
              note: 'Derived from newest activity',
            },
          },
          reason: null,
        },
      },
      { tab: { id: tabId } },
    );

    expect(browserApi.tabs.update).toHaveBeenCalledWith(tabId, {
      url: 'https://www.britishairways.com/nx/b/customerhub/en/usa/your-account/',
      active: false,
    });
    expect(browserApi.tabs.remove).not.toHaveBeenCalled();

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'britishairways',
        pageUrl:
          'https://www.britishairways.com/nx/b/customerhub/en/usa/your-account/',
        final: false,
        result: {
          kind: 'member_number_found',
          authState: 'authenticated',
          capture: { memberNumber: 'BA000008' },
          reason: null,
        },
      },
      { tab: { id: tabId } },
    );

    const state = await stateRepository.getState();
    expect(state.records.britishairways.automatic).toMatchObject({
      balance: 42300,
      memberNumber: 'BA000008',
      expiration: { date: '2029-01-01' },
    });
    expect(browserApi.tabs.remove).toHaveBeenCalledWith(tabId);
    coordinator.destroy();
  });
});
