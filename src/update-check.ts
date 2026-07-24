import type { StorageAreaLike } from './types.js';

export const UPDATE_CACHE_KEY = 'pointsTrackerUpdateCache';
export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1_000;
export const UPDATE_CHECK_TIMEOUT_MS = 4_000;
export const LATEST_RELEASE_API_URL =
  'https://api.github.com/repos/itswcl/PointsTracker/releases/latest';
export const LATEST_RELEASE_URL =
  'https://github.com/itswcl/PointsTracker/releases/latest';

interface UpdateCache {
  checkedAt: number;
  latestVersion: string | null;
}

interface UpdateFetchResponse {
  readonly ok: boolean;
  json(): Promise<unknown>;
}

export type UpdateFetcher = (
  input: string,
  init: RequestInit,
) => Promise<UpdateFetchResponse>;

interface CheckForUpdateOptions {
  readonly storageArea: StorageAreaLike;
  readonly installedVersion: string;
  readonly fetcher?: UpdateFetcher;
  readonly now?: number;
  readonly timeoutMs?: number;
}

function normalizedVersion(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) return null;

  const parts = match.slice(1).map(Number);
  if (parts.some((part) => !Number.isSafeInteger(part))) return null;
  return parts.join('.');
}

type VersionParts = readonly [number, number, number];

function versionParts(value: string): VersionParts | null {
  const normalized = normalizedVersion(value);
  if (!normalized) return null;
  const [major, minor, patch] = normalized.split('.').map(Number);
  if (major === undefined || minor === undefined || patch === undefined) {
    return null;
  }
  return [major, minor, patch];
}

export function isVersionNewer(
  candidateVersion: string,
  installedVersion: string,
): boolean {
  const candidate = versionParts(candidateVersion);
  const installed = versionParts(installedVersion);
  if (!candidate || !installed) return false;

  for (const index of [0, 1, 2] as const) {
    if (candidate[index] > installed[index]) return true;
    if (candidate[index] < installed[index]) return false;
  }
  return false;
}

function normalizedCache(value: unknown): UpdateCache | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const checkedAt = Reflect.get(value, 'checkedAt');
  const rawLatestVersion = Reflect.get(value, 'latestVersion');
  const latestVersion =
    rawLatestVersion === null ? null : normalizedVersion(rawLatestVersion);

  if (
    typeof checkedAt !== 'number' ||
    !Number.isFinite(checkedAt) ||
    checkedAt < 0 ||
    (rawLatestVersion !== null && latestVersion === null)
  ) {
    return null;
  }

  return { checkedAt, latestVersion };
}

function availableVersion(
  latestVersion: string | null,
  installedVersion: string,
): string | null {
  return latestVersion &&
    isVersionNewer(latestVersion, installedVersion)
    ? latestVersion
    : null;
}

async function readCache(
  storageArea: StorageAreaLike,
): Promise<UpdateCache | null> {
  try {
    const stored = await storageArea.get(UPDATE_CACHE_KEY);
    return normalizedCache(stored[UPDATE_CACHE_KEY]);
  } catch {
    return null;
  }
}

async function writeCache(
  storageArea: StorageAreaLike,
  cache: UpdateCache,
): Promise<void> {
  try {
    await storageArea.set({ [UPDATE_CACHE_KEY]: cache });
  } catch {
    // Update checking must never interfere with the local ledger.
  }
}

function releaseVersion(value: unknown): string | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return normalizedVersion(Reflect.get(value, 'tag_name'));
}

export async function checkForAvailableUpdate({
  storageArea,
  installedVersion,
  fetcher = globalThis.fetch.bind(globalThis),
  now = Date.now(),
  timeoutMs = UPDATE_CHECK_TIMEOUT_MS,
}: CheckForUpdateOptions): Promise<string | null> {
  const cache = await readCache(storageArea);
  const cacheAge = cache ? now - cache.checkedAt : null;
  if (
    cache &&
    cacheAge !== null &&
    cacheAge >= 0 &&
    cacheAge < UPDATE_CHECK_INTERVAL_MS
  ) {
    return availableVersion(cache.latestVersion, installedVersion);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(LATEST_RELEASE_API_URL, {
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        Accept: 'application/vnd.github+json',
      },
      method: 'GET',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });

    if (!response.ok) {
      await writeCache(storageArea, {
        checkedAt: now,
        latestVersion: cache?.latestVersion ?? null,
      });
      return availableVersion(cache?.latestVersion ?? null, installedVersion);
    }

    const latestVersion = releaseVersion(await response.json());
    await writeCache(storageArea, {
      checkedAt: now,
      latestVersion: latestVersion ?? cache?.latestVersion ?? null,
    });
    return availableVersion(
      latestVersion ?? cache?.latestVersion ?? null,
      installedVersion,
    );
  } catch {
    await writeCache(storageArea, {
      checkedAt: now,
      latestVersion: cache?.latestVersion ?? null,
    });
    return availableVersion(cache?.latestVersion ?? null, installedVersion);
  } finally {
    clearTimeout(timeout);
  }
}
