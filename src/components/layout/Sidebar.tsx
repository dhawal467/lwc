"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Columns, ClipboardList, Users, HardHat, Settings, LogOut, Trash, Activity, BadgeDollarSign, Archive, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV_SECTIONS = [
  {
    category: "Production",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Kanban Board", href: "/dashboard/kanban", icon: Columns },
      { name: "Delivery Calendar", href: "/dashboard/delivery", icon: Calendar },
    ],
  },
  {
    category: "Orders",
    items: [
      { name: "Orders", href: "/dashboard/orders", icon: ClipboardList },
      { name: "Order Archive", href: "/dashboard/orders/completed", icon: Archive },
    ],
  },
  {
    category: "People",
    items: [
      { name: "Customers", href: "/dashboard/customers", icon: Users },
      { name: "Workers", href: "/dashboard/workers", icon: HardHat },
    ],
  },
  {
    category: "Preferences",
    items: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

const ADMIN_ITEMS = [
  { name: "Finance", href: "/dashboard/finance", icon: BadgeDollarSign },
  { name: "Recycle Bin", href: "/dashboard/orders/recycle-bin", icon: Trash },
  { name: "System Logs", href: "/dashboard/admin/logs", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/user/me");
        if (!res.ok) return;
        const data = await res.json();
        setUserName(data.name || "User");
        setUserRole(data.role || "staff");
        if (data.role === "admin") setIsAdmin(true);
      } catch {
        // silently fail — sidebar still renders
      }
    }
    loadUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 flex-col bg-surface border-r border-border">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h1 className="font-display text-2xl font-bold text-primary">FurnitureMFG</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-6 custom-scrollbar" aria-label="Sidebar navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.category} className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              {section.category}
            </p>
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg font-body text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary-soft text-primary font-semibold shadow-xs" 
                      : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
        
        {isAdmin && (
          <div className="space-y-1 pt-2 border-t border-border/60">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Administration
            </p>
            {ADMIN_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg font-body text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary-soft text-primary font-semibold shadow-xs" 
                      : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center text-primary font-bold uppercase">
            {userName ? userName.charAt(0) : "U"}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-text-primary truncate capitalize">{userName}</p>
            <p className="text-xs text-text-muted truncate capitalize">{userRole}</p>
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
