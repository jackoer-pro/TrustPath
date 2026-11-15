// Shared colour mapping for the console: risk/severity → text, badge and the fresh-row flash.
export type Level = "low" | "medium" | "high" | "critical";

export const LEVEL = {
  low: { text: "text-risk-low", badge: "bg-risk-low-bg text-risk-low", dot: "bg-risk-low", flash: "var(--color-risk-low-bg)" },
  medium: { text: "text-risk-medium", badge: "bg-risk-medium-bg text-risk-medium", dot: "bg-risk-medium", flash: "var(--color-risk-medium-bg)" },
  high: { text: "text-risk-high", badge: "bg-risk-high-bg text-risk-high", dot: "bg-risk-high", flash: "var(--color-risk-high-bg)" },
  critical: { text: "text-risk-critical", badge: "bg-risk-critical-bg text-risk-critical", dot: "bg-risk-critical", flash: "var(--color-risk-critical-bg)" },
} as const;

/** Props for a row that flashes when it's new since the last poll. */
export const flash = (isFresh: boolean, level: Level) =>
  isFresh ? { className: "animate-flash", style: { "--flash": LEVEL[level].flash } as React.CSSProperties } : { className: "", style: undefined };

/** Today: 24-hour time with seconds. Earlier: "12 Nov 05:47", so seed history reads as history. */
export const clock = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : `${d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} ${d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
};
