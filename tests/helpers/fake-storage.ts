import type { StorageAreaLike } from '../../src/types.js';

export interface FakeStorageArea extends StorageAreaLike {
  get(keys: string | readonly string[] | null): Promise<Record<string, unknown>>;
  snapshot(): Record<string, unknown>;
}

export function createFakeStorageArea(
  initial: Record<string, unknown> = {},
): FakeStorageArea {
  let values = structuredClone(initial);

  return {
    async get(keys: string | readonly string[] | null) {
      if (typeof keys === 'string') {
        return keys in values ? { [keys]: structuredClone(values[keys]) } : {};
      }
      if (Array.isArray(keys)) {
        return Object.fromEntries(
          keys
            .filter((key) => key in values)
            .map((key) => [key, structuredClone(values[key])]),
        );
      }
      return structuredClone(values);
    },
    async set(update: Record<string, unknown>) {
      values = { ...values, ...structuredClone(update) };
    },
    snapshot(): Record<string, unknown> {
      return structuredClone(values);
    },
  };
}
