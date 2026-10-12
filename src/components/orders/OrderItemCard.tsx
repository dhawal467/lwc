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
import { Loader2, MoreVertical, Play, Pause, Check, X, Trash2, ImagePlus, Camera, Printer } from "lucide-react";
import { useConfirmOrderItem, useAdvanceOrderItem, useHoldOrderItem, useDeleteOrderItem, useDemoteOrderItem } from "@/hooks/useOrderItems";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { compressAndUpload } from "@/lib/upload";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { triggerHaptic } from "@/lib/haptics";

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
      toast.success("Item photo updated");
    } catch (error) {
      console.error("Photo upload failed", error);
      toast.error("Failed to upload photo");
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
      toast.success("Photo removed");
    } catch (error) {
      console.error("Photo remove failed", error);
      toast.error("Failed to remove photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleBlock = async () => {
    if (!blockReason) {
      toast.error("Please select a block reason");
      return;
    }
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
      triggerHaptic([40, 40]);
      toast.success("Item marked as blocked");
    } catch (err: any) {
      toast.error(err.message || "Failed to block item");
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
      triggerHaptic([50, 80]);
      toast.success("✨ Block resolved! Item returned to production.");
    } catch (err: any) {
      toast.error(err.message || "Failed to unblock item");
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
              <div className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg z-20 py-1 divide-y divide-border/60">
                {!showDeleteConfirm ? (
                  <>
                    {item.status === 'in_production' && !(item as any).blocked && (
                      <div className="py-1">
                        <button 
                          onClick={() => {
                            setMenuOpen(false);
                            holdItem(item.id);
                          }} 
                          disabled={holding}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-surface-raised text-text-primary flex items-center gap-2"
                        >
                          <Pause size={14} className="text-text-muted" /> Put on Hold
                        </button>
                        {currentStage?.stage_key !== (item.track === 'A' ? 'carpentry' : 'frame_making') && (
                          <button 
                            onClick={() => {
                              setMenuOpen(false);
                              if (window.confirm("Demote to previous stage?")) {
                                demoteItem(item.id);
                              }
                            }} 
                            disabled={demoting}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-surface-raised text-text-primary flex items-center gap-2"
                          >
                            ← Demote to Prev Stage
                          </button>
                        )}
                      </div>
                    )}
                    <div className="py-1">
                      <button 
                        onClick={() => setShowDeleteConfirm(true)} 
                        className="w-full text-left px-3 py-2 text-sm hover:bg-danger-soft text-danger flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Delete Item
                      </button>
                    </div>
                  </>
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
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Sanding prerequisite directly adjacent to advance */}
              {requiresSanding && (
                <label className={cn(
                  "flex items-center gap-2 h-10 px-3.5 rounded-md border text-xs sm:text-sm font-medium cursor-pointer transition-colors",
                  currentStage?.sanding_complete
                    ? "bg-green-500/10 border-green-500/30 text-green-700"
                    : "bg-warning-soft/40 border-warning/30 text-text-primary hover:bg-warning-soft/60"
                )}>
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-primary rounded"
                    checked={currentStage?.sanding_complete || false}
                    onChange={(e) => toggleSanding.mutate(e.target.checked)}
                    disabled={toggleSanding.isPending}
                  />
                  <span>{currentStage?.sanding_complete ? "✓ Sanding Complete" : "Mark Sanding Done"}</span>
                </label>
              )}

              {/* Primary Forward Action (Hick's Law singular primary CTA) */}
              {currentStage?.stage_key === 'qc_check' ? (
                <Link 
                  href={`/dashboard/orders/${orderId}/qc`}
                  className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors bg-green-600 hover:bg-green-700 text-white h-10 px-4 shadow-sm"
                >
                  ✅ Run QC Check
                </Link>
              ) : (
                <Button 
                  size="default" 
                  onClick={() => advanceItem(item.id)}
                  disabled={advancing || (requiresSanding && !currentStage?.sanding_complete)}
                  className="h-10 px-5 font-semibold shadow-sm"
                >
                  {advancing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null} Advance Stage →
                </Button>
              )}
              
              {/* Block Action */}
              <Button 
                size="default" 
                variant="secondary"
                onClick={() => setShowBlockForm(!showBlockForm)}
                className="h-10 px-3.5 text-danger border-danger/30 hover:bg-danger-soft text-xs sm:text-sm ml-auto"
              >
                🚫 Block
              </Button>
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
          <div className="w-full flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-danger font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
              Blocked: {BLOCK_REASONS[(item as any).blocked_reason as keyof typeof BLOCK_REASONS]?.label || (item as any).blocked_reason}
            </span>
            <Button 
              size="default" 
              onClick={handleUnblock} 
              disabled={isUnblocking} 
              className="h-10 px-5 bg-green-600 hover:bg-green-700 text-white font-semibold gap-1.5 shadow-sm"
            >
              {isUnblocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              Resolve Block
            </Button>
          </div>
        )}

        {item.status === 'on_hold' && (
          <div className="w-full flex items-center justify-between gap-2">
            <span className="text-xs text-warning font-medium">Item is paused on hold</span>
            <Button 
              size="default" 
              variant="secondary"
              onClick={() => holdItem(item.id)}
              disabled={holding}
              className="h-10 bg-warning-soft text-text-primary hover:bg-warning-soft/80 border-warning/30 font-medium"
            >
              {holding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />} Resume Production
            </Button>
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
