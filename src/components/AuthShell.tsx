import type { ReactNode } from "react";

/**
 * The narrow centred column shared by log in, sign up and store onboarding: heading, optional subtitle, the form
 * in a card, and an optional footer line (a link to the sibling page). It owns layout only. The caller owns the
 * form, its actions and any redirects. The page's `<main>` comes from the surrounding shell, not from here.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="card mt-6 p-6">{children}</div>
      {footer && <p className="mt-5 text-center text-sm text-muted">{footer}</p>}
    </div>
  );
}
