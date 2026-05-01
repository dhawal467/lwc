"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

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
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EditOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
}

export function EditOrderModal({ open, onOpenChange, order }: EditOrderModalProps) {
  const queryClient = useQueryClient();

  const [description, setDescription] = useState("");
  const [materialsChecklist, setMaterialsChecklist] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [priority, setPriority] = useState(false);
  const [quotedAmount, setQuotedAmount] = useState("");

  useEffect(() => {
    if (open && order) {
      setDescription(order.description || "");
      setMaterialsChecklist(order.materials_checklist || "");
      setDeliveryDate(order.delivery_date ? order.delivery_date.split('T')[0] : "");
      setPriority(order.priority || false);
      setQuotedAmount(order.quoted_amount ? order.quoted_amount.toString() : "");
    }
  }, [open, order]);

  const updateOrder = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update order");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order updated successfully");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {};
    if (description !== (order.description || "")) data.description = description;
    if (materialsChecklist !== (order.materials_checklist || "")) data.materials_checklist = materialsChecklist;
    if (deliveryDate !== (order.delivery_date ? order.delivery_date.split('T')[0] : "")) data.delivery_date = deliveryDate || null;
    if (priority !== (order.priority || false)) data.priority = priority;
    
    const parsedAmount = quotedAmount ? parseFloat(quotedAmount) : null;
    const orderAmount = order.quoted_amount ? parseFloat(order.quoted_amount) : null;
    if (parsedAmount !== orderAmount) {
      data.quoted_amount = parsedAmount;
    }

    if (Object.keys(data).length === 0) {
      onOpenChange(false);
      return;
    }

    updateOrder.mutate(data);
  };

  const isLocked = ["dispatched", "completed"].includes(order.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order Details</DialogTitle>
        </DialogHeader>

        <form id="edit-order-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quotedAmount">Quoted Amount (₹)</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                ₹
              </div>
              <Input
                id="quotedAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-7"
                value={quotedAmount}
                onChange={(e) => setQuotedAmount(e.target.value)}
                disabled={isLocked || updateOrder.isPending}
              />
            </div>
            {isLocked && <p className="text-xs text-text-muted">Cannot edit quoted amount on {order.status} orders.</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Delivery Date</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              disabled={updateOrder.isPending}
            />
          </div>

          <div className="space-y-2 flex flex-row items-center justify-between p-3 border rounded-lg bg-surface">
            <div className="space-y-0.5">
              <Label htmlFor="priority">High Priority</Label>
              <p className="text-xs text-text-muted">Flag this order as urgent.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="priority"
                type="checkbox"
                className="sr-only peer"
                checked={priority}
                onChange={(e) => setPriority(e.target.checked)}
                disabled={updateOrder.isPending}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              placeholder="Order description..."
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-soft focus:border-transparent placeholder:text-text-muted transition-all"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLocked || updateOrder.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="materialsChecklist">Materials Checklist</Label>
            <textarea
              id="materialsChecklist"
              rows={3}
              placeholder="Materials needed..."
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-soft focus:border-transparent placeholder:text-text-muted transition-all"
              value={materialsChecklist}
              onChange={(e) => setMaterialsChecklist(e.target.value)}
              disabled={isLocked || updateOrder.isPending}
            />
          </div>
        </form>

        <DialogFooter className="px-6 pb-6 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={updateOrder.isPending}
          >
            Cancel
          </Button>
          <Button
            form="edit-order-form"
            type="submit"
            disabled={updateOrder.isPending}
          >
            {updateOrder.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Details"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
