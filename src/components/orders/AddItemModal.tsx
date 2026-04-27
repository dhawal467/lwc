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
import { useAddOrderItem } from "@/hooks/useOrderItems";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  initialName?: string;
}

export function AddItemModal({
  open,
  onOpenChange,
  orderId,
  initialName,
}: AddItemModalProps) {
  const [name, setName] = useState("");
  const [track, setTrack] = useState<"A" | "B">("A");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);

  const addOrderItem = useAddOrderItem(orderId);

  useEffect(() => {
    if (open) {
      setName(initialName || "");
      setTrack("A");
      setDescription("");
      setUnitPrice("");
      setQuantity("1");
      setError(null);
    }
  }, [open, initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Item name is required.");
      return;
    }

    addOrderItem.mutate(
      {
        name: name.trim(),
        track,
        description: description.trim() || null,
        unit_price: unitPrice ? parseFloat(unitPrice) : null,
        quantity: quantity ? parseInt(quantity, 10) : 1,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
        </DialogHeader>

        <form id="add-item-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="item-name">Name *</Label>
            <Input
              id="item-name"
              placeholder="e.g. King Size Bed"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-quantity">Quantity *</Label>
            <Input
              id="item-quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Production Track *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTrack("A")}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                  track === "A"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border bg-surface hover:border-text-muted text-text-secondary"
                )}
              >
                <span className="text-sm font-semibold">Track A</span>
                <span className="text-[10px] text-center mt-1 leading-tight opacity-70">
                  Full production (Carpentry, Sanding, Polish, Upholstery)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTrack("B")}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                  track === "B"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border bg-surface hover:border-text-muted text-text-secondary"
                )}
              >
                <span className="text-sm font-semibold">Track B</span>
                <span className="text-[10px] text-center mt-1 leading-tight opacity-70">
                  Upholstery only (Frame making + Upholstery)
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-desc">Description (Optional)</Label>
            <textarea
              id="item-desc"
              rows={3}
              placeholder="Dimensions, fabric color, foam density..."
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-soft focus:border-transparent placeholder:text-text-muted transition-all"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-price">Unit Price (₹)</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                ₹
              </div>
              <Input
                id="item-price"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-7"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-danger-soft border border-danger/20 rounded-md text-xs text-danger font-medium animate-in fade-in zoom-in-95 duration-200">
              {error}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            form="add-item-form"
            type="submit"
            disabled={addOrderItem.isPending}
            className="sm:flex-1"
          >
            {addOrderItem.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Item"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
