"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ShieldCheck, ShoppingBag, UserRound } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", Icon: House },
  { href: "/store", label: "Shop", Icon: ShoppingBag },
  { href: "/protect", label: "Protect", Icon: ShieldCheck },
  { href: "/me", label: "Me", Icon: UserRound },
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex shrink-0 border-t border-line">
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 border-t-2 py-2 text-xs font-medium ${
              active ? "border-brand text-navy" : "border-transparent text-muted hover:text-navy"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
