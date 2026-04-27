"use client";

import React, { useState } from "react";
import { useCompletedOrders } from "@/hooks/useOrders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, PackageX, Calendar, Archive } from "lucide-react";
import { StatusBadge } from "@/components/shared/Badges";
import { useDebounce } from "@/hooks/useDebounce";

export default function CompletedOrdersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCompletedOrders(debouncedSearch);

  const orders = data?.pages.flatMap((page) => page.data) || [];
  const totalCount = data?.pages[0]?.count || 0;

  return (
    <div className="h-full flex flex-col pt-4 sm:pt-6 pb-2 px-4 sm:px-6 bg-bg overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight text-text-primary flex items-center gap-2">
            <span className="text-primary bg-primary/10 p-2 rounded-md">
              <Archive className="w-6 h-6" />
            </span>
            Order Archive
          </h1>
          <p className="text-sm text-text-secondary mt-1 ml-1">
            Completed & Cancelled Orders
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
            <Search className="h-4 w-4" />
          </div>
          <Input
            type="text"
            placeholder="Search order #..."
            className="pl-10 bg-surface border-border focus:border-primary focus:ring-primary shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-text-secondary flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p>Loading historical orders...</p>
            </div>
          ) : isError ? (
            <div className="p-12 text-center text-danger flex flex-col items-center justify-center">
              <PackageX className="h-8 w-8 mb-4 opacity-50" />
              <p>Failed to load orders.</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center bg-surface/50">
              <div className="bg-surface-raised w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-border">
                <Search className="h-6 w-6 text-text-muted" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-1">No orders found</h3>
              <p className="text-text-secondary max-w-sm mx-auto">
                {debouncedSearch 
                  ? "No completed or cancelled orders match your search." 
                  : "No completed or cancelled orders exist yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-text-secondary uppercase bg-surface-raised border-b border-border">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-semibold">Order #</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Customer</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Items</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => {
                    const itemCount = order.order_items?.length || 0;
                    return (
                      <tr key={order.id} className="hover:bg-surface-raised/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-text-primary">
                          {order.order_number}
                        </td>
                        <td className="px-6 py-4 text-text-secondary font-medium">
                          {order.customers?.name || "Unknown"}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-6 py-4 text-text-secondary">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </td>
                        <td className="px-6 py-4 text-text-secondary">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 opacity-70" />
                            {new Date(order.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {hasNextPage && (
          <div className="mt-6 flex justify-center pb-6">
            <Button
              variant="secondary"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="bg-surface shadow-sm px-8"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading more...
                </>
              ) : (
                `Load More (${totalCount - orders.length} remaining)`
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
