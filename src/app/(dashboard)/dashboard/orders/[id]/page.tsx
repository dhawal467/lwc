export const dynamic = 'force-dynamic';
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

import { FsmControls } from "@/components/orders/FsmControls";
import { StageTimeline } from "@/components/orders/StageTimeline";
import { Badge } from "@/components/ui/badge";
import { DesignFileUpload } from "@/components/orders/DesignFileUpload";
import { PriorityToggle } from "@/components/orders/PriorityToggle";

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let role = 'manager';
  if (user) {
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile) role = profile.role;
  }
  const isAdmin = role === 'admin';

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      *,
      customers ( name, phone ),
      design_files ( * ),
      order_stages ( *, qc_checks ( * ) )
    `)
    .eq("id", id)
    .single();

  if (error || !order) {
    console.error("[OrderDetailPage] Failed to load order:", id, error);
    notFound();
  }

  const currentStage = order.order_stages?.find(
    (s: any) => s.status === "in_progress"
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 animate-fade-in flex flex-col md:flex-row gap-8">
      {/* Left Panel: Order Details & Controls */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-semibold text-text-primary tracking-tight">
            Order #{order.order_number}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <Badge variant="outline" className="bg-surface shadow-sm">
              Status: <span className="ml-1 text-primary-hover font-semibold capitalize">{order.status.replace("_", " ")}</span>
            </Badge>
            <Badge variant="outline" className="bg-surface shadow-sm uppercase tracking-wider">
              Track {order.track}
            </Badge>
          </div>
        </div>

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
          <h2 className="text-xl font-semibold mb-2">Order Information</h2>
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
          </div>
        </div>

        <FsmControls order={order} currentStage={currentStage} />
        
        <DesignFileUpload orderId={order.id} />

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
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                        <a href={file.file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-white bg-primary px-3 py-1.5 rounded-md hover:bg-primary-hover shadow-pop">
                          View Full
                        </a>
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
                {order.order_stages?.flatMap((s: any) => s.qc_checks || []).filter((qc: any) => qc.photo_url).length > 0 ? (
                  order.order_stages.flatMap((s: any) => s.qc_checks || []).filter((qc: any) => qc.photo_url).map((qc: any) => (
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
                )}
              </div>
            </div>
          </div>
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
    </div>
  );
}
