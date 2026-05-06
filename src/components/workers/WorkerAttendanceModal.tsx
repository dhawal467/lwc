"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Worker, useWorkerAttendanceSummary, useAddWorkerAdvance } from "@/hooks/useWorkers";

interface WorkerAttendanceModalProps {
  worker: Worker | null;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-500",
  absent: "bg-gray-300",
  half_day: "bg-yellow-400",
  on_leave: "bg-blue-400",
};

function getMonthDays(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // Start on Monday (0=Mon, 6=Sun)
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days: (Date | null)[] = Array(startOffset).fill(null);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month - 1, d));
  }

  // Pad to full weeks
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function shiftMonth(monthStr: string, delta: number): string {
  const [year, month] = monthStr.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function WorkerAttendanceModal({ worker, onClose }: WorkerAttendanceModalProps) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [currentMonth, setCurrentMonth] = useState(defaultMonth);
  const [showAddAdvance, setShowAddAdvance] = useState(false);
  const [advDate, setAdvDate] = useState(now.toISOString().split("T")[0]);
  const [advAmount, setAdvAmount] = useState("");
  const [advNotes, setAdvNotes] = useState("");

  const { data, isLoading } = useWorkerAttendanceSummary(worker?.id ?? null, currentMonth);
  const addAdvance = useAddWorkerAdvance(worker?.id ?? "");

  const attendance: any[] = data?.attendance ?? [];
  const advances: any[] = data?.advances ?? [];
  const summary = data?.summary ?? { totalShifts: 0, totalAdvances: 0 };

  // Build lookup maps by date string
  const attByDate: Record<string, any> = {};
  attendance.forEach((r) => { attByDate[r.date] = r; });
  const advByDate: Record<string, number> = {};
  advances.forEach((r) => { advByDate[r.date] = (advByDate[r.date] || 0) + Number(r.amount); });

  const days = getMonthDays(currentMonth);

  const handleAddAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(advAmount);
    if (!amount || amount <= 0) return;

    addAdvance.mutate(
      { date: advDate, amount, notes: advNotes.trim() || undefined },
      {
        onSuccess: () => {
          setShowAddAdvance(false);
          setAdvAmount("");
          setAdvNotes("");
        },
      }
    );
  };

  return (
    <Dialog open={!!worker} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-xl font-semibold">
            {worker?.name}
          </DialogTitle>
          <div className="flex items-center gap-3 text-sm text-text-secondary mt-1">
            {worker?.department && <span>{worker.department}</span>}
            {worker?.phone && <span>· {worker.phone}</span>}
          </div>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">

        {/* Month Navigator */}
        <div className="flex items-center justify-between px-1 py-2">
          <button
            onClick={() => setCurrentMonth(shiftMonth(currentMonth, -1))}
            className="p-1.5 rounded-md hover:bg-border/50 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold text-text-primary">
            {formatMonthLabel(currentMonth)}
          </span>
          <button
            onClick={() => setCurrentMonth(shiftMonth(currentMonth, 1))}
            className="p-1.5 rounded-md hover:bg-border/50 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Summary Badges */}
        <div className="flex gap-3 px-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
            🕒 {summary.totalShifts} shifts
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            ₹ {Number(summary.totalAdvances).toLocaleString()} advances
          </span>
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
          </div>
        ) : (
          <div className="mt-2">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-text-muted py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((date, i) => {
                if (!date) {
                  return <div key={`empty-${i}`} className="aspect-square" />;
                }

                const dateStr = date.toISOString().split("T")[0];
                const att = attByDate[dateStr];
                const advTotal = advByDate[dateStr];
                const isToday = dateStr === now.toISOString().split("T")[0];

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "aspect-square relative rounded-md border flex flex-col items-center justify-center p-0.5",
                      isToday ? "border-primary/50 bg-primary/5" : "border-border bg-surface",
                      att ? "" : "opacity-60"
                    )}
                  >
                    <span className={cn("text-[10px] font-semibold", isToday ? "text-primary" : "text-text-secondary")}>
                      {date.getDate()}
                    </span>

                    {att && (
                      <>
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full mt-0.5",
                            STATUS_COLORS[att.status] || "bg-gray-300"
                          )}
                        />
                        {att.shifts_worked > 0 && (
                          <span className="text-[8px] text-text-muted leading-tight">{att.shifts_worked}s</span>
                        )}
                      </>
                    )}

                    {advTotal && (
                      <div className="absolute top-0.5 right-0.5 bg-orange-400 text-white rounded-full w-3 h-3 flex items-center justify-center">
                        <span className="text-[7px] font-bold">₹</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-[10px] text-text-muted px-1 mt-1">
          {[
            { color: "bg-green-500", label: "Present" },
            { color: "bg-yellow-400", label: "Half day" },
            { color: "bg-gray-300", label: "Absent" },
            { color: "bg-blue-400", label: "On leave" },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1">
              <span className={cn("w-2 h-2 rounded-full", color)} />
              {label}
            </span>
          ))}
        </div>

        {/* Advances Section */}
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Advances This Month</h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowAddAdvance(!showAddAdvance)}
              className="h-7 text-xs gap-1"
            >
              {showAddAdvance ? <X size={12} /> : <Plus size={12} />}
              {showAddAdvance ? "Cancel" : "Add Advance"}
            </Button>
          </div>

          {showAddAdvance && (
            <form onSubmit={handleAddAdvance} className="bg-surface-raised border border-border rounded-lg p-3 mb-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="adv-date" className="text-xs">Date</Label>
                  <Input
                    id="adv-date"
                    type="date"
                    value={advDate}
                    onChange={(e) => setAdvDate(e.target.value)}
                    className="h-8 text-xs mt-0.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="adv-amount" className="text-xs">Amount (₹)</Label>
                  <Input
                    id="adv-amount"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="500"
                    value={advAmount}
                    onChange={(e) => setAdvAmount(e.target.value)}
                    className="h-8 text-xs mt-0.5"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="adv-notes" className="text-xs">Notes (optional)</Label>
                <Input
                  id="adv-notes"
                  placeholder="Reason, etc."
                  value={advNotes}
                  onChange={(e) => setAdvNotes(e.target.value)}
                  className="h-8 text-xs mt-0.5"
                />
              </div>
              <Button type="submit" size="sm" className="w-full h-7 text-xs" disabled={addAdvance.isPending}>
                {addAdvance.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Record Advance
              </Button>
            </form>
          )}

          {advances.length === 0 ? (
            <p className="text-xs text-text-muted italic">No advances recorded this month.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-raised border-b border-border">
                    <th className="text-left px-3 py-2 text-text-secondary font-semibold">Date</th>
                    <th className="text-right px-3 py-2 text-text-secondary font-semibold">Amount</th>
                    <th className="text-left px-3 py-2 text-text-secondary font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map((adv: any) => (
                    <tr key={adv.id} className="border-b border-border last:border-0 hover:bg-surface-raised/50 transition-colors">
                      <td className="px-3 py-2 text-text-secondary">{new Date(adv.date).toLocaleDateString("en-IN")}</td>
                      <td className="px-3 py-2 text-right font-semibold text-orange-700">₹{Number(adv.amount).toLocaleString()}</td>
                      <td className="px-3 py-2 text-text-muted">{adv.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
