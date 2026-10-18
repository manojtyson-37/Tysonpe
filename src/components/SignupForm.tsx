"use client";

import { useState } from "react";
import { signup } from "@/app/actions/auth";
import { ActionForm, FormError, Input, InputGroup, RadioCard, SubmitButton, useFormError, useFormValues, type InputProps } from "./form";
import { IconEye, IconEyeOff } from "./icons";
import {
  AxisBankIcon,
  GPayIcon,
  HdfcBankIcon,
  IciciBankIcon,
  MastercardIcon,
  PaytmIcon,
  PhonePeIcon,
  RupayIcon,
  SbiBankIcon,
  UpiIcon,
  VisaIcon,
} from "./gateway-icons";

/** Same cap as the server's handle rule (src/lib/handles.ts: 3 to 30 characters). */
const HANDLE_MAX = 30;

/**
 * What the handle box accepts while the user types: lowercase letters, digits and hyphens only. It must not trim or
 * collapse, or typing "my-shop" would lose its hyphen the moment it is typed.
 */
export function cleanHandleInput(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, HANDLE_MAX);
}

/** A handle to offer from the name: a full slug (trimmed, collapsed), capped, never ending in a hyphen. */
export function suggestHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, HANDLE_MAX)
    .replace(/-+$/, "");
}

type FormInputProps = Omit<InputProps, "error" | "defaultValue" | "value" | "name"> & { name: string };

/**
 * An Input wired to the surrounding ActionForm: the server's error for this field, and the value the user last
 * submitted (React 19 resets the form after an action). Remounts only when the returned value changes, so typing
 * never loses focus.
 */
function FormInput({ name, ...rest }: FormInputProps) {
  const submitted = useFormValues();
  const error = useFormError(name);
  const returned = submitted?.[name] ?? "";
  return <Input key={`${name}:${returned}`} name={name} defaultValue={returned} error={error} {...rest} />;
}

function PasswordInput() {
  const [shown, setShown] = useState(false);
  const error = useFormError("password");
  return (
    <InputGroup
      name="password"
      label="Password"
      type={shown ? "text" : "password"}
      autoComplete="new-password"
      required
      hint="8 or more characters, 72 bytes at most."
      error={error}
      suffix={
        <button
          type="button"
          aria-pressed={shown}
          aria-label={shown ? "Hide password" : "Show password"}
          onClick={() => setShown((v) => !v)}
          className="-mx-3 flex min-w-11 items-center justify-center self-stretch text-muted transition-colors duration-(--dur-fast) ease-(--ease-standard) hover:text-ink focus-visible:outline-none pointer-coarse:min-h-11"
        >
          {shown ? <IconEyeOff size={18} /> : <IconEye size={18} />}
        </button>
      }
    />
  );
}

const ROLES = [
  { value: "creator", title: "Sell my content", description: "Open a storefront for courses and downloads." },
  { value: "learner", title: "Learn from creators", description: "Buy from creators and learn in your library." },
] as const;

const GATEWAYS = [
  {
    value: "razorpay",
    title: "Razorpay",
    description: "Checkout opens in a pop-up on the page.",
    rails: [GPayIcon, PhonePeIcon, PaytmIcon, VisaIcon, MastercardIcon, RupayIcon],
  },
  {
    value: "easebuzz",
    title: "Easebuzz",
    description: "Checkout moves to a hosted page with a 15-minute timer.",
    rails: [HdfcBankIcon, SbiBankIcon, IciciBankIcon, AxisBankIcon, UpiIcon],
  },
] as const;

/**
 * Every field, the submit and the error line. Exported for the interaction tests. It is rendered BELOW
 * `<ActionForm>`, which is the only place `useFormValues` / `useFormError` see the form's state.
 */
export function SignupFields({ initialRole }: { initialRole: "learner" | "creator" }) {
  const submitted = useFormValues();
  const handleError = useFormError("handle");

  // The radios are uncontrolled (`defaultChecked`): React 19 resets the form after every action, so the DOM falls back
  // to the defaults. The default is therefore derived from what was last submitted, and a pick only drives the
  // conditional UI below (the handle field) through onChange.
  const [pickedRole, setPickedRole] = useState<string | null>(null);
  const role = pickedRole ?? submitted?.role ?? initialRole;
  const gateway = submitted?.preferredGateway ?? "razorpay";

  const [name, setName] = useState(submitted?.name ?? "");
  // null until the user touches the handle: then the box follows the name. A handle that came back from a failed
  // submit counts as typed.
  const [typedHandle, setTypedHandle] = useState<string | null>(submitted?.handle ?? null);
  const handle = typedHandle ?? suggestHandle(name);

  return (
    <>
      <fieldset>
        <legend className="label">I want to</legend>
        <div className="space-y-2">
          {ROLES.map((r) => (
            <RadioCard
              key={r.value}
              name="role"
              value={r.value}
              title={r.title}
              description={r.description}
              defaultChecked={role === r.value}
              onChange={() => setPickedRole(r.value)}
            />
          ))}
        </div>
      </fieldset>

      <FormInput
        name="name"
        label="Full name"
        autoComplete="name"
        required
        onChange={(e) => setName(e.target.value)}
      />
      <FormInput
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        required
      />
      <PasswordInput />

      {role === "creator" && (
        <InputGroup
          name="handle"
          label="Store handle"
          prefix="/c/"
          placeholder="your-name"
          value={handle}
          onChange={(e) => setTypedHandle(cleanHandleInput(e.target.value))}
          maxLength={HANDLE_MAX}
          autoCapitalize="none"
          autoComplete="off"
          inputMode="text"
          spellCheck={false}
          required
          error={handleError}
          hint={
            handle ? (
              <>
                Your store address: <span className="font-mono text-ink">/c/{handle}</span>
              </>
            ) : (
              "Letters, numbers and hyphens, 3 to 30 characters."
            )
          }
        />
      )}

      <fieldset>
        <legend className="label">Checkout gateway</legend>
        <p className="t-meta mb-2">Payments run in test mode.</p>
        <div className="space-y-2">
          {GATEWAYS.map((g) => (
            <RadioCard
              key={g.value}
              name="preferredGateway"
              value={g.value}
              title={g.title}
              description={g.description}
              defaultChecked={gateway === g.value}
            >
              <span className="mt-2.5 flex items-center gap-1.5" aria-hidden="true">
                {g.rails.map((Rail, i) => (
                  <Rail key={i} className="h-5 w-auto" />
                ))}
              </span>
            </RadioCard>
          ))}
        </div>
      </fieldset>

      <FormError />
      <SubmitButton pendingText={role === "creator" ? "Opening your store…" : "Creating account…"} className="w-full">
        {role === "creator" ? "Open your store" : "Create account"}
      </SubmitButton>
    </>
  );
}

export function SignupForm({ initialRole, next }: { initialRole: "learner" | "creator"; next?: string }) {
  return (
    <ActionForm action={signup} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      <SignupFields initialRole={initialRole} />
    </ActionForm>
  );
}
