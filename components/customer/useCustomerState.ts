"use client";

import { useEffect, useState } from "react";
import type { CustomerState } from "@/lib/banking/state";

const POLL_MS = 2000;

/** Polls /api/customer/state every 2 s (paused while the tab is hidden). Keeps the last good state on errors. */
export function useCustomerState() {
  const [state, setState] = useState<CustomerState | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/customer/state", { cache: "no-store" });
        const body = await res.json();
        if (!alive) return;
        if (body.ok) {
          setState(body.data);
          setError(false);
        } else setError(true);
      } catch {
        if (alive) setError(true);
      }
    }

    load();
    const timer = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  return { state, error };
}
