"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { STAGE_COLORS } from "@/lib/design-constants";
import { Zap, Clock, ArrowRight } from "lucide-react";
import { STAGE_CONFIG, StageKey } from "@/lib/fsm/tracks";

interface KanbanCardProps {
  order: any;
}

export function KanbanCard({ order }: KanbanCardProps) {
  const queryClient = useQueryClient();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
    },
    onError: (error: Error) => alert(error.message),
  });

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
  const showAdvance = !(requiresSanding && !isSandingDone) && !isQcCheck;

  // Track dark mode reactively
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

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
    <Link
      href={detailHref}
      className="block relative overflow-hidden rounded-xl aspect-[4/3] group cursor-pointer select-none"
      style={{ borderTop: `4px solid ${stageColorValue}` }}
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

      {/* ── Top-Left: Order Number Badge ── */}
      <div className="absolute top-2.5 left-2.5 z-10">
        <span className="font-mono text-[10px] font-bold text-white/90 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
          {order.order_number}
        </span>
      </div>

      {/* ── Top-Right: Status Icons ── */}
      <div className="absolute top-2.5 right-2.5 z-10 flex gap-1">
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
      </div>

      {/* ── Bottom Metadata Panel ── */}
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white z-10 flex items-end justify-between gap-2">
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
          <p className="text-[10px] text-white/60 leading-tight mt-0.5">📅 {deliveryDate}</p>
        </div>

        {/* Quick Advance Button */}
        {showAdvance && (
          <button
            onClick={handleAdvance}
            disabled={advanceMutation.isPending}
            title="Quick Advance Stage"
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-md transition-colors border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {advanceMutation.isPending ? (
              <span className="text-[10px] font-bold text-white">...</span>
            ) : (
              <ArrowRight className="w-4 h-4 text-white" />
            )}
          </button>
        )}
      </div>
    </Link>
  );
}
