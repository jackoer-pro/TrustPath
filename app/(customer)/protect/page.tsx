import { CreditCard, LockOpen, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";

// ponytail: static placeholder until Unit 22 (Protect tab) reads live security status.
export default function ProtectPage() {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto bg-sunken p-4">
      <h1 className="font-display text-3xl text-navy">Protect</h1>

      <Card className="flex items-center gap-3 bg-trust-bg p-4">
        <ShieldCheck className="h-8 w-8 text-trust" aria-hidden />
        <div>
          <p className="text-lg font-semibold text-trust">Protected</p>
          <p className="text-sm text-muted">No restrictions on your accounts.</p>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold">Cards</h2>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-navy" aria-hidden />
            Debit •••• 4821
          </span>
          <span className="flex items-center gap-1 text-sm text-risk-low">
            <LockOpen className="h-4 w-4" aria-hidden />
            Active
          </span>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold">Cases</h2>
        <p className="mt-2 text-sm text-muted">No open cases.</p>
      </Card>
    </div>
  );
}
