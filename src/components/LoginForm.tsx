"use client";

import { login } from "@/app/actions/auth";
import { ActionForm, Field, FormError, SubmitButton } from "./form";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={login} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field name="email" label="Email" type="email" autoComplete="email" required />
      <Field name="password" label="Password" type="password" autoComplete="current-password" required />
      <FormError />
      <SubmitButton pendingText="Signing in…" className="btn btn-primary w-full">Log in</SubmitButton>
    </ActionForm>
  );
}
