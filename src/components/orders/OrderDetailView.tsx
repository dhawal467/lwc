"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";
import { FsmControls } from "./FsmControls";
import { StageTimeline } from "./StageTimeline";
import { Badge } from "@/components/ui/badge";
import { DesignFileUpload } from "./DesignFileUpload";
import { PriorityToggle } from "./PriorityToggle";
import { OrderItemCard } from "./OrderItemCard";
import { PaymentLedgerPanel } from "./PaymentLedgerPanel";
import { AddItemModal } from "./AddItemModal";
import { EditOrderModal } from "./EditOrderModal";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useOrder } from "@/hooks/useOrders";

interface OrderDetailViewProps {
  order: any;
  isAdmin: boolean;
}

export function OrderDetailView({ order: initialOrder, isAdmin }: OrderDetailViewProps) {
  const { data: order = initialOrder } = useOrder(initialOrder.id, initialOrder);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const isPhase2Order = order.track === null;
  const currentStage = order.order_stages?.find((s: any) => s.status === "in_progress");

  const handleDeleteFile = async (fileId: string) => {
    if (!window.confirm("Are you sure you want to delete this design file?")) return;
    
    try {
      const res = await fetch(`/api/orders/${order.id}/design-files/${fileId}`, {
        method: "DELETE"
      });
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to delete file");
      }
      
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      router.refresh();
    } catch (err: any) {
      console.error("File deletion failed:", err);
      alert(err.message);
    }
  };

  // Common Header Section
  const OrderHeader = () => (
    <div>
      <h1 className="text-3xl font-display font-semibold text-text-primary tracking-tight">
        Order #{order.order_number}
      </h1>
      <div className="mt-2 flex items-center gap-3">
        <Badge variant="outline" className="bg-surface shadow-sm">
          Status: <span className="ml-1 text-primary-hover font-semibold capitalize">{order.status.replace("_", " ")}</span>
        </Badge>
        <Badge variant="outline" className="bg-surface shadow-sm uppercase tracking-wider">
          {isPhase2Order ? "Phase 2 (Multi-Item)" : `Track ${order.track}`}
        </Badge>
      </div>
    </div>
  );

  // Common Details Section
  const OrderDetails = () => (
    <>
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col gap-4">
        <h2 className="text-xl font-semibold mb-2">Customer Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-text-secondary">Name</p>
            <p className="font-medium text-text-primary">{order.customers?.name}</p>
          </div>
          <div>
            <p className="text-text-secondary">Phone</p>
            <p className="font-medium text-text-primary">{order.customers?.phone}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Order Information</h2>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => setEditOrderOpen(true)} className="text-primary hover:bg-primary/10 gap-1.5 h-8 px-2">
              <Edit2 size={14} />
              <span className="text-xs font-medium">Edit Details</span>
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-text-secondary">Delivery Date</p>
            <p className="font-medium text-text-primary">
              {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : "TBD"}
            </p>
          </div>
          <div>
            {isAdmin ? (
              <PriorityToggle orderId={order.id} initialPriority={order.priority} isAdmin={isAdmin} />
            ) : (
              <>
                <p className="text-text-secondary">Priority</p>
                <p className="font-medium text-text-primary">
                  {order.priority ? <span className="text-red-500 font-bold">High</span> : "Normal"}
                </p>
              </>
            )}
          </div>
          <div className="col-span-2">
            <p className="text-text-secondary">Description</p>
            <p className="font-medium text-text-primary bg-surface-raised p-3 rounded-md mt-1 italic border border-border">
              {order.description || "No description provided."}
            </p>
          </div>
          <div>
            <p className="text-text-secondary">Quoted Amount</p>
            <p className="font-medium text-text-primary">
              {order.quoted_amount ? `₹ ${order.quoted_amount.toLocaleString()}` : "Not set"}
            </p>
          </div>
          <div>
            <p className="text-text-secondary">Materials Checklist</p>
            <p className="font-medium text-text-primary">
              {order.materials_checklist || "None"}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  // Common Files & Photos Section
  const FilesAndPhotos = () => (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col gap-4 mt-6">
      <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
        <span className="bg-primary/10 text-primary p-1.5 rounded-md">🖼️</span>
        Files & Photos
      </h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Design Specs</h3>
          {order.design_files && order.design_files.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {order.design_files.map((file: any) => (
                <div key={file.id} className="relative group rounded-md overflow-hidden border border-border aspect-square">
                  <img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover rounded-md" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md gap-2">
                    <a href={file.file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-white bg-primary px-3 py-1.5 rounded-md hover:bg-primary-hover shadow-pop">
                      View Full
                    </a>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1.5 bg-danger text-white rounded-md hover:bg-danger-hover transition-colors shadow-pop"
                        title="Delete File"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted italic">No design specs uploaded.</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">QC Proofs</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Phase 1 QC Proofs from order_stages */}
            {/* Phase 2 QC Proofs from order_items -> order_stages */}
            {(() => {
              const phase1Proofs = order.order_stages?.flatMap((s: any) => s.qc_checks || []).filter((qc: any) => qc.photo_url) || [];
              const phase2Proofs = order.order_items?.flatMap((i: any) => i.order_stages?.flatMap((s: any) => s.qc_checks || []) || []).filter((qc: any) => qc.photo_url) || [];
              const allProofs = [...phase1Proofs, ...phase2Proofs];

              return allProofs.length > 0 ? (
                allProofs.map((qc: any) => (
                  <div key={qc.id} className="relative group rounded-md overflow-hidden border border-border aspect-square">
                    <img src={qc.photo_url} alt="QC Proof" className="w-full h-full object-cover rounded-md border-4 border-green-500/20" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                      <a href={qc.photo_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-white bg-green-600 px-3 py-1.5 rounded-md hover:bg-green-700 shadow-pop">
                        Verify Proof
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted italic">No QC proofs available yet.</p>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );

  if (isPhase2Order) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 animate-fade-in flex flex-col gap-8">
        <div className="flex-1 space-y-6">
          <OrderHeader />
          <OrderDetails />
          
          {/* Items section */}
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span className="bg-primary/10 text-primary p-1.5 rounded-md">📦</span>
                Order Items
              </h3>
              <Button onClick={() => setAddItemOpen(true)} className="gap-2">
                <PlusIcon className="w-4 h-4" />
                Add Item
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {order.order_items && order.order_items.length > 0 ? (
                order.order_items.map((item: any) => (
                  <OrderItemCard key={item.id} item={item} orderId={order.id} />
                ))
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-border rounded-xl bg-surface/50">
                  <p className="text-text-muted">No items added to this order yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-1.5 rounded-md">💰</span>
              Payment Ledger
            </h3>
            <PaymentLedgerPanel orderId={order.id} isAdmin={isAdmin} />
          </div>

          <FilesAndPhotos />
          <DesignFileUpload orderId={order.id} />
        </div>

        <AddItemModal 
          open={addItemOpen} 
          onOpenChange={setAddItemOpen} 
          orderId={order.id} 
        />
        <EditOrderModal open={editOrderOpen} onOpenChange={setEditOrderOpen} order={order} />
      </div>
    );
  }

  // Phase 1 Layout (Legacy)
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 animate-fade-in flex flex-col md:flex-row gap-8">
      <div className="flex-1 space-y-6">
        <OrderHeader />
        <OrderDetails />
        <FsmControls order={order} currentStage={currentStage} />
        <DesignFileUpload orderId={order.id} />
        <FilesAndPhotos />
      </div>

      {/* Right Panel: FSM Timeline */}
      <div className="md:w-80 lg:w-96">
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm sticky top-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <span className="bg-primary/10 text-primary p-1.5 rounded-md">📈</span>
            Production Track
          </h2>
          
          {order.order_stages && order.order_stages.length > 0 ? (
             <StageTimeline stages={order.order_stages} />
          ) : (
            <div className="text-center py-8 text-gray-500 bg-surface-raised rounded-lg border border-dashed border-border">
              <p className="text-sm">Production hasn&apos;t started yet.</p>
              <p className="text-xs mt-1">Confirm the order to generate stages.</p>
            </div>
          )}
        </div>
      </div>

      <EditOrderModal open={editOrderOpen} onOpenChange={setEditOrderOpen} order={order} />
    </div>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
