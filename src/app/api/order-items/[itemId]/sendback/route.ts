/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const { targetStageKey } = await request.json();
    if (!targetStageKey) {
      return NextResponse.json({ error: "targetStageKey is required" }, { status: 400 });
    }

    // 1. Fetch item and its stages
    const { data: item, error: itemError } = await supabase
      .from("order_items")
      .select("*, order_stages(*)")
      .eq("id", params.itemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const itemStages = item.order_stages.filter((s: any) => s.order_item_id === params.itemId);
    
    const currentStage = itemStages.find((s: any) => s.status === 'in_progress');
    const targetStage = itemStages.find((s: any) => s.stage_key === targetStageKey);

    if (!currentStage) {
      return NextResponse.json({ error: "No active stage found to send back from" }, { status: 400 });
    }
    if (!targetStage) {
      return NextResponse.json({ error: `Target stage ${targetStageKey} not found for this item` }, { status: 400 });
    }

    // 2. Update stages
    // Mark current as failed
    const { error: failError } = await supabase
      .from("order_stages")
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq("id", currentStage.id);

    if (failError) throw new Error(failError.message);

    // Mark target as in_progress
    const { error: targetError } = await supabase
      .from("order_stages")
      .update({ 
        status: 'in_progress', 
        started_at: new Date().toISOString(),
        sanding_complete: false,
        completed_at: null 
      })
      .eq("id", targetStage.id);

    if (targetError) throw new Error(targetError.message);

    // 3. Update item
    const { error: itemUpdateError } = await supabase
      .from("order_items")
      .update({ current_stage_key: targetStageKey })
      .eq("id", params.itemId);

    if (itemUpdateError) throw new Error(itemUpdateError.message);

    // 4. Recalculate order status
    await recalculateOrderStatus(item.order_id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
