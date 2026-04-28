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
    if (action === "INSERT") return `Created order ${orderNum}`;
    if (action === "DELETE") return `Deleted order ${orderNum}`;
    if (action === "UPDATE" && old_data && new_data) {
      if (old_data.status !== new_data.status) {
        return `${orderNum} status changed from "${old_data.status}" → "${new_data.status}"`;
      }
      if (old_data.priority !== new_data.priority) {
        return `${orderNum} priority ${new_data.priority ? "set HIGH" : "cleared"}`;
      }
      if (old_data.deleted_at === null && new_data.deleted_at !== null) {
        return `${orderNum} moved to Recycle Bin`;
      }
      if (old_data.deleted_at !== null && new_data.deleted_at === null) {
        return `${orderNum} restored from Recycle Bin`;
      }
      return `Updated order ${orderNum}`;
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

// ─────────────────────────────────────────────
// Action badge colours
// ─────────────────────────────────────────────
const ACTION_BADGE: Record<string, string> = {
  INSERT: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  UPDATE: "bg-amber-100 text-amber-700 border border-amber-200",
  DELETE: "bg-red-100 text-red-700 border border-red-200",
};

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
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-5xl max-h-[85vh] flex flex-col bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-raised flex-shrink-0">
          <div>
            <h2 className="font-display text-lg font-bold text-text-primary">
              Change Details
            </h2>
            <p className="text-xs text-text-muted mt-0.5 font-mono">
              {log.table_name} · {log.action} ·{" "}
              {new Date(log.created_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:bg-surface hover:text-text-primary transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body — side-by-side JSON */}
        <div className="flex flex-1 overflow-hidden divide-x divide-border min-h-0">
          {/* Old data */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-red-50 border-b border-border flex-shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
                Before
              </span>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs text-text-secondary font-mono leading-relaxed bg-surface whitespace-pre-wrap break-words">
              {log.old_data
                ? JSON.stringify(log.old_data, null, 2)
                : "—  (no previous state)"}
            </pre>
          </div>

          {/* New data */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-emerald-50 border-b border-border flex-shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                After
              </span>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs text-text-secondary font-mono leading-relaxed bg-surface whitespace-pre-wrap break-words">
              {log.new_data
                ? JSON.stringify(log.new_data, null, 2)
                : "—  (row was deleted)"}
            </pre>
          </div>
        </div>

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
                          ACTION_BADGE[log.action] ?? "bg-surface-raised text-text-secondary border border-border"
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
