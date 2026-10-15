"use client";

import { createContext, useActionState, useContext, useId, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions/auth";

type State = (FormState & { values?: Record<string, string> }) | undefined;
const Ctx = createContext<State>(undefined);

/**
 * React 19 resets uncontrolled inputs after every form action. We capture the submitted
 * values (never passwords) so a failed submit re-renders with what the user typed.
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState<State, FormData>(async (prev, fd) => {
    const res = await action(prev, fd);
    if (!res) return res;
    const values: Record<string, string> = {};
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string" && !/password/i.test(k) && !k.startsWith("$ACTION")) values[k] = v;
    }
    return { ...res, values };
  }, undefined);
  return (
    <Ctx.Provider value={state}>
      <form action={formAction} className={className}>
        {children}
      </form>
    </Ctx.Provider>
  );
}

/** Values the user last submitted (never passwords). Use to derive conditional UI that survives React's post-action form reset. */
export function useFormValues() {
  return useContext(Ctx)?.values;
}

export function FormError() {
  const s = useContext(Ctx);
  if (!s?.error) return null;
  return (
    <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm font-medium text-bad">
      {s.error}
    </p>
  );
}

export function SavedNote({ children = "Saved" }: { children?: ReactNode }) {
  const s = useContext(Ctx);
  if (!s?.fields?.saved || s.error) return null;
  return (
    <span role="status" className="text-sm font-medium text-good">
      {children}
    </span>
  );
}

export function SubmitButton({
  children,
  pendingText = "Working…",
  className = "btn btn-primary",
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

type FieldProps = {
  name: string;
  label: string;
  type?: string;
  as?: "input" | "textarea" | "select";
  defaultValue?: string | number | null;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  rows?: number;
  maxLength?: number;
  autoComplete?: string;
  prefix?: string;
  onChange?: (value: string) => void;
  children?: ReactNode; // <option>s
  className?: string;
};

export function Field({
  name, label, type = "text", as = "input", defaultValue, placeholder, hint, required,
  rows = 4, maxLength, autoComplete, prefix, onChange, children, className,
}: FieldProps) {
  const s = useContext(Ctx);
  const error = s?.fields?.[name];
  const value = s?.values?.[name] ?? (defaultValue == null ? "" : String(defaultValue));
  const uid = useId();
  const id = `${uid}-${name}`; // unique per field instance: several forms on one page share field names
  const common = {
    id, name, required, placeholder, "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-err` : hint ? `${id}-hint` : undefined,
    className: "input",
    onChange: onChange ? (e: { target: { value: string } }) => onChange(e.target.value) : undefined,
  };
  // Remount only when the server-returned value changes (not on local edits, which would drop focus).
  const k = `${name}:${s?.values?.[name] ?? ""}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <div className={prefix ? "flex items-center gap-2" : undefined}>
        {prefix && <span className="text-sm text-muted whitespace-nowrap">{prefix}</span>}
        {as === "textarea" ? (
          <textarea key={k} {...common} rows={rows} maxLength={maxLength} defaultValue={value} />
        ) : as === "select" ? (
          <select key={k} {...common} defaultValue={value}>{children}</select>
        ) : (
          <input key={k} {...common} type={type} maxLength={maxLength} autoComplete={autoComplete} defaultValue={type === "password" ? undefined : value} />
        )}
      </div>
      {error ? <p id={`${id}-err`} className="err">{error}</p> : hint ? <p id={`${id}-hint`} className="hint">{hint}</p> : null}
    </div>
  );
}
