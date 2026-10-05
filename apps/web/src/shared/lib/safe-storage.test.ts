import { describe, expect, it } from "vitest";
import { safeGetItem, safeSetItem } from "./safe-storage";

function memoryStorage(): Pick<Storage, "getItem" | "setItem"> {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

const throwingStorage: Pick<Storage, "getItem" | "setItem"> = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

describe("safe storage", () => {
  it("round-trips values", () => {
    const storage = memoryStorage();
    expect(safeSetItem(storage, "k", "v")).toBe(true);
    expect(safeGetItem(storage, "k")).toBe("v");
  });

  it("returns null when storage is missing", () => {
    expect(safeGetItem(undefined, "k")).toBeNull();
    expect(safeSetItem(undefined, "k", "v")).toBe(false);
  });

  it("swallows storage errors", () => {
    expect(safeGetItem(throwingStorage, "k")).toBeNull();
    expect(safeSetItem(throwingStorage, "k", "v")).toBe(false);
  });
});
