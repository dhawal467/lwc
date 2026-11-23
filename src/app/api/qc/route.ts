export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  advanceStage,
  advanceOrderItemStage,
  demoteOrderItemStage,
  sendBackOrderItemToStage,
} from "@/lib/fsm/engine";
import { logOrderEvent } from "@/lib/events";

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Role check — admin or manager only
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin" && profile?.role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      order_stage_id,
      passed,
      checklist_json,
      failure_notes,
      photo_url,
      remediation_stage,
    } = await req.json();

    if (!photo_url || !order_stage_id) {
      return NextResponse.json(
        { error: "order_stage_id and photo_url are required" },
        { status: 400 }
      );
    }

    // 3. Use service role for writes (qc_checks has no INSERT RLS for authenticated users)
    const serviceSupabase = createServiceRoleClient(user.id);

    // Fetch order stage
    const { data: orderStage, error: stageError } = await serviceSupabase
      .from("order_stages")
      .select("id, order_id, order_item_id")
      .eq("id", order_stage_id)
      .single();

    if (stageError || !orderStage) {
      return NextResponse.json({ error: "Order stage not found" }, { status: 404 });
    }

    // Invariant check: if order item exists, verify it is not blocked
    if (orderStage.order_item_id) {
      const { data: item, error: itemError } = await serviceSupabase
        .from("order_items")
        .select("id, blocked")
        .eq("id", orderStage.order_item_id)
        .single();

      if (itemError || !item) {
        return NextResponse.json({ error: "Order item not found" }, { status: 404 });
      }

      if (item.blocked) {
        return NextResponse.json(
          { error: "Item is blocked. Cannot perform QC." },
          { status: 400 }
        );
      }
    }

    // Insert QC check record
    const { error: insertError } = await serviceSupabase
      .from("qc_checks")
      .insert({
        order_stage_id,
        passed,
        checklist_json,
        failure_notes,
        photo_url,
      });

    if (insertError) {
      console.error("QC Insert Error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (passed === true) {
      if (orderStage.order_item_id) {
        await advanceOrderItemStage(orderStage.order_item_id, user.id);
      } else {
        await advanceStage(orderStage.order_id, user.id);
      }

      // Fire qc_result event — non-blocking
      try {
        await logOrderEvent({
          orderId: orderStage.order_id,
          orderItemId: orderStage.order_item_id || undefined,
          actorId: user.id,
          eventType: "qc_result",
          payload: { passed: true, notes: failure_notes || null },
        });
      } catch {
        /* ignore event logging errors */
      }
    } else {
      if (orderStage.order_item_id) {
        if (remediation_stage) {
          await sendBackOrderItemToStage(
            orderStage.order_item_id,
            remediation_stage,
            user.id
          );
        } else {
          await demoteOrderItemStage(orderStage.order_item_id, user.id);
        }
      } else {
        const { error: stageUpdateError } = await serviceSupabase
          .from("order_stages")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("id", order_stage_id);

        if (stageUpdateError) {
          throw new Error(`Failed to update stage status: ${stageUpdateError.message}`);
        }
      }

      // Fire qc_result event — non-blocking
      try {
        await logOrderEvent({
          orderId: orderStage.order_id,
          orderItemId: orderStage.order_item_id || undefined,
          actorId: user.id,
          eventType: "qc_result",
          payload: {
            passed: false,
            notes: failure_notes || null,
            remediation_stage: remediation_stage || "demoted",
          },
        });
      } catch {
        /* ignore event logging errors */
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
