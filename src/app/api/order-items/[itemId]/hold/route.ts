import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { recalculateOrderStatus } from "@/lib/fsm/engine";

export async function POST(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch item
    const { data: item, error: fetchError } = await supabase
      .from("order_items")
      .select("*")
      .eq("id", params.itemId)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // 2. Toggle status
    let newStatus = item.status;
    if (item.status === 'in_production') {
      newStatus = 'on_hold';
    } else if (item.status === 'on_hold') {
      newStatus = 'in_production';
    } else {
      return NextResponse.json({ error: "Item must be 'in_production' or 'on_hold' to toggle hold" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("order_items")
      .update({ status: newStatus })
      .eq("id", params.itemId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Recalculate order status
    await recalculateOrderStatus(item.order_id);

    return NextResponse.json({ status: newStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
