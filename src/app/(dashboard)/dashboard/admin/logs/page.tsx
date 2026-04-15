import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogsTable, { type AuditLogEntry } from "./LogsTable";
import { Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "System Logs | FurnitureMFG",
  description: "Admin audit log — see who changed what and when.",
};

async function fetchLogs(): Promise<AuditLogEntry[]> {
  // Use absolute URL-less fetch to keep this a pure server-side call
  // via Supabase directly (no HTTP round-trip to our own API).
  const supabase = createClient();

  const { data, error } = await supabase
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
    console.error("[Logs Page] fetchLogs error:", error);
    return [];
  }

  return (data ?? []).map((log: any) => ({
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
}

export default async function AdminLogsPage() {
  const supabase = createClient();

  // ── Admin guard ──────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }
  // ─────────────────────────────────────────────────────────────

  const logs = await fetchLogs();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary">
              System Logs
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Full audit trail of all data changes across the platform.
            </p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 text-xs text-text-muted bg-surface border border-border rounded-full px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Latest 500 entries
        </div>
      </div>

      {/* Log table (client component) */}
      <LogsTable logs={logs} />
    </div>
  );
}
