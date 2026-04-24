"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOutstandingReport } from "@/hooks/useFinance";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/Badges";
import { Download, ChevronDown, ChevronRight, AlertCircle, ReceiptIndianRupee } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export default function FinancePage() {
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') {
        router.push("/dashboard");
      } else {
        setIsAdmin(true);
      }
    }
    checkAuth();
  }, [router, supabase]);

  const { data, isLoading, isError } = useOutstandingReport();
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

  const toggleCustomer = (customerId: string) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  if (isAdmin === null) {
    return (
      <div className="p-12 flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-danger flex flex-col items-center gap-2 border-2 border-dashed border-danger/20 rounded-xl bg-danger-soft/10">
        <AlertCircle className="w-8 h-8" />
        <span className="font-medium">Failed to load finance report.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary">Finance Overview</h1>
          <p className="text-text-secondary font-body mt-1">
            Track outstanding balances across all customers and orders.
          </p>
        </div>
        <Link href="/api/export?type=finance" target="_blank" rel="noopener noreferrer">
          <Button variant="secondary" className="w-full sm:w-auto gap-2 shadow-sm hover:shadow-md transition-shadow">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-32 bg-surface border border-border rounded-xl"></div>
          <div className="h-96 bg-surface border border-border rounded-xl"></div>
        </div>
      ) : (
        <>
          {/* Summary Bar */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <ReceiptIndianRupee className="w-32 h-32 text-primary rotate-12" />
            </div>
            <CardContent className="p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-10 justify-center relative z-10">
              <div className="flex flex-col items-center sm:items-end text-primary">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Total Outstanding</p>
                <p className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                  {formatCurrency(data?.grand_total_outstanding || 0)}
                </p>
              </div>
              <div className="hidden sm:block w-px h-16 bg-primary/20"></div>
              <div className="flex flex-col items-center sm:items-start">
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1">Across</p>
                <p className="text-2xl font-bold text-text-primary">
                  {data?.total_orders || 0} <span className="text-text-secondary text-lg font-medium">active orders</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Customer Accordion Table */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b border-border text-[11px] uppercase tracking-wider text-text-muted font-bold">
                  <tr>
                    <th className="px-6 py-4 w-12"></th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4 text-center">Orders</th>
                    <th className="px-6 py-4 text-right">Total Quoted</th>
                    <th className="px-6 py-4 text-right">Total Paid</th>
                    <th className="px-6 py-4 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {!data?.customers || data.customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-text-muted">
                          <ReceiptIndianRupee className="w-12 h-12 mb-3 opacity-20" />
                          <p className="text-base font-medium">No outstanding balances.</p>
                          <p className="text-sm mt-1">All customer accounts are settled.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.customers.map((customer: any) => {
                      const isExpanded = expandedCustomers[customer.customer_id];
                      const isSettled = customer.total_balance <= 0;

                      return (
                        <React.Fragment key={customer.customer_id}>
                          {/* Parent Row */}
                          <tr 
                            onClick={() => toggleCustomer(customer.customer_id)}
                            className={cn(
                              "hover:bg-muted/30 transition-colors cursor-pointer group",
                              isExpanded && "bg-muted/10"
                            )}
                          >
                            <td className="px-6 py-4 text-text-muted group-hover:text-primary transition-colors">
                              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-text-primary group-hover:text-primary transition-colors">
                                {customer.customer_name || "Unknown Customer"}
                              </p>
                              {customer.customer_phone && (
                                <p className="text-xs font-medium text-text-muted font-mono mt-0.5">
                                  {customer.customer_phone}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Badge variant="secondary" className="font-mono bg-surface-raised font-bold border-border shadow-sm">
                                {customer.orders?.length || 0}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right text-text-secondary font-semibold">
                              {formatCurrency(customer.total_quoted)}
                            </td>
                            <td className="px-6 py-4 text-right text-primary font-semibold">
                              {formatCurrency(customer.total_paid)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {isSettled ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0.5 font-bold uppercase tracking-tight text-[10px]">
                                  Settled
                                </Badge>
                              ) : (
                                <span className="text-amber-500 font-extrabold text-base">
                                  {formatCurrency(customer.total_balance)}
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Child Rows */}
                          {isExpanded && customer.orders && customer.orders.length > 0 && (
                            <tr>
                              <td colSpan={6} className="p-0 bg-surface-raised/30 border-b border-border">
                                <div className="px-14 py-5 shadow-inner">
                                  <div className="bg-surface border border-border/60 rounded-lg overflow-hidden shadow-sm">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-text-muted font-bold border-b border-border/50">
                                        <tr>
                                          <th className="px-4 py-2.5">Order #</th>
                                          <th className="px-4 py-2.5">Status</th>
                                          <th className="px-4 py-2.5 text-right">Quoted</th>
                                          <th className="px-4 py-2.5 text-right">Paid</th>
                                          <th className="px-4 py-2.5 text-right">Balance</th>
                                          <th className="px-4 py-2.5 text-right">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/30">
                                        {customer.orders.map((order: any) => (
                                          <tr key={order.id || order.order_number} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3 font-mono font-bold text-primary">
                                              {order.order_number}
                                            </td>
                                            <td className="px-4 py-3">
                                              <StatusBadge status={order.status} />
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-text-secondary">
                                              {formatCurrency(order.quoted_amount)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-primary">
                                              {formatCurrency(order.total_paid)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold">
                                              {order.balance_due > 0 ? (
                                                <span className="text-amber-500">{formatCurrency(order.balance_due)}</span>
                                              ) : (
                                                <span className="text-green-600">Settled</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                              <Link 
                                                href={`/dashboard/orders/${order.id || order.order_number}`}
                                                className="inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors border border-input bg-surface hover:bg-surface-raised h-7 px-3 text-text-primary"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                View Order
                                              </Link>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
