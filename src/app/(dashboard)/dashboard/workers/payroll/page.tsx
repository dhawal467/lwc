"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Banknote,
  HandCoins,
  CheckCircle2,
  Calendar,
  Search,
  Filter,
  ArrowUpRight,
  Printer,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePayroll, useSettlePayroll, WorkerPayrollRecord, Worker } from "@/hooks/useWorkers";
import { WorkerAttendanceModal } from "@/components/workers/WorkerAttendanceModal";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import { toast } from "sonner";

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function shiftMonth(monthStr: string, delta: number): string {
  const [year, month] = monthStr.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthTitle(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatDateRange(startDateStr?: string, endDateStr?: string): string {
  if (!startDateStr || !endDateStr) return "";
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const sDay = String(start.getDate()).padStart(2, "0");
  const sMon = start.toLocaleDateString("en-IN", { month: "short" });
  const eDay = String(end.getDate()).padStart(2, "0");
  const eMon = end.toLocaleDateString("en-IN", { month: "short" });
  const year = end.getFullYear();
  return `${sDay} ${sMon} – ${eDay} ${eMon} ${year}`;
}

export default function PayrollLedgerPage() {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedWorkerForModal, setSelectedWorkerForModal] = useState<Worker | null>(null);
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);

  const { data, isLoading, isError, refetch } = usePayroll(selectedMonth);
  const settleMutation = useSettlePayroll(selectedMonth);

  const allWorkersSettled =
    data?.workers &&
    data.workers.length > 0 &&
    data.workers.every((w) => w.isSettled);

  const handleSettleMonth = () => {
    if (!data?.workers || data.workers.length === 0) {
      toast.error("No workers found to settle for this month.");
      return;
    }
    settleMutation.mutate(
      {
        settle_all: true,
        records: data.workers.map((w) => ({
          worker_id: w.id,
          month: selectedMonth,
          shifts_count: w.shifts,
          daily_rate: w.dailyRate,
          gross_wage: w.gross,
          advances_deducted: w.advances,
          net_paid: w.netPayable,
          carryover_balance: w.carryover,
        })),
      },
      {
        onSuccess: () => {
          setShowSettleConfirm(false);
        },
      }
    );
  };

  const handlePrevMonth = () => {
    triggerHaptic(20);
    setSelectedMonth((prev) => shiftMonth(prev, -1));
  };

  const handleNextMonth = () => {
    triggerHaptic(20);
    setSelectedMonth((prev) => shiftMonth(prev, 1));
  };

  const handleResetMonth = () => {
    triggerHaptic(20);
    setSelectedMonth(currentMonthStr);
  };

  const totals = data?.totals || {
    totalGross: 0,
    totalAdvances: 0,
    totalNetPayable: 0,
    totalShifts: 0,
  };

  const filteredWorkers = useMemo(() => {
    if (!data?.workers) return [];
    return data.workers.filter((worker) => {
      const matchesSearch =
        worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (worker.phone && worker.phone.includes(searchQuery));

      if (!matchesSearch) return false;

      if (statusFilter === "all") return true;
      if (statusFilter === "payable") return worker.netPayable > 0;
      if (statusFilter === "carryover") return worker.carryover > 0;
      if (statusFilter === "settled") return worker.status === "settled";
      if (statusFilter === "inactive") return worker.shifts === 0 && worker.advances === 0;

      return true;
    });
  }, [data?.workers, searchQuery, statusFilter]);

  const openWorkerModal = (worker: WorkerPayrollRecord) => {
    triggerHaptic(25);
    setSelectedWorkerForModal({
      id: worker.id,
      name: worker.name,
      department: worker.department,
      phone: worker.phone,
      active: true,
    });
  };

  const isCurrentMonth = selectedMonth === currentMonthStr;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/workers"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors min-h-[44px] -ml-2 px-2 rounded-lg hover:bg-surface-raised active:scale-[0.98]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Workers Roster</span>
            </Link>
            <span className="text-text-muted">/</span>
            <span className="text-sm font-semibold text-text-primary">Wage & Advance Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary">
            Artisan Wage Settlement Ledger
          </h1>
          <p className="text-sm text-text-secondary">
            Monthly shift aggregation, cash advance reconciliations, and net artisan disbursements.
          </p>
        </div>

        {/* Month Switcher Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-surface border border-border rounded-xl p-1 shadow-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="h-10 w-10 sm:h-9 sm:w-9 p-0 rounded-lg hover:bg-surface-raised active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="px-3 py-1 text-center min-w-[140px]">
              <div className="text-sm font-bold text-text-primary">
                {formatMonthTitle(selectedMonth)}
              </div>
              <div className="text-[11px] text-text-muted font-mono">
                {formatDateRange(data?.startDate, data?.endDate)}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="h-10 w-10 sm:h-9 sm:w-9 p-0 rounded-lg hover:bg-surface-raised active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {!isCurrentMonth && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetMonth}
              className="gap-1.5 min-h-[44px] sm:min-h-[36px] rounded-xl border-border hover:bg-surface-raised"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Current Month</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 min-h-[44px] sm:min-h-[36px] rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-raised"
            title="Print or export PDF ledger"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print Ledger</span>
          </Button>

          {/* Settle Month Button */}
          {!isLoading && totals.totalShifts > 0 && (
            <Button
              variant={allWorkersSettled ? "secondary" : "default"}
              size="sm"
              onClick={() => {
                triggerHaptic(20);
                setShowSettleConfirm(true);
              }}
              disabled={settleMutation.isPending}
              className={`gap-1.5 min-h-[44px] sm:min-h-[36px] rounded-xl font-medium shadow-xs ${
                allWorkersSettled
                  ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
              title="Freeze monthly payroll figures to prevent drift"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{allWorkersSettled ? "Settled (Re-freeze)" : "Settle Month"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 4 Summary Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Shifts */}
        <Card className="border border-border/80 bg-surface shadow-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-text-secondary mb-2">
              <span className="text-xs sm:text-sm font-medium">Total Shifts</span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-display text-text-primary tracking-tight">
              {isLoading ? "—" : `${totals.totalShifts} shifts`}
            </div>
            <div className="text-[11px] sm:text-xs text-text-muted mt-1 flex items-center gap-1">
              <span>Across all artisans in {formatMonthTitle(selectedMonth)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Gross Wages */}
        <Card className="border border-border/80 bg-surface shadow-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-text-secondary mb-2">
              <span className="text-xs sm:text-sm font-medium">Gross Wages</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-text-primary tracking-tight">
              {isLoading ? "—" : formatINR(totals.totalGross)}
            </div>
            <div className="text-[11px] sm:text-xs text-text-muted mt-1">
              <span>Earned before cash deductions</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Advances Deducted */}
        <Card className="border border-border/80 bg-surface shadow-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-text-secondary mb-2">
              <span className="text-xs sm:text-sm font-medium">Advances Deducted</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <HandCoins className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 tracking-tight">
              {isLoading ? "—" : formatINR(totals.totalAdvances)}
            </div>
            <div className="text-[11px] sm:text-xs text-text-muted mt-1">
              <span>Cash advances issued in month</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Net Payable */}
        <Card className="border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-xs shadow-[inset_0_1px_0_0_rgba(16,185,129,0.15)]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 mb-2">
              <span className="text-xs sm:text-sm font-semibold">Net Payable</span>
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {isLoading ? "—" : formatINR(totals.totalNetPayable)}
            </div>
            <div className="text-[11px] sm:text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1 font-medium">
              <span>Final settlement balance due</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search artisan name, department, or phone..."
            className="pl-9 bg-background border-border min-h-[44px] sm:min-h-[38px] rounded-lg text-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-medium text-text-muted flex items-center gap-1 pl-1">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </span>
          {[
            { id: "all", label: "All Artisans" },
            { id: "payable", label: "Payable" },
            { id: "carryover", label: "Carryover" },
            { id: "settled", label: "Settled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic(15);
                setStatusFilter(tab.id);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors min-h-[44px] sm:min-h-[32px] flex items-center justify-center",
                statusFilter === tab.id
                  ? "bg-primary text-primary-text shadow-xs"
                  : "bg-surface-raised text-text-secondary hover:text-text-primary hover:bg-surface-raised/80"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card className="border border-border p-12 text-center bg-surface">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-text-secondary">
              Calculating monthly artisan wages and cash advance ledger...
            </p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Card className="border border-danger/30 bg-danger/5 p-6 text-center">
          <div className="flex flex-col items-center justify-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-danger" />
            <p className="text-sm font-semibold text-danger">Failed to load payroll ledger</p>
            <p className="text-xs text-text-secondary">Please check your permissions and connection.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              className="mt-2 min-h-[44px]"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State when no shifts recorded in the month */}
      {!isLoading && !isError && totals.totalShifts === 0 && (
        <Card className="border border-border/80 bg-surface shadow-sm rounded-2xl p-8 sm:p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-inner">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold font-display text-text-primary">
                No Shifts Recorded for {formatMonthTitle(selectedMonth)}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                There are no attendance or shift records logged for active artisans during this month.
                You can mark daily shifts or log cash advances from the daily roster.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/dashboard/workers" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto min-h-[44px] gap-2 shadow-sm rounded-xl">
                  <Clock className="w-4 h-4" />
                  <span>Open Daily Attendance Roster</span>
                </Button>
              </Link>
              {!isCurrentMonth && (
                <Button
                  variant="secondary"
                  onClick={handleResetMonth}
                  className="w-full sm:w-auto min-h-[44px] rounded-xl"
                >
                  Jump to Current Month
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Active Data: Desktop Table (`hidden md:block`) */}
      {!isLoading && !isError && totals.totalShifts > 0 && (
        <div className="space-y-4">
          <div className="hidden md:block rounded-xl border border-border/80 bg-surface shadow-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-surface-raised/40 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    <th className="py-3.5 px-4">Artisan</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4 text-right">Daily Rate</th>
                    <th className="py-3.5 px-4 text-right">Shifts</th>
                    <th className="py-3.5 px-4 text-right">Gross Wage</th>
                    <th className="py-3.5 px-4 text-right">Cash Advances</th>
                    <th className="py-3.5 px-4 text-right">Net Payable</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  {filteredWorkers.map((worker) => {
                    const isPayable = worker.netPayable > 0;
                    const hasCarryover = worker.carryover > 0;

                    return (
                      <tr
                        key={worker.id}
                        onClick={() => openWorkerModal(worker)}
                        className="hover:bg-surface-raised/50 cursor-pointer transition-colors group"
                      >
                        {/* Artisan */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {worker.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-text-primary group-hover:text-primary transition-colors flex items-center gap-1.5">
                                <span>{worker.name}</span>
                                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                              </div>
                              <div className="text-xs text-text-muted">
                                {worker.phone || "No phone"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4">
                          <Badge variant="secondary" className="bg-surface-raised text-xs font-normal">
                            {worker.department}
                          </Badge>
                        </td>

                        {/* Daily Rate */}
                        <td className="py-3.5 px-4 text-right font-mono text-text-secondary">
                          {formatINR(worker.dailyRate)}
                          <span className="text-[11px] text-text-muted">/day</span>
                        </td>

                        {/* Shifts */}
                        <td className="py-3.5 px-4 text-right font-semibold text-text-primary">
                          {worker.shifts}
                        </td>

                        {/* Gross Wage */}
                        <td className="py-3.5 px-4 text-right font-mono text-text-primary font-medium">
                          {formatINR(worker.gross)}
                        </td>

                        {/* Cash Advances */}
                        <td className="py-3.5 px-4 text-right font-mono">
                          {worker.advances > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              -{formatINR(worker.advances)}
                            </span>
                          ) : (
                            <span className="text-text-muted">₹0</span>
                          )}
                        </td>

                        {/* Net Payable */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {isPayable ? (
                            <span className="text-emerald-600 dark:text-emerald-400 text-base">
                              {formatINR(worker.netPayable)}
                            </span>
                          ) : (
                            <span className="text-text-muted">₹0</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {worker.isSettled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Settled
                            </span>
                          ) : hasCarryover ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              Carryover: {formatINR(worker.carryover)}
                            </span>
                          ) : isPayable ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              Payable
                            </span>
                          ) : worker.shifts > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                              Settled
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-normal bg-surface-raised text-text-muted">
                              No Activity
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table Footer Totals Row */}
                <tfoot>
                  <tr className="border-t-2 border-border/90 bg-surface-raised/60 font-semibold text-sm text-text-primary">
                    <td className="py-4 px-4 font-bold" colSpan={3}>
                      Total ({filteredWorkers.length} Artisans)
                    </td>
                    <td className="py-4 px-4 text-right font-bold font-mono">
                      {totals.totalShifts}
                    </td>
                    <td className="py-4 px-4 text-right font-bold font-mono text-primary">
                      {formatINR(totals.totalGross)}
                    </td>
                    <td className="py-4 px-4 text-right font-bold font-mono text-amber-600 dark:text-amber-400">
                      {totals.totalAdvances > 0 ? `-${formatINR(totals.totalAdvances)}` : "₹0"}
                    </td>
                    <td className="py-4 px-4 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400 text-base">
                      {formatINR(totals.totalNetPayable)}
                    </td>
                    <td className="py-4 px-4 text-center text-xs text-text-muted">
                      Full Month Settlement
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Mobile View (`md:hidden`): Stacked Card Layout with 44px Touch Targets */}
          <div className="md:hidden space-y-3">
            {filteredWorkers.map((worker) => {
              const isPayable = worker.netPayable > 0;
              const hasCarryover = worker.carryover > 0;

              return (
                <Card
                  key={worker.id}
                  onClick={() => openWorkerModal(worker)}
                  className="border border-border/80 bg-surface shadow-xs active:scale-[0.99] transition-transform rounded-xl cursor-pointer"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Top Header: Name, Department & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                          {worker.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-text-primary text-base">
                            {worker.name}
                          </div>
                          <div className="text-xs text-text-muted">
                            {worker.department} {worker.phone ? `• ${worker.phone}` : ""}
                          </div>
                        </div>
                      </div>

                      {worker.isSettled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Settled
                        </span>
                      ) : hasCarryover ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          Carryover: {formatINR(worker.carryover)}
                        </span>
                      ) : isPayable ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          Payable
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal bg-surface-raised text-text-muted">
                          {worker.shifts > 0 ? "Settled" : "No Shifts"}
                        </span>
                      )}
                    </div>

                    {/* 4-Stat Metric Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                      <div className="bg-surface-raised/40 p-2 rounded-lg">
                        <span className="text-text-muted block text-[11px]">Daily Rate</span>
                        <span className="font-mono font-medium text-text-primary">
                          {formatINR(worker.dailyRate)}/day
                        </span>
                      </div>

                      <div className="bg-surface-raised/40 p-2 rounded-lg">
                        <span className="text-text-muted block text-[11px]">Shifts Worked</span>
                        <span className="font-semibold text-text-primary">
                          {worker.shifts} shifts
                        </span>
                      </div>

                      <div className="bg-surface-raised/40 p-2 rounded-lg">
                        <span className="text-text-muted block text-[11px]">Gross Wage</span>
                        <span className="font-mono font-medium text-text-primary">
                          {formatINR(worker.gross)}
                        </span>
                      </div>

                      <div className="bg-surface-raised/40 p-2 rounded-lg">
                        <span className="text-text-muted block text-[11px]">Cash Advance</span>
                        <span className={cn(
                          "font-mono font-medium",
                          worker.advances > 0 ? "text-amber-600 dark:text-amber-400" : "text-text-muted"
                        )}>
                          {worker.advances > 0 ? `-${formatINR(worker.advances)}` : "₹0"}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Net Payable & Touch Target Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <div>
                        <span className="text-xs text-text-muted block">Net Due</span>
                        <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {formatINR(worker.netPayable)}
                        </span>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        className="min-h-[44px] px-3 gap-1.5 text-xs rounded-xl border-border hover:bg-surface-raised"
                      >
                        <span>History & Advances</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Artisan Attendance & Advance Modal */}
      {selectedWorkerForModal && (
        <WorkerAttendanceModal
          worker={selectedWorkerForModal}
          onClose={() => {
            setSelectedWorkerForModal(null);
            refetch();
          }}
        />
      )}

      {/* Settle Month Confirmation Dialog */}
      <Dialog open={showSettleConfirm} onOpenChange={setShowSettleConfirm}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Settle & Freeze Payroll</DialogTitle>
                <DialogDescription className="mt-1">
                  Freeze artisan wage settlement for{" "}
                  <strong>{formatMonthTitle(selectedMonth)}</strong>?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="text-xs text-text-secondary bg-surface-raised p-3 rounded-lg space-y-1.5 border border-border">
            <p>
              • <strong>Immutable Snapshot:</strong> All {data?.workers?.length || 0} artisan figures (total net payable:{" "}
              <strong>{formatINR(totals.totalNetPayable)}</strong>) will be permanently saved.
            </p>
            <p>
              • <strong>Audit Integrity:</strong> Future edits to past attendance or advances will not mutate this month&apos;s settlement.
            </p>
          </div>

          <DialogFooter className="flex sm:flex-row gap-2 justify-end mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowSettleConfirm(false)}
              disabled={settleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSettleMonth}
              disabled={settleMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {settleMutation.isPending ? "Freezing..." : "Confirm & Settle Month"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
