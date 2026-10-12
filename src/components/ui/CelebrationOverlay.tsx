"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface CelebrationOverlayProps {
  show: boolean;
  title?: string;
  subtitle?: string;
  onDone?: () => void;
  durationMs?: number;
}

export function CelebrationOverlay({
  show,
  title = "Order Completed!",
  subtitle = "All stages finished & ready for dispatch.",
  onDone,
  durationMs = 2800,
}: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      triggerHaptic([40, 60, 100]); // Dual tactile burst
      const t = setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, durationMs);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [show, durationMs, onDone]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4">
      {/* Backdrop flash */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in-0 duration-300" />

      {/* Floating Celebration Card */}
      <div className="relative bg-surface border-2 border-primary/40 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center max-w-sm animate-in zoom-in-90 duration-300">
        <div className="w-16 h-16 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-3 animate-bounce shadow-md">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
          <span>🎉</span> {title}
        </h3>
        <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-success bg-success-soft px-3 py-1 rounded-full border border-success/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Milestone Achieved</span>
        </div>
      </div>
    </div>
  );
}
