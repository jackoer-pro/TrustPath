import { Bell } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { TabBar } from "@/components/customer/TabBar";

export default function CustomerLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 justify-center sm:items-center sm:py-8">
      <div className="flex h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-surface sm:h-[860px] sm:rounded-[2.75rem] sm:border sm:border-line sm:shadow-xl">
        <div className="h-1 shrink-0 bg-brand" />
        <header className="flex shrink-0 items-center justify-between px-4 py-3">
          <Logo />
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
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        <TabBar />
        <p className="shrink-0 px-4 pb-2 text-center text-[11px] leading-tight text-muted">
          Concept prototype for the Westpac Innovation and Coding Competition 2026 · Simulated data
        </p>
      </div>
    </div>
  );
}
