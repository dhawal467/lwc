import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { advanceStage } from "@/lib/fsm/engine";

export async function POST(req: Request) {
  try {
    const { order_stage_id, passed, checklist_json, failure_notes, photo_url } = await req.json();

    if (!photo_url) {
      return NextResponse.json({ error: "photo_url is required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { error: insertError } = await supabase
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
      const { data: orderStage, error: stageError } = await supabase
        .from('order_stages')
        .select('order_id')
        .eq('id', order_stage_id)
        .single();
        
      if (orderStage && !stageError) {
        await advanceStage(orderStage.order_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
