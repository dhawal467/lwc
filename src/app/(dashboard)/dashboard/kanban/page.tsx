"use client";

import React, { useState } from "react";
import { useKanban } from "@/hooks/useKanban";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/design-constants";
import { KanbanCard } from "@/components/kanban/KanbanCard";
import { KanbanSkeleton } from "@/components/kanban/KanbanSkeleton";

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
  const { data: groupedOrders, isLoading, isError } = useKanban();
  const [activeTab, setActiveTab] = useState(STAGES[0]);
  const [activeDept, setActiveDept] = useState("all");

  const visibleStages = activeDept === "all" ? STAGES : [activeDept];

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <h1 className="text-3xl font-display font-semibold tracking-tight text-text-primary flex items-center gap-2">
          <span className="text-primary bg-primary/10 px-2 py-1 rounded-md">📋</span>
          Production Board
        </h1>
        
        {/* Department Filter */}
        <select 
          value={activeDept}
          onChange={(e) => setActiveDept(e.target.value)}
          className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
        >
          <option value="all">All Departments</option>
          {STAGES.map(stage => (
             <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>
          ))}
        </select>
      </div>

      {/* Mobile Tabs */}
      <div className="md:hidden flex overflow-x-auto pb-4 mb-2 -mx-4 px-4 gap-2 border-b border-border hide-scrollbar shrink-0">
        {visibleStages.map((stage) => {
          const count = groupedOrders[stage]?.length || 0;
          const isActive = activeTab === stage;
          const color = STAGE_COLORS[stage] || { light: "#ccc", text: { light: "#000" } };
          
          return (
            <button
              key={stage}
              onClick={() => setActiveTab(stage)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                isActive 
                  ? "shadow-sm border border-transparent" 
                  : "bg-surface border border-border text-text-secondary hover:bg-surface-raised"
              }`}
              style={isActive ? { backgroundColor: color.light, color: color.text.light } : {}}
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
        {visibleStages.map((stage) => {
          const orders = groupedOrders[stage] || [];
          const stageColor = STAGE_COLORS[stage] || { light: "#ccc", text: { light: "#000" } };
          
          return (
            <div key={stage} className="flex-shrink-0 w-80 flex flex-col bg-surface/50 rounded-xl overflow-hidden shadow-sm border border-border max-h-full">
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
