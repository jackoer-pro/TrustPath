import { formatAUD } from "@/lib/money";

export function Money({ cents, className = "" }: { cents: number; className?: string }) {
  return <span className={`tabular-nums font-semibold ${className}`}>{formatAUD(cents)}</span>;
}
