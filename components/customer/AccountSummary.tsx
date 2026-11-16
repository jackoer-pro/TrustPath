import { Money } from "@/components/ui/Money";
import type { CustomerState } from "@/lib/banking/state";

const chip = "min-w-40 rounded-xl border border-line p-3";

export function AccountSummary({ accounts }: { accounts: CustomerState["accounts"] | null }) {
  return (
    <section aria-label="Accounts" className="flex shrink-0 gap-3 overflow-x-auto px-4 lg:hidden">
      {accounts
        ? accounts.map((a) => (
            <div key={a.id} className={`${chip} bg-surface shadow-sm`}>
              <p className="text-sm text-muted">{a.name}</p>
              <Money cents={a.balanceCents} className="font-display text-3xl text-navy" />
              <p className="text-xs text-muted">•••• {a.lastFour}</p>
            </div>
          ))
        : [0, 1].map((i) => <div key={i} aria-hidden className={`${chip} h-[94px] bg-sunken`} />)}
    </section>
  );
}
