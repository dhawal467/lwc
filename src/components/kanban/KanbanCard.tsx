"use client";

import React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { STAGE_COLORS } from "@/lib/design-constants";
import { Zap, Clock, CalendarDays, ArrowRight, Package } from "lucide-react";
import { STAGE_CONFIG, StageKey } from "@/lib/fsm/tracks";

interface KanbanCardProps {
  order: any;
}

export function KanbanCard({ order }: KanbanCardProps) {
  const queryClient = useQueryClient();
  const isItemCard = order.type === "item";

  const advanceMutation = useMutation({
    mutationFn: async () => {
      // Item cards hit the item-scoped endpoint; order cards hit the order endpoint
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
  const startedAt = new Date(currentStage.started_at).getTime();
  const now = new Date().getTime();
  const ageInHours = (now - startedAt) / (1000 * 60 * 60);
  const isStalled = ageInHours > 48;

  const isPriority = order.priority;

  const baseClasses = "block bg-surface rounded-lg shadow-sm p-4 relative transition-all duration-200 hover:shadow-md hover:-translate-y-0.5";
  const priorityClasses = isPriority ? "shadow-pop" : "";
  const stallClasses = isStalled ? "border-2 border-danger bg-danger-soft/20" : "border border-border";

  const isSandingDone = currentStage.sanding_complete;
  const isQcCheck = stageKey === "qc_check";

  const showAdvance = !(requiresSanding && !isSandingDone) && !isQcCheck;

  const handleAdvance = (e: React.MouseEvent) => {
    e.preventDefault();
    advanceMutation.mutate();
  };

  // Item cards always link to their parent order detail page
  const detailHref = `/dashboard/orders/${order.id}`;

  return (
    <Link
      href={detailHref}
      className={`${baseClasses} ${priorityClasses} ${stallClasses}`}
      style={{ borderTopWidth: "4px", borderTopColor: stageColor.light }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-sm w-fit shrink-0">
              {order.order_number}
            </span>
            {isItemCard && order.item_name && (
              <>
                <span className="text-text-muted text-xs shrink-0">·</span>
                <span className="text-xs font-semibold text-text-secondary truncate max-w-[110px]">
                  {order.item_name}
                </span>
              </>
            )}
          </div>
          <span className="font-medium text-text-primary text-sm truncate max-w-[160px]">
            {order.customers?.name || "Unknown Customer"}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isItemCard && (
            <div className="bg-surface-raised p-1 rounded-md border border-border" title="Item card">
              <Package className="w-3.5 h-3.5 text-text-muted" />
            </div>
          )}
          {isPriority && (
            <div className="bg-red-100 p-1.5 rounded-full" title="High Priority">
              <Zap className="w-4 h-4 text-red-600 fill-current" />
            </div>
          )}
        </div>
      </div>

      {/* Body: Track & Stalled indicator */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
          Track {order.track}
        </Badge>
        {isStalled && (
          <div className="flex items-center gap-1 text-danger text-xs font-semibold" title="Stalled for over 48 hours">
            <Clock className="w-3.5 h-3.5" />
            {Math.floor(ageInHours / 24)}d stalled
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-text-secondary text-xs border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : "TBD"}</span>
        </div>

        {showAdvance && (
          <button
            onClick={handleAdvance}
            disabled={advanceMutation.isPending}
            className="flex items-center gap-1.5 px-2 py-1 bg-surface hover:bg-primary-soft text-primary font-medium rounded-md transition-colors border border-border hover:border-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Quick Advance Stage"
          >
            {advanceMutation.isPending ? "..." : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </Link>
  );
}
