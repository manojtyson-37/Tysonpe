"use client";

import { useState } from "react";
import type { StorefrontConfig } from "@/lib/storefront";
import { CheckCircleIcon } from "./icons";

export function NewsletterSection({ newsletter }: { newsletter?: StorefrontConfig["newsletter"] }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  if (!newsletter || !newsletter.enabled) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setStatus("loading");
    setTimeout(() => {
      setStatus("success");
    }, 400);
  };

  return (
    <section className="mx-auto max-w-4xl px-4 pb-14 sm:px-6">
      <div className="card relative overflow-hidden bg-brand-soft/40 p-8 text-center sm:p-10">
        <div className="mx-auto max-w-xl">
          <span className="badge badge-brand text-[10px] font-bold uppercase tracking-wider">
            Free Weekly Insights
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {newsletter.title}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
            {newsletter.subtitle}
          </p>

          {status === "success" ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-good-soft p-4 text-xs font-semibold text-good">
              <CheckCircleIcon className="h-4 w-4" />
              <span>You&apos;re subscribed! Check your inbox for the latest dispatch.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <input
                type="email"
                placeholder="Enter your work email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input flex-1 bg-surface text-sm"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="btn btn-primary sm:w-auto"
              >
                {status === "loading" ? "Subscribing..." : newsletter.buttonText || "Subscribe Free"}
              </button>
            </form>
          )}

          <p className="mt-3 text-[11px] text-muted">
            Instant unsubscribe anytime. Strictly zero promotional spam.
          </p>
        </div>
      </div>
    </section>
  );
}
