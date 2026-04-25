"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Columns, ClipboardList, Users, HardHat, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Kanban", href: "/dashboard/kanban", icon: Columns },
  { name: "Orders", href: "/dashboard/orders", icon: ClipboardList },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Workers", href: "/dashboard/workers", icon: HardHat },
  { name: "More", href: "/dashboard/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-surface/80 backdrop-blur-md border-t border-border flex items-center justify-around px-2 pb-safe">
      {navigation.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 text-[11px] font-medium transition-colors",
              isActive ? "text-primary" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <item.icon className="w-5 h-5 mb-0.5" />
            <span>{item.name}</span>
          </Link>
        )
      })}
    </div>
  );
}
