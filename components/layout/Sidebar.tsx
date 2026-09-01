"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Wallet,
  Users,
  Settings,
  Bot,
  Calendar,
  MessageCircle,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/payroll", label: "Payroll", icon: Users },
  { href: "/compliance", label: "Compliance", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-neutral-200 bg-neutral-950 text-white">
      <div className="border-b border-neutral-800 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white">
            <Bot className="h-5 w-5 text-neutral-950" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">BackOffice</h1>
            <p className="text-[11px] text-neutral-400">AI Agent</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white text-neutral-950"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-800 p-4 space-y-2">
        <div className="flex items-start gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-3">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.5} />
          <div>
            <p className="text-xs font-medium text-white">WhatsApp</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
              Agent active · mock mode
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded-md px-3 py-2 text-left text-xs text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
