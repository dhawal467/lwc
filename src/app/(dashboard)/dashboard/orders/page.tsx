"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrders, useDeleteOrder } from "@/hooks/useOrders";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge, StageBadge } from "@/components/shared/Badges";
import { Search, Plus, Zap, Loader2, CalendarClock, Trash2, Trash } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_production", label: "In Production" },
  { value: "on_hold", label: "On Hold" },
  { value: "qc_passed", label: "QC Passed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Row-level Skeleton for the loading state
function SkeletonRow() {
  return (
    <tr>
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-border/50 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <Card className="border border-border">
      <CardContent className="p-4 space-y-3 animate-pulse">
        <div className="flex justify-between">
          <div className="h-4 w-24 bg-border/50 rounded" />
          <div className="h-5 w-20 bg-border/50 rounded-full" />
        </div>
        <div className="h-4 w-36 bg-border/50 rounded" />
        <div className="h-3 w-28 bg-border/50 rounded" />
      </CardContent>
    </Card>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityOnly, setPriorityOnly] = useState(false);

  const { data: orders, isLoading, isError } = useOrders({
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role === 'admin') setIsAdmin(true);
      }
    }
    checkRole();
  }, [supabase]);
  
  const deleteMutation = useDeleteOrder();

  const handleDelete = (orderId: string) => {
    if (window.confirm("Move this order to the Recycle Bin?")) {
      deleteMutation.mutate(orderId, {
        onSuccess: () => alert("Order moved to Recycle Bin"),
        onError: (err) => alert(err.message),
      });
    }
  };

  const filtered = orders?.filter((o) => {
    const customerName = o.customers?.name ?? "";
    const matchSearch =
      !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      customerName.toLowerCase().includes(search.toLowerCase());
    const matchPriority = !priorityOnly || o.priority;
    return matchSearch && matchPriority;
  }) ?? [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary">Orders</h1>
          <p className="text-text-secondary font-body mt-1">
            {orders ? `${filtered.length} order${filtered.length !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          {isAdmin && (
            <Link href="/dashboard/orders/recycle-bin">
              <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2">
                <Trash className="w-4 h-4" />
                Recycle Bin
              </Button>
            </Link>
          )}
          <Link href="/dashboard/orders/new">
            <Button variant="default" className="w-full sm:w-auto flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            type="text"
            placeholder="Search by order # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-ring min-w-[160px]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setPriorityOnly(!priorityOnly)}
          className={`h-10 px-4 rounded-md border text-sm font-medium flex items-center gap-2 transition-colors ${
            priorityOnly
              ? "bg-warning text-text-primary border-warning/80"
              : "bg-surface text-text-secondary border-input hover:border-warning/50"
          }`}
        >
          <Zap className="w-4 h-4" />
          Priority
        </button>
      </div>

      {/* Error State */}
      {isError && (
        <Card className="border-danger/20 bg-danger-soft">
          <CardContent className="py-6 text-center text-danger font-medium">
            Failed to load orders. Please try refreshing.
          </CardContent>
        </Card>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised">
              <th className="text-left px-6 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Order #</th>
              <th className="text-left px-6 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Customer</th>
              <th className="text-left px-6 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Track</th>
              <th className="text-left px-6 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider hidden lg:table-cell">Stage</th>
              <th className="text-left px-6 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider hidden xl:table-cell">Delivery</th>
              <th className="px-6 py-3 text-center font-semibold text-text-secondary text-xs uppercase tracking-wider">Priority</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <p className="text-3xl mb-2">📋</p>
                  <p className="font-medium text-text-secondary">
                    {search || statusFilter !== "all" || priorityOnly
                      ? "No orders match the current filters."
                      : "No orders yet. Create your first one!"}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-surface-raised transition-colors group"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="flex items-center gap-2 w-full h-full"
                    >
                      <span className="font-mono text-xs font-semibold text-primary bg-primary-soft px-2 py-1 rounded group-hover:bg-primary group-hover:text-white transition-colors">
                        {order.order_number}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-medium text-text-primary">
                    <Link href={`/dashboard/orders/${order.id}`} className="block w-full">
                      {order.customers?.name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-raised text-text-secondary border border-border">
                      Track {order.track}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {order.current_stage_key ? (
                      <StageBadge stageKey={order.current_stage_key} />
                    ) : (
                      <span className="text-text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 hidden xl:table-cell">
                    {order.delivery_date ? (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <CalendarClock className="w-3.5 h-3.5 text-text-muted" />
                        {new Date(order.delivery_date).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </div>
                    ) : (
                      <span className="text-text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {order.priority && (
                      <Zap className="w-4 h-4 text-warning inline-block" fill="currentColor" />
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-text-muted hover:text-danger hover:bg-danger/10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(order.id);
                      }}
                      disabled={deleteMutation.isPending && deleteMutation.variables === order.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Swipe Cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="font-medium text-text-secondary">No orders found.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="block"
            >
              <Card className="border border-border bg-surface shadow-sm hover:shadow-pop transition-all active:scale-[0.99] cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary-soft px-2 py-1 rounded">
                          {order.order_number}
                        </span>
                        {order.priority && (
                          <Zap className="w-3.5 h-3.5 text-warning flex-shrink-0" fill="currentColor" />
                        )}
                      </div>
                      <p className="font-medium text-text-primary text-sm truncate">
                        {order.customers?.name ?? "Unknown Customer"}
                      </p>
                      {order.current_stage_key && (
                        <StageBadge stageKey={order.current_stage_key} />
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-text-muted hover:text-danger hover:bg-danger/10 -mt-2 -mr-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(order.id);
                        }}
                        disabled={deleteMutation.isPending && deleteMutation.variables === order.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <StatusBadge status={order.status} />
                      <span className="text-[10px] text-text-muted font-mono">
                        Track {order.track}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
