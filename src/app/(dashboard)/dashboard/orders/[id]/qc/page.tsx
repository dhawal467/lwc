import React from "react";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { QcChecklistForm } from "@/components/qc/QcChecklistForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function QcPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const supabase = createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_stages ( * )
    `)
    .eq("id", id)
    .single();

  if (error || !order) {
    console.error("[QCPage] Failed to load order:", id, error);
    notFound();
  }

  const currentStage = order.order_stages?.find(
    (s: any) => s.status === "in_progress"
  );

  if (!currentStage || currentStage.stage_key !== "qc_check") {
    redirect(`/dashboard/orders/${id}`);
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 animate-fade-in">
      <div className="mb-6">
        <Button variant="secondary" asChild className="mb-4">
          <Link href={`/dashboard/orders/${id}`}>← Back to Order</Link>
        </Button>
        <h1 className="text-3xl font-display font-semibold text-text-primary">
          QC Gate: Order #{order.order_number}
        </h1>
      </div>
      
      <QcChecklistForm orderId={order.id} orderStageId={currentStage.id} />
    </div>
  );
}
