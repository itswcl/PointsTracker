export function createFakeStorageArea(initial = {}) {
  let values = structuredClone(initial);

  return {
    async get(keys) {
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
    async set(update) {
      values = { ...values, ...structuredClone(update) };
    },
    snapshot() {
      return structuredClone(values);
    },
  };
}

