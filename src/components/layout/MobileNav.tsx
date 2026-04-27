"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Columns,
  ClipboardList,
  Users,
  HardHat,
  Settings,
  BadgeDollarSign,
  Trash,
  Activity,
  LogOut,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Context ──────────────────────────────────────────────────
interface DrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const DrawerContext = createContext<DrawerContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function useDrawer() {
  return useContext(DrawerContext);
}

// ── Provider (wraps the entire dashboard layout on mobile) ───
export function MobileDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close when navigating
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <DrawerContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((p) => !p),
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
}

// ── Primary nav (always visible on mobile bottom bar) ────────
const PRIMARY_NAV = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Kanban", href: "/dashboard/kanban", icon: Columns },
  { name: "Orders", href: "/dashboard/orders", icon: ClipboardList },
  { name: "Workers", href: "/dashboard/workers", icon: HardHat },
];

// ── All nav items for the drawer ─────────────────────────────
const GENERAL_NAV = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Kanban Board", href: "/dashboard/kanban", icon: Columns },
  { name: "Orders", href: "/dashboard/orders", icon: ClipboardList },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Workers", href: "/dashboard/workers", icon: HardHat },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const ADMIN_NAV = [
  { name: "Finance", href: "/dashboard/finance", icon: BadgeDollarSign },
  { name: "Recycle Bin", href: "/dashboard/orders/recycle-bin", icon: Trash },
  { name: "System Logs", href: "/dashboard/admin/logs", icon: Activity },
];

// ── Shared NavLink helper ────────────────────────────────────
function DrawerNavLink({
  href,
  icon: Icon,
  name,
  pathname,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  name: string;
  pathname: string | null;
  onClick?: () => void;
}) {
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all",
        isActive
          ? "bg-primary text-white shadow-sm"
          : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {name}
    </Link>
  );
}

// ── Full-screen Drawer ───────────────────────────────────────
export function MobileDrawer() {
  const { isOpen, close } = useDrawer();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("Staff");

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role, name")
          .eq("id", user.id)
          .single();
        if (profile?.role === "admin") {
          setIsAdmin(true);
          setUserRole("Admin");
        }
        if (profile?.name) setUserName(profile.name);
        else if (user.email) setUserName(user.email.split("@")[0]);
      }
    }
    if (isOpen) loadUser();
  }, [isOpen, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer panel — slides up from bottom */}
      <div
        className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 z-[70] bg-bg rounded-t-3xl border-t border-border shadow-2xl",
          "transition-transform duration-300 ease-out",
          "flex flex-col max-h-[88vh]",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-border/50">
          <h2 className="font-display font-bold text-lg text-primary">FurnitureMFG</h2>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links — scrollable */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-1">
          {GENERAL_NAV.map((item) => (
            <DrawerNavLink key={item.href} {...item} pathname={pathname} onClick={close} />
          ))}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1 px-4">
                <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
                  Admin
                </p>
              </div>
              {ADMIN_NAV.map((item) => (
                <DrawerNavLink key={item.href} {...item} pathname={pathname} onClick={close} />
              ))}
            </>
          )}
        </div>

        {/* Footer: user + logout */}
        <div className="shrink-0 border-t border-border px-4 py-4 pb-safe space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {userName[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate capitalize">{userName}</p>
              <p className="text-xs text-text-muted capitalize">{userRole}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-danger hover:bg-danger/10 rounded-xl transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

// ── Bottom Tab Bar ───────────────────────────────────────────
export function MobileNav() {
  const pathname = usePathname();
  const { toggle } = useDrawer();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-surface/90 backdrop-blur-md border-t border-border flex items-stretch justify-around px-1 pb-safe">
      {PRIMARY_NAV.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 space-y-0.5 text-[10px] font-semibold transition-colors py-2 px-1",
              isActive ? "text-primary" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <item.icon
              className={cn(
                "w-5 h-5 transition-transform",
                isActive && "scale-110"
              )}
            />
            <span>{item.name}</span>
          </Link>
        );
      })}

      {/* "More" button opens drawer */}
      <button
        onClick={toggle}
        className="flex flex-col items-center justify-center flex-1 space-y-0.5 text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors py-2 px-1"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
        <span>More</span>
      </button>
    </div>
  );
}
