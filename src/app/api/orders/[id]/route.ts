/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cancelOrderItems } from "@/lib/fsm/engine";
import { logOrderEvent } from "@/lib/events";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      *,
      customers ( name, phone ),
      owner:users!orders_owner_id_fkey ( id, full_name ),
      design_files ( * ),
      order_stages ( *, qc_checks ( * ) ),
      order_items (
        *,
        order_stages ( *, qc_checks ( * ) )
      ),
      payment_ledger ( * )
    `)
    .eq("id", params.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: error?.message || "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

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

  // 1. Role Check
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    return NextResponse.json({ error: "Forbidden: Admins and Managers only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      description, 
      materials_checklist, 
      delivery_date, 
      priority, 
      quoted_amount, 
      status,
      owner_id
    } = body;

    // 2. Fetch current order to check status and for logging
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("status, owner_id, delivery_date")
      .eq("id", params.id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isLocked = ["dispatched", "completed"].includes(order.status);
    const updateData: any = {};

    // Fields always editable
    if (delivery_date !== undefined) updateData.delivery_date = delivery_date;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;

    // owner_id — admin-only
    if (owner_id !== undefined) {
      if (profile.role !== 'admin') {
        return NextResponse.json({ error: "Only admins can reassign order ownership" }, { status: 403 });
      }
      updateData.owner_id = owner_id;
    }

    // Fields locked on dispatch/complete
    if (isLocked) {
      const attemptedLockedFields = [];
      if (description !== undefined) attemptedLockedFields.push("description");
      if (materials_checklist !== undefined) attemptedLockedFields.push("materials_checklist");
      if (quoted_amount !== undefined) attemptedLockedFields.push("quoted_amount");

      if (attemptedLockedFields.length > 0) {
        return NextResponse.json(
          { error: `Cannot edit ${attemptedLockedFields.join(", ")} on a ${order.status} order` },
          { status: 400 }
        );
      }
    } else {
      if (description !== undefined) updateData.description = description;
      if (materials_checklist !== undefined) updateData.materials_checklist = materials_checklist;
      if (quoted_amount !== undefined) updateData.quoted_amount = quoted_amount;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No changes provided" });
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Event Logging
    if (owner_id && owner_id !== order.owner_id) {
      await logOrderEvent({
        orderId: params.id,
        actorId: user.id,
        eventType: 'ownership_change',
        payload: { from_id: order.owner_id, to_id: owner_id }
      });
    }

    if (delivery_date && delivery_date !== order.delivery_date) {
      await logOrderEvent({
        orderId: params.id,
        actorId: user.id,
        eventType: 'delivery_date_changed',
        payload: { from: order.delivery_date, to: delivery_date }
      });
    }

    // If order is cancelled, cascade cancellation to all items
    if (updateData.status === "cancelled") {
      try {
        await cancelOrderItems(params.id);
      } catch (err: any) {
        console.error("Failed to cascade order cancellation:", err.message);
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
