"use client";

import type { ReactNode } from "react";

/** Submit button that asks before a destructive form action runs. */
export function ConfirmButton({ message, className, children, "aria-label": ariaLabel }: { message: string; className?: string; children: ReactNode; "aria-label"?: string }) {
  return (
    <button
      type="submit"
      className={className}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
