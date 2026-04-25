"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — render nothing until client-side
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <button className="w-8 h-8 rounded-full bg-surface-raised border border-border flex items-center justify-center">
        <span className="text-xs">🌓</span>
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-8 h-8 rounded-full bg-surface-raised border border-border flex items-center justify-center hover:bg-border transition-colors"
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-yellow-500" />
      ) : (
        <Moon className="w-4 h-4 text-text-secondary" />
      )}
    </button>
  );
}
