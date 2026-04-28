"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomers } from "@/hooks/useCustomers";
import type { Customer } from "@/hooks/useCustomers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomerFormModal from "@/components/customers/CustomerFormModal";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
  UserPlus,
  ChevronDown,
  X,
} from "lucide-react";

type OrderPayload = {
  customer_id: string;
  delivery_date?: string;
  description?: string;
  materials_checklist?: string;
  quoted_amount?: number;
};

type FormToast = { type: "success" | "error"; message: string } | null;

/* -----------------------------------------------------------
   Creatable Customer Select
----------------------------------------------------------- */
interface CreatableCustomerSelectProps {
  customers: Customer[];
  value: string; // customer id or ""
  onChange: (customerId: string) => void;
  onCreateRequest: (name: string) => void;
  disabled?: boolean;
}

function CreatableCustomerSelect({
  customers,
  value,
  onChange,
  onCreateRequest,
  disabled,
}: CreatableCustomerSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = customers.find((c) => c.id === value) ?? null;

  // Derived filtered list
  const filtered = query.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.phone.includes(query)
      )
    : customers;

  const showCreateOption =
    query.trim().length > 0 &&
    !customers.some((c) => c.name.toLowerCase() === query.toLowerCase().trim());

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(customer: Customer) {
    onChange(customer.id);
    setQuery("");
    setOpen(false);
  }

  function handleClear() {
    onChange("");
    setQuery("");
    setOpen(false);
  }

  function handleInputFocus() {
    setOpen(true);
  }

  function handleCreateClick() {
    const name = query.trim();
    setOpen(false);
    setQuery("");
    onCreateRequest(name);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger / Input area */}
      {selected && !open ? (
        // Shows the selected customer as a pill; clicking opens the dropdown
        <div
          className="flex items-center justify-between h-10 rounded-md border border-input bg-surface px-3 py-2 text-sm text-text-primary cursor-pointer hover:bg-surface-raised transition-colors"
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-primary-soft text-primary font-bold text-xs flex items-center justify-center shrink-0">
              {selected.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium truncate">{selected.name}</span>
            <span className="text-text-muted font-mono text-xs shrink-0">
              {selected.phone}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-1 rounded hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={handleInputFocus}
            placeholder="Search or type a new customer name…"
            disabled={disabled}
            className="w-full h-10 rounded-md border border-input bg-surface pl-9 pr-9 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 transition-colors"
            autoComplete="off"
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-surface border border-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Search field inside dropdown (if selected was previously showing) */}
          {selected && (
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search customers…"
                  autoFocus
                  className="w-full h-9 rounded-md border border-input bg-surface-raised pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          <ul className="max-h-56 overflow-y-auto divide-y divide-border/50 py-1">
            {/* Create option — always on top if search text doesn't exactly match */}
            {showCreateOption && (
              <li>
                <button
                  type="button"
                  onClick={handleCreateClick}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-primary/5 transition-colors text-left group"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <UserPlus className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-text-muted">+ Create</span>{" "}
                    <span className="font-semibold text-text-primary">
                      &ldquo;{query.trim()}&rdquo;
                    </span>
                    <span className="text-text-muted"> as new customer</span>
                  </div>
                </button>
              </li>
            )}

            {/* Filtered customer list */}
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                    c.id === value
                      ? "bg-primary/8 text-primary"
                      : "hover:bg-surface-raised text-text-primary"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-primary-soft text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-text-muted font-mono text-xs">{c.phone}</p>
                  </div>
                </button>
              </li>
            ))}

            {/* Empty state */}
            {filtered.length === 0 && !showCreateOption && (
              <li className="px-4 py-6 text-center text-sm text-text-muted">
                No customers found. Type a name to create one.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------------------------
   New Order Page
----------------------------------------------------------- */
export default function NewOrderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const [toast, setToast] = useState<FormToast>(null);

  // Creatable Modal state
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [prefillName, setPrefillName] = useState("");

  const [form, setForm] = useState<Partial<OrderPayload>>({
    customer_id: "",
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
      setToast({ type: "error", message: "Please select or create a customer." });
      return;
    }

    const payload: OrderPayload = {
      customer_id: form.customer_id!,
      ...(form.delivery_date && { delivery_date: form.delivery_date }),
      ...(form.description && { description: form.description }),
      ...(form.materials_checklist && { materials_checklist: form.materials_checklist }),
      ...(form.quoted_amount && { quoted_amount: form.quoted_amount }),
    };

    createOrder.mutate(payload);
  };

  const update =
    (key: keyof OrderPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  /** Called when user clicks "+ Create '...' as new customer" */
  function handleCreateRequest(name: string) {
    setPrefillName(name);
    setCustomerModalOpen(true);
  }

  /** Called by the modal after a customer is created — auto-select them */
  function handleCustomerCreated(customer: Customer) {
    setForm((prev) => ({ ...prev, customer_id: customer.id }));
  }

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
            {/* Customer — Creatable Select */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-secondary">
                Customer <span className="text-danger">*</span>
              </label>
              {customersLoading ? (
                <div className="h-10 bg-border/40 rounded-md animate-pulse" />
              ) : (
                <CreatableCustomerSelect
                  customers={customers}
                  value={form.customer_id || ""}
                  onChange={(id) => setForm((prev) => ({ ...prev, customer_id: id }))}
                  onCreateRequest={handleCreateRequest}
                  disabled={createOrder.isPending}
                />
              )}
              <p className="text-xs text-text-muted">
                Type a name to search. If the customer doesn&apos;t exist, you&apos;ll see an option to create them instantly.
              </p>
            </div>

            <p className="text-sm text-text-secondary bg-primary-soft/30 p-4 rounded-lg border border-primary/10">
              💡 You&apos;ll add individual items (Sofa, Table, etc.) with their own production tracks after creating this order.
            </p>

            {/* Delivery Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-secondary">Delivery Date</label>
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
              <label className="text-sm font-semibold text-text-secondary">Materials Checklist</label>
              <textarea
                value={form.materials_checklist}
                onChange={update("materials_checklist")}
                placeholder="List materials needed, one per line…"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[80px] resize-none font-mono text-xs"
              />
            </div>

            {/* Quoted Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-secondary">Quoted Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium">
                  ₹
                </span>
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

      {/* Customer Creation Modal — opened from Creatable Select */}
      <CustomerFormModal
        open={customerModalOpen}
        onOpenChange={setCustomerModalOpen}
        initialName={prefillName}
        onCreated={handleCustomerCreated}
      />
    </div>
  );
}
