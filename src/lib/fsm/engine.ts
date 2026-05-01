/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceRoleClient } from "@/lib/supabase/service";
import { STAGE_CONFIG, StageKey, TRACK_A_STAGES, TRACK_B_STAGES } from "@/lib/fsm/tracks";

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

export async function recalculateOrderStatus(orderId: string) {
  const supabase = createServiceRoleClient();

  const { data: items, error } = await supabase
    .from("order_items")
    .select("status")
    .eq("order_id", orderId)
    .is("deleted_at", null);

  if (error || !items) {
    throw new Error(`Failed to fetch order items: ${error?.message || ''}`);
  }

  let newStatus = 'confirmed';

  if (items.length > 0) {
    const allCompleted = items.every(i => i.status === 'completed');
    const allDispatchedOrCompleted = items.every(i => i.status === 'dispatched' || i.status === 'completed');
    
    const anyDispatched = items.some(i => i.status === 'dispatched');
    const anyActive = items.some(i => !['completed', 'dispatched', 'cancelled'].includes(i.status));
    
    const anyInProduction = items.some(i => i.status === 'in_production');
    const anyOnHold = items.some(i => i.status === 'on_hold');

    if (allCompleted) {
      newStatus = 'completed';
    } else if (allDispatchedOrCompleted) {
      newStatus = 'dispatched';
    } else if (anyDispatched && anyActive) {
      newStatus = 'partial_dispatch';
    } else if (anyInProduction) {
      newStatus = 'in_production';
    } else if (anyOnHold && !anyInProduction) {
      newStatus = 'on_hold';
    }
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (updateError) {
    throw new Error(`Failed to recalculate order status: ${updateError.message}`);
  }
}

export async function confirmOrderItem(itemId: string) {
  const supabase = createServiceRoleClient();

  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    throw new Error(`Item not found: ${itemError?.message || ''}`);
  }

  const stages = item.track === 'A' ? TRACK_A_STAGES : TRACK_B_STAGES;

  const stageInserts = stages.map((stageKey, index) => ({
    order_id: item.order_id,
    order_item_id: itemId,
    stage_key: stageKey,
    sequence_position: index + 1,
    status: index === 0 ? 'in_progress' : 'pending',
    sanding_complete: false,
    started_at: index === 0 ? new Date().toISOString() : null,
  }));

  const { error: stagesError } = await supabase
    .from("order_stages")
    .insert(stageInserts);

  if (stagesError) {
    throw new Error(`Failed to create stages: ${stagesError.message}`);
  }

  const firstStage = stages[0];

  const { error: itemUpdateError } = await supabase
    .from("order_items")
    .update({ 
      status: 'in_production', 
      current_stage_key: firstStage 
    })
    .eq("id", itemId);

  if (itemUpdateError) {
    throw new Error(`Failed to update item state: ${itemUpdateError.message}`);
  }

  await recalculateOrderStatus(item.order_id);
}

export async function advanceOrderItemStage(itemId: string) {
  const supabase = createServiceRoleClient();

  // 1. Fetch Order Item and its stages
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("*, order_stages(*)")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    throw new Error(`Order item not found: ${itemError?.message || ''}`);
  }

  // Filter stages by order_item_id to ensure we only look at this item's stages
  const itemStages = item.order_stages.filter((s: any) => s.order_item_id === itemId);

  const currentStage = itemStages.find((s: any) => s.status === 'in_progress');
  if (!currentStage) {
    throw new Error("No active stage found for order item");
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
  const nextStages = itemStages
    .filter((s: any) => s.sequence_position > currentStage.sequence_position)
    .sort((a: any, b: any) => a.sequence_position - b.sequence_position);

  const nextStage = nextStages[0];

  if (nextStage) {
    // 6. If Next Stage exists: Update it and the item
    const { error: nextStageError } = await supabase
      .from("order_stages")
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq("id", nextStage.id);
    
    if (nextStageError) {
       throw new Error(`Failed to start next stage: ${nextStageError.message}`);
    }

    const nextStatus = nextStage.stage_key === 'dispatch' ? 'dispatched' : item.status;

    const { error: itemUpdateError } = await supabase
      .from("order_items")
      .update({ 
        current_stage_key: nextStage.stage_key,
        status: nextStatus
      })
      .eq("id", itemId);

    if (itemUpdateError) {
      throw new Error(`Failed to update item state: ${itemUpdateError.message}`);
    }
  } else {
    // 7. If No Next Stage: Update item to completed
    const { error: completeItemError } = await supabase
      .from("order_items")
      .update({ status: 'completed' })
      .eq("id", itemId);

    if (completeItemError) {
      throw new Error(`Failed to complete item: ${completeItemError.message}`);
    }
  }

  // 8. Recalculate order status
  await recalculateOrderStatus(item.order_id);
}

export async function cancelOrderItems(orderId: string) {
  const supabase = createServiceRoleClient();

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", orderId)
    .is("deleted_at", null)
    .not("status", "in", "('completed','dispatched','cancelled')");

  if (itemsError) {
    throw new Error(`Failed to fetch active items for cancellation: ${itemsError.message}`);
  }

  if (!items || items.length === 0) {
    return;
  }

  const itemIds = items.map(i => i.id);

  // Update order_items status
  const { error: itemsUpdateError } = await supabase
    .from("order_items")
    .update({ status: 'cancelled' })
    .in("id", itemIds);

  if (itemsUpdateError) {
    throw new Error(`Failed to cancel order items: ${itemsUpdateError.message}`);
  }

  // Update order_stages status
  const { error: stagesUpdateError } = await supabase
    .from("order_stages")
    .update({ status: 'cancelled' })
    .in("order_item_id", itemIds)
    .in("status", ['pending', 'in_progress']);

  if (stagesUpdateError) {
    throw new Error(`Failed to cancel order stages: ${stagesUpdateError.message}`);
  }
}

export async function demoteOrderItemStage(itemId: string) {
  const supabase = createServiceRoleClient();

  // 1. Fetch item with its stages
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("*, order_stages(*)")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    throw new Error(`Order item not found: ${itemError?.message || ''}`);
  }

  // 2. Guard: Item must be in_production
  if (item.status !== 'in_production') {
    throw new Error(`Item must be in_production to demote. Current status: ${item.status}`);
  }

  // 3. Filter to this item's stages
  const itemStages = item.order_stages.filter((s: any) => s.order_item_id === itemId);

  const currentStage = itemStages.find((s: any) => s.status === 'in_progress');
  if (!currentStage) {
    throw new Error("No active (in_progress) stage found for order item");
  }

  // 4. Determine track and find previous stage key via array index
  const track = item.track === 'A' ? TRACK_A_STAGES : TRACK_B_STAGES;
  const currentIndex = track.findIndex(k => k === currentStage.stage_key);

  if (currentIndex <= 0) {
    throw new Error("Cannot demote: this is already the first stage in the track");
  }

  const previousStageKey = track[currentIndex - 1];

  // 5. Mark current stage as 'reverted'
  const { error: revertError } = await supabase
    .from("order_stages")
    .update({ status: 'reverted', completed_at: new Date().toISOString() })
    .eq("id", currentStage.id);

  if (revertError) {
    throw new Error(`Failed to revert current stage: ${revertError.message}`);
  }

  // 6. Find and re-activate previous stage row
  const previousStageRow = itemStages.find((s: any) => s.stage_key === previousStageKey);
  if (!previousStageRow) {
    throw new Error(`Previous stage row not found for key: ${previousStageKey}`);
  }

  const { error: prevActivateError } = await supabase
    .from("order_stages")
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      completed_at: null,
      sanding_complete: false,
    })
    .eq("id", previousStageRow.id);

  if (prevActivateError) {
    throw new Error(`Failed to re-activate previous stage: ${prevActivateError.message}`);
  }

  // 7. Update item's current_stage_key
  const { error: itemUpdateError } = await supabase
    .from("order_items")
    .update({ current_stage_key: previousStageKey })
    .eq("id", itemId);

  if (itemUpdateError) {
    throw new Error(`Failed to update item current_stage_key: ${itemUpdateError.message}`);
  }

  // 8. Recalculate parent order status
  await recalculateOrderStatus(item.order_id);
}

