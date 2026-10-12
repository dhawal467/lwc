import { STAGE_COLORS, STAGE_LABELS, STATUS_CONFIG } from "@/lib/design-constants";

// ─── StatusBadge ────────────────────────────────────────────────
type StatusBadgeProps = {
  status: string;
};

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  draft:            { bg: "bg-surface-raised",       text: "text-text-muted",     border: "border-border" },
  confirmed:        { bg: "bg-info-soft",            text: "text-info",           border: "border-info/30" },
  in_production:    { bg: "bg-warning-soft",         text: "text-warning",        border: "border-warning/30" },
  on_hold:          { bg: "bg-warning-soft",         text: "text-warning",        border: "border-warning/40" },
  qc_passed:        { bg: "bg-success-soft",         text: "text-success",        border: "border-success/30" },
  completed:        { bg: "bg-success-soft",         text: "text-success",        border: "border-success/40" },
  cancelled:        { bg: "bg-danger-soft",          text: "text-danger",         border: "border-danger/30" },
  dispatched:       { bg: "bg-success-soft",         text: "text-success",        border: "border-success/30" },
  partial_dispatch: { bg: "bg-warning-soft",         text: "text-warning",        border: "border-warning/30" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { icon: "○", label: status };
  const style = STATUS_STYLE[status] ?? { bg: "bg-surface-raised", text: "text-text-muted", border: "border-border" };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border}`}
    >
      <span className="text-[10px]" aria-hidden="true">{config.icon}</span>
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
