"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCustomers } from "@/hooks/useCustomers";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Phone, MapPin, Loader2 } from "lucide-react";

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: customers, isLoading, isError } = useCustomers();

  const filtered = customers?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.address ?? "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary">Customers</h1>
          <p className="text-text-secondary font-body mt-1">
            {customers ? `${customers.length} total customers` : "Loading..."}
          </p>
        </div>
        <Button variant="default" className="w-full sm:w-auto flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          New Customer
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input
          type="text"
          placeholder="Search by name, phone, or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-3 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="font-body text-sm">Loading customers...</span>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card className="border-danger/20 bg-danger-soft">
          <CardContent className="py-6 text-center text-danger font-medium">
            Failed to load customers. Please try refreshing.
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-3">🪑</div>
            <p className="font-display font-semibold text-text-primary">No customers found</p>
            <p className="text-sm text-text-secondary font-body mt-1">
              {search ? `No results for "${search}"` : "Add your first customer to get started."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Desktop Table */}
      {!isLoading && filtered.length > 0 && (
        <>
          <div className="hidden md:block rounded-lg border border-border overflow-hidden bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-raised">
                  <th className="text-left px-6 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Phone</th>
                  <th className="text-left px-6 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider hidden lg:table-cell">Address</th>
                  <th className="text-left px-6 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider hidden xl:table-cell">Created</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                    className="hover:bg-surface-raised transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium text-text-primary">{customer.name}</td>
                    <td className="px-6 py-4 text-text-secondary font-mono text-xs">{customer.phone}</td>
                    <td className="px-6 py-4 text-text-secondary hidden lg:table-cell">
                      {customer.address ?? <span className="text-text-muted italic">No address</span>}
                    </td>
                    <td className="px-6 py-4 text-text-muted hidden xl:table-cell text-xs">
                      {new Date(customer.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity text-xs h-7 px-3">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Swipe Card List */}
          <div className="md:hidden space-y-3">
            {filtered.map((customer) => (
              <Card
                key={customer.id}
                onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                className="border border-border bg-surface shadow-sm hover:shadow-pop transition-all cursor-pointer active:scale-[0.99]"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary-soft text-primary font-bold text-sm flex items-center justify-center shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-display font-semibold text-text-primary truncate">{customer.name}</p>
                      </div>
                      <div className="space-y-1 pl-10">
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Phone className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                          <span className="font-mono text-xs">{customer.phone}</span>
                        </div>
                        {customer.address && (
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                            <span className="truncate text-xs">{customer.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {new Date(customer.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
