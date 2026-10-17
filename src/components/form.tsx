"use client";

import {
  createContext,
  useActionState,
  useContext,
  useId,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions/auth";
import { Button, type ButtonSize, type ButtonVariant } from "./ui/button";
import { IconCheck, IconChevronDown } from "./icons";

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

/**
 * Old call sites pass a full `btn btn-secondary btn-sm w-full` string. Read the variant and size back out of it so
 * the Button primitive owns the base classes and nothing is emitted twice; anything else is kept as extra className.
 */
export function legacyButtonLook(cls: string): { variant: ButtonVariant; size: ButtonSize; className: string | undefined } {
  let variant: ButtonVariant = "primary";
  let size: ButtonSize = "md";
  const rest: string[] = [];
  for (const token of cls.split(/\s+/).filter(Boolean)) {
    if (token === "btn") continue;
    const v = /^btn-(primary|secondary|ghost|danger)$/.exec(token);
    if (v) variant = v[1] as ButtonVariant;
    else if (token === "btn-sm") size = "sm";
    else if (token === "btn-lg") size = "lg";
    else rest.push(token);
  }
  return { variant, size, className: rest.length ? rest.join(" ") : undefined };
}

export function SubmitButton({
  children,
  pendingText = "Working…",
  className = "btn btn-primary",
  variant,
  size,
}: {
  children: ReactNode;
  pendingText?: string;
  /** Extra classes. A full legacy `btn btn-… btn-sm` string is still understood. */
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const { pending } = useFormStatus();
  const look = legacyButtonLook(className);
  return (
    <>
      {/*
        Outside the button on purpose: a button's descendants are presentational, so a live region inside it is
        never announced, and Button remounts its children when `loading` flips. Always mounted, text swapped in
        place, so the pending text is announced once and the button's accessible name stays the label.
        Rendered BEFORE the button so the button stays the form's last child: `space-y-N` is
        `:not(:last-child)` margin, and a trailing sr-only span would hand the button a bottom margin.
      */}
      <span role="status" aria-live="polite" className="sr-only">
        {pending ? pendingText : ""}
      </span>
      <Button
        type="submit"
        loading={pending}
        variant={variant ?? look.variant}
        size={size ?? look.size}
        className={look.className}
      >
        {children}
      </Button>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Form controls. Label above, helper text below, error below with role="alert". Each control wires
// label[for] / aria-invalid / aria-describedby from one id (caller's `id`, else React.useId).
// ---------------------------------------------------------------------------------------------------------------

const join = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

type FieldChrome = {
  label: ReactNode;
  /** Helper text under the control. Replaced by `error` while there is one. */
  hint?: ReactNode;
  /** Validation message under the control; sets aria-invalid on the control. */
  error?: ReactNode;
};

/**
 * One id drives label[for], aria-describedby and aria-invalid. A caller's own `aria-invalid` and
 * `aria-describedby` are merged in rather than dropped: the control is invalid if either the field has an
 * `error` or the caller says so, and both the caller's description ids and ours are announced.
 */
function useFieldA11y(
  idProp: string | undefined,
  hint: ReactNode,
  error: ReactNode,
  extraDescribedBy?: string,
  callerInvalid?: ComponentProps<"input">["aria-invalid"],
) {
  const uid = useId();
  const id = idProp ?? uid;
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const messageId = error ? errId : hint ? hintId : undefined;
  const describedBy = join(extraDescribedBy, messageId) || undefined;
  const invalid = error ? true : callerInvalid && callerInvalid !== "false" ? callerInvalid : undefined;
  return {
    id,
    hintId,
    errId,
    control: {
      id,
      "aria-invalid": invalid,
      "aria-describedby": describedBy,
    },
  };
}

function FieldMessage({
  hintId,
  errId,
  hint,
  error,
  className,
}: { hintId: string; errId: string; hint: ReactNode; error: ReactNode; className?: string }) {
  if (error) {
    return (
      <p id={errId} role="alert" className={join("err", className)}>
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={hintId} className={join("hint", className)}>
        {hint}
      </p>
    );
  }
  return null;
}

/** Label above, control, message below. */
function FieldFrame({
  id, hintId, errId, label, hint, error, className, children,
}: FieldChrome & { id: string; hintId: string; errId: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      <FieldMessage hintId={hintId} errId={errId} hint={hint} error={error} />
    </div>
  );
}

export type InputProps = Omit<ComponentProps<"input">, "prefix"> & FieldChrome;

/** `className` lands on the wrapper; the control keeps the `.input` token look (44px tall on touch). */
export function Input({ label, hint, error, id: idProp, className, ...rest }: InputProps) {
  const a = useFieldA11y(idProp, hint, error, rest["aria-describedby"], rest["aria-invalid"]);
  return (
    <FieldFrame id={a.id} hintId={a.hintId} errId={a.errId} label={label} hint={hint} error={error} className={className}>
      <input {...rest} {...a.control} className="input" />
    </FieldFrame>
  );
}

export type TextareaProps = ComponentProps<"textarea"> & FieldChrome;

export function Textarea({ label, hint, error, id: idProp, className, rows = 4, ...rest }: TextareaProps) {
  const a = useFieldA11y(idProp, hint, error, rest["aria-describedby"], rest["aria-invalid"]);
  return (
    <FieldFrame id={a.id} hintId={a.hintId} errId={a.errId} label={label} hint={hint} error={error} className={className}>
      <textarea {...rest} {...a.control} rows={rows} className="input" />
    </FieldFrame>
  );
}

export type SelectProps = ComponentProps<"select"> & FieldChrome;

/** A real <select> (native menu, keyboard and mobile pickers) with the browser arrow swapped for the icon chevron. */
export function Select({ label, hint, error, id: idProp, className, children, ...rest }: SelectProps) {
  const a = useFieldA11y(idProp, hint, error, rest["aria-describedby"], rest["aria-invalid"]);
  return (
    <FieldFrame id={a.id} hintId={a.hintId} errId={a.errId} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <select {...rest} {...a.control} className="peer input appearance-none pr-10">
          {children}
        </select>
        <IconChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted peer-disabled:opacity-50"
        />
      </div>
    </FieldFrame>
  );
}

export type InputGroupProps = Omit<ComponentProps<"input">, "prefix"> &
  FieldChrome & {
    /** Text attached to the left edge, e.g. "/c/" or "₹". */
    prefix?: ReactNode;
    /** Text attached to the right edge, e.g. ".tysonpe.in". */
    suffix?: ReactNode;
  };

const ADDON = "flex items-center whitespace-nowrap bg-surface-2 px-3 text-sm text-muted";

/** One bordered control with attached prefix/suffix text. The group draws the border and focus state for its input. */
export function InputGroup({ label, hint, error, id: idProp, className, prefix, suffix, ...rest }: InputGroupProps) {
  const a = useFieldA11y(idProp, hint, error, rest["aria-describedby"], rest["aria-invalid"]);
  return (
    <FieldFrame id={a.id} hintId={a.hintId} errId={a.errId} label={label} hint={hint} error={error} className={className}>
      <div
        className={join(
          "flex items-stretch overflow-hidden rounded-control border border-line-strong bg-surface",
          "transition-colors duration-(--dur-fast) ease-(--ease-standard)",
          "focus-within:border-ink has-[[aria-invalid=true]]:border-bad",
          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
          // The group owns the border and background, so the disabled look is drawn here, matching `.input`.
          "has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-surface-2 has-[:disabled]:text-muted",
        )}
      >
        {prefix ? <span className={join(ADDON, "border-r border-line")}>{prefix}</span> : null}
        <input
          {...rest}
          {...a.control}
          className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-muted pointer-coarse:min-h-11"
        />
        {suffix ? <span className={join(ADDON, "border-l border-line")}>{suffix}</span> : null}
      </div>
    </FieldFrame>
  );
}

export type CheckboxProps = Omit<ComponentProps<"input">, "type" | "prefix"> & FieldChrome;

/** Native checkbox, 20px box, whole row is the click target (44px on touch). */
export function Checkbox({ label, hint, error, id: idProp, className, ...rest }: CheckboxProps) {
  const a = useFieldA11y(idProp, hint, error, rest["aria-describedby"], rest["aria-invalid"]);
  return (
    <div className={className}>
      <label
        htmlFor={a.id}
        className="flex cursor-pointer items-start gap-3 py-1.5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 pointer-coarse:py-3"
      >
        <input
          {...rest}
          {...a.control}
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-brand disabled:cursor-not-allowed"
        />
        <span className="text-sm font-medium text-ink">{label}</span>
      </label>
      <FieldMessage hintId={a.hintId} errId={a.errId} hint={hint} error={error} className="pl-8" />
    </div>
  );
}

export type SwitchProps = Omit<ComponentProps<"input">, "type" | "role" | "prefix"> & FieldChrome;

/** A native checkbox with role="switch"; the track and thumb are drawn from `:checked` through peer classes. */
export function Switch({ label, hint, error, id: idProp, className, ...rest }: SwitchProps) {
  const a = useFieldA11y(idProp, hint, error, rest["aria-describedby"], rest["aria-invalid"]);
  return (
    <div className={className}>
      <label
        htmlFor={a.id}
        className="flex cursor-pointer items-start gap-3 py-1.5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 pointer-coarse:py-2.5"
      >
        <input {...rest} {...a.control} type="checkbox" role="switch" className="peer sr-only" />
        <span
          aria-hidden="true"
          className={join(
            "relative mt-px inline-block h-6 w-11 shrink-0 rounded-full bg-muted",
            "transition-colors duration-(--dur-fast) ease-(--ease-standard)",
            "peer-checked:bg-ink peer-disabled:opacity-50",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink",
            "after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-surface",
            "after:border after:border-line",
            "after:transition-transform after:duration-(--dur-fast) after:ease-(--ease-standard)",
            "peer-checked:after:translate-x-5",
          )}
        />
        <span className="text-sm font-medium text-ink">{label}</span>
      </label>
      <FieldMessage hintId={a.hintId} errId={a.errId} hint={hint} error={error} className="pl-14" />
    </div>
  );
}

export type RadioCardProps = Omit<ComponentProps<"input">, "type" | "title" | "children" | "prefix"> & {
  title?: ReactNode;
  description?: ReactNode;
  /** Right-aligned content, e.g. a badge or a price. */
  trailing?: ReactNode;
  /** Free content under the description for cards that need more than title and text. */
  children?: ReactNode;
  /** Lands on the outer <label> so grid placement (col-span-2) works. */
  className?: string;
};

/**
 * One selectable card. The native radio sits underneath (sr-only), so arrow-key movement inside a `name` group,
 * form submission and defaultChecked all stay native; the selected look is drawn from `:checked` through peers.
 */
export function RadioCard({ title, description, trailing, children, className, ...rest }: RadioCardProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  return (
    <label className={join("relative block cursor-pointer", className)}>
      <input
        {...rest}
        type="radio"
        className="peer sr-only"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
      />
      <span
        className={join(
          "flex items-start justify-between gap-3 rounded-card border border-line bg-surface py-4 pl-11 pr-4",
          "transition-colors duration-(--dur-fast) ease-(--ease-standard)",
          "peer-enabled:hover:border-line-strong",
          "peer-checked:border-ink peer-checked:bg-surface-2",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        )}
      >
        <span className="min-w-0 flex-1">
          {title ? <span id={titleId} className="block text-sm font-semibold text-ink">{title}</span> : null}
          {description ? <span id={descId} className="mt-0.5 block text-sm text-muted">{description}</span> : null}
          {children}
        </span>
        {trailing ? <span className="shrink-0">{trailing}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={join(
          "absolute left-4 top-[1.125rem] size-4 rounded-full border border-muted bg-surface",
          "transition-colors duration-(--dur-fast) ease-(--ease-standard)",
          "peer-checked:border-[5px] peer-checked:border-ink peer-disabled:opacity-50",
        )}
      />
    </label>
  );
}

export type CheckboxCardProps = Omit<ComponentProps<"input">, "type" | "title" | "children" | "prefix"> & {
  title?: ReactNode;
  description?: ReactNode;
  /** Right-aligned content, e.g. a badge or a price. */
  trailing?: ReactNode;
  /** Free content under the description. */
  children?: ReactNode;
  /** Lands on the outer <label> so grid placement works. */
  className?: string;
};

/**
 * RadioCard's multi-select sibling: the same card, a native checkbox underneath (sr-only), and the selected look
 * drawn from `:checked` through peers (a filled ink box with a check, so it never relies on colour alone). Use it
 * where several options can be on at once; use RadioCard where exactly one can.
 */
export function CheckboxCard({ title, description, trailing, children, className, ...rest }: CheckboxCardProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  return (
    <label className={join("relative block cursor-pointer", className)}>
      <input
        {...rest}
        type="checkbox"
        className="peer sr-only"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
      />
      <span
        className={join(
          "flex items-start justify-between gap-3 rounded-card border border-line bg-surface py-4 pl-11 pr-4 pointer-coarse:min-h-11",
          "transition-colors duration-(--dur-fast) ease-(--ease-standard)",
          "peer-enabled:hover:border-line-strong",
          "peer-checked:border-ink peer-checked:bg-surface-2",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        )}
      >
        <span className="min-w-0 flex-1">
          {title ? <span id={titleId} className="block text-sm font-semibold text-ink">{title}</span> : null}
          {description ? <span id={descId} className="mt-0.5 block text-sm text-muted">{description}</span> : null}
          {children}
        </span>
        {trailing ? <span className="shrink-0">{trailing}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={join(
          "absolute left-4 top-[1.125rem] size-4 rounded-sm border border-muted bg-surface",
          "transition-colors duration-(--dur-fast) ease-(--ease-standard)",
          "peer-checked:border-ink peer-checked:bg-ink peer-disabled:opacity-50",
        )}
      />
      <IconCheck
        size={16}
        className={join(
          "absolute left-4 top-[1.125rem] text-brand-ink opacity-0",
          "transition-opacity duration-(--dur-fast) ease-(--ease-standard)",
          "peer-checked:opacity-100",
        )}
      />
    </label>
  );
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/** What a typed hex does: the box keeps the user's casing, everything leaving the field is lowercase. */
export function colorFromText(value: string): { text: string; picker?: string; emit?: string } {
  return isHexColor(value) ? { text: value, picker: value.toLowerCase(), emit: value.toLowerCase() } : { text: value };
}

/** `<input type="color">` reports uppercase in some browsers; one casing reaches state and the caller. */
export function colorFromPicker(value: string): { text: string; picker: string; emit: string } {
  const hex = value.toLowerCase();
  return { text: hex, picker: hex, emit: hex };
}

export type ColorFieldProps = FieldChrome & {
  id?: string;
  /** Submitted name. Only the hex text input carries it; the native picker is a helper. */
  name: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (hex: string) => void;
  className?: string;
};

/** Native colour picker plus a hex text input kept in sync. The text input is the labelled, submitted field. */
export function ColorField({
  label, hint, error, id: idProp, name, defaultValue = "#16130f", disabled, required, onChange, className,
}: ColorFieldProps) {
  const a = useFieldA11y(idProp, hint, error);
  const [text, setText] = useState(defaultValue);
  const [picker, setPicker] = useState(isHexColor(defaultValue) ? defaultValue.toLowerCase() : "#000000");
  return (
    <FieldFrame id={a.id} hintId={a.hintId} errId={a.errId} label={label} hint={hint} error={error} className={className}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={picker}
          disabled={disabled}
          aria-label="Pick a colour"
          onChange={(e) => {
            const next = colorFromPicker(e.target.value);
            setPicker(next.picker);
            setText(next.text);
            onChange?.(next.emit);
          }}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-control border border-line-strong bg-surface p-1 pointer-coarse:h-11 pointer-coarse:w-14"
        />
        <input
          {...a.control}
          type="text"
          name={name}
          value={text}
          disabled={disabled}
          required={required}
          maxLength={7}
          pattern="#[0-9a-fA-F]{6}"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          onChange={(e) => {
            const next = colorFromText(e.target.value);
            setText(next.text);
            if (next.picker !== undefined) setPicker(next.picker);
            if (next.emit !== undefined) onChange?.(next.emit);
          }}
          className="input w-32 tabular-nums"
        />
      </div>
    </FieldFrame>
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

/**
 * Form-aware field: takes its error and last-submitted value from the surrounding ActionForm, then renders the
 * matching control above. Kept as the one component pages import.
 */
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
    id, name, label, hint, error, required, placeholder, className,
    onChange: onChange ? (e: { target: { value: string } }) => onChange(e.target.value) : undefined,
  };
  // Remount only when the server-returned value changes (not on local edits, which would drop focus).
  const k = `${name}:${s?.values?.[name] ?? ""}`;
  if (as === "textarea") return <Textarea key={k} {...common} rows={rows} maxLength={maxLength} defaultValue={value} />;
  if (as === "select") return <Select key={k} {...common} defaultValue={value}>{children}</Select>;
  const inputProps = { ...common, type, maxLength, autoComplete, defaultValue: type === "password" ? undefined : value };
  return prefix ? <InputGroup key={k} {...inputProps} prefix={prefix} /> : <Input key={k} {...inputProps} />;
}
