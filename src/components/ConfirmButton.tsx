"use client";

import { useEffect, useReducer, useRef, type ReactNode } from "react";
import { ConfirmDialog, confirmReducer } from "@/components/ui/dialog";

/**
 * Submit button that asks before a destructive form action runs. The click that opens the dialog is cancelled so
 * the form does not submit first; on confirm the ORIGINAL form is submitted with this button as the submitter
 * (`requestSubmit(button)`), so formAction, name and value behave exactly as for a plain submit button.
 */
export function ConfirmButton({ message, className, children }: { message: string; className?: string; children: ReactNode }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [state, dispatch] = useReducer(confirmReducer, { open: false, submit: false });

  useEffect(() => {
    if (!state.submit) return;
    const button = buttonRef.current;
    dispatch("submitted");
    button?.form?.requestSubmit(button);
  }, [state.submit]);

  return (
    <>
      <button
        ref={buttonRef}
        type="submit"
        className={className}
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
