"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrderItem, OrderStage } from "../../../types";
import { StatusBadge } from "@/components/shared/Badges";
import { ItemStageTimeline } from "./ItemStageTimeline";
import { STAGE_CONFIG } from "@/lib/fsm/tracks";
import { Button } from "@/components/ui/button";
import { Loader2, MoreVertical, Play, Pause, CheckSquare, Square, Check, X, Trash2, ImagePlus, Camera, Printer } from "lucide-react";
import { useConfirmOrderItem, useAdvanceOrderItem, useHoldOrderItem, useDeleteOrderItem, useDemoteOrderItem } from "@/hooks/useOrderItems";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { compressAndUpload } from "@/lib/upload";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const BLOCK_REASONS = {
  material_pending: { label: 'Material Pending', icon: '📦' },
  customer_approval: { label: 'Customer Approval', icon: '👤' },
  worker_unavailable: { label: 'Worker Unavailable', icon: '🔧' },
  payment_pending: { label: 'Payment Pending', icon: '💰' },
  machine_issue: { label: 'Machine Issue', icon: '⚙️' },
  other: { label: 'Other', icon: '❓' },
};

interface OrderItemCardProps {
  item: OrderItem & { order_stages: OrderStage[] };
  orderId: string;
}

export function OrderItemCard({ item, orderId }: OrderItemCardProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockReason, setBlockReason] = useState<keyof typeof BLOCK_REASONS | "">("");
  const [blockNote, setBlockNote] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);

  const { mutate: confirmItem, isPending: confirming, error: confirmError } = useConfirmOrderItem(orderId);
  const { mutate: advanceItem, isPending: advancing, error: advanceError } = useAdvanceOrderItem(orderId);
  const { mutate: holdItem, isPending: holding, error: holdError } = useHoldOrderItem(orderId);
  const { mutate: deleteItem, isPending: deleting, error: deleteError } = useDeleteOrderItem(orderId);
  const { mutate: demoteItem, isPending: demoting } = useDemoteOrderItem(orderId);

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
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    const supabase = createClient();
    
    try {
      if (item.photo_url) {
        try {
          const oldUrl = new URL(item.photo_url);
          const pathSegments = oldUrl.pathname.split('/design-files/');
          if (pathSegments.length > 1) {
            const oldPath = pathSegments[1];
            await supabase.storage.from("design-files").remove([oldPath]);
          }
        } catch (err) {
          console.warn("Failed to delete old photo", err);
        }
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `items/${orderId}/${Date.now()}_${safeName}`;
      const newUrl = await compressAndUpload(file, storagePath, "design-files");

      await fetch(`/api/order-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: newUrl })
      });

      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      router.refresh();
    } catch (error) {
      console.error("Photo upload failed", error);
      alert("Failed to upload photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (!item.photo_url) return;
    if (!window.confirm("Are you sure you want to remove this photo?")) return;

    setPhotoUploading(true);
    const supabase = createClient();
    
    try {
      try {
        const oldUrl = new URL(item.photo_url);
        const pathSegments = oldUrl.pathname.split('/design-files/');
        if (pathSegments.length > 1) {
          const oldPath = pathSegments[1];
          await supabase.storage.from("design-files").remove([oldPath]);
        }
      } catch (err) {
        console.warn("Failed to delete old photo", err);
      }

      await fetch(`/api/order-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: null })
      });

      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      router.refresh();
    } catch (error) {
      console.error("Photo remove failed", error);
      alert("Failed to remove photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleBlock = async () => {
    if (!blockReason) return alert("Select a reason");
    setIsBlocking(true);
    try {
      const res = await fetch(`/api/order-items/${item.id}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: blockReason, note: blockNote })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || await res.text());
      }
      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-events", orderId] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      setShowBlockForm(false);
      setBlockReason("");
      setBlockNote("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblock = async () => {
    setIsUnblocking(true);
    try {
      const res = await fetch(`/api/order-items/${item.id}/unblock`, {
        method: "PATCH"
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || await res.text());
      }
      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-events", orderId] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUnblocking(false);
    }
  };

  const getBlockedDuration = (blockedAt: string) => {
    if (!blockedAt) return "0h";
    const diffMs = Date.now() - new Date(blockedAt).getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    return `${diffHrs}h`;
  };

  return (
    <div className={cn("bg-surface border rounded-xl shadow-sm overflow-hidden mb-4", (item as any).blocked ? "border-l-4 border-l-danger border-border" : "border-border")}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised/30">
        <div className="flex items-center gap-3">
          {item.photo_url ? (
            <div className="relative group w-10 h-10 flex-shrink-0">
              <img
                src={item.photo_url}
                alt={item.name}
                className="w-10 h-10 rounded-lg object-cover border border-border"
              />
              {photoUploading && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
              )}
              {!photoUploading && (
                <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <label className="cursor-pointer text-white hover:text-primary transition-colors">
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    <Camera size={14} />
                  </label>
                  <button onClick={handlePhotoRemove} className="text-white hover:text-danger transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-10 h-10 flex-shrink-0">
              <label className="w-10 h-10 flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-surface-raised cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors text-text-muted hover:text-primary">
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={photoUploading} />
                {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus size={16} />}
              </label>
            </div>
          )}
          <h3 className="font-semibold text-text-primary text-base">{item.name}</h3>
          <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border font-medium">
            Track {item.track}
          </span>
          <StatusBadge status={item.status} />
          {(item as any).blocked && (
            <div className="flex items-center gap-1.5 bg-danger text-white px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] sm:max-w-none">
              <span className="opacity-90">BLOCKED</span>
              <span className="border-l border-white/30 pl-1.5 opacity-90 hidden sm:inline">
                {BLOCK_REASONS[(item as any).blocked_reason as keyof typeof BLOCK_REASONS]?.label || (item as any).blocked_reason}
              </span>
              <span className="border-l border-white/30 pl-1.5 opacity-80 font-medium">
                {getBlockedDuration((item as any).blocked_at)}
              </span>
            </div>
          )}
        </div>
        
        {/* Print button */}
        <button
          title="Print Work Order"
          onClick={() => window.open(`/print/items/${item.id}`, '_blank')}
          className="p-1.5 rounded-md hover:bg-border/50 text-text-muted hover:text-primary transition-colors"
        >
          <Printer size={16} />
        </button>

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

        {item.status === 'in_production' && !(item as any).blocked && (
          <div className="w-full flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {currentStage?.stage_key !== (item.track === 'A' ? 'carpentry' : 'frame_making') && (
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => {
                    if (window.confirm("Demote to previous stage?")) {
                      demoteItem(item.id);
                    }
                  }}
                  disabled={demoting}
                >
                  {demoting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} ← Demote
                </Button>
              )}
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
              
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => setShowBlockForm(!showBlockForm)}
                className="text-danger border-danger/30 hover:bg-danger-soft"
              >
                Block
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
        
        {showBlockForm && !(item as any).blocked && item.status === 'in_production' && (
          <div className="w-full mt-3 p-4 bg-danger-soft/20 border border-danger/20 rounded-lg animate-fade-in space-y-3">
            <h4 className="text-sm font-semibold text-danger">Select Block Reason</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(BLOCK_REASONS).map(([key, {label, icon}]) => (
                <button
                  key={key}
                  onClick={() => setBlockReason(key as keyof typeof BLOCK_REASONS)}
                  className={`text-xs px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${blockReason === key ? 'bg-danger text-white border-danger font-bold' : 'bg-surface text-text-secondary border-border hover:border-danger/50'}`}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
            <textarea
              className="w-full text-sm p-2 border border-border rounded-md bg-surface mt-2 focus:outline-none focus:border-danger/50"
              placeholder="Optional notes..."
              value={blockNote}
              onChange={(e) => setBlockNote(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button size="sm" variant="ghost" onClick={() => { setShowBlockForm(false); setBlockReason(""); setBlockNote(""); }}>Cancel</Button>
              <Button size="sm" variant="danger" onClick={handleBlock} disabled={isBlocking || !blockReason}>
                {isBlocking ? "..." : "Confirm Block"}
              </Button>
            </div>
          </div>
        )}

        {(item as any).blocked && (
          <div className="w-full flex justify-end">
            <Button size="sm" onClick={handleUnblock} disabled={isUnblocking} className="bg-danger hover:bg-danger-hover text-white gap-2">
              {isUnblocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              Unblock Item
            </Button>
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
