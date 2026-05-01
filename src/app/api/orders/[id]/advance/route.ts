/* eslint-disable @typescript-eslint/no-explicit-any */
import { advanceStage } from "@/lib/fsm/engine";
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
    await advanceStage(params.id);
    return NextResponse.json({ message: "Stage advanced successfully" });
  } catch (error: any) {
    console.error("Advance Stage Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to advance stage" }, 
      { status: 400 }
    );
  }
}
