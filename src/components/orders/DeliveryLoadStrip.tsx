"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isBefore, isWithinInterval, addDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronUp, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  item_count: number;
  status: string;
  owner_name: string;
  delivery_date: string;
}

interface WeekData {
  weekStart: string;
  weekEnd: string;
  orders: Order[];
}

interface DeliveryLoadStripProps {
  highlightWeek?: string;
}

// Sentinel key for the overdue/backlog panel
const OVERDUE_KEY = "__overdue__";

export function DeliveryLoadStrip({ highlightWeek }: DeliveryLoadStripProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["delivery-load"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/delivery-load");
      if (!res.ok) {
        const errBody = await res.text();
        console.error("Delivery load API failed:", res.status, errBody);
        throw new Error("Failed to fetch delivery load");
      }
      return res.json() as Promise<{ weeks: WeekData[]; backlog: Order[] }>;
    },
  });

  if (isLoading) {
    return <div className="h-[120px] animate-pulse bg-surface-raised rounded-xl"></div>;
  }

  if (isError || !data) {
    return (
      <div className="text-danger p-4 text-center flex flex-col gap-2">
        <p>Failed to load delivery schedule.</p>
        <p className="text-xs opacity-70">{(error as any)?.message || "Unknown error"}</p>
      </div>
    );
  }

  const today = startOfDay(new Date());
  const threeDaysFromNow = addDays(today, 3);
  const backlog = data.backlog || [];

  // Height scaling includes backlog so a large overdue pile dominates visually
  const maxOrders = Math.max(
    ...data.weeks.map(w => w.orders.length),
    backlog.length,
    1
  );

  const isOverdueExpanded = expandedKey === OVERDUE_KEY;

  // Helper to colour-classify an order row in the expanded panel
  function orderStatusColor(deliveryDate: string | null) {
    if (!deliveryDate) return "text-emerald-500";
    try {
      const d = startOfDay(parseISO(deliveryDate));
      if (isBefore(d, today)) return "text-danger";
      if (isBefore(d, addDays(threeDaysFromNow, 1))) return "text-amber-500";
    } catch {}
    return "text-emerald-500";
  }

  // Shared order row renderer (used for both backlog and weekly panels)
  function OrderRow({ o }: { o: Order }) {
    const statusColor = orderStatusColor(o.delivery_date);
    return (
      <Link
        href={`/dashboard/orders/${o.id}`}
        key={o.id}
        className="flex items-center justify-between p-2 bg-surface-raised rounded-lg border border-border/50 text-sm hover:bg-surface transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-primary bg-primary-soft px-1.5 py-0.5 rounded">
            {o.order_number}
          </span>
          <span className="font-medium text-text-primary truncate max-w-[150px]">
            {o.customer_name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase text-text-muted hidden sm:inline-block">
            {o.status.replace(/_/g, " ")}
          </span>
          <span className={cn("text-xs font-bold whitespace-nowrap", statusColor)}>
            {o.delivery_date ? format(parseISO(o.delivery_date), "MMM d") : "TBD"}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Bar Chart Row ─────────────────────────────────── */}
      <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar items-end h-[120px]">

        {/* ── OVERDUE bar (only if there is backlog) ── */}
        {backlog.length > 0 && (() => {
          const heightPx = Math.max(16, Math.floor((backlog.length / maxOrders) * 80));
          return (
            <div className="flex flex-col items-center gap-2 flex-shrink-0 min-w-[60px]">
              {/* Pulsing urgency label above the bar */}
              <div className="text-[10px] text-danger font-bold whitespace-nowrap -mb-1 animate-pulse flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />
                {backlog.length}
              </div>

              <button
                onClick={() => setExpandedKey(isOverdueExpanded ? null : OVERDUE_KEY)}
                className={cn(
                  "w-full max-w-[40px] rounded-t-md rounded-b-sm overflow-hidden flex flex-col justify-end transition-all cursor-pointer hover:opacity-80 ring-offset-2 ring-offset-background",
                  isOverdueExpanded ? "ring-2 ring-danger" : "ring-1 ring-danger/40"
                )}
                style={{ height: heightPx }}
                title={`${backlog.length} overdue order${backlog.length !== 1 ? "s" : ""}`}
              >
                {/* Solid danger bar — all overdue orders are red */}
                <div className="bg-danger w-full h-full" />
              </button>

              <span className="text-[10px] text-danger font-bold tracking-tighter whitespace-nowrap">
                OVERDUE
              </span>
            </div>
          );
        })()}

        {/* ── Divider between overdue and upcoming ── */}
        {backlog.length > 0 && (
          <div className="w-px self-stretch bg-border/60 mx-1 flex-shrink-0 rounded-full" />
        )}

        {/* ── Weekly bars ── */}
        {data.weeks.map((week) => {
          let isHighlighted = false;
          if (highlightWeek) {
            try {
              isHighlighted = isWithinInterval(parseISO(highlightWeek), {
                start: parseISO(week.weekStart),
                end: parseISO(week.weekEnd),
              });
            } catch {}
          }

          const total = week.orders.length;
          let redCount = 0, amberCount = 0, greenCount = 0;

          week.orders.forEach(o => {
            if (!o.delivery_date) { greenCount++; return; }
            try {
              const d = startOfDay(parseISO(o.delivery_date));
              if (isBefore(d, today)) redCount++;
              else if (isBefore(d, addDays(threeDaysFromNow, 1))) amberCount++;
              else greenCount++;
            } catch { greenCount++; }
          });

          const heightPx = total === 0 ? 4 : Math.max(16, Math.floor((total / maxOrders) * 80));
          const isExpanded = expandedKey === week.weekStart;

          return (
            <div key={week.weekStart} className="flex flex-col items-center gap-2 flex-1 min-w-[60px]">
              {isHighlighted && (
                <div className="text-[10px] text-primary font-bold whitespace-nowrap -mb-1 animate-pulse">
                  {total} due
                </div>
              )}

              <button
                onClick={() => setExpandedKey(isExpanded ? null : week.weekStart)}
                className={cn(
                  "w-full max-w-[40px] rounded-t-md rounded-b-sm overflow-hidden flex flex-col justify-end transition-all cursor-pointer hover:opacity-80 ring-offset-2 ring-offset-background",
                  isHighlighted ? "ring-2 ring-primary animate-pulse" : "",
                  isExpanded ? "ring-2 ring-border" : ""
                )}
                style={{ height: heightPx }}
                title={`${total} orders`}
              >
                {total > 0 ? (
                  <>
                    {greenCount > 0 && <div className="bg-emerald-500 w-full" style={{ flex: greenCount }} />}
                    {amberCount > 0 && <div className="bg-amber-500 w-full" style={{ flex: amberCount }} />}
                    {redCount > 0 && <div className="bg-danger w-full" style={{ flex: redCount }} />}
                  </>
                ) : (
                  <div className="bg-surface-raised w-full h-full" />
                )}
              </button>

              <span className="text-[10px] text-text-secondary font-medium tracking-tighter whitespace-nowrap">
                {format(parseISO(week.weekStart), "MMM d")}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Expanded Panel ─────────────────────────────────── */}
      {expandedKey && (
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-3">
            {expandedKey === OVERDUE_KEY ? (
              <h3 className="font-semibold text-sm flex items-center gap-2 text-danger">
                <AlertTriangle className="w-4 h-4" />
                {backlog.length} Overdue Order{backlog.length !== 1 ? "s" : ""}
              </h3>
            ) : (
              <h3 className="font-semibold text-sm">
                Orders for week of {format(parseISO(expandedKey), "MMMM d, yyyy")}
              </h3>
            )}
            <button
              onClick={() => setExpandedKey(null)}
              className="text-text-muted hover:text-text-primary"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {expandedKey === OVERDUE_KEY ? (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {backlog.map(o => <OrderRow key={o.id} o={o} />)}
            </div>
          ) : (
            (() => {
              const weekOrders = data.weeks.find(w => w.weekStart === expandedKey)?.orders || [];
              return weekOrders.length === 0 ? (
                <p className="text-sm text-text-muted italic">No orders scheduled for delivery this week.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {weekOrders.map(o => <OrderRow key={o.id} o={o} />)}
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
