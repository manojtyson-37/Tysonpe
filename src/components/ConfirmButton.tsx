"use client";

import { useEffect, useReducer, useRef, type ReactNode } from "react";
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
 * Submit button that asks before a destructive form action runs. The click that opens the dialog is cancelled so
 * the form does not submit first; on confirm the ORIGINAL form is submitted with this button as the submitter
 * (`requestSubmit(button)`), so formAction, name and value behave exactly as for a plain submit button.
 */
export function ConfirmButton({ message, className, children, "aria-label": ariaLabel }: { message: string; className?: string; children: ReactNode; "aria-label"?: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [state, dispatch] = useReducer(confirmReducer, { open: false, submit: false });

  useEffect(() => {
    if (!state.submit) return;
    const button = buttonRef.current;
    dispatch("submitted");
    submitWithSubmitter(button);
  }, [state.submit]);

  return (
    <>
      <button
        ref={buttonRef}
        type="submit"
        className={className}
        aria-label={ariaLabel}
        onClick={(event) => {
          event.preventDefault();
          dispatch("open");
        }}
      >
        {children}
      </button>
      <ConfirmDialog
        open={state.open}
        title={message}
        confirmLabel={children}
        onConfirm={() => dispatch("confirm")}
        onCancel={() => dispatch("cancel")}
        returnFocusRef={buttonRef}
      />
    </>
  );
}
