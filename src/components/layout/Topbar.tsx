"use client";

import { User, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useDrawer } from "@/components/layout/MobileNav";
import Link from "next/link";

export function Topbar() {
  const { toggle } = useDrawer();

  return (
    <header className="sticky top-0 z-40 h-16 bg-surface/50 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3">
        {/* Hamburger — visible only on mobile/tablet */}
        <button
          onClick={toggle}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h2 className="font-display font-semibold text-lg lg:text-xl text-text-primary">
          <span className="lg:hidden text-primary font-bold">FurnitureMFG</span>
          <span className="hidden lg:inline text-text-secondary">Dashboard</span>
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Avatar - Navigates to Settings */}
        <Link 
          href="/dashboard/settings"
          className="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all active:scale-95"
          title="User Settings"
        >
          <User className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}
