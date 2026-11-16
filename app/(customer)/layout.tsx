import { Bell } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { TabBar } from "@/components/customer/TabBar";
import { InsightsPanel } from "@/components/customer/InsightsPanel";

export default function CustomerLayout({ children }: LayoutProps<"/">) {
  return (
    // Phone: one column in a phone-sized frame. Laptop (lg+): full screen, insights on the left, the app on the right.
    <div className="flex flex-1 justify-center sm:items-center sm:py-8 lg:py-0">
      <div className="flex h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-surface sm:h-[860px] sm:rounded-[2.75rem] sm:border sm:border-line sm:shadow-xl lg:h-dvh lg:max-w-none lg:rounded-none lg:border-0 lg:shadow-none">
        <div className="h-1 shrink-0 bg-brand" />
        <header className="flex shrink-0 items-center justify-between px-4 py-3 lg:border-b lg:border-line lg:px-8">
          <div className="flex items-center gap-10">
            <Logo />
            <TabBar top />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-11 w-11 items-center justify-center rounded-full text-navy hover:bg-sunken"
            >
              <Bell className="h-5 w-5" aria-hidden />
            </button>
            <span
              aria-label="Alex Nguyen"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white"
            >
              AN
            </span>
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          <InsightsPanel />
          <main className="flex min-h-0 flex-1 flex-col lg:max-w-[520px] lg:border-l lg:border-line">{children}</main>
        </div>
        <TabBar />
        <p className="shrink-0 px-4 pb-2 text-center text-[11px] leading-tight text-muted">
          Concept prototype for the Westpac Innovation and Coding Competition 2026 · Simulated data
        </p>
      </div>
    </div>
  );
}
