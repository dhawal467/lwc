import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logOrderEvent } from "@/lib/events";

export async function PATCH(request: Request, { params }: { params: { itemId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: item, error: itemErr } = await supabase
    .from("order_items").select("order_id, name, blocked, blocked_at").eq("id", params.itemId).single();
  if (itemErr || !item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (!item.blocked) return NextResponse.json({ error: "Item is not blocked" }, { status: 400 });

  const blockedHours = item.blocked_at
    ? Math.round((Date.now() - new Date(item.blocked_at).getTime()) / (1000 * 60 * 60) * 10) / 10 : 0;

  const { error } = await supabase.from("order_items").update({
    blocked: false, blocked_reason: null, blocked_at: null, blocked_by: null, blocked_note: null,
  }).eq("id", params.itemId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logOrderEvent({ orderId: item.order_id, orderItemId: params.itemId, actorId: user.id,
    eventType: 'unblocked', payload: { item_name: item.name, blocked_hours: blockedHours } });

  return NextResponse.json({ success: true });
}
