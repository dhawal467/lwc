import React, { useState, useEffect } from "react";
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
  const [activeTab, setActiveTab] = useState(STAGES[0]); // Mobile
  const [focusMode, setFocusMode] = useState<string>("all"); // Desktop
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [dataUpdatedAt]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col pt-4 sm:pt-6 pb-2 px-4 sm:px-6 bg-bg overflow-hidden">
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
      <div className="p-6 text-center text-danger font-medium bg-bg h-full">
        Failed to load the Production Board.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col pt-4 sm:pt-6 pb-2 px-4 sm:px-6 bg-bg overflow-hidden">
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

      {/* Pill Bar (Desktop & Mobile Unified) */}
      <div className="flex overflow-x-auto pb-4 mb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-4 sm:mb-4 gap-2 border-b border-border hide-scrollbar shrink-0">
        {/* "All" is desktop only since mobile is single-column */}
        <button
          onClick={() => setFocusMode("all")}
          className={cn(
            "hidden md:block whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all",
            focusMode === "all"
              ? "bg-text-primary text-white shadow-md"
              : "bg-surface border border-border text-text-secondary hover:bg-surface-raised"
          )}
        >
          All Stages
        </button>

        {STAGES.map((stage) => {
          const count = groupedOrders[stage]?.length || 0;
          const isMobileActive = activeTab === stage;
          const isDesktopActive = focusMode === stage;
          const color = STAGE_COLORS[stage] || { light: "#ccc", text: { light: "#000" } };
          
          return (
            <button
              key={stage}
              onClick={() => {
                setActiveTab(stage);
                setFocusMode(stage);
              }}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all md:hidden",
                isMobileActive
                  ? "shadow-sm border border-transparent"
                  : "bg-surface border border-border text-text-secondary hover:bg-surface-raised"
              )}
              style={isMobileActive ? { backgroundColor: color.light, color: color.text.light } : {}}
            >
              {STAGE_LABELS[stage] || stage} ({count})
            </button>
          );
        })}

        {/* Desktop Pills */}
        {STAGES.map((stage) => {
          const count = groupedOrders[stage]?.length || 0;
          const isDesktopActive = focusMode === stage;
          const color = STAGE_COLORS[stage] || { light: "#ccc", text: { light: "#000" } };
          
          return (
            <button
              key={`desktop-${stage}`}
              onClick={() => setFocusMode(stage)}
              className={cn(
                "hidden md:block whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all",
                isDesktopActive
                  ? "shadow-sm border border-transparent"
                  : "bg-surface border border-border text-text-secondary hover:bg-surface-raised"
              )}
              style={isDesktopActive ? { backgroundColor: color.light, color: color.text.light } : {}}
            >
              {STAGE_LABELS[stage] || stage} ({count})
            </button>
          );
        })}
      </div>

      {/* Mobile Content (Single Column) */}
      <div className="md:hidden flex-1 overflow-y-auto pb-20 custom-scrollbar">
        <div className="flex flex-col gap-3">
           {groupedOrders[activeTab]?.length > 0 ? (
             groupedOrders[activeTab].map((order: any) => (
               <KanbanCard
                 key={`${order.type ?? 'order'}-${order.item_id ?? order.id}`}
                 order={order}
               />
             ))
           ) : (
             <div className="border-2 border-dashed border-border/60 rounded-lg p-8 text-center text-text-secondary text-sm bg-surface/50">
               No orders in this stage
             </div>
           )}
        </div>
      </div>

      {/* Desktop Horizontal Board */}
      <div className="hidden md:flex flex-1 overflow-x-auto gap-6 pb-6 relative custom-scrollbar items-start">
        {STAGES.map((stage) => {
          const orders = groupedOrders[stage] || [];
          const stageColor = STAGE_COLORS[stage] || { light: "#ccc", text: { light: "#000" } };
          
          const isFocused = focusMode === "all" || focusMode === stage;
          
          return (
            <div 
              key={stage} 
              className={cn(
                "flex-shrink-0 w-64 flex flex-col bg-surface/50 rounded-xl overflow-hidden shadow-sm border border-border max-h-full transition-all duration-300",
                !isFocused && "opacity-40 scale-[0.98] pointer-events-none grayscale-[0.5]",
                focusMode === stage && "ring-2 ring-primary shadow-md scale-[1.02] z-10 bg-surface"
              )}
            >
              {/* Column Header */}
              <div 
                className="px-4 py-3 border-b flex justify-between items-center sticky top-0 z-10 bg-gradient-to-b from-white/20 to-transparent backdrop-blur-sm"
                style={{ backgroundColor: stageColor.light, borderColor: 'rgba(0,0,0,0.1)' }}
              >
                <h3 className="font-semibold text-sm tracking-wide" style={{ color: stageColor.text.light }}>
                  {STAGE_LABELS[stage] || stage.replace("_", " ")}
                </h3>
                <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm" style={{ color: stageColor.text.light }}>
                  {orders.length}
                </span>
              </div>
              
              {/* Column Body */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                {orders.length > 0 ? (
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
