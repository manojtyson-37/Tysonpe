"use client";

import { useEffect, useReducer, useRef, type ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { ConfirmDialog, confirmReducer } from "@/components/ui/dialog";

/**
 * Submits the button's own form with the button as the submitter (`requestSubmit(button)`), so formAction, name and
 * value behave exactly as for a plain submit button. Returns whether it submitted. A button outside any form cannot
 * submit anything: that is a bug in the caller, so it warns (outside production) instead of closing silently.
 */
export function submitWithSubmitter<B extends { form: { requestSubmit(submitter?: B): void } | null }>(button: B | null): boolean {
  const form = button?.form;
  if (!button || !form) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("ConfirmButton: confirmed, but the button is not inside a <form>, so nothing was submitted.");
    }
    return false;
  }
  form.requestSubmit(button);
  return true;
}

/**
 * Reads a legacy `btn btn-danger btn-sm ...` class string back into a variant and size, starting from ConfirmButton's
 * own defaults (danger / sm), not the generic Button defaults, so a bare `btn` or a lone `btn-sm` still gets the
 * destructive look. `btn` and the `btn-*` look tokens are consumed (the Button primitive emits them once); every other
 * class is returned as extras. It does not need a `btn` token to be present.
 */
export function confirmButtonLook(cls: string | undefined): { variant: ButtonVariant; size: ButtonSize; className: string | undefined } {
  let variant: ButtonVariant = "danger";
  let size: ButtonSize = "sm";
  const rest: string[] = [];
  for (const token of (cls ?? "").split(/\s+/).filter(Boolean)) {
    const v = /^btn-(primary|secondary|ghost|danger)$/.exec(token);
    if (token === "btn") continue;
    if (v) variant = v[1] as ButtonVariant;
    else if (token === "btn-sm") size = "sm";
    else if (token === "btn-lg") size = "lg";
    else rest.push(token);
  }
  return { variant, size, className: rest.length ? rest.join(" ") : undefined };
}

/**
 * Submit button that asks before a destructive form action runs. The click that opens the dialog is cancelled so
 * the form does not submit first; on confirm the ORIGINAL form is submitted with this button as the submitter
 * (`requestSubmit(button)`), so formAction, name and value behave exactly as for a plain submit button.
 *
 * It renders the `Button` primitive: pass `variant` and `size` (default `danger` / `sm`). The older call sites pass a
 * full `btn btn-danger btn-sm` string in `className`; that is read back into a variant and size, starting from
 * danger / sm (an explicit `variant` or `size` wins), and any other classes are kept as extras. `message` is the
 * dialog title; `confirmLabel` names the action on the dialog's confirm button and falls back to the trigger's
 * children, so pass it whenever the children are just "Delete".
 */
export function ConfirmButton({
  message,
  className,
  variant,
  size,
  confirmLabel,
  destructive = true,
  children,
  "aria-label": ariaLabel,
}: {
  message: string;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  confirmLabel?: ReactNode;
  /** Whether the dialog's confirm button is the red destructive one (default). Pass `false` for a reversible action. */
  destructive?: boolean;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [state, dispatch] = useReducer(confirmReducer, { open: false, submit: false });

  useEffect(() => {
    if (!state.submit) return;
    const button = buttonRef.current;
    dispatch("submitted");
    submitWithSubmitter(button);
  }, [state.submit]);

  const look = confirmButtonLook(className);

  return (
    <>
      <Button
        ref={buttonRef}
        type="submit"
        variant={variant ?? look.variant}
        size={size ?? look.size}
        className={look.className}
        aria-label={ariaLabel}
        onClick={(event) => {
          event.preventDefault();
          dispatch("open");
        }}
      >
        {children}
      </Button>
      <ConfirmDialog
        open={state.open}
        title={message}
        confirmLabel={confirmLabel ?? children}
        destructive={destructive}
        onConfirm={() => dispatch("confirm")}
        onCancel={() => dispatch("cancel")}
        returnFocusRef={buttonRef}
      />
    </>
  );
}
