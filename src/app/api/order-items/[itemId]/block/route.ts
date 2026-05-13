import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logOrderEvent } from "@/lib/events";

export async function PATCH(request: Request, { params }: { params: { itemId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { reason, note } = body;

  if (!reason) return NextResponse.json({ error: "Reason is required" }, { status: 400 });

  const validReasons = ['material_pending','customer_approval','worker_unavailable','payment_pending','machine_issue','other'];
  if (!validReasons.includes(reason)) return NextResponse.json({ error: "Invalid reason" }, { status: 400 });

  // Fetch item to get order_id
  const { data: item, error: itemErr } = await supabase
    .from("order_items").select("order_id, name, blocked").eq("id", params.itemId).single();
  if (itemErr || !item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.blocked) return NextResponse.json({ error: "Item is already blocked" }, { status: 400 });

  const { error } = await supabase.from("order_items").update({
    blocked: true, blocked_reason: reason, blocked_at: new Date().toISOString(),
    blocked_by: user.id, blocked_note: note || null,
  }).eq("id", params.itemId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logOrderEvent({ orderId: item.order_id, orderItemId: params.itemId, actorId: user.id,
    eventType: 'blocked', payload: { item_name: item.name, reason, note } });

  return NextResponse.json({ success: true });
}
