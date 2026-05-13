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

// ── Types ─────────────────────────────────────────────────────
type ActionId = "note" | "block" | "payment" | "photo";

interface ActionDef {
  id: ActionId;
  icon: React.ElementType;
  label: string;
  color: string;
}

const ACTIONS: ActionDef[] = [
  { id: "photo",   icon: Camera,          label: "Photo",        color: "bg-violet-500 hover:bg-violet-600" },
  { id: "payment", icon: BadgeDollarSign,  label: "Payment",      color: "bg-emerald-500 hover:bg-emerald-600" },
  { id: "block",   icon: Ban,             label: "Block Item",   color: "bg-amber-500 hover:bg-amber-600" },
  { id: "note",    icon: StickyNote,      label: "Quick Note",   color: "bg-sky-500 hover:bg-sky-600" },
];

// ── Toast state ───────────────────────────────────────────────
type ToastState = { type: "success" | "error"; message: string } | null;

// ── Main Component ────────────────────────────────────────────
export function QuickCaptureFAB() {
  const [expanded, setExpanded]         = useState(false);
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);
  const containerRef                    = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
        // Don't close the modal on outside click — user must close explicitly
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
      {/* Backdrop for modal */}
      {activeAction && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={handleClose}
          aria-hidden
        />
      )}

      {/* Modal / bottom-sheet */}
      {activeAction && (
        <div className="fixed bottom-0 left-0 right-0 z-[70] lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:max-w-md lg:w-full animate-in slide-in-from-bottom-4 lg:zoom-in-95 duration-200">
          <ActionModal action={activeAction} onClose={handleClose} />
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
          const delay = i * 40; // stagger
          return (
            <div
              key={action.id}
              className={cn(
                "flex items-center gap-2 transition-all duration-300",
                expanded
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-4 pointer-events-none"
              )}
              style={{
                transitionDelay: expanded ? `${delay}ms` : `${(ACTIONS.length - 1 - i) * 30}ms`,
              }}
            >
              {/* Tooltip label */}
              <span className="text-xs font-semibold text-white bg-gray-800/90 px-2 py-1 rounded shadow whitespace-nowrap">
                {action.label}
              </span>
              {/* Action button */}
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
          aria-label={expanded ? "Close menu" : "Quick capture"}
          className={cn(
            "w-14 h-14 rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-white shadow-xl flex items-center justify-center transition-all duration-300 ring-4 ring-primary/20",
          )}
        >
          <Plus
            className={cn(
              "w-7 h-7 transition-transform duration-300",
              expanded ? "rotate-45" : "rotate-0"
            )}
          />
        </button>
      </div>
    </>
  );
}

// ── Action Modal ──────────────────────────────────────────────
function ActionModal({ action, onClose }: { action: ActionId; onClose: () => void }) {
  return (
    <div
      className="bg-surface rounded-t-3xl lg:rounded-2xl border border-border shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {action === "note"    && <NoteFlow    onClose={onClose} />}
      {action === "block"   && <ComingSoon  title="Block Item"  onClose={onClose} />}
      {action === "payment" && <ComingSoon  title="Log Payment" onClose={onClose} />}
      {action === "photo"   && <ComingSoon  title="Add Photo"   onClose={onClose} />}
    </div>
  );
}

// ── Note Flow ─────────────────────────────────────────────────
function NoteFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep]           = useState<"search" | "write">("search");
  const [selectedOrder, setSelectedOrder] = useState<SearchResult | null>(null);
  const [content, setContent]     = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast]         = useState<ToastState>(null);

  const handleOrderSelect = (order: SearchResult) => {
    setSelectedOrder(order);
    setStep("write");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to post note");
      }

      setToast({ type: "success", message: "Note added!" });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {step === "write" && (
            <button
              onClick={() => { setStep("search"); setSelectedOrder(null); }}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-sky-500" />
            Quick Note
          </h2>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface-raised">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Toast */}
      {toast && (
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
      )}

      {/* Step 1: Order search */}
      {step === "search" && (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Select an order to attach this note to:</p>
          <OrderQuickSearch onSelect={handleOrderSelect} />
        </div>
      )}

      {/* Step 2: Write note */}
      {step === "write" && selectedOrder && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selected order chip */}
          <div className="flex items-center gap-2 bg-primary-soft/30 border border-primary/20 rounded-lg px-3 py-2">
            <span className="font-mono text-xs font-bold text-primary bg-primary-soft px-1.5 py-0.5 rounded">
              {selectedOrder.order_number}
            </span>
            <span className="text-sm font-medium text-text-primary truncate">
              {selectedOrder.customer_name}
            </span>
          </div>

          {/* Note content */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-text-secondary">Note</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your note here…"
              rows={4}
              autoFocus
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : (
                "Add Note"
              )}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Coming Soon placeholder ───────────────────────────────────
function ComingSoon({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-text-primary">{title}</h2>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface-raised">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">🚧</span>
        </div>
        <p className="text-text-secondary text-sm">Coming soon in Task 21</p>
      </div>
    </div>
  );
}
