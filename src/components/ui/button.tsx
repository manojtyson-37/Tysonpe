import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type Look = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon (use a component from icons.tsx). Replaced by the spinner while loading. */
  icon?: ReactNode;
};

const SIZE_CLASS: Record<ButtonSize, string> = { sm: " btn-sm", md: "", lg: " btn-lg" };

/**
 * Token classes for a button look. The `.btn` rules in globals.css own radius, press feedback
 * (scale 0.98, 0.97 on `btn-sm`), transitions and the 44px touch hit area.
 */
export function buttonClass({ variant = "primary", size = "md" }: Pick<Look, "variant" | "size">): string {
  return `btn btn-${variant}${SIZE_CLASS[size]}`;
}

// Inline spinner, kept here because it is only meaningful inside a button. Respects reduced motion
// through the global animation override (it holds still, and aria-busy still announces the state).
function Spinner() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className="animate-spin"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

export type ButtonProps = Look &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    /** Shows a spinner, sets aria-busy and blocks clicks. The label stays in layout so the width does not change. */
    loading?: boolean;
    children: ReactNode;
  };

export function Button({
  variant,
  size,
  icon,
  loading = false,
  type = "button",
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const cls = [buttonClass({ variant, size }), loading && "disabled:opacity-100", className].filter(Boolean).join(" ");
  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <span className="invisible inline-flex items-center justify-center gap-2">
            {icon}
            {children}
          </span>
          <span className="absolute inset-0 inline-flex items-center justify-center">
            <Spinner />
          </span>
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}

export type ButtonLinkProps = Look & Omit<ComponentProps<typeof Link>, "children"> & { children: ReactNode };

export function ButtonLink({ variant, size, icon, className, children, ...rest }: ButtonLinkProps) {
  const cls = [buttonClass({ variant, size }), className].filter(Boolean).join(" ");
  return (
    <Link className={cls} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
