"use client";

import { useEffect, useState } from "react";
import type { OpsState } from "@/lib/ops/state";

const POLL_MS = 2000;

/** Polls /api/ops/state every 2 s (paused while hidden). `fresh` = ids that weren't in the previous poll (none on first load). */
export function useOpsState() {
  const [data, setData] = useState<{ state: OpsState; fresh: Set<string> } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    let seen: Set<string> | null = null;

    async function load() {
      if (document.visibilityState === "hidden") return;
      try {
        const body = await (await fetch("/api/ops/state", { cache: "no-store" })).json();
        if (!alive) return;
        if (!body.ok) return setError(true);
        const state = body.data as OpsState;
        const ids = [...state.cardEvents, ...state.incidents, ...state.audit].map((x) => x.id);
        const prev: Set<string> | null = seen;
        const fresh = new Set(prev ? ids.filter((id) => !prev.has(id)) : []);
        seen = new Set(ids);
        setData({ state, fresh });
        setError(false);
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

  return { state: data?.state ?? null, fresh: data?.fresh ?? new Set<string>(), error };
}
