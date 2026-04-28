import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();

    // --- Auth guard ---
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Defense-in-depth: check role via DB profile (not just RLS),
    // so the 403 message is explicit rather than an empty result set.
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: admin access required" },
        { status: 403 }
      );
    }

    // --- Fetch logs joined to users for full_name ---
    // Supabase FK join: changed_by references public.users(id)
    const { data: logs, error } = await supabase
      .from("audit_logs")
      .select(
        `
        id,
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_by,
        created_at,
        users!audit_logs_changed_by_fkey ( full_name )
      `
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[Admin Logs API] Query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the nested users object for easier consumption on the client
    const flattened = (logs ?? []).map((log: any) => ({
      id: log.id,
      table_name: log.table_name,
      record_id: log.record_id,
      action: log.action,
      old_data: log.old_data,
      new_data: log.new_data,
      changed_by: log.changed_by,
      changed_by_name: log.users?.full_name ?? "System",
      created_at: log.created_at,
    }));

    return NextResponse.json({ logs: flattened });
  } catch (err) {
    console.error("[Admin Logs API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
