/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { TRACK_A_STAGES, TRACK_B_STAGES } from "@/lib/fsm/tracks";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const serviceSupabase = createServiceRoleClient();
  const orderId = params.id;

  // 1. Authentication Check (Must be an authenticated user to initiate confirmation)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch the order
  const { data: order, error: fetchError } = await serviceSupabase
    .from("orders")
    .select("id, track, status")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "confirmed") {
    // Only 'confirmed' orders can be pushed to production
    // This assumes state 0 is 'confirmed' as per Sprint 2
    // If it's already 'in_production', skip.
    if (order.status === "in_production") {
        return NextResponse.json({ error: "Order is already in production" }, { status: 400 });
    }
  }

  // 3. Determine stages based on track
  const trackKey = order.track?.toUpperCase();
  const stages = trackKey === "A" ? TRACK_A_STAGES : trackKey === "B" ? TRACK_B_STAGES : null;

  if (!stages) {
    return NextResponse.json({ error: `Invalid track '${order.track}' defined for order` }, { status: 400 });
  }

  // 4. Prepare order_stages payload
  const now = new Date().toISOString();
  const orderStagesPayload = stages.map((stageKey, index) => ({
    order_id: orderId,
    stage_key: stageKey,
    sequence_position: (index + 1) * 10,
    status: index === 0 ? "in_progress" : "pending",
    started_at: index === 0 ? now : null,
  }));

  try {
    // 5. Insert stages (using service role to bypass restrictive RLS)
    const { error: insertError } = await serviceSupabase
      .from("order_stages")
      .insert(orderStagesPayload);

    if (insertError) throw insertError;

    // 6. Update order row
    const { error: updateError } = await serviceSupabase
      .from("orders")
      .update({
        status: "in_production",
        current_stage_key: stages[0],
      })
      .eq("id", orderId);

    if (updateError) throw updateError;

    return NextResponse.json({ 
        message: "Order confirmed and pushed to production",
        track: trackKey,
        current_stage: stages[0]
    });

  } catch (error: any) {
    console.error("FSM Transition Error:", error);
    return NextResponse.json({ error: error.message || "Failed to confirm order" }, { status: 500 });
  }
}
