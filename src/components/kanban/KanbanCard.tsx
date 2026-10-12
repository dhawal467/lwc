"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { STAGE_COLORS } from "@/lib/design-constants";
import { Zap, Clock, ArrowRight, Printer } from "lucide-react";
import { STAGE_CONFIG, StageKey } from "@/lib/fsm/tracks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import { CelebrationOverlay } from "@/components/ui/CelebrationOverlay";

interface KanbanCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any;
}

export function KanbanCard({ order }: KanbanCardProps) {
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = useState(false);
  const isItemCard = order.type === "item";

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const endpoint = isItemCard
        ? `/api/order-items/${order.item_id}/advance`
        : `/api/orders/${order.id}/advance`;

      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to advance stage");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      triggerHaptic(40);
      const nextStage = data?.stage || data?.current_stage;
      if (nextStage === "dispatch" || nextStage === "completed") {
        setShowCelebration(true);
        toast.success(`🎉 ${order.order_number} reached final stage: Ready for Dispatch!`);
      } else {
        toast.success(`✓ Advanced ${order.order_number} to next stage`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Track dark mode reactively
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const currentStage = order.currentStage;
  if (!currentStage) return null;

  const stageKey = currentStage.stage_key as StageKey;
  const requiresSanding = STAGE_CONFIG[stageKey]?.requiresSanding ?? false;
  const stageColor = STAGE_COLORS[stageKey] || { light: "#ccc", dark: "#999", text: { light: "#000", dark: "#000" } };

  // Aging Logic: > 2 days (48 hours)
  const startedAt = currentStage.started_at ? new Date(currentStage.started_at).getTime() : Date.now();
  const now = Date.now();
  const ageInHours = (now - startedAt) / (1000 * 60 * 60);
  const isStalled = ageInHours > 48;

  const isPriority = order.priority;
  const isSandingDone = currentStage.sanding_complete;
  const isQcCheck = stageKey === "qc_check";
  const isBlocked = order.blocked;
  const showAdvance = !(requiresSanding && !isSandingDone) && !isQcCheck && !isBlocked;

  const stageColorValue = isDark ? stageColor.dark : stageColor.light;

  const handleAdvance = (e: React.MouseEvent) => {
    e.preventDefault();
    advanceMutation.mutate();
  };

  const detailHref = `/dashboard/orders/${order.id}`;

  // Display values
  const itemLabel = order.item_name || order.order_number;
  const quantity = order.quantity;
  const customerName = order.customers?.name || "Unknown Customer";
  const deliveryDate = order.delivery_date
    ? new Date(order.delivery_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "TBD";

  return (
    <>
      <Link
        href={detailHref}
        className={cn(
          "block relative overflow-hidden rounded-xl aspect-[4/3] group cursor-pointer select-none transition-all",
        isBlocked 
          ? "ring-2 ring-danger shadow-[0_0_16px_rgba(220,75,62,0.5)] scale-[1.01]" 
          : "hover:shadow-pop hover:scale-[1.01]"
      )}
      style={{ borderTop: `4px solid ${isBlocked ? "var(--danger, #dc2626)" : stageColorValue}` }}
    >
      {/* ── Background Layer ── */}
      {order.thumbnail_url ? (
        <img
          src={order.thumbnail_url}
          alt={`${order.order_number} thumbnail`}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          draggable={false}
        />
      ) : (
        // Styled placeholder gradient using stage color (dark-mode aware)
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${stageColorValue}cc 0%, ${isDark ? (stageColor.light ?? stageColorValue) : (stageColor.dark ?? stageColorValue)}99 100%)`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-display font-black opacity-10 leading-none tracking-tighter select-none">
              {order.order_number}
            </span>
          </div>
        </div>
      )}

      {/* ── Gradient Overlay ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      {isBlocked && (
        <div className="absolute inset-0 bg-red-950/40 backdrop-blur-[1px] z-[1] flex items-center justify-center p-3 pointer-events-none">
          <div className="bg-danger/95 text-white px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1.5 text-[11px] font-bold tracking-tight">
            <span>🚫</span>
            <span className="uppercase">{order.blocked_reason?.replace(/_/g, ' ') || "BLOCKED"}</span>
          </div>
        </div>
      )}

      {/* ── Top-Left: Order Number Badge ── */}
      <div className="absolute top-2.5 left-2.5 z-10">
        <span className="font-mono text-[10px] font-bold text-white/90 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
          {order.order_number}
        </span>
      </div>

      {/* ── Top-Right: Status Icons ── */}
      <div className="absolute top-2.5 right-2.5 z-10 flex gap-1">
        {isBlocked && (
          <span
            className="bg-danger/90 backdrop-blur-sm text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
            title={`Blocked: ${order.blocked_reason}`}
          >
            🚫
          </span>
        )}
        {isPriority && (
          <span
            className="bg-yellow-500/80 backdrop-blur-sm text-white rounded-full w-6 h-6 flex items-center justify-center"
            title="High Priority"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
          </span>
        )}
        {isStalled && (
          <span
            className="bg-red-500/80 backdrop-blur-sm text-white rounded-full w-6 h-6 flex items-center justify-center"
            title={`Stalled ${Math.floor(ageInHours / 24)}d`}
          >
            <Clock className="w-3.5 h-3.5" />
          </span>
        )}
        {/* Print icon — hover on desktop, always visible on touch */}
        {isItemCard && order.item_id && (
          <button
            title="Print Work Order"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(`/print/items/${order.item_id}`, '_blank');
            }}
            className="opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 bg-black/60 backdrop-blur-sm text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-white/30 transition-all"
            aria-label="Print Work Order"
          >
            <Printer className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Bottom Metadata Panel ── */}
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white z-10 flex items-end justify-between gap-2">
        <div className="flex gap-2 min-w-0 items-end">
          <div 
            className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-bold text-[9px] flex-shrink-0 border border-white/20 mb-0.5"
            title={`Owner: ${order.owner_name || "Unassigned"}`}
          >
            {order.owner_name?.charAt(0) || "U"}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
          {/* Line 1: Item name × quantity */}
          <p className="font-semibold text-sm leading-tight truncate">
            {quantity && quantity > 1 ? (
              <>
                {itemLabel} <span className="font-normal text-white/70">× {quantity}</span>
              </>
            ) : (
              itemLabel
            )}
          </p>

          {/* Line 2: Customer name */}
          <p className="text-xs text-white/80 truncate leading-tight">{customerName}</p>

          {/* Line 3: Delivery date */}
          <p className="text-[10px] text-white/60 leading-tight mt-0.5 flex items-center gap-1">
            📅 {deliveryDate}
          </p>
          {isBlocked && (
            <p className="text-[10px] font-bold text-red-300 leading-tight mt-0.5 truncate max-w-[120px]">
              {order.blocked_reason}
            </p>
          )}
        </div>
      </div>

        {/* Quick Advance Button (Fitts's Law 44px min touch target) */}
        {showAdvance && (
          <button
            onClick={handleAdvance}
            disabled={advanceMutation.isPending}
            title="Quick Advance Stage"
            aria-label="Advance Stage"
            className="flex-shrink-0 flex items-center justify-center w-11 h-11 bg-white/25 hover:bg-white/45 active:scale-95 backdrop-blur-sm rounded-lg transition-all border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {advanceMutation.isPending ? (
              <span className="text-[10px] font-bold text-white animate-pulse">...</span>
            ) : (
              <ArrowRight className="w-5 h-5 text-white" />
            )}
          </button>
        )}
      </div>
    </Link>
    <CelebrationOverlay
      show={showCelebration}
      title={`${order.order_number} Dispatched!`}
      subtitle="Order reached final stage and is ready for dispatch."
      onDone={() => setShowCelebration(false)}
    />
  </>
);
}
