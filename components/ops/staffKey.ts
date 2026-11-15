"use client";

import { useSyncExternalStore } from "react";

// Staff / demo key: kept for this browser tab only (sessionStorage), with an in-memory fallback when storage is
// blocked. /demo and its /ops iframe are same-origin in one tab, so they share it; the storage event keeps both live.
const STORAGE_KEY = "trustpath-staff-key";
let memo: string | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function read() {
  if (memo === null) {
    try {
      memo = sessionStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      memo = "";
    }
  }
  return memo;
}

export function saveStaffKey(k: string) {
  memo = k;
  try {
    sessionStorage.setItem(STORAGE_KEY, k);
  } catch {}
  notify();
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    memo = e.newValue ?? "";
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export const useStaffKey = () => useSyncExternalStore(subscribe, read, () => "");
