"use client";

import { useCallback, useSyncExternalStore } from "react";
import { browserLocalStorage } from "@/shared/lib/safe-storage";
import { PVP_MODE_KEY, readPvpMode, writePvpMode } from "./pvp-mode";

const CHANGE_EVENT = "lalivre:pvp-mode-change";

/** In-tab value, so the toggle still works when storage is blocked. */
let sessionValue: boolean | null = null;

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== PVP_MODE_KEY) return;
    sessionValue = null;
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => sessionValue ?? readPvpMode(browserLocalStorage());
const getServerSnapshot = () => false;

/** Browser-persisted "Modo PVP" flag, synced across components and tabs. */
export function usePvpMode(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setEnabled = useCallback((value: boolean) => {
    sessionValue = value;
    writePvpMode(browserLocalStorage(), value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [enabled, setEnabled];
}
