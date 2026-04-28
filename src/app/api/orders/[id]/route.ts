import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cancelOrderItems } from "@/lib/fsm/engine";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional: Check if user is admin if only admins can delete orders

  const { error } = await supabase
    .from("orders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Cascade soft-delete to child items
  await supabase
    .from('order_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('order_id', params.id);

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { error } = await supabase
    .from("orders")
    .update(body)
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If order is cancelled, cascade cancellation to all items
  if (body.status === 'cancelled') {
    try {
      await cancelOrderItems(params.id);
    } catch (err: any) {
      console.error("Failed to cascade order cancellation:", err.message);
      // We don't fail the whole request if cascade fails, but we log it
    }
  }

  return NextResponse.json({ success: true });
}
