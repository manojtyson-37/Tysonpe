"use client";

import { useState } from "react";
import { login } from "@/app/actions/auth";
import { ActionForm, FormError, SubmitButton } from "./form";

export function LoginForm({ next, demoPassword }: { next?: string; demoPassword?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const fillDemo = (role: "creator" | "learner") => {
    setEmail(role === "creator" ? "asha@demo.tysonpe.test" : "learner@demo.tysonpe.test");
    setPassword(demoPassword ?? "");
  };

  return (
    <div className="space-y-5">
      {/* 1-Click Demo Autofill Box: only rendered on demo deployments / local dev */}
      {demoPassword && (
      <div className="rounded-xl border border-line bg-surface-2/60 p-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-muted">
            Demo Test Accounts
          </span>
          <span className="badge badge-brand !text-[10px]">1-Click Fill</span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fillDemo("creator")}
            className="btn btn-secondary btn-sm flex flex-col items-start gap-0.5 !py-2 text-left active:scale-[0.98]"
          >
            <span className="text-xs font-bold text-ink">Asha (Creator)</span>
            <span className="text-[10px] text-muted">Opens /dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemo("learner")}
            className="btn btn-secondary btn-sm flex flex-col items-start gap-0.5 !py-2 text-left active:scale-[0.98]"
          >
            <span className="text-xs font-bold text-ink">Ravi (Learner)</span>
            <span className="text-[10px] text-muted">Opens /library</span>
          </button>
        </div>
      </div>
      )}

      <ActionForm action={login} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="input"
            placeholder="name@example.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="input"
          />
        </div>
        <FormError />
        <SubmitButton pendingText="Signing in…" className="btn btn-primary w-full active:scale-[0.98]">
          Log in
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
