"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isBefore, isWithinInterval, addDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";

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

export function DeliveryLoadStrip({ highlightWeek }: DeliveryLoadStripProps) {
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["delivery-load"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/delivery-load");
      if (!res.ok) throw new Error("Failed to fetch delivery load");
      return res.json() as Promise<{ weeks: WeekData[] }>;
    },
  });

  if (isLoading) {
    return <div className="h-[120px] animate-pulse bg-surface-raised rounded-xl"></div>;
  }

  if (isError || !data) {
    return <div className="text-danger p-4 text-center">Failed to load delivery schedule.</div>;
  }

  const today = startOfDay(new Date());
  const threeDaysFromNow = addDays(today, 3);

  const maxOrders = Math.max(...data.weeks.map(w => w.orders.length), 1); // Avoid division by 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar items-end h-[120px]">
        {data.weeks.map((week) => {
          let isHighlighted = false;
          if (highlightWeek) {
            try {
              isHighlighted = isWithinInterval(parseISO(highlightWeek), {
                start: parseISO(week.weekStart),
                end: parseISO(week.weekEnd)
              });
            } catch (e) {
              // Ignore parse errors
            }
          }
          
          const total = week.orders.length;
          
          let redCount = 0;
          let amberCount = 0;
          let greenCount = 0;
          
          week.orders.forEach(o => {
            if (!o.delivery_date) {
              greenCount++;
              return;
            }
            try {
              const delDate = startOfDay(parseISO(o.delivery_date));
              if (isBefore(delDate, today)) {
                redCount++;
              } else if (isBefore(delDate, addDays(threeDaysFromNow, 1))) {
                amberCount++;
              } else {
                greenCount++;
              }
            } catch (e) {
              greenCount++;
            }
          });
          
          // Height calc: max 80px
          const heightPx = total === 0 ? 4 : Math.max(16, Math.floor((total / maxOrders) * 80));
          
          const isExpanded = expandedWeek === week.weekStart;
          
          return (
            <div 
              key={week.weekStart}
              className="flex flex-col items-center gap-2 flex-1 min-w-[60px]"
            >
              {isHighlighted && (
                <div className="text-[10px] text-primary font-bold whitespace-nowrap -mb-1 animate-pulse">
                  {total} orders due
                </div>
              )}
              
              <button 
                onClick={() => setExpandedWeek(isExpanded ? null : week.weekStart)}
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

      {expandedWeek && (
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm">
              Orders for week of {format(parseISO(expandedWeek), "MMMM d, yyyy")}
            </h3>
            <button 
              onClick={() => setExpandedWeek(null)}
              className="text-text-muted hover:text-text-primary"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          
          {data.weeks.find(w => w.weekStart === expandedWeek)?.orders.length === 0 ? (
            <p className="text-sm text-text-muted italic">No orders scheduled for delivery this week.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {data.weeks.find(w => w.weekStart === expandedWeek)?.orders.map(o => {
                let statusColor = "text-emerald-500";
                if (o.delivery_date) {
                  try {
                    const delDate = startOfDay(parseISO(o.delivery_date));
                    if (isBefore(delDate, today)) statusColor = "text-danger";
                    else if (isBefore(delDate, addDays(threeDaysFromNow, 1))) statusColor = "text-amber-500";
                  } catch (e) {}
                }

                return (
                  <div key={o.id} className="flex items-center justify-between p-2 bg-surface-raised rounded-lg border border-border/50 text-sm">
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
                        {o.status.replace('_', ' ')}
                      </span>
                      <span className={cn("text-xs font-bold whitespace-nowrap", statusColor)}>
                        {o.delivery_date ? format(parseISO(o.delivery_date), "MMM d") : "TBD"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
