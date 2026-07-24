import { describe, expect, it, vi } from 'vitest';
import {
  checkForAvailableUpdate,
  isVersionNewer,
  LATEST_RELEASE_API_URL,
  UPDATE_CACHE_KEY,
  UPDATE_CHECK_INTERVAL_MS,
} from '../src/update-check.js';
import { createFakeStorageArea } from './helpers/fake-storage.js';

describe('update availability checks', () => {
  it('compares numeric semantic versions instead of comparing strings', () => {
    expect(isVersionNewer('1.10.0', '1.9.9')).toBe(true);
    expect(isVersionNewer('v2.0.0', '1.99.99')).toBe(true);
    expect(isVersionNewer('1.2.1', '1.2.1')).toBe(false);
    expect(isVersionNewer('1.2.0', '1.2.1')).toBe(false);
    expect(isVersionNewer('1.3.0-beta.1', '1.2.1')).toBe(false);
    expect(isVersionNewer('not-a-version', '1.2.1')).toBe(false);
  });

  it('uses a fresh 24-hour cache without making a request', async () => {
    const now = 1_000_000_000;
    const storageArea = createFakeStorageArea({
      [UPDATE_CACHE_KEY]: {
        checkedAt: now - UPDATE_CHECK_INTERVAL_MS + 1,
        latestVersion: '1.3.0',
      },
    });
    const fetcher = vi.fn(async (_input: string, _init: RequestInit) => ({
      ok: true,
      json: async () => ({ tag_name: 'v9.9.9' }),
    }));

    await expect(
      checkForAvailableUpdate({
        fetcher,
        installedVersion: '1.2.1',
        now,
        storageArea,
      }),
    ).resolves.toBe('1.3.0');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requests, validates, normalizes, and caches the latest release', async () => {
    const now = 1_000_000_000;
    const storageArea = createFakeStorageArea();
    const fetcher = vi.fn(async (_input: string, _init: RequestInit) => ({
      ok: true,
      json: async () => ({ tag_name: 'v1.10.0' }),
    }));

    await expect(
      checkForAvailableUpdate({
        fetcher,
        installedVersion: '1.2.1',
        now,
        storageArea,
      }),
    ).resolves.toBe('1.10.0');
    expect(fetcher).toHaveBeenCalledWith(
      LATEST_RELEASE_API_URL,
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'omit',
        method: 'GET',
        referrerPolicy: 'no-referrer',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(storageArea.snapshot()[UPDATE_CACHE_KEY]).toEqual({
      checkedAt: now,
      latestVersion: '1.10.0',
    });
  });

  it('does not show an alert for the installed or an older release', async () => {
    const now = 1_000_000_000;

    for (const tagName of ['v1.2.1', 'v1.1.9']) {
      const storageArea = createFakeStorageArea();
      const fetcher = vi.fn(async () => ({
        ok: true,
        json: async () => ({ tag_name: tagName }),
      }));

      await expect(
        checkForAvailableUpdate({
          fetcher,
          installedVersion: '1.2.1',
          now,
          storageArea,
        }),
      ).resolves.toBeNull();
    }
  });

  it('fails silently and caches a failed attempt to avoid repeated requests', async () => {
    const now = 1_000_000_000;
    const storageArea = createFakeStorageArea();
    const failingFetcher = vi.fn(async () => {
      throw new Error('offline');
    });

    await expect(
      checkForAvailableUpdate({
        fetcher: failingFetcher,
        installedVersion: '1.2.1',
        now,
        storageArea,
      }),
    ).resolves.toBeNull();
    expect(storageArea.snapshot()[UPDATE_CACHE_KEY]).toEqual({
      checkedAt: now,
      latestVersion: null,
    });

    const retryFetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ tag_name: 'v1.3.0' }),
    }));
    await expect(
      checkForAvailableUpdate({
        fetcher: retryFetcher,
        installedVersion: '1.2.1',
        now: now + 1,
        storageArea,
      }),
    ).resolves.toBeNull();
    expect(retryFetcher).not.toHaveBeenCalled();
  });

  it('aborts a slow request and keeps the ledger path error-free', async () => {
    const now = 1_000_000_000;
    const storageArea = createFakeStorageArea();
    const fetcher = vi.fn(
      async (_input: string, init: RequestInit) =>
        new Promise<never>((_resolve, reject) => {
          init.signal?.addEventListener(
            'abort',
            () => reject(new Error('aborted')),
            { once: true },
          );
        }),
    );

    await expect(
      checkForAvailableUpdate({
        fetcher,
        installedVersion: '1.2.1',
        now,
        storageArea,
        timeoutMs: 1,
      }),
    ).resolves.toBeNull();
    expect(storageArea.snapshot()[UPDATE_CACHE_KEY]).toEqual({
      checkedAt: now,
      latestVersion: null,
    });
  });

  it('ignores malformed release data without removing a known update', async () => {
    const now = 1_000_000_000;
    const storageArea = createFakeStorageArea({
      [UPDATE_CACHE_KEY]: {
        checkedAt: now - UPDATE_CHECK_INTERVAL_MS,
        latestVersion: '1.3.0',
      },
    });
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ tag_name: 'release-next' }),
    }));

    await expect(
      checkForAvailableUpdate({
        fetcher,
        installedVersion: '1.2.1',
        now,
        storageArea,
      }),
    ).resolves.toBe('1.3.0');
    expect(storageArea.snapshot()[UPDATE_CACHE_KEY]).toEqual({
      checkedAt: now,
      latestVersion: '1.3.0',
    });
  });
});
