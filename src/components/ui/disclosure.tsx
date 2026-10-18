"use client";

import { useId, useState, type ReactNode } from "react";

/** Inline SVG chevron — no emoji. */
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Animated accordion panel.
 *
 * Height animation uses the CSS grid-rows trick:
 * `grid-rows-[0fr]` (collapsed) ↔ `grid-rows-[1fr]` (expanded).
 * The inner div must have `min-h-0` so it collapses properly.
 *
 * Keyboard native: a `<button aria-expanded>` — no custom JS needed.
 */
export function Disclosure({
  label,
  children,
  defaultOpen = false,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const id = useId();
  const panelId = `${id}-panel`;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        id={id}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 py-3 text-left text-sm font-medium text-ink"
      >
        <span className="min-w-0 flex-1">{label}</span>
        <ChevronIcon
          className={[
            "h-4 w-4 shrink-0 text-muted",
            "transition-transform duration-[var(--dur-base)]",
            open ? "rotate-180" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={id}
        // Collapsing is only a height change, so without this the closed fields stay tabbable and readable.
        inert={!open}
        className={[
          "grid overflow-hidden",
          "transition-[grid-template-rows] duration-[var(--dur-base)] ease-[var(--ease-standard)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="min-h-0">{children}</div>
      </div>
    </div>
  );
}
