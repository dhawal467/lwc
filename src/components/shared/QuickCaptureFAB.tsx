"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  StickyNote,
  Ban,
  BadgeDollarSign,
  Camera,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderQuickSearch, SearchResult } from "@/components/shared/OrderQuickSearch";
import { Button } from "@/components/ui/button";

// ── Shared constants ──────────────────────────────────────────
const BLOCK_REASONS: Record<string, { label: string; icon: string }> = {
  material_pending:  { label: "Material Pending",   icon: "📦" },
  customer_approval: { label: "Customer Approval",  icon: "👤" },
  worker_unavailable:{ label: "Worker Unavailable", icon: "🔧" },
  payment_pending:   { label: "Payment Pending",    icon: "💰" },
  machine_issue:     { label: "Machine Issue",      icon: "⚙️" },
  other:             { label: "Other",              icon: "❓" },
};

const PAYMENT_TYPES = [
  { id: "advance",  label: "Advance" },
  { id: "partial",  label: "Partial" },
  { id: "final",    label: "Final"   },
] as const;
type PaymentType = typeof PAYMENT_TYPES[number]["id"];

// ── Action types ──────────────────────────────────────────────
type ActionId = "note" | "block" | "payment" | "photo";
interface ActionDef {
  id: ActionId;
  icon: React.ElementType;
  label: string;
  color: string;
}

const ACTIONS: ActionDef[] = [
  { id: "photo",   icon: Camera,          label: "Photo",       color: "bg-violet-500 hover:bg-violet-600" },
  { id: "payment", icon: BadgeDollarSign, label: "Payment",     color: "bg-emerald-500 hover:bg-emerald-600" },
  { id: "block",   icon: Ban,             label: "Block Item",  color: "bg-amber-500 hover:bg-amber-600" },
  { id: "note",    icon: StickyNote,      label: "Quick Note",  color: "bg-sky-500 hover:bg-sky-600" },
];

type ToastState = { type: "success" | "error"; message: string } | null;

// ── Main Component ────────────────────────────────────────────
export function QuickCaptureFAB() {
  const [expanded, setExpanded]         = useState(false);
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);
  const containerRef                    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMainButtonClick = () => {
    setExpanded((p) => !p);
    if (activeAction) setActiveAction(null);
  };

  const handleActionClick = (id: ActionId) => {
    setActiveAction(id);
    setExpanded(false);
  };

  const handleClose = () => {
    setActiveAction(null);
    setExpanded(false);
  };

  return (
    <>
      {/* Backdrop */}
      {activeAction && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={handleClose}
          aria-hidden
        />
      )}

      {/* Modal / bottom-sheet */}
      {activeAction && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[70] lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:max-w-md lg:w-full animate-in slide-in-from-bottom-4 lg:zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-surface rounded-t-3xl lg:rounded-2xl border border-border shadow-2xl">
            {activeAction === "note"    && <NoteFlow    onClose={handleClose} />}
            {activeAction === "block"   && <BlockFlow   onClose={handleClose} />}
            {activeAction === "payment" && <PaymentFlow onClose={handleClose} />}
            {activeAction === "photo"   && <PhotoPlaceholder onClose={handleClose} />}
          </div>
        </div>
      )}

      {/* FAB cluster */}
      <div
        ref={containerRef}
        className="fixed bottom-24 right-6 z-50 lg:bottom-6 flex flex-col items-center gap-3"
      >
        {/* Fan-out action buttons */}
        {ACTIONS.map((action, i) => {
          const Icon = action.icon;
          const delay = i * 40;
          return (
            <div
              key={action.id}
              className={cn(
                "flex items-center gap-2 transition-all duration-300",
                expanded
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-4 pointer-events-none"
              )}
              style={{ transitionDelay: expanded ? `${delay}ms` : `${(ACTIONS.length - 1 - i) * 30}ms` }}
            >
              <span className="text-xs font-semibold text-white bg-gray-800/90 px-2 py-1 rounded shadow whitespace-nowrap">
                {action.label}
              </span>
              <button
                onClick={() => handleActionClick(action.id)}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center shadow-lg text-white transition-transform hover:scale-110 active:scale-95",
                  action.color
                )}
                aria-label={action.label}
              >
                <Icon className="w-5 h-5" />
              </button>
            </div>
          );
        })}

        {/* Main FAB button */}
        <button
          onClick={handleMainButtonClick}
          aria-label={expanded ? "Close quick capture" : "Quick capture"}
          className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-white shadow-xl flex items-center justify-center transition-all duration-300 ring-4 ring-primary/20"
        >
          <Plus className={cn("w-7 h-7 transition-transform duration-300", expanded ? "rotate-45" : "rotate-0")} />
        </button>
      </div>
    </>
  );
}

// ── Modal header ──────────────────────────────────────────────
function ModalHeader({
  icon: Icon,
  iconClass,
  title,
  onClose,
  onBack,
}: {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-0">
      <div className="flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="text-text-muted hover:text-text-primary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
          <Icon className={cn("w-5 h-5", iconClass)} />
          {title}
        </h2>
      </div>
      <button
        onClick={onClose}
        className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface-raised"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium animate-in fade-in",
      toast.type === "success"
        ? "bg-success/10 border-success/30 text-success"
        : "bg-danger-soft border-danger/20 text-danger"
    )}>
      {toast.type === "success"
        ? <CheckCircle className="w-4 h-4 shrink-0" />
        : <AlertCircle className="w-4 h-4 shrink-0" />}
      {toast.message}
    </div>
  );
}

// ── Order chip ────────────────────────────────────────────────
function OrderChip({ order }: { order: SearchResult }) {
  return (
    <div className="flex items-center gap-2 bg-primary-soft/30 border border-primary/20 rounded-lg px-3 py-2">
      <span className="font-mono text-xs font-bold text-primary bg-primary-soft px-1.5 py-0.5 rounded">
        {order.order_number}
      </span>
      <span className="text-sm font-medium text-text-primary truncate">{order.customer_name}</span>
    </div>
  );
}

// ── Note Flow ─────────────────────────────────────────────────
function NoteFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep]           = useState<"search" | "write">("search");
  const [order, setOrder]         = useState<SearchResult | null>(null);
  const [content, setContent]     = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast]         = useState<ToastState>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !content.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to post note");
      setToast({ type: "success", message: "Note added!" });
      setTimeout(onClose, 1200);
    } catch (err: unknown) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 space-y-4">
      <ModalHeader
        icon={StickyNote} iconClass="text-sky-500" title="Quick Note"
        onClose={onClose}
        onBack={step === "write" ? () => { setStep("search"); setOrder(null); } : undefined}
      />
      <Toast toast={toast} />

      {step === "search" && (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Select an order to attach this note to:</p>
          <OrderQuickSearch onSelect={(o) => { setOrder(o); setStep("write"); }} />
        </div>
      )}

      {step === "write" && order && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <OrderChip order={order} />
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-text-secondary">Note</label>
            <textarea
              value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Type your note here…" rows={4} autoFocus
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={!content.trim() || isSubmitting} className="flex-1">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Add Note"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Block Flow ────────────────────────────────────────────────
function BlockFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep]               = useState<"search" | "reason">("search");
  const [order, setOrder]             = useState<SearchResult | null>(null);
  const [item, setItem]               = useState<SearchResult["items"][0] | null>(null);
  const [reason, setReason]           = useState<string>("");
  const [note, setNote]               = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast]             = useState<ToastState>(null);

  const handleOrderSelect = (o: SearchResult, selectedItem?: SearchResult["items"][0]) => {
    setOrder(o);
    if (selectedItem) {
      setItem(selectedItem);
      setStep("reason");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !reason) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/order-items/${item.id}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note: note.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to block item");
      setToast({ type: "success", message: "Item blocked!" });
      setTimeout(onClose, 1200);
    } catch (err: unknown) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 space-y-4">
      <ModalHeader
        icon={Ban} iconClass="text-amber-500" title="Block Item"
        onClose={onClose}
        onBack={step === "reason" ? () => { setStep("search"); setItem(null); setReason(""); } : undefined}
      />
      <Toast toast={toast} />

      {step === "search" && (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Select an order and item to block:</p>
          <OrderQuickSearch onSelect={handleOrderSelect} showItems />
        </div>
      )}

      {step === "reason" && order && item && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <OrderChip order={order} />
          {/* Item chip */}
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            <Ban className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-sm font-medium text-text-primary truncate">{item.name}</span>
          </div>

          {/* Reason grid */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-secondary">Reason</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(BLOCK_REASONS).map(([key, { label, icon }]) => (
                <button
                  key={key} type="button"
                  onClick={() => setReason(key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-sm transition-all",
                    reason === key
                      ? "bg-amber-500/20 border-amber-500 text-amber-600 font-semibold ring-1 ring-amber-500/30"
                      : "bg-surface-raised border-border hover:border-amber-400 text-text-primary"
                  )}
                >
                  <span>{icon}</span>
                  <span className="text-xs leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional note */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-text-secondary">
              Additional note <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Provide more details…" rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={!reason || isSubmitting} variant="danger" className="flex-1">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Blocking…</> : "Confirm Block"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Payment Flow ──────────────────────────────────────────────
function PaymentFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep]               = useState<"search" | "amount">("search");
  const [order, setOrder]             = useState<SearchResult | null>(null);
  const [amount, setAmount]           = useState<string>("");
  const [paymentType, setPaymentType] = useState<PaymentType>("advance");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast]             = useState<ToastState>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !amount || Number(amount) <= 0) return;
    setIsSubmitting(true);
    const today = new Date().toISOString().split("T")[0];
    try {
      const res = await fetch(`/api/orders/${order.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          payment_type: paymentType,
          payment_date: today,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to record payment");
      setToast({ type: "success", message: "Payment recorded!" });
      setTimeout(onClose, 1200);
    } catch (err: unknown) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 space-y-4">
      <ModalHeader
        icon={BadgeDollarSign} iconClass="text-emerald-500" title="Log Payment"
        onClose={onClose}
        onBack={step === "amount" ? () => { setStep("search"); setOrder(null); } : undefined}
      />
      <Toast toast={toast} />

      {step === "search" && (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Select an order to record a payment for:</p>
          <OrderQuickSearch onSelect={(o) => { setOrder(o); setStep("amount"); }} />
        </div>
      )}

      {step === "amount" && order && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <OrderChip order={order} />

          {/* Payment type */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-secondary">Payment Type</label>
            <div className="flex gap-2">
              {PAYMENT_TYPES.map(({ id, label }) => (
                <button
                  key={id} type="button"
                  onClick={() => setPaymentType(id)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                    paymentType === id
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-600 ring-1 ring-emerald-500/30"
                      : "bg-surface-raised border-border hover:border-emerald-400 text-text-primary"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-text-secondary">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-medium">₹</span>
              <input
                type="number" min="1" step="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" autoFocus
                className="w-full h-10 rounded-md border border-input bg-surface pl-7 pr-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={!amount || Number(amount) <= 0 || isSubmitting} className="flex-1">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Recording…</> : "Record Payment"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Photo Placeholder ─────────────────────────────────────────
function PhotoPlaceholder({ onClose }: { onClose: () => void }) {
  return (
    <div className="p-5 space-y-4">
      <ModalHeader icon={Camera} iconClass="text-violet-500" title="Add Photo" onClose={onClose} />
      <div className="py-8 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto border border-violet-500/20">
          <Camera className="w-7 h-7 text-violet-400" />
        </div>
        <div>
          <p className="font-semibold text-text-primary">Coming Next Sprint</p>
          <p className="text-sm text-text-muted mt-1">
            Photo upload via Quick Capture requires complex file handling and is scheduled for a future sprint.
          </p>
        </div>
        <Button variant="secondary" onClick={onClose} className="w-full">Close</Button>
      </div>
    </div>
  );
}
