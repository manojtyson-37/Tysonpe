"use client";

import { useState } from "react";
import { signup } from "@/app/actions/auth";
import { ActionForm, Field, FormError, SubmitButton, useFormValues } from "./form";

function RoleFields({ initialRole }: { initialRole: "learner" | "creator" }) {
  const submitted = useFormValues();
  const [picked, setPicked] = useState<string | null>(null);
  const role = picked ?? submitted?.role ?? initialRole; // derived: survives the post-action form reset
  return (
    <>
      <fieldset>
        <legend className="label">I want to</legend>
        <div className="grid grid-cols-2 gap-2">
          {([["creator", "Sell my content"], ["learner", "Learn from creators"]] as const).map(([v, l]) => (
            <label key={v} className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${role === v ? "border-brand bg-brand-soft text-brand" : "border-line hover:bg-surface-2"}`}>
              <input type="radio" name="role" value={v} defaultChecked={role === v} onChange={() => setPicked(v)} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <Field name="name" label="Full name" autoComplete="name" required />
      <Field name="email" label="Email" type="email" autoComplete="email" required />
      <Field name="password" label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." required />
      {role === "creator" && (
        <Field name="handle" label="Your store handle" prefix="/c/" placeholder="your-name" hint="Lowercase letters, numbers and hyphens. This is your public link." required />
      )}
    </>
  );
}

function GatewayFields() {
  const submitted = useFormValues();
  const [picked, setPicked] = useState<string | null>(null);
  const gateway = picked ?? submitted?.preferredGateway ?? "razorpay";
  return (
    <fieldset>
      <legend className="label">Preferred gateway for demo</legend>
      <p className="text-xs text-muted mb-2">Simulate checkout as your buyers will see it.</p>
      <div className="grid grid-cols-2 gap-2">
        {([
          ["razorpay", "Razorpay", "In-page modal: UPI, cards & netbanking"],
          ["easebuzz", "Easebuzz", "Hosted checkout with 15-min countdown timer"],
        ] as const).map(([v, l, desc]) => (
          <label
            key={v}
            className={`cursor-pointer rounded-xl border p-3 text-left transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
              gateway === v ? "border-brand bg-brand-soft text-brand ring-1 ring-brand" : "border-line hover:bg-surface-2"
            }`}
          >
            <input
              type="radio"
              name="preferredGateway"
              value={v}
              defaultChecked={gateway === v}
              onChange={() => setPicked(v)}
              className="sr-only"
            />
            <div className="font-semibold text-sm flex items-center justify-between">
              <span>{l}</span>
              {gateway === v && <span className="text-xs font-bold text-brand">✓</span>}
            </div>
            <div className="text-xs text-muted mt-1 leading-snug">{desc}</div>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SignupForm({ initialRole, next }: { initialRole: "learner" | "creator"; next?: string }) {
  return (
    <ActionForm action={signup} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <RoleFields initialRole={initialRole} />
      <GatewayFields />
      <FormError />
      <SubmitButton pendingText="Creating account…" className="btn btn-primary w-full">Create account</SubmitButton>
    </ActionForm>
  );
}
