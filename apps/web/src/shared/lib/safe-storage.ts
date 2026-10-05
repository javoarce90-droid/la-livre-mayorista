type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

/** Reads from Web Storage without ever throwing (private mode, blocked storage, SSR). */
export function safeGetItem(storage: KeyValueStorage | undefined, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes to Web Storage without ever throwing; returns whether it succeeded. */
export function safeSetItem(storage: KeyValueStorage | undefined, key: string, value: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function browserLocalStorage(): KeyValueStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
