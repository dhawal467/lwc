"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useKanban } from "@/hooks/useKanban";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/design-constants";
import { KanbanCard } from "@/components/kanban/KanbanCard";
import { KanbanSkeleton } from "@/components/kanban/KanbanSkeleton";
import { cn } from "@/lib/utils";

// Kanban Columns (Excluding Sanding as it's a sub-gate usually)
const STAGES = [
  "carpentry",
  "frame_making",
  "polish",
  "upholstery",
  "qc_check",
  "dispatch",
];

export default function KanbanPage() {
  const { data: groupedOrders, isLoading, isError, dataUpdatedAt } = useKanban();
  const [focusMode, setFocusMode] = useState<string>("all");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isDark, setIsDark] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [dataUpdatedAt]);

  // Scroll a specific column into view when a pill is tapped
  const scrollToColumn = useCallback((stage: string) => {
    const el = columnRefs.current.get(stage);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }
  }, []);

  const handlePillClick = useCallback((stage: string) => {
    if (stage === "all") {
      setFocusMode("all");
      // Scroll back to the first column
      const first = columnRefs.current.get(STAGES[0]);
      if (first) {
        first.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      }
    } else {
      setFocusMode(stage);
      scrollToColumn(stage);
    }
  }, [scrollToColumn]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col pt-4 sm:pt-6 pb-2 px-4 sm:px-6 bg-background overflow-hidden">
         {/* Skeleton Header */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
            <h1 className="text-3xl font-display font-semibold tracking-tight text-text-primary flex items-center gap-2">
              <span className="text-primary bg-primary/10 px-2 py-1 rounded-md">📋</span>
              Production Board
            </h1>
         </div>
         <KanbanSkeleton />
      </div>
    );
  }

  if (isError || !groupedOrders) {
    return (
      <div className="p-6 text-center text-danger font-medium bg-background h-full">
        Failed to load the Production Board.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col pt-4 sm:pt-6 pb-2 px-4 sm:px-6 bg-background overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
        <div className="flex items-end gap-4">
          <h1 className="text-3xl font-display font-semibold tracking-tight text-text-primary flex items-center gap-2">
            <span className="text-primary bg-primary/10 px-2 py-1 rounded-md">📋</span>
            Production Board
          </h1>
          {lastUpdated && (
            <span className="text-[10px] text-text-muted mb-1 font-medium">
              Last updated: {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* Unified Pill Bar — All Devices */}
      <div className="flex overflow-x-auto pb-3 mb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-4 sm:mb-4 gap-2 border-b border-border hide-scrollbar shrink-0">
        {/* "All Stages" pill — visible on all devices */}
        <button
          onClick={() => handlePillClick("all")}
          className={cn(
            "whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all",
            focusMode === "all"
              ? "bg-text-primary text-white shadow-md"
              : "bg-surface border border-border text-text-secondary hover:bg-surface-raised"
          )}
        >
          All Stages
        </button>

        {STAGES.map((stage) => {
          const count = groupedOrders[stage]?.length || 0;
          const isActive = focusMode === stage;
          const color = STAGE_COLORS[stage] || { light: "#ccc", dark: "#999", text: { light: "#000", dark: "#000" } };
          const activeBg = isDark ? color.dark : color.light;
          const activeTextColor = isDark ? color.text.dark : color.text.light;
          
          return (
            <button
              key={stage}
              onClick={() => handlePillClick(stage)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all",
                isActive
                  ? "shadow-sm border border-transparent"
                  : "bg-surface border border-border text-text-secondary hover:bg-surface-raised"
              )}
              style={isActive ? { backgroundColor: activeBg, color: activeTextColor } : {}}
            >
              {STAGE_LABELS[stage] || stage} ({count})
            </button>
          );
        })}
      </div>

      {/* Unified Horizontal Board — All Devices */}
      <div
        ref={boardRef}
        className="flex flex-1 overflow-x-auto gap-4 md:gap-6 pb-6 relative custom-scrollbar hide-scrollbar items-start snap-x snap-mandatory scroll-pl-0"
      >
        {STAGES.map((stage) => {
          const orders = groupedOrders[stage] || [];
          const stageColor = STAGE_COLORS[stage] || { light: "#ccc", dark: "#999", text: { light: "#000", dark: "#000" } };
          
          const isFocused = focusMode === "all" || focusMode === stage;
          
          const headerBg = isDark ? stageColor.dark : stageColor.light;
          const headerText = isDark ? stageColor.text.dark : stageColor.text.light;

          return (
            <div 
              key={stage}
              ref={(el) => {
                if (el) columnRefs.current.set(stage, el);
              }}
              className={cn(
                "flex-shrink-0 w-[80vw] max-w-[300px] md:w-72 md:max-w-none flex flex-col bg-surface/50 rounded-xl overflow-hidden shadow-sm border border-border max-h-full transition-all duration-300 snap-start",
                !isFocused && "opacity-40 scale-[0.98] pointer-events-none grayscale-[0.5]",
                focusMode === stage && "ring-2 ring-primary shadow-md scale-[1.02] z-10 bg-surface"
              )}
            >
              {/* Column Header */}
              <div 
                className="px-3 py-2.5 md:px-4 md:py-3 flex justify-between items-center sticky top-0 z-10"
                style={{ backgroundColor: headerBg, borderBottom: `1px solid rgba(0,0,0,0.15)` }}
              >
                <h3 className="font-semibold text-xs md:text-sm tracking-wide" style={{ color: headerText }}>
                  {STAGE_LABELS[stage] || stage.replace("_", " ")}
                </h3>
                <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs font-bold" style={{ color: headerText }}>
                  {orders.length}
                </span>
              </div>
              
              {/* Column Body */}
              <div className="flex-1 overflow-y-auto p-3 md:p-4 flex flex-col gap-3 md:gap-4 custom-scrollbar">
                {orders.length > 0 ? (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  orders.map((order: any) => (
                    <KanbanCard
                      key={`${order.type ?? 'order'}-${order.item_id ?? order.id}`}
                      order={order}
                    />
                  ))
                ) : (
                   <div className="border-2 border-dashed border-border/40 rounded-lg p-6 text-center flex flex-col items-center justify-center opacity-70 mt-4 bg-surface/30">
                     <span className="text-xl mb-2 grayscale">🪹</span>
                     <p className="text-text-secondary text-sm font-medium">No orders in this stage</p>
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
