import { STAGE_COLORS, STAGE_LABELS, STATUS_CONFIG } from "@/lib/design-constants";

// ─── StatusBadge ────────────────────────────────────────────────
type StatusBadgeProps = {
  status: string;
};

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  draft:         { bg: "bg-border/40",        text: "text-text-muted",    border: "border-border/60" },
  confirmed:     { bg: "bg-blue-50",          text: "text-blue-700",     border: "border-blue-200" },
  in_production: { bg: "bg-amber-50",         text: "text-amber-700",    border: "border-amber-200" },
  on_hold:       { bg: "bg-orange-50",        text: "text-orange-600",   border: "border-orange-200" },
  qc_passed:     { bg: "bg-emerald-50",       text: "text-emerald-700",  border: "border-emerald-200" },
  completed:     { bg: "bg-green-50",         text: "text-green-700",    border: "border-green-200" },
  cancelled:     { bg: "bg-red-50",           text: "text-red-700",      border: "border-red-200" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { icon: "○", label: status };
  const style = STATUS_STYLE[status] ?? { bg: "bg-border/40", text: "text-text-muted", border: "border-border/60" };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border}`}
    >
      <span className="text-[10px]">{config.icon}</span>
      {config.label}
    </span>
  );
}

// ─── StageBadge ─────────────────────────────────────────────────
type StageBadgeProps = {
  stageKey: string;
};

export function StageBadge({ stageKey }: StageBadgeProps) {
  const colors = STAGE_COLORS[stageKey];
  const label = STAGE_LABELS[stageKey] ?? stageKey;

  if (!colors) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-border/40 text-text-muted border border-border/60">
        {label}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border"
      style={{
        backgroundColor: colors.light + "25",
        color: colors.light,
        borderColor: colors.light + "50",
      }}
    >
      {label}
    </span>
  );
}
