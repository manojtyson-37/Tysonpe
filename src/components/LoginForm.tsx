"use client";

import { useState } from "react";
import { login } from "@/app/actions/auth";
import { Button } from "./ui/button";
import { ActionForm, FormError, Input, SubmitButton } from "./form";

const DEMO_ACCOUNTS = [
  { who: "Asha (creator)", email: "asha@demo.tysonpe.test", opens: "/dashboard" },
  { who: "Ravi (learner)", email: "learner@demo.tysonpe.test", opens: "/library" },
] as const;

export function LoginForm({ next, demoPassword }: { next?: string; demoPassword?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-5">
      {/* Only rendered on demo deployments / local dev: the page passes demoPassword only there. */}
      {demoPassword && (
        <div className="rounded-card border border-line bg-surface-2 p-4">
          <p className="t-label">Demo accounts</p>
          <p className="t-meta mt-1">Fill the form with a seeded test account.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <Button
                key={a.email}
                type="button"
                variant="secondary"
                className="flex-col items-start gap-0.5 text-left"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(demoPassword);
                }}
              >
                <span>{a.who}</span>
                {/* With a next target the login goes there instead, so the route is only promised without one. */}
                {!next && <span className="t-meta font-normal">{`Opens ${a.opens}`}</span>}
              </Button>
            ))}
          </div>
        </div>
      )}

      <ActionForm action={login} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <Input
          name="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder="name@example.com"
        />
        <Input
          name="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <FormError />
        <SubmitButton pendingText="Signing in…" className="w-full">
          Log in
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
