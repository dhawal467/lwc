import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { advanceStage } from "@/lib/fsm/engine";
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

    const { order_stage_id, passed, checklist_json, failure_notes, photo_url } = await req.json();

    if (!photo_url) {
      return NextResponse.json({ error: "photo_url is required" }, { status: 400 });
    }

    // 3. Use service role for writes (qc_checks has no INSERT RLS for authenticated users)
    const serviceSupabase = createServiceRoleClient();

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

    if (passed) {
      const { data: orderStage, error: stageError } = await serviceSupabase
        .from('order_stages')
        .select('order_id, order_item_id')
        .eq('id', order_stage_id)
        .single();
        
      if (orderStage && !stageError) {
        await advanceStage(orderStage.order_id);

        // Fire qc_result event — non-blocking
        try {
          await logOrderEvent({
            orderId: orderStage.order_id,
            orderItemId: orderStage.order_item_id || undefined,
            actorId: user.id,
            eventType: 'qc_result',
            payload: { passed, notes: failure_notes || null },
          });
        } catch { /* ignore event logging errors */ }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
