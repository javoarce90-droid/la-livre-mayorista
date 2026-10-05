import { safeGetItem, safeSetItem } from "@/shared/lib/safe-storage";

export const PVP_MODE_KEY = "lalivre:pvp-mode";

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

/** "Modo PVP" hides net prices and discounts; persisted per browser. */
export function readPvpMode(storage: KeyValueStorage | undefined): boolean {
  return safeGetItem(storage, PVP_MODE_KEY) === "1";
}

export function writePvpMode(storage: KeyValueStorage | undefined, enabled: boolean): void {
  safeSetItem(storage, PVP_MODE_KEY, enabled ? "1" : "0");
}
