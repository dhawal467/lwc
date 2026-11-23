"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from "react";
import { FsmControls } from "./FsmControls";
import { StageTimeline } from "./StageTimeline";
import { Badge } from "@/components/ui/badge";
import { DesignFileUpload } from "./DesignFileUpload";
import { PriorityToggle } from "./PriorityToggle";
import { OrderItemCard } from "./OrderItemCard";
import { PaymentLedgerPanel } from "./PaymentLedgerPanel";
import { AddItemModal } from "./AddItemModal";
import { EditOrderModal } from "./EditOrderModal";
import { MaterialChecklistModal } from "./MaterialChecklistModal";
import { OrderEventsTimeline } from "./OrderEventsTimeline";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, X, MessageSquare, ClipboardCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useOrder } from "@/hooks/useOrders";
import { buildCustomerWhatsAppUrl } from "@/lib/notifications/templates";
import { parseMaterialsChecklist } from "@/lib/materials";

interface OrderDetailViewProps {
  order: any;
  isAdmin: boolean;
}

export function OrderDetailView({ order: initialOrder, isAdmin }: OrderDetailViewProps) {
  const { data: order = initialOrder } = useOrder(initialOrder.id, initialOrder);
  const searchParams = useSearchParams();
  const targetItemId = searchParams.get("item");
  const action = searchParams.get("action");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(() => searchParams.get("add_item") === "true");
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (targetItemId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`item-${targetItemId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [targetItemId, order.order_items]);

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/users")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllUsers(data);
        })
        .catch(err => console.error("Failed to fetch users:", err));
    }
  }, [isAdmin]);

  const handleOwnerChange = async (newOwnerId: string) => {
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_id: newOwnerId })
      });
      if (!res.ok) throw new Error("Failed to reassign owner");
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
    } catch (err) {
      console.error(err);
      alert("Error reassigning owner");
    }
  };

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
  const OrderHeader = () => {
    const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
    const customerName = customer?.name || order.customer_name || null;
    const customerPhone = customer?.phone || order.customer_phone || null;
    const cleanPhone = (customerPhone || "").replace(/[^0-9]/g, "");
    const isPhoneInvalid = !customerPhone || cleanPhone.length < 10;

    const deliveryDateStr = order.delivery_date
      ? (order.delivery_date.includes("T") ? order.delivery_date.split("T")[0] : order.delivery_date)
      : null;

    const whatsAppUrl = !isPhoneInvalid
      ? buildCustomerWhatsAppUrl({
          order_number: order.order_number,
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_date: deliveryDateStr,
        })
      : "";

    const handleSendWhatsAppAlert = () => {
      if (isPhoneInvalid || !whatsAppUrl) return;
      window.open(whatsAppUrl, "_blank");
    };

    return (
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
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

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleSendWhatsAppAlert}
            disabled={isPhoneInvalid}
            title={isPhoneInvalid ? "Customer phone number missing" : undefined}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-sm h-10 px-3.5 rounded-lg flex items-center gap-2 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send WhatsApp Alert</span>
          </button>

          <div className="flex items-center gap-3 bg-surface border border-border rounded-full px-4 py-1.5 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center font-bold text-sm">
              {order.owner?.full_name?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Owner</span>
              {isAdmin ? (
                <select 
                  className="bg-transparent text-sm font-medium text-text-primary focus:outline-none -ml-1 cursor-pointer hover:text-primary transition-colors"
                  value={order.owner?.id || ""}
                  onChange={(e) => handleOwnerChange(e.target.value)}
                >
                  <option value="" disabled>Select Owner</option>
                  {allUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-medium text-text-primary">
                  {order.owner?.full_name || "Unassigned"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Common Details Section
  const OrderDetails = () => {
    const checklistItems = parseMaterialsChecklist(order.materials_checklist);
    const verifiedCount = checklistItems.filter((i) => i.verified).length;
    const totalMaterials = checklistItems.length;
    const allVerified = totalMaterials > 0 && verifiedCount === totalMaterials;

    return (
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
            <div className="col-span-2 sm:col-span-1">
              <p className="text-text-secondary">Quoted Amount</p>
              <p className="font-medium text-text-primary">
                {order.quoted_amount ? `₹ ${order.quoted_amount.toLocaleString()}` : "Not set"}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-text-secondary">Materials Checklist</p>
                {totalMaterials > 0 && (
                  <Badge
                    variant={allVerified ? "default" : "outline"}
                    className={
                      allVerified
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px]"
                    }
                  >
                    {verifiedCount}/{totalMaterials} Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className="font-medium text-text-primary truncate">
                  {totalMaterials > 0
                    ? `${totalMaterials} item${totalMaterials === 1 ? "" : "s"} listed`
                    : "None"}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setMaterialModalOpen(true)}
                  className="h-7 px-2.5 text-xs text-primary hover:bg-primary/10 gap-1 border-primary/20 shrink-0"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Manage Checklist</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

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
          {/* ── CHUNK 1: Order Overview & Customer ── */}
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden p-6 space-y-6">
            <OrderHeader />
            <OrderDetails />
          </div>
          
          {/* ── CHUNK 2: Production Items ── */}
          <div className="bg-surface border border-border rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <span className="bg-primary/10 text-primary p-1.5 rounded-md">📦</span>
                  Order Items
                  <span className="text-xs font-normal text-text-muted bg-surface-raised px-2 py-0.5 rounded-full border border-border">
                    {order.order_items?.length || 0} items
                  </span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">Track production progress and advance stages per item</p>
              </div>
              <Button onClick={() => setAddItemOpen(true)} className="h-10 px-4 gap-2 font-medium shadow-sm">
                <PlusIcon className="w-4 h-4" />
                Add Item
              </Button>
            </div>
            
            {targetItemId && action === "quick_advance" && !bannerDismissed && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-fade-in shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span>Scan-to-Advance Active: Scanned item highlighted below.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBannerDismissed(true)}
                  className="text-primary/70 hover:text-primary transition-colors p-1 rounded-md"
                  aria-label="Dismiss notification"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 pt-1">
              {order.order_items && order.order_items.length > 0 ? (
                order.order_items.map((item: any) => {
                  const isTarget = item.id === targetItemId;
                  return (
                    <div
                      key={item.id}
                      id={`item-${item.id}`}
                      className={
                        isTarget
                          ? "ring-2 ring-primary shadow-md rounded-xl transition-all duration-300"
                          : "transition-all duration-300"
                      }
                    >
                      <OrderItemCard item={item} orderId={order.id} />
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-border rounded-xl bg-surface/50">
                  <p className="text-text-muted">No items added to this order yet.</p>
                  <Button onClick={() => setAddItemOpen(true)} variant="secondary" className="mt-3 text-xs">
                    + Add first item
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ── CHUNK 3: Financials & Ledger ── */}
          <div className="bg-surface border border-border rounded-xl shadow-sm p-6 space-y-4">
            <div className="pb-3 border-b border-border">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span className="bg-primary/10 text-primary p-1.5 rounded-md">💰</span>
                Payment Ledger
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">Summary of quoted balance, advance payments, and receipts</p>
            </div>
            <PaymentLedgerPanel orderId={order.id} isAdmin={isAdmin} />
          </div>

          {/* ── CHUNK 4: Activity, Files & QC Proofs ── */}
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-xl shadow-sm p-6 space-y-4">
              <div className="pb-3 border-b border-border">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <span className="bg-primary/10 text-primary p-1.5 rounded-md">📋</span>
                  Activity & Notes
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">Audit log of stage movements, blocks, and floor handoffs</p>
              </div>
              <OrderEventsTimeline orderId={order.id} />
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
          <MaterialChecklistModal
            open={materialModalOpen}
            onOpenChange={setMaterialModalOpen}
            orderId={order.id}
            rawChecklist={order.materials_checklist}
            canEdit={true}
          />
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
        
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="bg-primary/10 text-primary p-1.5 rounded-md">📋</span>
            Activity & Notes
          </h3>
          <OrderEventsTimeline orderId={order.id} />
        </div>
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
      <MaterialChecklistModal
        open={materialModalOpen}
        onOpenChange={setMaterialModalOpen}
        orderId={order.id}
        rawChecklist={order.materials_checklist}
        canEdit={true}
      />
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
