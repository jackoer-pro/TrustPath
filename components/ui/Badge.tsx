import type { ReactNode } from "react";

/** Colours come from the caller (e.g. "bg-risk-low-bg text-risk-low"); always pair with an icon or text label. */
export function Badge({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium ${className}`}>
      {children}
    </span>
  );
}
