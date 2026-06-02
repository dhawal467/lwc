import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const { sanding_complete } = await request.json();

    if (typeof sanding_complete !== "boolean") {
      return NextResponse.json(
        { error: "Invalid payload: sanding_complete must be a boolean" },
        { status: 400 }
      );
    }

    // 3. Use service role for the write (order_stages has no UPDATE RLS for authenticated users)
    const serviceSupabase = createServiceRoleClient();
    const { data, error } = await serviceSupabase
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
