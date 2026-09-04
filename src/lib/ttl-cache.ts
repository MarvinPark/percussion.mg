type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export function createTTLCache<T>() {
  let entry: CacheEntry<T> | null = null;

  return {
    get(): T | null {
      if (!entry || Date.now() >= entry.expiresAt) {
        return null;
      }
      return entry.value;
    },
    set(value: T, ttlMs: number) {
      entry = { value, expiresAt: Date.now() + ttlMs };
    },
    invalidate() {
      entry = null;
    },
  };
}
