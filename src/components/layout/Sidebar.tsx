"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Columns, ClipboardList, Users, HardHat, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Kanban Board", href: "/dashboard/kanban", icon: Columns },
  { name: "Orders", href: "/dashboard/orders", icon: ClipboardList },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Workers", href: "/dashboard/workers", icon: HardHat },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 flex-col bg-surface border-r border-border">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h1 className="font-display text-2xl font-bold text-primary">FurnitureMFG</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
        {navigation.map((item) => {
          // Simplistic matching for the active state
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md font-body text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary-soft text-primary" 
                  : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center text-primary font-bold">
            M
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-text-primary truncate">Production Manager</p>
            <p className="text-xs text-text-muted truncate">Manager</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 text-danger hover:bg-danger-soft rounded-md transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
