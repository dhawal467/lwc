import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, unit_price, photo_url } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (unit_price !== undefined) updateData.unit_price = unit_price;
    if (photo_url !== undefined) updateData.photo_url = photo_url;

    const { data: updatedItem, error } = await supabase
      .from("order_items")
      .update(updateData)
      .eq("id", params.itemId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updatedItem);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch the item to check status
  const { data: item, error: fetchError } = await supabase
    .from("order_items")
    .select("status")
    .eq("id", params.itemId)
    .single();

  if (fetchError || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (item.status !== 'confirmed') {
    return NextResponse.json({ error: "Can only delete items in confirmed status" }, { status: 400 });
  }

  // 2. Soft-delete
  const { error: deleteError } = await supabase
    .from("order_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.itemId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
