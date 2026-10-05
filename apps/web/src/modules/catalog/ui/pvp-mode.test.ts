import { describe, expect, it } from "vitest";
import { PVP_MODE_KEY, readPvpMode, writePvpMode } from "./pvp-mode";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

describe("PVP mode preference", () => {
  it("defaults to off", () => {
    expect(readPvpMode(memoryStorage())).toBe(false);
    expect(readPvpMode(undefined)).toBe(false);
  });

  it("persists and reads back the preference", () => {
    const storage = memoryStorage();
    writePvpMode(storage, true);
    expect(storage.data.get(PVP_MODE_KEY)).toBe("1");
    expect(readPvpMode(storage)).toBe(true);
    writePvpMode(storage, false);
    expect(readPvpMode(storage)).toBe(false);
  });

  it("never throws when storage is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readPvpMode(blocked)).toBe(false);
    expect(() => writePvpMode(blocked, true)).not.toThrow();
  });
});
