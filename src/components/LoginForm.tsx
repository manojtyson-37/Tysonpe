"use client";

import { useState } from "react";
import { login } from "@/app/actions/auth";
import { ActionForm, FormError, SubmitButton } from "./form";

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  role: "creator" | "fresh_buyer" | "enrolled_buyer";
  badge: string;
  badgeTone: "good" | "brand" | "muted";
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  // 6 fresh customer / buyer accounts without any prior course enrollments
  {
    id: "priya",
    name: "Priya Sharma",
    email: "priya@demo.tysonpe.test",
    role: "fresh_buyer",
    badge: "Fresh Customer #1",
    badgeTone: "good",
    description: "0 course enrollments • Clean checkout & payment test",
  },
  {
    id: "rohan",
    name: "Rohan Mehta",
    email: "rohan@demo.tysonpe.test",
    role: "fresh_buyer",
    badge: "Fresh Customer #2",
    badgeTone: "good",
    description: "0 course enrollments • Clean checkout & payment test",
  },
  {
    id: "ananya",
    name: "Ananya Iyer",
    email: "ananya@demo.tysonpe.test",
    role: "fresh_buyer",
    badge: "Fresh Customer #3",
    badgeTone: "good",
    description: "0 course enrollments • Clean checkout & payment test",
  },
  {
    id: "vikram",
    name: "Vikram Patel",
    email: "vikram@demo.tysonpe.test",
    role: "fresh_buyer",
    badge: "Fresh Customer #4",
    badgeTone: "good",
    description: "0 course enrollments • Clean checkout & payment test",
  },
  {
    id: "neha",
    name: "Neha Verma",
    email: "neha@demo.tysonpe.test",
    role: "fresh_buyer",
    badge: "Fresh Customer #5",
    badgeTone: "good",
    description: "0 course enrollments • Clean checkout & payment test",
  },
  {
    id: "kabir",
    name: "Kabir Das",
    email: "kabir@demo.tysonpe.test",
    role: "fresh_buyer",
    badge: "Fresh Customer #6",
    badgeTone: "good",
    description: "0 course enrollments • Clean checkout & payment test",
  },
  // Creator account
  {
    id: "asha",
    name: "Asha Rao",
    email: "asha@demo.tysonpe.test",
    role: "creator",
    badge: "Creator",
    badgeTone: "brand",
    description: "Opens /dashboard • Configure gateways & payout UPI",
  },
  // Existing enrolled learner (useful to test already-purchased flows)
  {
    id: "ravi",
    name: "Ravi Kumar",
    email: "learner@demo.tysonpe.test",
    role: "enrolled_buyer",
    badge: "Enrolled",
    badgeTone: "muted",
    description: "Already owns Masterclass • Tests duplicate block",
  },
];

export function LoginForm({ next, demoPassword }: { next?: string; demoPassword?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"fresh" | "all">("fresh");

  const fillAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(demoPassword ?? "");
    setSelectedAccountId(account.id);
  };

  const freshBuyers = DEMO_ACCOUNTS.filter((a) => a.role === "fresh_buyer");
  const creatorAndEnrolled = DEMO_ACCOUNTS.filter((a) => a.role !== "fresh_buyer");
  const displayedAccounts = activeTab === "fresh" ? freshBuyers : DEMO_ACCOUNTS;

  const selectedAccount = DEMO_ACCOUNTS.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      {/* 1-Click Demo Test Accounts Selector */}
      {demoPassword && (
        <div className="rounded-2xl border border-line bg-surface-2/70 p-4 space-y-3.5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-good animate-pulse" />
              <span className="font-semibold uppercase tracking-wider text-[11px] text-muted">
                Demo Test Accounts (1-Click Fill)
              </span>
            </div>
            
            {/* Filter Pills */}
            <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("fresh")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  activeTab === "fresh"
                    ? "bg-good text-white shadow-xs"
                    : "text-muted hover:text-ink"
                }`}
              >
                Fresh Buyers (6)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  activeTab === "all"
                    ? "bg-brand text-white shadow-xs"
                    : "text-muted hover:text-ink"
                }`}
              >
                All Accounts ({DEMO_ACCOUNTS.length})
              </button>
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            {activeTab === "fresh"
              ? "6 fresh customer logins without prior course enrollments. Pick any buyer to test clean checkout, Jodo/Razorpay/Easebuzz payments, and course unlocks."
              : "Switch between fresh customer logins, Asha Rao (Creator dashboard), and Ravi Kumar (already owns masterclass)."}
          </p>

          {/* Quick Select Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {displayedAccounts.map((account) => {
              const isSelected = selectedAccountId === account.id;
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => fillAccount(account)}
                  className={`group relative flex flex-col items-start rounded-xl border p-2.5 text-left transition-all duration-150 active:scale-[0.98] ${
                    isSelected
                      ? "border-brand bg-brand-soft/70 shadow-xs ring-1 ring-brand/30"
                      : "border-line bg-surface hover:border-line-strong hover:bg-surface-2/80"
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="text-xs font-bold text-ink group-hover:text-brand transition-colors">
                      {account.name}
                    </span>
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        account.badgeTone === "good"
                          ? "bg-good-soft text-good border border-good/20"
                          : account.badgeTone === "brand"
                          ? "bg-brand-soft text-brand border border-brand/20"
                          : "bg-surface-2 text-muted border border-line"
                      }`}
                    >
                      {account.badge}
                    </span>
                  </div>

                  <span className="mt-0.5 text-[11px] font-mono text-muted truncate w-full">
                    {account.email}
                  </span>

                  <span className="mt-1 text-[10px] text-muted/80 line-clamp-1">
                    {account.description}
                  </span>

                  {isSelected && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Account Status Feedback */}
          {selectedAccount && (
            <div className="flex items-center gap-2 rounded-lg border border-brand/20 bg-brand-soft/50 px-3 py-2 text-xs text-brand">
              <svg className="w-4 h-4 shrink-0 text-brand" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 truncate">
                <span className="font-semibold">{selectedAccount.name}</span> filled ({selectedAccount.email}). Ready to sign in.
              </div>
            </div>
          )}

          {activeTab === "fresh" && (
            <div className="pt-1 flex items-center justify-between text-[11px] text-muted border-t border-line/60">
              <span>Looking for Creator or Ravi?</span>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className="font-semibold text-brand hover:underline"
              >
                View Asha & Ravi →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Login Form */}
      <ActionForm action={login} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSelectedAccountId(null);
            }}
            autoComplete="email"
            required
            className="input"
            placeholder="name@example.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">
              Password
            </label>
            {demoPassword && (
              <span className="text-[11px] font-mono text-muted">
                Demo password: <code className="text-ink font-bold">{demoPassword}</code>
              </span>
            )}
          </div>
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
