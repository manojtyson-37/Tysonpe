export type ProgressTone = "ink" | "good";

const FILL_CLASS: Record<ProgressTone, string> = {
  ink: "bg-brand",
  good: "bg-good",
};

/** Flat completion bar. The accessible name comes from `label`; the visible text value means it never relies on colour. */
export function Progress({
  value,
  max = 100,
  label,
  valueText,
  showValue = true,
  tone = "ink",
  className,
}: {
  value: number;
  max?: number;
  /** Accessible name, e.g. "Course completion". Render a visible label separately if the design needs one. */
  label: string;
  /** Text alternative and visible value, e.g. "3 of 8 lessons". Defaults to the rounded percentage. */
  valueText?: string;
  showValue?: boolean;
  tone?: ProgressTone;
  className?: string;
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 0;
  const now = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0;
  const pct = safeMax > 0 ? Math.round((now / safeMax) * 100) : 0;
  const text = valueText ?? `${pct}%`;
  return (
    <div className={["flex items-center gap-3", className].filter(Boolean).join(" ")}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={now}
        aria-valuemin={0}
        aria-valuemax={safeMax || 100}
        aria-valuetext={text}
        // Track is line-strong, not line: the fill reads against it (ink 10.4:1, emerald 2.99:1), and the
        // value is always printed beside the bar. The track against the surface is only 1.77:1, the same
        // project-wide line-strong question as .input borders; that is one token decision, not patched here.
        // Emerald (tone="good") is just under 3:1, so do not assume it passes: the printed value and
        // aria-valuetext carry the information, the fill colour is reinforcement only.
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-strong"
      >
        <div className={`h-full rounded-full ${FILL_CLASS[tone]}`} style={{ width: `${pct}%` }} />
      </div>
      {showValue && <span className="text-sm tabular-nums text-muted">{text}</span>}
    </div>
  );
}
