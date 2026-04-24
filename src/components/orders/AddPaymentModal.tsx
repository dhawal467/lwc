"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddPayment } from "@/hooks/usePayments";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  currentBalance: number;
  quotedAmount: number | null;
}

export function AddPaymentModal({
  open,
  onOpenChange,
  orderId,
  currentBalance,
  quotedAmount,
}: AddPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<'advance' | 'partial' | 'final'>('advance');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addPayment = useAddPayment(orderId);

  useEffect(() => {
    if (open) {
      setAmount("");
      setType('advance');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    addPayment.mutate(
      {
        amount: amountNum,
        payment_type: type,
        payment_date: date,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: (err: any) => {
          setError(err.message || "Something went wrong.");
        },
      }
    );
  };

  const amountVal = parseFloat(amount) || 0;
  const remainingAfter = currentBalance - amountVal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <form id="add-payment-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹) *</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                ₹
              </div>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-7"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            {amount && !isNaN(amountVal) && (
              <p className="text-xs text-text-muted animate-in fade-in slide-in-from-top-1">
                After this payment, balance will be: <span className="font-semibold text-text-primary">₹{remainingAfter.toLocaleString()}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Payment Type *</Label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-lg border border-border">
              {(['advance', 'partial', 'final'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "py-1.5 text-xs font-semibold rounded-md transition-all capitalize",
                    type === t
                      ? "bg-white text-primary shadow-sm"
                      : "text-text-muted hover:text-text-secondary hover:bg-white/50"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Payment Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Reference #, bank details, etc."
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-soft focus:border-transparent placeholder:text-text-muted transition-all"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-danger-soft border border-danger/20 rounded-md text-xs text-danger font-medium animate-in fade-in zoom-in-95">
              {error}
            </div>
          )}
        </form>

        <DialogFooter className="px-6 pb-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            form="add-payment-form"
            type="submit"
            disabled={addPayment.isPending}
            className="sm:flex-1"
          >
            {addPayment.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              "Record Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
