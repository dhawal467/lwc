import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin Check
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { priority } = await request.json();

    if (typeof priority !== "boolean") {
      return NextResponse.json(
        { error: "Invalid payload: priority must be a boolean" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();
    const { data, error } = await serviceSupabase
      .from("orders")
      .update({ priority })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("[Priority API] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: data });
  } catch (error) {
    console.error("[Priority API] Internal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
