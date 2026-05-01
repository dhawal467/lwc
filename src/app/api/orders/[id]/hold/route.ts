import { NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const serviceSupabase = createServiceRoleClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch current order
    const { data: order, error: fetchError } = await serviceSupabase
      .from("orders")
      .select("id, status")
      .eq("id", params.id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Toggle Status
    let newStatus = order.status;
    if (order.status === "in_production") {
      newStatus = "on_hold";
    } else if (order.status === "on_hold") {
      newStatus = "in_production";
    } else {
      return NextResponse.json({ error: `Cannot hold/resume order in status: ${order.status}` }, { status: 400 });
    }

    // 3. Update Order
    const { error: updateError } = await serviceSupabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", params.id);

    if (updateError) throw updateError;

    return NextResponse.json({ message: `Order status updated to ${newStatus}`, status: newStatus });
  } catch (error: any) {
    console.error("Hold/Resume Order Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to toggle order hold status" }, 
      { status: 500 }
    );
  }
}
