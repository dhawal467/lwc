export const dynamic = 'force-dynamic';
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { OrderDetailView } from "@/components/orders/OrderDetailView";

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
      order_stages ( *, qc_checks ( * ) ),
      order_items (
        *,
        order_stages ( *, qc_checks ( * ) )
      ),
      payment_ledger ( * )
    `)
    .eq("id", id)
    .single();

  if (error || !order) {
    console.error("[OrderDetailPage] Failed to load order:", id, error);
    notFound();
  }

  return <OrderDetailView order={order} isAdmin={isAdmin} />;
}
