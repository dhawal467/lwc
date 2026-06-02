"use client";

import { useState } from "react";

// ─────────────────────────────────────────────
// Stage key → human-readable label map
// Mirrors STAGE_CONFIG in src/lib/fsm/tracks.ts
// ─────────────────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
  carpentry: "Carpentry",
  frame_making: "Frame Making",
  polish: "Polish",
  upholstery: "Upholstery",
  qc_check: "QC Check",
  dispatch: "Dispatch",
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string | null;
  changed_by_name: string;
  created_at: string;
}

// ─────────────────────────────────────────────
// describeLog — human-readable one-liner
// ─────────────────────────────────────────────
function describeLog(log: AuditLogEntry): string {
  const { table_name, action, old_data, new_data } = log;
  const current = new_data ?? old_data;

  // ── order_stages: the most important log for the workshop ──
  if (table_name === "order_stages") {
    const orderNum = (current?.order_number as string) ?? null;

    if (action === "UPDATE" && old_data && new_data) {
      const oldStage = old_data.stage_key as string | undefined;
      const newStage = new_data.stage_key as string | undefined;

      // Stage-key changed → movement between workshop stages
      if (oldStage && newStage && oldStage !== newStage) {
        const from = STAGE_LABELS[oldStage] ?? oldStage;
        const to = STAGE_LABELS[newStage] ?? newStage;
        return orderNum
          ? `Moved ${orderNum} from ${from} → ${to}`
          : `Moved order from ${from} → ${to}`;
      }

      // Status changed within same stage
      const oldStatus = old_data.status as string | undefined;
      const newStatus = new_data.status as string | undefined;
      if (oldStatus !== newStatus && newStage) {
        const stageLabel = STAGE_LABELS[newStage] ?? newStage;
        const statusLabel =
          newStatus === "completed"
            ? "completed"
            : newStatus === "in_progress"
            ? "started"
            : newStatus ?? "updated";
        return orderNum
          ? `${stageLabel} ${statusLabel} on ${orderNum}`
          : `${stageLabel} stage ${statusLabel}`;
      }

      // Sanding flag toggled
      if (
        old_data.sanding_complete !== new_data.sanding_complete &&
        newStage
      ) {
        const stageLabel = STAGE_LABELS[newStage] ?? newStage;
        return `Sanding ${new_data.sanding_complete ? "marked complete" : "unmarked"} on ${stageLabel}`;
      }

      // QC photo / notes updates
      if (old_data.photo_url !== new_data.photo_url) {
        return orderNum
          ? `QC photo updated for ${orderNum}`
          : "QC photo updated";
      }
    }

    if (action === "INSERT") {
      const stageLabel = STAGE_LABELS[(current?.stage_key as string) ?? ""] ?? current?.stage_key ?? "";
      return orderNum
        ? `Stage "${stageLabel}" created for ${orderNum}`
        : `New stage "${stageLabel}" added`;
    }

    if (action === "DELETE") {
      const stageLabel = STAGE_LABELS[(current?.stage_key as string) ?? ""] ?? current?.stage_key ?? "";
      return orderNum
        ? `Stage "${stageLabel}" removed from ${orderNum}`
        : `Stage "${stageLabel}" deleted`;
    }
  }

  // ── orders ──
  if (table_name === "orders") {
    const orderNum = (current?.order_number as string) ?? "an order";
    if (action === "INSERT") return `New order ${orderNum} created`;
    if (action === "DELETE") return `Order ${orderNum} deleted`;
    if (action === "UPDATE" && old_data && new_data) {
      if (old_data.status !== new_data.status) {
        const from = ORDER_STATUS_LABELS[String(old_data.status)] ?? old_data.status;
        const to   = ORDER_STATUS_LABELS[String(new_data.status)] ?? new_data.status;
        return `${orderNum} moved from "${from}" to "${to}"`;
      }
      if (old_data.priority !== new_data.priority) {
        return `${orderNum} marked as ${new_data.priority ? "high priority" : "normal priority"}`;
      }
      if (old_data.deleted_at === null && new_data.deleted_at !== null) {
        return `${orderNum} moved to Recycle Bin`;
      }
      if (old_data.deleted_at !== null && new_data.deleted_at === null) {
        return `${orderNum} restored from Recycle Bin`;
      }
      if (old_data.delivery_date !== new_data.delivery_date) {
        return `${orderNum} delivery date updated`;
      }
      return `Order ${orderNum} details updated`;
    }
  }

  // ── customers ──
  if (table_name === "customers") {
    const name = (current?.name as string) ?? "a customer";
    if (action === "INSERT") return `Added new customer "${name}"`;
    if (action === "DELETE") return `Deleted customer "${name}"`;
    return `Updated customer "${name}"`;
  }

  // ── workers ──
  if (table_name === "workers") {
    const name = (current?.name as string) ?? "a worker";
    if (action === "INSERT") return `Added new worker "${name}"`;
    if (action === "DELETE") return `Removed worker "${name}"`;
    if (action === "UPDATE" && old_data && new_data) {
      if (old_data.active !== new_data.active) {
        return `Worker "${name}" marked ${new_data.active ? "active" : "inactive"}`;
      }
    }
    return `Updated worker "${name}"`;
  }

  // ── fallback ──
  return `${ACTION_LABELS[action] ?? action} record in ${table_name}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Field label map — translates raw DB column names to plain English
// ─────────────────────────────────────────────────────────────────────────────

// Order status labels — used by describeLog above AND by formatValue below
const ORDER_STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  in_production: "In Production",
  on_hold: "On Hold",
  dispatched: "Dispatched",
  completed: "Completed",
  cancelled: "Cancelled",
  partial_dispatch: "Partially Dispatched",
  pending: "Pending",
  in_progress: "In Progress",
  complete: "Complete",
  failed: "Failed",
  reverted: "Reverted",
};

const FIELD_LABELS: Record<string, string> = {
  // Common
  id: "ID",
  created_at: "Created At",
  updated_at: "Updated At",
  deleted_at: "Deleted At",
  // Orders
  order_number: "Order Number",
  status: "Status",
  priority: "Priority",
  description: "Description",
  materials_checklist: "Materials Checklist",
  delivery_date: "Delivery Date",
  quoted_amount: "Quoted Amount",
  current_stage_key: "Current Stage",
  owner_id: "Owner",
  customer_id: "Customer",
  track: "Production Track",
  // Order stages
  stage_key: "Stage",
  sequence_position: "Sequence Position",
  started_at: "Started At",
  completed_at: "Completed At",
  sanding_complete: "Sanding Complete",
  order_id: "Order",
  order_item_id: "Order Item",
  // Order items
  name: "Name",
  quantity: "Quantity",
  unit_price: "Unit Price",
  // Customers
  phone: "Phone",
  address: "Address",
  // Workers
  active: "Active",
  daily_rate: "Daily Rate",
  role: "Role",
  // QC
  passed: "QC Passed",
  failure_notes: "Failure Notes",
  photo_url: "Photo",
  checklist_json: "Checklist",
};


// ─────────────────────────────────────────────────────────────────────────────
// Value formatters — make raw DB values human-readable
// ─────────────────────────────────────────────────────────────────────────────

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (field === "stage_key" || field === "current_stage_key") {
    return STAGE_LABELS[String(value)] ?? String(value);
  }
  if (field === "status") {
    return ORDER_STATUS_LABELS[String(value)] ?? String(value);
  }
  if (
    field === "created_at" ||
    field === "updated_at" ||
    field === "deleted_at" ||
    field === "started_at" ||
    field === "completed_at" ||
    field === "delivery_date"
  ) {
    try {
      return new Date(String(value)).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(value);
    }
  }
  if (field === "quoted_amount" || field === "unit_price" || field === "daily_rate") {
    const n = Number(value);
    if (!isNaN(n)) return `₹${n.toLocaleString("en-IN")}`;
  }
  if (field === "priority") return value ? "High Priority" : "Normal";
  if (field === "photo_url") return "Photo attached";
  if (field === "checklist_json") return "(checklist data)";
  if (field === "materials_checklist") return "(checklist data)";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Fields that are too noisy to show individually in the diff
const SKIP_FIELDS = new Set(["id", "order_id", "order_item_id", "customer_id", "owner_id"]);

// ─────────────────────────────────────────────────────────────────────────────
// buildChangeSummary — returns an array of human-readable change rows
// ─────────────────────────────────────────────────────────────────────────────
type ChangeRow = {
  field: string;
  label: string;
  oldVal: string | null;
  newVal: string | null;
  kind: "changed" | "added" | "removed";
};

function buildChangeSummary(log: AuditLogEntry): ChangeRow[] {
  const { action, old_data, new_data } = log;
  const rows: ChangeRow[] = [];

  if (action === "UPDATE" && old_data && new_data) {
    // Only show fields that actually changed
    const allFields = Array.from(new Set([...Object.keys(old_data), ...Object.keys(new_data)]));
    for (const field of allFields) {
      if (SKIP_FIELDS.has(field)) continue;
      const ov = old_data[field];
      const nv = new_data[field];
      // Compare as strings to catch null vs "" etc.
      if (JSON.stringify(ov) === JSON.stringify(nv)) continue;
      rows.push({
        field,
        label: FIELD_LABELS[field] ?? field,
        oldVal: formatValue(field, ov),
        newVal: formatValue(field, nv),
        kind: "changed",
      });
    }
    return rows;
  }

  if (action === "INSERT" && new_data) {
    for (const [field, value] of Object.entries(new_data)) {
      if (SKIP_FIELDS.has(field)) continue;
      if (value === null || value === undefined) continue;
      rows.push({
        field,
        label: FIELD_LABELS[field] ?? field,
        oldVal: null,
        newVal: formatValue(field, value),
        kind: "added",
      });
    }
    return rows;
  }

  if (action === "DELETE" && old_data) {
    for (const [field, value] of Object.entries(old_data)) {
      if (SKIP_FIELDS.has(field)) continue;
      if (value === null || value === undefined) continue;
      rows.push({
        field,
        label: FIELD_LABELS[field] ?? field,
        oldVal: formatValue(field, value),
        newVal: null,
        kind: "removed",
      });
    }
    return rows;
  }

  return rows;
}

// ─────────────────────────────────────────────
// LogDetailsModal
// ─────────────────────────────────────────────
function LogDetailsModal({
  log,
  onClose,
}: {
  log: AuditLogEntry;
  onClose: () => void;
}) {
  const changes = buildChangeSummary(log);
  const summary = describeLog(log);

  const actionColors: Record<string, string> = {
    INSERT: "text-emerald-600 bg-emerald-50 border-emerald-200",
    UPDATE: "text-amber-600 bg-amber-50 border-amber-200",
    DELETE: "text-red-600 bg-red-50 border-red-200",
  };
  const actionColor = actionColors[log.action] ?? "text-text-secondary bg-surface-raised border-border";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border bg-surface-raised flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="font-display text-base font-bold text-text-primary leading-snug">
              {summary}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${actionColor}`}>
                {ACTION_LABELS[log.action] ?? log.action}
              </span>
              <span className="text-xs text-text-muted">
                {log.table_name.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">
                {new Date(log.created_at).toLocaleString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs font-medium text-text-primary">
                {log.changed_by_name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:bg-surface hover:text-text-primary transition-colors text-xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Body — human-readable change list */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ── Summary card ─────────────────────────────────────────── */}
          <div className="mx-6 mt-4 mb-3 px-4 py-3 rounded-xl bg-primary-soft border border-primary/20 flex items-start gap-3">
            <span className="mt-0.5 text-primary flex-shrink-0">
              {/* info icon */}
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-primary leading-snug">{summary}</p>
              <p className="text-xs text-primary/70 mt-0.5">
                {log.changed_by_name === "System"
                  ? "This change was made automatically by the system."
                  : `This change was made by ${log.changed_by_name}.`}
              </p>
            </div>
          </div>

          {/* ── Field-by-field change table ──────────────────────────── */}
          <div className="px-6 pb-4 space-y-1">
          {changes.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">
              No field-level details available for this entry.
            </p>
          ) : (
            <>
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 pb-2 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Field</span>
                {log.action === "INSERT" ? (
                  <>
                    <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">Value Set</span>
                  </>
                ) : log.action === "DELETE" ? (
                  <>
                    <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-red-600">Value Removed</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-semibold uppercase tracking-wider text-red-500">Before</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">After</span>
                  </>
                )}
              </div>

              {changes.map((row) => (
                <div
                  key={row.field}
                  className="grid grid-cols-[1fr_1fr_1fr] gap-3 py-2.5 border-b border-border/50 last:border-0 items-start"
                >
                  {/* Field name */}
                  <span className="text-xs font-medium text-text-secondary">
                    {row.label}
                  </span>

                  {log.action === "INSERT" ? (
                    <span className="col-span-2 text-sm text-emerald-700 font-medium">
                      {row.newVal}
                    </span>
                  ) : log.action === "DELETE" ? (
                    <span className="col-span-2 text-sm text-red-600 line-through">
                      {row.oldVal}
                    </span>
                  ) : (
                    <>
                      {/* Old value */}
                      <span className="text-sm text-red-500 line-through break-words">
                        {row.oldVal ?? "—"}
                      </span>
                      {/* New value */}
                      <span className="text-sm text-emerald-700 font-medium break-words">
                        {row.newVal ?? "—"}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </>
          )}
          </div>{/* end field table */}
        </div>{/* end scroll container */}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-surface-raised flex-shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// Main LogsTable client component
// ─────────────────────────────────────────────
export default function LogsTable({ logs }: { logs: AuditLogEntry[] }) {
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [search, setSearch] = useState("");

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.table_name.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.changed_by_name.toLowerCase().includes(q) ||
      describeLog(log).toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by user, table, action…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 text-sm rounded-lg border border-border bg-surface-raised text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-raised border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs w-40">
                  Time
                </th>
                <th className="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs w-36">
                  User
                </th>
                <th className="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs w-32">
                  Action
                </th>
                <th className="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">
                  Description
                </th>
                <th className="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs w-20 text-right">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-text-muted text-sm">
                    No log entries found.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-surface-raised/50 transition-colors group"
                  >
                    {/* Time */}
                    <td className="px-4 py-3 text-text-muted font-mono text-xs whitespace-nowrap">
                      <div>{new Date(log.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      <div className="text-text-muted/70">
                        {new Date(log.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-4 py-3 text-text-primary font-medium text-xs">
                      {log.changed_by_name}
                    </td>

                    {/* Action badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          log.action === "INSERT"
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : log.action === "DELETE"
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : "bg-amber-100 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}{" "}
                        <span className="ml-1 opacity-60">{log.table_name}</span>
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 text-text-primary text-xs">
                      {describeLog(log)}
                    </td>

                    {/* Details button */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-xs font-medium text-primary hover:underline opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        <div className="px-4 py-2 border-t border-border bg-surface-raised text-xs text-text-muted">
          Showing {filtered.length} of {logs.length} entries (latest 500)
        </div>
      </div>

      {/* Modal */}
      {selectedLog && (
        <LogDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </>
  );
}
