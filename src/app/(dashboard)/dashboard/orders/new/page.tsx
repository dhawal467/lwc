"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomers } from "@/hooks/useCustomers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type OrderPayload = {
  customer_id: string;
  track: string;
  delivery_date?: string;
  description?: string;
  materials_checklist?: string;
  quoted_amount?: number;
};

type FormToast = { type: "success" | "error"; message: string } | null;

export default function NewOrderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const [toast, setToast] = useState<FormToast>(null);

  const [form, setForm] = useState<OrderPayload>({
    customer_id: "",
    track: "A",
    delivery_date: "",
    description: "",
    materials_checklist: "",
    quoted_amount: undefined,
  });

  const createOrder = useMutation({
    mutationFn: async (payload: OrderPayload) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setToast({ type: "success", message: "Order created successfully!" });
      setTimeout(() => router.push("/dashboard/orders"), 1500);
    },
    onError: (err: Error) => {
      setToast({ type: "error", message: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    if (!form.customer_id) {
      setToast({ type: "error", message: "Please select a customer." });
      return;
    }

    const payload: OrderPayload = {
      customer_id: form.customer_id,
      track: form.track,
      ...(form.delivery_date && { delivery_date: form.delivery_date }),
      ...(form.description && { description: form.description }),
      ...(form.materials_checklist && { materials_checklist: form.materials_checklist }),
      ...(form.quoted_amount && { quoted_amount: form.quoted_amount }),
    };

    createOrder.mutate(payload);
  };

  const update = (key: keyof OrderPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.back()}
          className="shrink-0 h-9 w-9 p-0 flex items-center justify-center rounded-full"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">Create New Order</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Order number will be generated automatically.
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border text-sm font-medium ${
            toast.type === "success"
              ? "bg-success/10 border-success/30 text-success"
              : "bg-danger-soft border-danger/20 text-danger"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <Card className="shadow-sm border border-border bg-surface">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-lg font-display">Order Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-secondary">
                Customer <span className="text-danger">*</span>
              </label>
              {customersLoading ? (
                <div className="h-10 bg-border/40 rounded-md animate-pulse" />
              ) : (
                <select
                  value={form.customer_id}
                  onChange={update("customer_id")}
                  className="w-full h-10 rounded-md border border-input bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                >
                  <option value="">Select a customer…</option>
                  {customers?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.phone}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Track Toggle */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-secondary">
                Production Track <span className="text-danger">*</span>
              </label>
              <div className="flex rounded-md border border-input overflow-hidden w-fit">
                {[
                  { value: "A", label: "Track A — Wood" },
                  { value: "B", label: "Track B — Sofa" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, track: value }))}
                    className={`px-5 py-2 text-sm font-medium transition-colors ${
                      form.track === value
                        ? "bg-primary text-white"
                        : "bg-surface text-text-secondary hover:bg-surface-raised"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-secondary">
                Delivery Date
              </label>
              <Input
                type="date"
                value={form.delivery_date}
                onChange={update("delivery_date")}
                className="w-full"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-secondary">Description</label>
              <textarea
                value={form.description}
                onChange={update("description")}
                placeholder="e.g. 6-seater dining table, dark walnut finish…"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[90px] resize-none"
              />
            </div>

            {/* Materials Checklist */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-secondary">
                Materials Checklist
              </label>
              <textarea
                value={form.materials_checklist}
                onChange={update("materials_checklist")}
                placeholder="List materials needed, one per line…"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[80px] resize-none font-mono text-xs"
              />
            </div>

            {/* Quoted Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-secondary">
                Quoted Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium">₹</span>
                <Input
                  type="number"
                  value={form.quoted_amount ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      quoted_amount: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  placeholder="0.00"
                  className="pl-7 font-mono"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <Button
                type="submit"
                variant="default"
                className="flex-1 sm:flex-none sm:min-w-[160px]"
                disabled={createOrder.isPending}
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create Order"
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                disabled={createOrder.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
