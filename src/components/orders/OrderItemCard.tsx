"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrderItem, OrderStage } from "../../../types";
import { StatusBadge } from "@/components/shared/Badges";
import { ItemStageTimeline } from "./ItemStageTimeline";
import { STAGE_CONFIG } from "@/lib/fsm/tracks";
import { Button } from "@/components/ui/button";
import { Loader2, MoreVertical, Play, Pause, CheckSquare, Square, Check, X, Trash2 } from "lucide-react";
import { useConfirmOrderItem, useAdvanceOrderItem, useHoldOrderItem, useDeleteOrderItem } from "@/hooks/useOrderItems";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface OrderItemCardProps {
  item: OrderItem & { order_stages: OrderStage[] };
  orderId: string;
}

export function OrderItemCard({ item, orderId }: OrderItemCardProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { mutate: confirmItem, isPending: confirming, error: confirmError } = useConfirmOrderItem(orderId);
  const { mutate: advanceItem, isPending: advancing, error: advanceError } = useAdvanceOrderItem(orderId);
  const { mutate: holdItem, isPending: holding, error: holdError } = useHoldOrderItem(orderId);
  const { mutate: deleteItem, isPending: deleting, error: deleteError } = useDeleteOrderItem(orderId);

  const currentStage = item.order_stages?.find((s: OrderStage) => s.status === 'in_progress');
  const stageKey = currentStage?.stage_key as keyof typeof STAGE_CONFIG;
  const requiresSanding = stageKey && STAGE_CONFIG[stageKey]?.requiresSanding;

  const toggleSanding = useMutation({
    mutationFn: async (checked: boolean) => {
      if (!currentStage) return;
      const res = await fetch(`/api/stages/${currentStage.id}/sanding`, {
        method: 'PATCH',
        body: JSON.stringify({ sanding_complete: checked })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update sanding");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      router.refresh();
    }
  });

  const handleDelete = () => {
    deleteItem(item.id, {
      onSuccess: () => {
        setMenuOpen(false);
        setShowDeleteConfirm(false);
      }
    });
  };

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised/30">
        <div className="flex items-center gap-3">
          {item.photo_url && (
            <img
              src={item.photo_url}
              alt={item.name}
              className="w-10 h-10 rounded-lg object-cover border border-border flex-shrink-0"
            />
          )}
          <h3 className="font-semibold text-text-primary text-base">{item.name}</h3>
          <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border font-medium">
            Track {item.track}
          </span>
          <StatusBadge status={item.status} />
        </div>
        
        {/* Kebab menu */}
        <div className="relative">
          <button 
            onClick={() => { setMenuOpen(!menuOpen); setShowDeleteConfirm(false); }}
            className="p-1.5 rounded-md hover:bg-border/50 text-text-muted transition-colors"
          >
            <MoreVertical size={18} />
          </button>
          
          {menuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg z-20 py-1">
                {!showDeleteConfirm ? (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)} 
                    className="w-full text-left px-3 py-2 text-sm hover:bg-danger-soft text-danger flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete Item
                  </button>
                ) : (
                  <div className="px-3 py-2">
                    <p className="text-xs text-text-secondary mb-2">Are you sure?</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" onClick={handleDelete} disabled={deleting} className="flex-1 h-7 text-xs">
                        {deleting ? '...' : 'Yes, Delete'}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="flex-1 h-7 text-xs">
                        Cancel
                      </Button>
                    </div>
                    {deleteError && <p className="text-[10px] text-danger mt-1">{deleteError.message}</p>}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description & Timeline */}
      <div className="p-4 space-y-4">
        {item.description && (
          <p className="text-sm text-text-secondary">{item.description}</p>
        )}
        
        {item.order_stages && item.order_stages.length > 0 ? (
          <ItemStageTimeline stages={item.order_stages} />
        ) : (
          <div className="text-sm text-text-muted italic py-2">No stages initialized yet.</div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-border bg-surface-raised/30 flex flex-wrap items-center gap-2">
        {item.status === 'confirmed' && (
          <div className="w-full">
            <Button 
              size="sm" 
              onClick={() => confirmItem(item.id)}
              disabled={confirming}
            >
              {confirming ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : "🚀 "} Start Production
            </Button>
            {confirmError && <p className="text-xs text-danger mt-1">{(confirmError as Error).message}</p>}
          </div>
        )}

        {item.status === 'in_production' && (
          <div className="w-full flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                size="sm" 
                onClick={() => advanceItem(item.id)}
                disabled={advancing}
              >
                {advancing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Advance Stage →
              </Button>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => holdItem(item.id)}
                disabled={holding}
              >
                {holding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Pause className="h-4 w-4 mr-1" />} Hold
              </Button>

              {currentStage?.stage_key === 'qc_check' && (
                <Link 
                  href={`/qc/${item.id}`}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-surface hover:bg-surface-raised h-8 px-3"
                >
                  ✅ Run QC Check
                </Link>
              )}

              {requiresSanding && (
                <label className="flex items-center gap-1.5 text-sm cursor-pointer ml-auto bg-surface border px-2 py-1 rounded-md hover:bg-surface-raised transition-colors">
                  <input 
                    type="checkbox" 
                    className="sr-only"
                    checked={currentStage?.sanding_complete || false}
                    onChange={(e) => toggleSanding.mutate(e.target.checked)}
                    disabled={toggleSanding.isPending}
                  />
                  {toggleSanding.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                  ) : currentStage?.sanding_complete ? (
                    <CheckSquare className="h-4 w-4 text-green-600" />
                  ) : (
                    <Square className="h-4 w-4 text-text-muted" />
                  )}
                  <span className={currentStage?.sanding_complete ? "text-green-700 font-medium" : "text-text-secondary"}>
                    Sanding Complete
                  </span>
                </label>
              )}
            </div>
            
            {(advanceError || holdError || toggleSanding.error) && (
              <p className="text-xs text-danger">
                {((advanceError || holdError || toggleSanding.error) as Error).message}
              </p>
            )}
          </div>
        )}

        {item.status === 'on_hold' && (
          <div className="w-full">
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => holdItem(item.id)}
              disabled={holding}
              className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200"
            >
              {holding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1 fill-current" />} Resume
            </Button>
            {holdError && <p className="text-xs text-danger mt-1">{(holdError as Error).message}</p>}
          </div>
        )}

        {item.status === 'dispatched' && (
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <span className="text-base">🚚</span> Dispatched
          </div>
        )}

        {item.status === 'completed' && (
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
            <Check className="h-3 w-3" strokeWidth={3} /> Completed
          </div>
        )}

        {item.status === 'cancelled' && (
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <X className="h-3 w-3" strokeWidth={3} /> Cancelled
          </div>
        )}
      </div>
    </div>
  );
}
