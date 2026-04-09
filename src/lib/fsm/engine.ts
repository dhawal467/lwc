import { createServiceRoleClient } from "@/lib/supabase/service";
import { STAGE_CONFIG, StageKey } from "@/lib/fsm/tracks";

export async function advanceStage(orderId: string) {
  const supabase = createServiceRoleClient();

  // 1. Fetch Order and current active Stage
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, order_stages(*)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order not found: ${orderError?.message || ''}`);
  }

  const currentStage = order.order_stages.find((s: any) => s.status === 'in_progress');
  if (!currentStage) {
    throw new Error("No active stage found for order");
  }

  const stageKey = currentStage.stage_key as StageKey;

  // 2. Guard: Sanding check
  if (STAGE_CONFIG[stageKey]?.requiresSanding && !currentStage.sanding_complete) {
    throw new Error("Sanding must be marked complete");
  }

  // 3. Guard: QC check
  if (stageKey === 'qc_check') {
    const { data: qcChecks, error: qcError } = await supabase
      .from("qc_checks")
      .select("*")
      .eq("order_stage_id", currentStage.id)
      .eq("passed", true)
      .limit(1);
    
    if (qcError || !qcChecks || qcChecks.length === 0) {
      throw new Error("QC must be passed first");
    }
  }

  // 4. Transition: Update current stage
  const { error: completeError } = await supabase
    .from("order_stages")
    .update({ status: 'complete', completed_at: new Date().toISOString() })
    .eq("id", currentStage.id);

  if (completeError) {
    throw new Error(`Failed to complete current stage: ${completeError.message}`);
  }

  // 5. Find Next Stage
  const nextStages = order.order_stages
    .filter((s: any) => s.sequence_position > currentStage.sequence_position)
    .sort((a: any, b: any) => a.sequence_position - b.sequence_position);

  const nextStage = nextStages[0];

  if (nextStage) {
    // 6. If Next Stage exists: Update it and the order
    const { error: nextStageError } = await supabase
      .from("order_stages")
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq("id", nextStage.id);
    
    if (nextStageError) {
       throw new Error(`Failed to start next stage: ${nextStageError.message}`);
    }

    const nextStatus = nextStage.stage_key === 'dispatch' ? 'dispatched' : 'in_production';

    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({ 
        current_stage_key: nextStage.stage_key,
        status: nextStatus
      })
      .eq("id", orderId);

    if (orderUpdateError) {
      throw new Error(`Failed to update order state: ${orderUpdateError.message}`);
    }
  } else {
    // 7. If No Next Stage: Update order to completed
    const { error: completeOrderError } = await supabase
      .from("orders")
      .update({ status: 'completed' })
      .eq("id", orderId);

    if (completeOrderError) {
      throw new Error(`Failed to complete order: ${completeOrderError.message}`);
    }
  }
}

export async function sendBackToStage(orderId: string, targetStageKey: string) {
  const supabase = createServiceRoleClient();

  // 1. Fetch Order and current stage
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, order_stages(*)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order not found: ${orderError?.message || ''}`);
  }

  const currentStage = order.order_stages.find((s: any) => s.status === 'in_progress');
  if (!currentStage) {
    throw new Error("No active stage found for order");
  }

  // 2. Transition current to failed
  const { error: failError } = await supabase
    .from("order_stages")
    .update({ status: 'failed', completed_at: new Date().toISOString() })
    .eq("id", currentStage.id);
  
  if (failError) {
    throw new Error(`Failed to mark current stage as failed: ${failError.message}`);
  }

  // 3. Find target stage row
  const targetStage = order.order_stages.find((s: any) => s.stage_key === targetStageKey);
  if (!targetStage) {
    throw new Error(`Target stage ${targetStageKey} not found for this order`);
  }

  // 4. Update target stage row
  const { error: activateError } = await supabase
    .from("order_stages")
    .update({ 
      status: 'in_progress', 
      started_at: new Date().toISOString(),
      sanding_complete: false,
      completed_at: null // Reset completion if needed
    })
    .eq("id", targetStage.id);

  if (activateError) {
    throw new Error(`Failed to activate target stage: ${activateError.message}`);
  }

  // 5. Update Order's current_stage_key
  const { error: updateOrderError } = await supabase
    .from("orders")
    .update({ current_stage_key: targetStageKey })
    .eq("id", orderId);

  if (updateOrderError) {
    throw new Error(`Failed to update order target stage: ${updateOrderError.message}`);
  }
}
