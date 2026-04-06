import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { sanding_complete } = await request.json();

    if (typeof sanding_complete !== "boolean") {
      return NextResponse.json(
        { error: "Invalid payload: sanding_complete must be a boolean" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("order_stages")
      .update({ sanding_complete })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Sanding API] Supabase error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, stage: data });
  } catch (error) {
    console.error("[Sanding API] Internal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
