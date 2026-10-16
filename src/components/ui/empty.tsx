import Link from "next/link";
import type { ReactNode } from "react";

export interface EmptyActionItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: EmptyActionItem;
  secondaryAction?: EmptyActionItem;
  inline?: boolean;
  className?: string;
}

function ActionButton({ item, primary }: { item: EmptyActionItem; primary: boolean }) {
  const cls = primary ? "btn btn-primary" : "btn btn-outline";
  if (item.href) {
    return (
      <Link href={item.href} className={cls}>
        {item.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={item.onClick} className={cls}>
      {item.label}
    </button>
  );
}

/** Full empty-state with icon, title, body, and optional actions. */
export function EmptyState({
  icon,
  title,
  body,
  action,
  secondaryAction,
  inline = false,
  className,
}: EmptyStateProps) {
  const wrapper = [
    inline ? "flex flex-col items-center py-8 text-center" : "card flex flex-col items-center px-6 py-14 text-center",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapper}>
      {icon && <div className="mb-4 text-muted">{icon}</div>}
      <p className="text-lg font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {action && <ActionButton item={action} primary />}
          {secondaryAction && <ActionButton item={secondaryAction} primary={false} />}
        </div>
      )}
    </div>
  );
}

/**
 * Backwards-compatible alias for the old `Empty` export from `ui.tsx`.
 * Accepts `{ title, body, cta }` and maps to `EmptyState`.
 */
export function Empty({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <EmptyState
      title={title}
      body={body}
      action={cta ? { label: cta.label, href: cta.href } : undefined}
    />
  );
}
