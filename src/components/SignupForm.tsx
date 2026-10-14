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
    <fieldset className="space-y-1.5">
      <legend className="label font-bold text-xs uppercase tracking-wider text-muted">
        Select Gateway for Checkout Demo
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {[
          {
            id: "razorpay",
            name: "Razorpay",
            type: "Popup Modal",
            desc: "In-page modal checkout with instant UPI, Cards, Netbanking & Wallets",
          },
          {
            id: "easebuzz",
            name: "Easebuzz",
            type: "Hosted Page",
            desc: "Full-page hosted gateway with live 15-minute countdown clock & 303 return",
          },
        ].map((gw) => {
          const isSelected = gateway === gw.id;
          return (
            <label
              key={gw.id}
              className={`cursor-pointer rounded-2xl border p-4 text-left transition flex flex-col justify-between has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
                isSelected
                  ? "border-brand bg-brand-soft/70 ring-2 ring-brand shadow-xs"
                  : "border-line bg-surface hover:bg-surface-2"
              }`}
            >
              <input
                type="radio"
                name="preferredGateway"
                value={gw.id}
                defaultChecked={isSelected}
                onChange={() => setPicked(gw.id)}
                className="sr-only"
              />
              <div>
                <div className="flex items-center justify-between font-bold text-sm text-ink">
                  <span>{gw.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isSelected ? "bg-brand text-brand-ink" : "bg-surface-2 text-muted"
                    }`}
                  >
                    {gw.type}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1 leading-snug">{gw.desc}</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px] text-muted">
                <span>{gw.id === "razorpay" ? "⚡ On-site overlay" : "🛡️ 15-min timer"}</span>
                <span className={`font-bold ${isSelected ? "text-brand" : "text-muted"}`}>
                  {isSelected ? "● Selected" : "○ Select"}
                </span>
              </div>
            </label>
          );
        })}
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
