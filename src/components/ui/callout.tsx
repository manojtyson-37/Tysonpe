import type { ReactNode } from "react";
import { IconAlert, IconCheck, IconInfo, type IconProps } from "../icons";

export type CalloutTone = "info" | "good" | "warn" | "bad";

const TONE_CLASS: Record<CalloutTone, string> = {
  info: "border border-line bg-surface-2 text-ink",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-ink",
  bad: "bg-bad-soft text-bad",
};

const TONE_ICON: Record<CalloutTone, (props: IconProps) => ReactNode> = {
  info: IconInfo,
  good: IconCheck,
  warn: IconAlert,
  bad: IconAlert,
};

/**
 * An in-flow message: a one-step tone fill at card radius, no shadow. Only the `bad` tone is `role="alert"`
 * (it interrupts); the others are plain content. `action` is a trailing slot for a link or button.
 */
export function Callout({
  tone = "info",
  action,
  className,
  children,
}: {
  tone?: CalloutTone;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const Icon = TONE_ICON[tone];
  return (
    <div
      role={tone === "bad" ? "alert" : undefined}
      className={["flex items-start gap-3 rounded-card px-4 py-3 text-sm font-medium", TONE_CLASS[tone], className]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
