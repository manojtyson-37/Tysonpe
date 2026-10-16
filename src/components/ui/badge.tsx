import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "good" | "bad" | "warn" | "brand";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "badge-muted",
  good: "badge-good",
  bad: "badge-bad",
  warn: "badge-warn",
  brand: "badge-brand",
};

/** Full-radius label with a semantic soft fill. Use sparingly: not a decoration beside titles. */
export function Badge({ tone = "neutral", dot = false, children }: { tone?: BadgeTone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`badge ${TONE_CLASS[tone]}`}>
      {dot && <span aria-hidden="true" className="mr-1.5 size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

// Existing statuses keep their tones; created reads as "Pending" to a creator.
const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  created: { label: "Pending", tone: "warn" },
  paid: { label: "Paid", tone: "good" },
  failed: { label: "Failed", tone: "bad" },
  refunded: { label: "Refunded", tone: "bad" },
  published: { label: "Published", tone: "good" },
  active: { label: "Active", tone: "good" },
  draft: { label: "Draft", tone: "neutral" },
  inactive: { label: "Inactive", tone: "neutral" },
};

function humanize(status: string): string {
  const words = status.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function StatusBadge({ status }: { status: string }) {
  const known = STATUS[status];
  return <Badge tone={known?.tone ?? "neutral"}>{known?.label ?? humanize(status)}</Badge>;
}
