"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, CheckCircle, AlertCircle } from "lucide-react";
import type { Customer } from "@/hooks/useCustomers";

/* -----------------------------------------------------------
   Types
----------------------------------------------------------- */
interface CustomerFormPayload {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

interface CustomerFormModalProps {
  /** Controls open/closed state */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Pre-fill the name field — useful when the user types a new name in the
   * Creatable Select on the New Order page and hits "+ Create '...'".
   */
  initialName?: string;
  /**
   * Called after a customer is successfully created.
   * Passes the full Customer object so the caller can auto-select it.
   */
  onCreated?: (customer: Customer) => void;
}

type FormError = string | null;

/* -----------------------------------------------------------
   Component
----------------------------------------------------------- */
export default function CustomerFormModal({
  open,
  onOpenChange,
  initialName = "",
  onCreated,
}: CustomerFormModalProps) {
  const queryClient = useQueryClient();

  const defaultForm = (): CustomerFormPayload => ({
    name: initialName,
    phone: "",
    address: "",
    notes: "",
  });

  const [form, setForm] = useState<CustomerFormPayload>(defaultForm);
  const [formError, setFormError] = useState<FormError>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync name field when modal re-opens with a different initialName
  useEffect(() => {
    if (open) {
      setForm({ ...defaultForm(), name: initialName });
      setFormError(null);
      setSuccessMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialName]);

  const update =
    (key: keyof CustomerFormPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  /* ---------- mutation ---------- */
  const createCustomer = useMutation({
    mutationFn: async (payload: CustomerFormPayload) => {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create customer");
      }
      return res.json() as Promise<Customer>;
    },
    onSuccess: (customer) => {
      // Invalidate list so the Customers page refreshes
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSuccessMsg(`"${customer.name}" added successfully!`);
      // Notify parent — e.g. auto-select in New Order form
      onCreated?.(customer);
      // Auto-close after a beat
      setTimeout(() => onOpenChange(false), 1200);
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!form.phone.trim()) {
      setFormError("Phone number is required.");
      return;
    }

    createCustomer.mutate(form);
  };

  const isPending = createCustomer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            New Customer
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new customer to your records.
          </DialogDescription>
        </DialogHeader>

        <form
          id="customer-form"
          onSubmit={handleSubmit}
          className="px-6 py-4 space-y-4 overflow-y-auto"
        >
          {/* Inline feedback */}
          {formError && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 border border-success/30 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="customer-name"
              className="text-sm font-semibold text-text-secondary"
            >
              Full Name <span className="text-danger">*</span>
            </label>
            <Input
              id="customer-name"
              value={form.name}
              onChange={update("name")}
              placeholder="e.g. Rajesh Sharma"
              autoComplete="off"
              disabled={isPending}
              autoFocus
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label
              htmlFor="customer-phone"
              className="text-sm font-semibold text-text-secondary"
            >
              Phone <span className="text-danger">*</span>
            </label>
            <Input
              id="customer-phone"
              type="tel"
              value={form.phone}
              onChange={update("phone")}
              placeholder="e.g. 98765 43210"
              autoComplete="off"
              disabled={isPending}
              className="font-mono"
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label
              htmlFor="customer-address"
              className="text-sm font-semibold text-text-secondary"
            >
              Address
            </label>
            <Input
              id="customer-address"
              value={form.address}
              onChange={update("address")}
              placeholder="e.g. 12, MG Road, Bangalore"
              disabled={isPending}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="customer-notes"
              className="text-sm font-semibold text-text-secondary"
            >
              Notes
            </label>
            <textarea
              id="customer-notes"
              value={form.notes}
              onChange={update("notes")}
              placeholder="Any internal notes about this customer…"
              disabled={isPending}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[80px] resize-none disabled:opacity-60"
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="customer-form"
            variant="default"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Customer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
