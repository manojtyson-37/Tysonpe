import Link from "next/link";
import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  sub?: string;
  back?: { label: string; href: string };
  meta?: ReactNode;
  /** New: multi-action slot. Prefer this over the legacy `action` prop. */
  actions?: ReactNode;
  /** @deprecated Use `actions` instead. Kept for backwards compatibility. */
  action?: ReactNode;
  className?: string;
}

/** Left-arrow icon — inline SVG, no emoji. */
function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M10 12L6 8l4-4"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Page-level heading area: optional back link, title, sub-heading, meta chip
 * row, and right-side actions slot. No eyebrow by default.
 *
 * The legacy `action` prop (singular) is still accepted so existing callers
 * do not need to be updated.
 */
export function PageHeader({ title, sub, back, meta, actions, action, className }: PageHeaderProps) {
  // Prefer `actions` over the legacy `action`
  const actionSlot = actions ?? action;
  return (
    <div className={["mb-6 flex flex-wrap items-start justify-between gap-3", className].filter(Boolean).join(" ")}>
      <div>
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink transition-colors"
          >
            <ArrowLeftIcon />
            {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actionSlot && <div className="flex shrink-0 flex-wrap items-center gap-2">{actionSlot}</div>}
    </div>
  );
}
