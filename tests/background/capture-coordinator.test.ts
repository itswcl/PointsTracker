import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCaptureCoordinator,
  type RefreshResult,
} from '../../src/background/capture-coordinator.js';
import { MESSAGE_TYPES } from '../../src/messaging.js';
import {
  SETTINGS_STORAGE_KEY,
} from '../../src/domain/settings.js';
import { SettingsRepository } from '../../src/storage/settings-repository.js';
import { SessionRepository } from '../../src/storage/session-repository.js';
import { StateRepository } from '../../src/storage/state-repository.js';
import type { ProgramId } from '../../src/types.js';
import { createFakeStorageArea } from '../helpers/fake-storage.js';

function setup({
  timeoutMs = 30_000,
  loginWaitMs = 180_000,
  disabledProgramIds = [],
}: {
  timeoutMs?: number;
  loginWaitMs?: number;
  disabledProgramIds?: ProgramId[];
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
  const settingsRepository = new SettingsRepository(
    createFakeStorageArea({
      [SETTINGS_STORAGE_KEY]: {
        schemaVersion: 1,
        disabledProgramIds,
      },
    }),
  );
  const sessionRepository = new SessionRepository(createFakeStorageArea());
  const coordinator = createCaptureCoordinator({
    browserApi,
    settingsRepository,
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

  it('does not open or passively save a disabled program', async () => {
    const { browserApi, coordinator, stateRepository } = setup({
      disabledProgramIds: ['delta'],
    });

    await expect(
      coordinator.refreshProgram('delta', { force: true }),
    ).resolves.toEqual({ ok: true, skipped: 'disabled' });
    expect(browserApi.tabs.create).not.toHaveBeenCalled();

    await expect(
      coordinator.handleMessage({
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'delta',
        pageUrl: 'https://www.delta.com/myskymiles/overview',
        final: true,
        result: {
          kind: 'success',
          authState: 'authenticated',
          capture: {
            balance: 119300,
            memberNumber: 'DL000010',
            expiration: { type: 'never', date: null, note: 'No expiration' },
          },
          reason: null,
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      captured: false,
      skipped: 'disabled',
    });
    expect(await stateRepository.getState()).toMatchObject({
      records: {
        delta: {
          automatic: { balance: null },
          status: 'not_updated',
        },
      },
    });
  });

  it('does not passively update a program with a manual value', async () => {
    const { browserApi, coordinator, stateRepository } = setup();
    await stateRepository.saveManualOverride('delta', {
      balance: 119300,
      memberNumber: 'DL000010',
      expiration: { type: 'never', date: null, note: 'No expiration' },
    });

    await expect(
      coordinator.handleMessage({
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'delta',
        pageUrl: 'https://www.delta.com/myskymiles/overview',
        final: true,
        result: {
          kind: 'success',
          authState: 'authenticated',
          capture: {
            balance: 120500,
            memberNumber: 'DL000010',
            expiration: { type: 'never', date: null, note: 'No expiration' },
          },
          reason: null,
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      captured: false,
      skipped: 'manual_override',
    });

    expect(await stateRepository.getState()).toMatchObject({
      records: {
        delta: {
          automatic: { balance: null },
          manualOverride: { balance: 119300 },
          status: 'not_updated',
        },
      },
    });
    expect(browserApi.tabs.create).not.toHaveBeenCalled();
    coordinator.destroy();
  });

  it('requires authorization before replacing a manual value on refresh', async () => {
    const { browserApi, coordinator, stateRepository } = setup();
    await stateRepository.saveManualOverride('delta', {
      balance: 119300,
      memberNumber: 'DL000010',
      expiration: { type: 'never', date: null, note: 'No expiration' },
    });

    await expect(
      coordinator.refreshProgram('delta', { force: true }),
    ).resolves.toEqual({ ok: true, skipped: 'manual_override' });
    expect(browserApi.tabs.create).not.toHaveBeenCalled();

    const refresh = await coordinator.refreshProgram('delta', {
      force: true,
      replaceManualOverride: true,
    });
    const tabId = tabIdFrom(refresh);
    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'delta',
        pageUrl: 'https://www.delta.com/myskymiles/overview',
        final: false,
        result: {
          kind: 'success',
          authState: 'authenticated',
          capture: {
            balance: 120500,
            memberNumber: 'DL000010',
            expiration: { type: 'never', date: null, note: 'No expiration' },
          },
          reason: null,
        },
      },
      { tab: { id: tabId } },
    );

    expect(await stateRepository.getState()).toMatchObject({
      records: {
        delta: {
          automatic: { balance: 120500 },
          manualOverride: null,
          status: 'fresh',
          error: null,
        },
      },
    });
    expect(browserApi.tabs.remove).toHaveBeenCalledWith(tabId);
    coordinator.destroy();
  });

  it('keeps manual data when a confirmed multi-page refresh fails later', async () => {
    const { coordinator, stateRepository } = setup();
    await stateRepository.saveManualOverride('britishairways', {
      balance: 42000,
      memberNumber: 'BA000008',
      expiration: {
        type: 'activity_based',
        date: '2029-01-01',
        note: 'Manual expiration',
      },
    });
    const refresh = await coordinator.refreshProgram('britishairways', {
      force: true,
      replaceManualOverride: true,
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
              date: '2029-02-01',
              note: 'Derived from newest activity',
            },
          },
          reason: null,
        },
      },
      { tab: { id: tabId } },
    );
    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'britishairways',
        pageUrl:
          'https://www.britishairways.com/nx/b/customerhub/en/usa/your-account/',
        final: true,
        result: {
          kind: 'not_found',
          authState: 'authenticated',
          capture: null,
          reason: 'balance_not_found',
        },
      },
      { tab: { id: tabId } },
    );

    expect(await stateRepository.getState()).toMatchObject({
      records: {
        britishairways: {
          automatic: {
            balance: 42300,
            expiration: { date: '2029-02-01' },
          },
          manualOverride: {
            balance: 42000,
            memberNumber: 'BA000008',
            expiration: { date: '2029-01-01' },
          },
          status: 'error',
          error: 'balance_not_found',
        },
      },
    });
    coordinator.destroy();
  });

  it('protects a manual row while refreshing another row on the same page', async () => {
    const { coordinator, stateRepository } = setup();
    await stateRepository.saveManualOverride('southwestcredit', {
      balance: 5000,
      memberNumber: 'RR000016',
      expiration: { type: 'never', date: null, note: 'No expiration shown' },
    });
    const refresh = await coordinator.refreshProgram('southwest', {
      force: true,
    });
    const tabId = tabIdFrom(refresh);

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        pageUrl: 'https://www.southwest.com/loyalty/myaccount/',
        final: false,
        observations: [
          {
            programId: 'southwest',
            result: {
              kind: 'success',
              authState: 'authenticated',
              capture: {
                balance: 20383,
                memberNumber: 'RR000016',
                expiration: {
                  type: 'never',
                  date: null,
                  note: 'No expiration',
                },
              },
              reason: null,
            },
          },
          {
            programId: 'southwestcredit',
            result: {
              kind: 'success',
              authState: 'authenticated',
              capture: {
                balance: 69796,
                memberNumber: 'RR000016',
                expiration: {
                  type: 'fixed_date',
                  date: '2028-01-15',
                  note: 'Earliest Southwest Flight Credit expiration',
                },
              },
              reason: null,
            },
          },
        ],
      },
      { tab: { id: tabId } },
    );

    expect(await stateRepository.getState()).toMatchObject({
      records: {
        southwest: {
          automatic: { balance: 20383 },
          status: 'fresh',
        },
        southwestcredit: {
          automatic: { balance: null },
          manualOverride: { balance: 5000 },
          status: 'not_updated',
        },
      },
    });
    coordinator.destroy();
  });

  it('does not mark a protected shared-page row as updating during login', async () => {
    const { coordinator, stateRepository } = setup();
    await stateRepository.saveManualOverride('southwestcredit', {
      balance: 5000,
      memberNumber: 'RR000016',
      expiration: { type: 'never', date: null, note: 'No expiration shown' },
    });
    const refresh = await coordinator.refreshProgram('southwest', {
      force: true,
    });

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        pageUrl: 'https://www.southwest.com/loyalty/myaccount/',
        final: false,
        observations: [
          {
            programId: 'southwest',
            result: {
              kind: 'login_required',
              authState: 'signed_out',
              capture: null,
              reason: 'login_required',
            },
          },
          {
            programId: 'southwestcredit',
            result: {
              kind: 'login_required',
              authState: 'signed_out',
              capture: null,
              reason: 'login_required',
            },
          },
        ],
      },
      { tab: { id: tabIdFrom(refresh) } },
    );

    expect(await stateRepository.getState()).toMatchObject({
      records: {
        southwest: { status: 'updating' },
        southwestcredit: {
          manualOverride: { balance: 5000 },
          status: 'not_updated',
        },
      },
    });
    coordinator.destroy();
  });

  it('waits for the balance when a one-page member number renders first', async () => {
    const { browserApi, coordinator, stateRepository } = setup();
    const refresh = await coordinator.refreshProgram('choice', { force: true });
    const tabId = tabIdFrom(refresh);

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'choice',
        pageUrl: 'https://www.choicehotels.com/choice-privileges/account',
        final: false,
        result: {
          kind: 'member_number_found',
          authState: 'authenticated',
          capture: { memberNumber: 'CP000021' },
          reason: null,
        },
      },
      { tab: { id: tabId } },
    );

    expect(browserApi.tabs.remove).not.toHaveBeenCalled();
    expect((await stateRepository.getState()).records.choice).toMatchObject({
      automatic: { balance: null, memberNumber: 'CP000021' },
      status: 'updating',
    });

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'choice',
        pageUrl: 'https://www.choicehotels.com/choice-privileges/account',
        final: false,
        result: {
          kind: 'success',
          authState: 'authenticated',
          capture: {
            balance: 45500,
            memberNumber: 'CP000021',
            expiration: {
              type: 'activity_based',
              date: '2027-11-01',
              note: '18 mo inactivity',
            },
          },
          reason: null,
        },
      },
      { tab: { id: tabId } },
    );

    expect((await stateRepository.getState()).records.choice).toMatchObject({
      automatic: { balance: 45500, memberNumber: 'CP000021' },
      status: 'fresh',
    });
    expect(browserApi.tabs.remove).toHaveBeenCalledWith(tabId);
    coordinator.destroy();
  });

  it('preserves a newer manual edit made during a confirmed refresh', async () => {
    const { coordinator, stateRepository } = setup();
    await stateRepository.saveManualOverride('delta', {
      balance: 119300,
      memberNumber: 'DL000010',
      expiration: { type: 'never', date: null, note: 'No expiration' },
    });
    const refresh = await coordinator.refreshProgram('delta', {
      force: true,
      replaceManualOverride: true,
    });
    const tabId = tabIdFrom(refresh);

    await stateRepository.saveManualOverride('delta', {
      balance: 121000,
      memberNumber: 'DL000010',
      expiration: { type: 'never', date: null, note: 'No expiration' },
    });
    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        programId: 'delta',
        pageUrl: 'https://www.delta.com/myskymiles/overview',
        final: false,
        result: {
          kind: 'success',
          authState: 'authenticated',
          capture: {
            balance: 120500,
            memberNumber: 'DL000010',
            expiration: { type: 'never', date: null, note: 'No expiration' },
          },
          reason: null,
        },
      },
      { tab: { id: tabId } },
    );

    expect((await stateRepository.getState()).records.delta).toMatchObject({
      automatic: { balance: 120500 },
      manualOverride: { balance: 121000 },
    });
    coordinator.destroy();
  });

  it('replaces a completed manual row when another shared-page row fails', async () => {
    const { coordinator, stateRepository } = setup();
    await stateRepository.saveManualOverride('southwest', {
      balance: 19000,
      memberNumber: 'RR000016',
      expiration: { type: 'never', date: null, note: 'No expiration' },
    });
    const refresh = await coordinator.refreshProgram('southwest', {
      force: true,
      replaceManualOverride: true,
    });

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        pageUrl: 'https://www.southwest.com/loyalty/myaccount/',
        final: true,
        observations: [
          {
            programId: 'southwest',
            result: {
              kind: 'success',
              authState: 'authenticated',
              capture: {
                balance: 20383,
                memberNumber: 'RR000016',
                expiration: {
                  type: 'never',
                  date: null,
                  note: 'No expiration',
                },
              },
              reason: null,
            },
          },
          {
            programId: 'southwestcredit',
            result: {
              kind: 'not_found',
              authState: 'authenticated',
              capture: null,
              reason: 'balance_not_found',
            },
          },
        ],
      },
      { tab: { id: tabIdFrom(refresh) } },
    );

    expect((await stateRepository.getState()).records.southwest).toMatchObject({
      automatic: { balance: 20383 },
      manualOverride: null,
      status: 'fresh',
    });
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

  it('uses one owned tab for concurrent refreshes in the same capture group', async () => {
    const { browserApi, coordinator, stateRepository } = setup();

    const [pointsRefresh, creditRefresh] = await Promise.all([
      coordinator.refreshProgram('southwest', { force: true }),
      coordinator.refreshProgram('southwestcredit', { force: true }),
    ]);

    expect(pointsRefresh).toMatchObject({ ok: true, tabId: 41 });
    expect(creditRefresh).toEqual({ ok: true, alreadyRunning: true });
    expect(browserApi.tabs.create).toHaveBeenCalledTimes(1);
    expect(await stateRepository.getState()).toMatchObject({
      records: {
        southwest: { status: 'updating' },
        southwestcredit: { status: 'updating' },
      },
    });
    coordinator.destroy();
  });

  it('atomically saves Southwest points and Flight Credits from one page', async () => {
    const { browserApi, coordinator, stateRepository } = setup();
    const refresh = await coordinator.refreshProgram('southwest', {
      force: true,
    });
    const tabId = tabIdFrom(refresh);

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        pageUrl: 'https://www.southwest.com/loyalty/myaccount/',
        final: false,
        observations: [
          {
            programId: 'southwest',
            result: {
              kind: 'success',
              authState: 'authenticated',
              capture: {
                balance: 20383,
                memberNumber: 'RR000016',
                expiration: {
                  type: 'never',
                  date: null,
                  note: 'No expiration',
                },
              },
              reason: null,
            },
          },
          {
            programId: 'southwestcredit',
            result: {
              kind: 'success',
              authState: 'authenticated',
              capture: {
                balance: 69796,
                memberNumber: 'RR000016',
                expiration: {
                  type: 'fixed_date',
                  date: '2028-01-15',
                  note: 'Earliest Southwest Flight Credit expiration',
                },
              },
              reason: null,
            },
          },
        ],
      },
      { tab: { id: tabId } },
    );

    expect(await stateRepository.getState()).toMatchObject({
      records: {
        southwest: {
          automatic: {
            balance: 20383,
            memberNumber: 'RR000016',
          },
          status: 'fresh',
        },
        southwestcredit: {
          automatic: {
            balance: 69796,
            memberNumber: 'RR000016',
            expiration: { date: '2028-01-15' },
          },
          status: 'fresh',
        },
      },
    });
    expect(browserApi.tabs.remove).toHaveBeenCalledWith(tabId);
    coordinator.destroy();
  });

  it('keeps a shared page open until every row finishes rendering', async () => {
    const { browserApi, coordinator, stateRepository } = setup();
    const refresh = await coordinator.refreshProgram('southwestcredit', {
      force: true,
    });
    const tabId = tabIdFrom(refresh);

    const pointsObservation = {
      programId: 'southwest' as const,
      result: {
        kind: 'success' as const,
        authState: 'authenticated' as const,
        capture: {
          balance: 20383,
          memberNumber: 'RR000016',
          expiration: {
            type: 'never' as const,
            date: null,
            note: 'No expiration',
          },
        },
        reason: null,
      },
    };

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        pageUrl: 'https://www.southwest.com/loyalty/myaccount/',
        final: false,
        observations: [
          pointsObservation,
          {
            programId: 'southwestcredit',
            result: {
              kind: 'not_found',
              authState: 'authenticated',
              capture: null,
              reason: 'expiration_not_found',
            },
          },
        ],
      },
      { tab: { id: tabId } },
    );

    expect(await stateRepository.getState()).toMatchObject({
      records: {
        southwest: {
          automatic: { balance: 20383 },
          status: 'fresh',
        },
        southwestcredit: {
          automatic: { balance: null },
          status: 'updating',
        },
      },
    });
    expect(browserApi.tabs.remove).not.toHaveBeenCalled();

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        pageUrl: 'https://www.southwest.com/loyalty/myaccount/',
        final: true,
        observations: [
          pointsObservation,
          {
            programId: 'southwestcredit',
            result: {
              kind: 'success',
              authState: 'authenticated',
              capture: {
                balance: 2500,
                memberNumber: 'RR000016',
                expiration: {
                  type: 'never',
                  date: null,
                  note: 'All Southwest Flight Credits show no expiration',
                },
              },
              reason: null,
            },
          },
        ],
      },
      { tab: { id: tabId } },
    );

    expect(await stateRepository.getState()).toMatchObject({
      records: {
        southwestcredit: {
          automatic: {
            balance: 2500,
            memberNumber: 'RR000016',
          },
          status: 'fresh',
        },
      },
    });
    expect(browserApi.tabs.remove).toHaveBeenCalledWith(tabId);
    coordinator.destroy();
  });

  it('times out only shared-page rows that are still pending', async () => {
    const { browserApi, coordinator, stateRepository } = setup({
      timeoutMs: 1_000,
    });
    const refresh = await coordinator.refreshProgram('southwest', {
      force: true,
    });
    const tabId = tabIdFrom(refresh);

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        pageUrl: 'https://www.southwest.com/loyalty/myaccount/',
        final: false,
        observations: [
          {
            programId: 'southwest',
            result: {
              kind: 'success',
              authState: 'authenticated',
              capture: {
                balance: 20383,
                memberNumber: 'RR000016',
                expiration: {
                  type: 'never',
                  date: null,
                  note: 'No expiration',
                },
              },
              reason: null,
            },
          },
          {
            programId: 'southwestcredit',
            result: {
              kind: 'not_found',
              authState: 'authenticated',
              capture: null,
              reason: 'expiration_not_found',
            },
          },
        ],
      },
      { tab: { id: tabId } },
    );

    await vi.advanceTimersByTimeAsync(1_000);

    expect(await stateRepository.getState()).toMatchObject({
      records: {
        southwest: {
          automatic: { balance: 20383 },
          status: 'fresh',
          error: null,
        },
        southwestcredit: {
          status: 'error',
          error: 'capture_timeout',
        },
      },
    });
    expect(browserApi.tabs.remove).toHaveBeenCalledWith(tabId);
    coordinator.destroy();
  });

  it('keeps a completed shared-page replacement when the user closes the tab', async () => {
    const { coordinator, stateRepository } = setup();
    await stateRepository.saveManualOverride('southwest', {
      balance: 19000,
      memberNumber: 'RR000016',
      expiration: { type: 'never', date: null, note: 'No expiration' },
    });
    const refresh = await coordinator.refreshProgram('southwest', {
      force: true,
      replaceManualOverride: true,
    });
    const tabId = tabIdFrom(refresh);

    await coordinator.handleMessage(
      {
        type: MESSAGE_TYPES.PAGE_OBSERVED,
        pageUrl: 'https://www.southwest.com/loyalty/myaccount/',
        final: false,
        observations: [
          {
            programId: 'southwest',
            result: {
              kind: 'success',
              authState: 'authenticated',
              capture: {
                balance: 20383,
                memberNumber: 'RR000016',
                expiration: {
                  type: 'never',
                  date: null,
                  note: 'No expiration',
                },
              },
              reason: null,
            },
          },
          {
            programId: 'southwestcredit',
            result: {
              kind: 'not_found',
              authState: 'authenticated',
              capture: null,
              reason: 'expiration_not_found',
            },
          },
        ],
      },
      { tab: { id: tabId } },
    );

    coordinator.handleTabRemoved(tabId);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await Promise.resolve();
    }

    expect((await stateRepository.getState()).records.southwest).toMatchObject({
      automatic: { balance: 20383 },
      manualOverride: null,
      status: 'fresh',
    });
    coordinator.destroy();
  });
});
