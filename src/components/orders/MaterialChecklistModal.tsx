"use client";

import React, { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  MaterialChecklistItem,
  parseMaterialsChecklist,
  serializeMaterialsChecklist,
  generateMaterialId,
} from "@/lib/materials";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  ClipboardList,
} from "lucide-react";

export interface MaterialChecklistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  rawChecklist: unknown;
  canEdit?: boolean;
}

export function MaterialChecklistModal({
  open,
  onOpenChange,
  orderId,
  rawChecklist,
  canEdit = true,
}: MaterialChecklistModalProps) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<MaterialChecklistItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");

  // Sync internal state when opened or when rawChecklist changes
  useEffect(() => {
    if (open) {
      setItems(parseMaterialsChecklist(rawChecklist));
      setNewItemName("");
      setNewItemQuantity("");
    }
  }, [open, rawChecklist]);

  const saveMutation = useMutation({
    mutationFn: async (updatedItems: MaterialChecklistItem[]) => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materials_checklist: serializeMaterialsChecklist(updatedItems),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save materials checklist");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Materials checklist saved successfully");
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save checklist");
    },
  });

  const handleToggleVerified = (id: string) => {
    if (!canEdit) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, verified: !item.verified } : item
      )
    );
  };

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEdit) return;

    const trimmedName = newItemName.trim();
    if (!trimmedName) return;

    const newItem: MaterialChecklistItem = {
      id: generateMaterialId(),
      name: trimmedName,
      quantity: newItemQuantity.trim() || undefined,
      verified: false,
    };

    setItems((prev) => [...prev, newItem]);
    setNewItemName("");
    setNewItemQuantity("");
  };

  const handleDeleteItem = (id: string) => {
    if (!canEdit) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMarkAll = (verified: boolean) => {
    if (!canEdit) return;
    setItems((prev) => prev.map((item) => ({ ...item, verified })));
  };

  const verifiedCount = items.filter((i) => i.verified).length;
  const totalCount = items.length;
  const allVerified = totalCount > 0 && verifiedCount === totalCount;

  const handleSave = () => {
    saveMutation.mutate(items);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Materials & Hardware Checklist</DialogTitle>
                <DialogDescription>
                  Verify all fittings, laminates, and hardware before advancing.
                </DialogDescription>
              </div>
            </div>
            {totalCount > 0 && (
              <Badge
                variant={allVerified ? "default" : "outline"}
                className={
                  allVerified
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                }
              >
                {verifiedCount}/{totalCount} Verified
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[55vh]">
          {/* Quick Actions (when items exist and canEdit) */}
          {totalCount > 1 && canEdit && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleMarkAll(true)}
                className="text-primary hover:underline font-medium"
              >
                Mark all verified
              </button>
              <span className="text-text-muted">•</span>
              <button
                type="button"
                onClick={() => handleMarkAll(false)}
                className="text-text-secondary hover:underline"
              >
                Unmark all
              </button>
            </div>
          )}

          {/* Checklist items list */}
          {items.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-xl bg-surface/50">
              <ClipboardList className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-text-primary">
                No checklist items
              </p>
              <p className="text-xs text-text-muted mt-1">
                Add hardware fittings, hinges, or laminates below to track verification.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-all ${
                    item.verified
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-surface-raised border-border"
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={item.verified}
                      disabled={!canEdit}
                      onChange={() => handleToggleVerified(item.id)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm font-medium block truncate ${
                          item.verified
                            ? "line-through text-text-muted"
                            : "text-text-primary"
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.quantity && (
                        <span className="text-[11px] text-text-secondary font-mono mt-0.5 inline-block">
                          Qty: {item.quantity}
                        </span>
                      )}
                    </div>
                  </label>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.verified && (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-text-muted hover:text-danger p-1 rounded-md transition-colors"
                        title="Delete item"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Item Form */}
          {canEdit && (
            <form
              onSubmit={handleAddItem}
              className="pt-3 border-t border-border flex flex-col sm:flex-row gap-2"
            >
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Material or hardware name (e.g. 18'' Telescopic Slides)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <div className="w-full sm:w-32">
                <Input
                  type="text"
                  placeholder="Qty (e.g. 4 sets)"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={!newItemName.trim()}
                className="h-9 px-3 shrink-0 gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </Button>
            </form>
          )}
        </div>

        <DialogFooter className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          {canEdit && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="gap-2 shadow-sm"
            >
              {saveMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              <span>Save Checklist</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HardwareWarningDialog({
  open,
  onOpenChange,
  onProceed,
  onReview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
  onReview: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Hardware & Materials Warning</DialogTitle>
              <DialogDescription className="mt-1">
                Hardware & materials checklist contains unverified items. Proceed to Polish anyway?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-4 flex sm:flex-row gap-2 justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onReview();
              onOpenChange(false);
            }}
          >
            Review Checklist
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              onProceed();
              onOpenChange(false);
            }}
          >
            Proceed Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
