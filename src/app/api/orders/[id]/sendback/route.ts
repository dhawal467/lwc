import { sendBackToStage } from "@/lib/fsm/engine";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { targetStageKey } = await request.json();
    if (!targetStageKey) {
       return NextResponse.json({ error: "targetStageKey is required" }, { status: 400 });
    }

    await sendBackToStage(params.id, targetStageKey);
    return NextResponse.json({ message: "Order sent back to previous stage successfully" });
  } catch (error: any) {
    console.error("Send Back Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send back order" }, 
      { status: 400 }
    );
  }
}
