"use client";

import React, { useState } from "react";
import { usePayments, useDeletePayment } from "@/hooks/usePayments";
import { AddPaymentModal } from "./AddPaymentModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Receipt, 
  History,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentLedgerPanelProps {
  orderId: string;
  isAdmin: boolean;
}

export function PaymentLedgerPanel({ orderId, isAdmin }: PaymentLedgerPanelProps) {
  const { data, isLoading, isError } = usePayments(orderId);
  const deletePayment = useDeletePayment(orderId);
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-8 text-center animate-pulse">
        <div className="h-20 bg-muted rounded-xl mb-6"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-danger flex flex-col items-center gap-2 border-2 border-dashed border-danger/20 rounded-xl bg-danger-soft/10">
        <AlertCircle className="w-8 h-8" />
        <span className="font-medium">Failed to load payment history.</span>
      </div>
    );
  }

  const { payments = [], summary } = data || {};
  const { quoted_amount = 0, total_paid = 0, balance_due = 0 } = summary || {};

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this payment record?")) {
      deletePayment.mutate(id);
    }
  };

  const getBalanceColor = () => {
    if (quoted_amount === null || quoted_amount === 0) return "text-text-muted";
    if (balance_due > 0) return "text-amber-500";
    if (balance_due === 0) return "text-green-500";
    return "text-text-primary";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-4 p-5 bg-surface rounded-xl border border-border shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors"></div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Quoted</p>
          <p className="text-xl font-bold text-text-primary">
            {quoted_amount !== null && quoted_amount !== 0 ? formatCurrency(quoted_amount) : "Not Set"}
          </p>
        </div>
        <div className="space-y-1 border-x border-border px-4">
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Paid</p>
          <p className="text-xl font-bold text-primary">
            {formatCurrency(total_paid)}
          </p>
        </div>
        <div className="space-y-1 pl-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Balance</p>
          <p className={cn("text-xl font-extrabold", getBalanceColor())}>
            {formatCurrency(balance_due)}
          </p>
        </div>
      </div>

      {/* Payment List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-sm font-bold text-text-secondary uppercase tracking-tight">
            <History className="w-4 h-4 text-primary" />
            <h3>Transaction Ledger</h3>
          </div>
          <Badge variant="secondary" className="text-[10px] font-bold">
            {payments.length} Records
          </Badge>
        </div>

        {payments.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-border rounded-xl bg-surface/50">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-6 h-6 text-text-muted opacity-40" />
            </div>
            <p className="text-sm text-text-muted font-medium">No payments recorded yet.</p>
            <p className="text-xs text-text-muted mt-1">Start by clicking the record button below.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-surface shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-text-muted font-bold border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-center">Date</th>
                    <th className="px-4 py-3 text-center">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Notes</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3 whitespace-nowrap text-text-secondary font-medium text-center">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase tracking-tighter px-2 py-0 border-none font-bold",
                            payment.payment_type === 'advance' && "bg-green-100 text-green-700",
                            payment.payment_type === 'partial' && "bg-amber-100 text-amber-700",
                            payment.payment_type === 'final' && "bg-primary-soft text-primary"
                          )}
                        >
                          {payment.payment_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-text-primary">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3 text-text-muted max-w-[180px] truncate italic text-xs">
                        {payment.notes || "-"}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(payment.id)}
                            className="p-1.5 text-text-muted hover:text-danger hover:bg-danger-soft rounded-md transition-all sm:opacity-0 sm:group-hover:opacity-100"
                            title="Delete Payment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end pt-2">
        <Button 
          onClick={() => setModalOpen(true)} 
          className="gap-2 shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </Button>
      </div>

      <AddPaymentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        orderId={orderId}
        currentBalance={balance_due}
        quotedAmount={quoted_amount}
      />
    </div>
  );
}
