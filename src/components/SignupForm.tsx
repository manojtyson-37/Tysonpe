"use client";

import { useState } from "react";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { ActionForm, FormError, SubmitButton, useFormError, useFormValues } from "./form";
import {
  GPayIcon,
  PhonePeIcon,
  PaytmIcon,
  VisaIcon,
  MastercardIcon,
  RupayIcon,
  HdfcBankIcon,
  SbiBankIcon,
  IciciBankIcon,
  AxisBankIcon,
  UpiIcon,
  LockBadge,
  ShieldCheckBadge,
  ClockIcon,
} from "./gateway-icons";

// --- Vector Icons ---
function UserIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MailIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function EyeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function LightningIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function StorefrontIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
    </svg>
  );
}

function AcademicCapIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function CheckIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CopyIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

// Auto-slugify creator name
function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Password strength calculation
function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "Too short", color: "bg-line", text: "text-muted" };
  if (password.length < 8) return { score: 1, label: "Weak (8+ chars required)", color: "bg-bad", text: "text-bad" };
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const variety = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  if (password.length >= 10 && variety >= 2) {
    return { score: 3, label: "Strong & Secure", color: "bg-good", text: "text-good" };
  }
  return { score: 2, label: "Good strength", color: "bg-accent", text: "text-accent" };
}

export function SignupForm({ initialRole, next }: { initialRole: "learner" | "creator"; next?: string }) {
  const submitted = useFormValues();
  const [role, setRole] = useState<"learner" | "creator">(submitted?.role === "learner" ? "learner" : initialRole);
  const [name, setName] = useState<string>(submitted?.name ?? "");
  const [handle, setHandle] = useState<string>(submitted?.handle ?? (initialRole === "creator" ? "asha-rao" : ""));
  const [hasManuallyEditedHandle, setHasManuallyEditedHandle] = useState(false);
  const [gateway, setGateway] = useState<"razorpay" | "easebuzz">(
    submitted?.preferredGateway === "easebuzz" ? "easebuzz" : "razorpay"
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Field errors from server action
  const nameError = useFormError("name");
  const emailError = useFormError("email");
  const passwordError = useFormError("password");
  const handleError = useFormError("handle");

  const effectiveHandle = handle.trim() || (name.trim() ? slugify(name) : "your-store");
  const strength = getPasswordStrength(password);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!hasManuallyEditedHandle && role === "creator") {
      setHandle(slugify(val));
    }
  };

  const handleHandleChange = (val: string) => {
    setHasManuallyEditedHandle(true);
    setHandle(slugify(val));
  };

  const copyStoreLink = () => {
    navigator.clipboard?.writeText(`https://tysonpe.com/c/${effectiveHandle}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
      {/* LEFT COLUMN: THE HIGH-CRAFT FORM */}
      <div className="lg:col-span-7">
        {/* Header with status pill */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
            <LightningIcon className="h-3.5 w-3.5 text-brand" />
            <span>Instant UPI & Card Infrastructure</span>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-ink font-display">
            {role === "creator" ? "Open your store" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-muted">
            Free to start. No card needed. Accept payments across India with T+1 bank settlements.
          </p>
        </div>

        {/* Elevated Form Card */}
        <div className="card p-6 sm:p-8 bg-surface border border-line/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          <ActionForm action={signup} className="space-y-5">
            {next && <input type="hidden" name="next" value={next} />}

            {/* 1. Skiper UI Segmented Role Switcher */}
            <fieldset>
              <legend className="label font-semibold text-xs uppercase tracking-wider text-muted mb-2">
                I want to
              </legend>
              <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-surface-2 p-1.5 border border-line/60">
                <label
                  className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl p-3 text-center transition-all duration-150 active:scale-[0.99] ${
                    role === "creator"
                      ? "bg-surface shadow-xs text-ink font-semibold border border-line/80 ring-1 ring-brand/10"
                      : "text-muted hover:text-ink hover:bg-surface/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="creator"
                    checked={role === "creator"}
                    onChange={() => setRole("creator")}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2">
                    <StorefrontIcon className={`w-4 h-4 ${role === "creator" ? "text-brand" : "text-muted"}`} />
                    <span className="text-sm font-semibold">Sell my content</span>
                  </div>
                  <span className="mt-0.5 text-[11px] text-muted">Storefront, downloads & courses</span>
                </label>

                <label
                  className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl p-3 text-center transition-all duration-150 active:scale-[0.99] ${
                    role === "learner"
                      ? "bg-surface shadow-xs text-ink font-semibold border border-line/80 ring-1 ring-brand/10"
                      : "text-muted hover:text-ink hover:bg-surface/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="learner"
                    checked={role === "learner"}
                    onChange={() => setRole("learner")}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2">
                    <AcademicCapIcon className={`w-4 h-4 ${role === "learner" ? "text-brand" : "text-muted"}`} />
                    <span className="text-sm font-semibold">Learn from creators</span>
                  </div>
                  <span className="mt-0.5 text-[11px] text-muted">Access library & certificates</span>
                </label>
              </div>
            </fieldset>

            {/* 2. Full Name Input */}
            <div>
              <label htmlFor="signup-name" className="label text-sm font-medium text-ink">
                Full name
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-muted pointer-events-none">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  id="signup-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="e.g. Asha Rao"
                  defaultValue={submitted?.name ?? name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`input pl-10 h-11 text-sm font-sans ${nameError ? "border-bad" : ""}`}
                />
              </div>
              {nameError && <p className="err mt-1 text-xs text-bad font-medium">{nameError}</p>}
            </div>

            {/* 3. Email Input */}
            <div>
              <label htmlFor="signup-email" className="label text-sm font-medium text-ink">
                Email address
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-muted pointer-events-none">
                  <MailIcon className="w-4 h-4" />
                </span>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@domain.com"
                  defaultValue={submitted?.email}
                  className={`input pl-10 h-11 text-sm font-sans ${emailError ? "border-bad" : ""}`}
                />
              </div>
              {emailError && <p className="err mt-1 text-xs text-bad font-medium">{emailError}</p>}
            </div>

            {/* 4. Password with Show/Hide Toggle & Live Strength Meter */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="signup-password" className="label text-sm font-medium text-ink">
                  Password
                </label>
                {password && (
                  <span className={`text-[11px] font-semibold tracking-wide ${strength.text}`}>
                    {strength.label}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-muted pointer-events-none">
                  <LockBadge className="w-4 h-4" />
                </span>
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`input pl-10 pr-10 h-11 text-sm font-sans ${passwordError ? "border-bad" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 text-muted hover:text-ink transition-colors p-1"
                >
                  {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength visual meter */}
              {password && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className={`h-1 flex-1 rounded-full transition-all duration-200 ${strength.score >= 1 ? strength.color : "bg-line"}`} />
                  <div className={`h-1 flex-1 rounded-full transition-all duration-200 ${strength.score >= 2 ? strength.color : "bg-line"}`} />
                  <div className={`h-1 flex-1 rounded-full transition-all duration-200 ${strength.score >= 3 ? strength.color : "bg-line"}`} />
                </div>
              )}
              {passwordError ? (
                <p className="err mt-1 text-xs text-bad font-medium">{passwordError}</p>
              ) : (
                <p className="hint mt-1 text-[11px] text-muted">Use at least 8 characters with a mix of letters and numbers.</p>
              )}
            </div>

            {/* 5. Creator Store Handle */}
            {role === "creator" && (
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="signup-handle" className="label text-sm font-medium text-ink">
                    Your store handle
                  </label>
                  {effectiveHandle && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-good">
                      <CheckIcon className="w-3 h-3 text-good" />
                      Link available
                    </span>
                  )}
                </div>
                <div className="flex rounded-xl border border-line bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all overflow-hidden h-11">
                  <span className="flex items-center bg-surface-2 px-3.5 text-xs font-mono font-medium text-muted border-r border-line select-none">
                    /c/
                  </span>
                  <input
                    id="signup-handle"
                    name="handle"
                    type="text"
                    required
                    placeholder="your-name"
                    value={handle}
                    onChange={(e) => handleHandleChange(e.target.value)}
                    className="w-full bg-transparent px-3 text-sm font-mono text-ink placeholder:text-muted/60 focus:outline-none"
                  />
                </div>
                {handleError ? (
                  <p className="err mt-1 text-xs text-bad font-medium">{handleError}</p>
                ) : (
                  <p className="hint mt-1 text-[11px] text-muted">
                    Your public storefront link: <span className="font-mono text-ink">tysonpe.com/c/{effectiveHandle}</span>
                  </p>
                )}
              </div>
            )}

            {/* 6. Checkout Demo Gateway Selector (Anti-slop compliant, bespoke SVGs) */}
            <fieldset className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <legend className="label font-bold text-xs uppercase tracking-wider text-muted">
                  Select Gateway for Checkout Demo
                </legend>
                <span className="text-[11px] text-muted">Test in sandbox mode</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Razorpay Option */}
                <label
                  className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-150 active:scale-[0.99] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
                    gateway === "razorpay"
                      ? "border-brand bg-brand-soft/50 ring-2 ring-brand/40 shadow-xs"
                      : "border-line bg-surface hover:bg-surface-2 hover:border-line/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="preferredGateway"
                    value="razorpay"
                    checked={gateway === "razorpay"}
                    onChange={() => setGateway("razorpay")}
                    className="sr-only"
                  />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-ink flex items-center gap-1.5">
                        <span>Razorpay</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          gateway === "razorpay" ? "bg-brand text-brand-ink" : "bg-surface-2 text-muted"
                        }`}
                      >
                        Popup Modal
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1.5 leading-relaxed">
                      In-page modal checkout with instant UPI, Cards, Netbanking & Wallets.
                    </p>
                    {/* Bespoke SVG Rails */}
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <GPayIcon className="w-5 h-5" />
                      <PhonePeIcon className="w-5 h-5" />
                      <PaytmIcon className="w-6 h-4" />
                      <VisaIcon className="w-6 h-4" />
                      <MastercardIcon className="w-5 h-4" />
                      <RupayIcon className="w-6 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1 text-muted">
                      <LightningIcon className="w-3.5 h-3.5 text-brand" />
                      On-site overlay
                    </span>
                    <span className={`font-bold flex items-center gap-1 ${gateway === "razorpay" ? "text-brand" : "text-muted"}`}>
                      {gateway === "razorpay" ? (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                          Selected
                        </>
                      ) : (
                        "Select"
                      )}
                    </span>
                  </div>
                </label>

                {/* Easebuzz Option */}
                <label
                  className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-150 active:scale-[0.99] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
                    gateway === "easebuzz"
                      ? "border-brand bg-brand-soft/50 ring-2 ring-brand/40 shadow-xs"
                      : "border-line bg-surface hover:bg-surface-2 hover:border-line/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="preferredGateway"
                    value="easebuzz"
                    checked={gateway === "easebuzz"}
                    onChange={() => setGateway("easebuzz")}
                    className="sr-only"
                  />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-ink">Easebuzz</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          gateway === "easebuzz" ? "bg-brand text-brand-ink" : "bg-surface-2 text-muted"
                        }`}
                      >
                        Hosted Page
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1.5 leading-relaxed">
                      Full-page hosted gateway with live 15-minute countdown clock & 303 return.
                    </p>
                    {/* Bespoke Bank SVGs */}
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <HdfcBankIcon className="w-5 h-5" />
                      <SbiBankIcon className="w-5 h-5" />
                      <IciciBankIcon className="w-5 h-5" />
                      <AxisBankIcon className="w-5 h-5" />
                      <UpiIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1 text-muted">
                      <ClockIcon className="w-3.5 h-3.5 text-muted" />
                      15-min timer
                    </span>
                    <span className={`font-bold flex items-center gap-1 ${gateway === "easebuzz" ? "text-brand" : "text-muted"}`}>
                      {gateway === "easebuzz" ? (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                          Selected
                        </>
                      ) : (
                        "Select"
                      )}
                    </span>
                  </div>
                </label>
              </div>
            </fieldset>

            {/* Error banner from server */}
            <FormError />

            {/* Submit Button */}
            <SubmitButton
              pendingText="Creating account…"
              className="btn btn-primary w-full h-12 text-sm sm:text-base font-semibold shadow-sm active:scale-[0.98] transition-all duration-150"
            >
              {role === "creator" ? "Open store & continue →" : "Create account →"}
            </SubmitButton>

            {/* Security Trust Badges */}
            <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1">
                <LockBadge className="w-3.5 h-3.5 text-good" />
                256-bit SSL
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheckBadge className="w-3.5 h-3.5 text-good" />
                PCI-DSS Compliant
              </span>
              <span>·</span>
              <span>No card needed</span>
            </div>
          </ActionForm>
        </div>

        {/* Footer login link */}
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link className="font-semibold text-brand hover:underline transition-colors" href="/login">
            Log in
          </Link>
        </p>
      </div>

      {/* RIGHT COLUMN: LIVE INTERACTIVE SANDBOX PREVIEW */}
      <div className="lg:col-span-5 hidden lg:block sticky top-24 space-y-4">
        <div className="rounded-2xl border border-line/80 bg-surface shadow-[0_12px_36px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* macOS Browser Chrome */}
          <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-0.5 text-[11px] font-mono text-muted shadow-2xs">
                <LockBadge className="h-3 w-3 text-good" />
                <span className="truncate max-w-[200px]">
                  {role === "creator" ? `tysonpe.com/c/${effectiveHandle}` : "tysonpe.com/library"}
                </span>
              </div>
            </div>
            {role === "creator" && (
              <button
                type="button"
                onClick={copyStoreLink}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-muted hover:text-ink hover:bg-surface transition-all active:scale-95"
                title="Copy link"
              >
                {copied ? <CheckIcon className="w-3 h-3 text-good" /> : <CopyIcon className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            )}
          </div>

          {/* Interactive Preview Canvas */}
          <div className="p-5 space-y-4">
            {role === "creator" ? (
              <>
                {/* Storefront Hero Preview */}
                <div className="rounded-xl border border-line/60 bg-gradient-to-b from-brand-soft/30 to-surface p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-brand-ink font-bold text-lg shadow-sm">
                      {(name.trim() || "Asha")[0]?.toUpperCase() || "A"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-base font-bold text-ink truncate font-display">
                          {name.trim() || "Asha Rao"}
                        </h2>
                        <span className="inline-flex items-center text-good" title="Verified Creator">
                          <ShieldCheckBadge className="w-4 h-4 text-good" />
                        </span>
                      </div>
                      <p className="text-xs text-muted truncate">
                        tysonpe.com/c/{effectiveHandle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Product Card Mockup */}
                <div className="rounded-xl border border-line/80 bg-surface p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block rounded-full bg-good-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-good">
                        Digital Course
                      </span>
                      <h3 className="mt-1 text-sm font-bold text-ink leading-snug">
                        Production Distributed Systems & UPI Checkout
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-extrabold text-ink tabular-nums font-mono">₹1,499</div>
                      <div className="text-[10px] text-muted">₹1,270 + 18% GST</div>
                    </div>
                  </div>

                  {/* Dynamic Gateway Indicator */}
                  <div className="rounded-lg border border-brand/20 bg-brand-soft/40 p-2.5 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {gateway === "razorpay" ? (
                        <>
                          <LightningIcon className="w-4 h-4 text-brand" />
                          <span className="font-semibold text-brand">Razorpay Modal Checkout</span>
                        </>
                      ) : (
                        <>
                          <ClockIcon className="w-4 h-4 text-brand" />
                          <span className="font-semibold text-brand">Easebuzz 15m Hosted Page</span>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-brand uppercase tracking-wider">Active</span>
                  </div>

                  {/* Payment Rails Visual Strip */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-muted">
                    <span>Direct UPI & Cards:</span>
                    <div className="flex items-center gap-1.5">
                      <PhonePeIcon className="w-4 h-4" />
                      <GPayIcon className="w-4 h-4" />
                      <PaytmIcon className="w-5 h-3" />
                      <RupayIcon className="w-5 h-3" />
                    </div>
                  </div>
                </div>

                {/* Simulated Ledger & Payout Card */}
                <div className="rounded-xl border border-line/60 bg-surface-2 p-3.5 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Simulated Daily Settlement
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted">Estimated Revenue</div>
                      <div className="text-base font-extrabold text-good font-mono tabular-nums">₹42,850</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted">Payout Schedule</div>
                      <div className="text-xs font-bold text-ink">T+1 Auto-deposit</div>
                    </div>
                  </div>
                </div>

                {/* Social Proof Quote */}
                <div className="rounded-xl border border-line/40 bg-surface p-3 text-xs text-muted leading-relaxed">
                  <p className="italic text-slate-600">
                    “Instant UPI checkout on Tysonpe converted 38% better for our Indian audience. Zero payment drops.”
                  </p>
                  <p className="mt-1.5 font-semibold text-ink text-[11px]">
                    — Asha Rao · Cloud Architect & Tysonpe Creator
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Learner Dashboard Preview */}
                <div className="rounded-xl border border-line/60 bg-gradient-to-b from-brand-soft/30 to-surface p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-lg shadow-sm">
                      {(name.trim() || "Learner")[0]?.toUpperCase() || "L"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-bold text-ink truncate font-display">
                        {name.trim() || "Learner Account"}
                      </h2>
                      <p className="text-xs text-muted">Enrolled Student · Lifetime Access</p>
                    </div>
                  </div>
                </div>

                {/* Enrolled Course Card */}
                <div className="rounded-xl border border-line/80 bg-surface p-4 space-y-3">
                  <span className="inline-block rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                    In Progress
                  </span>
                  <h3 className="text-sm font-bold text-ink">
                    Production Distributed Systems & UPI Checkout
                  </h3>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-muted">
                      <span>Course Progress</span>
                      <span className="text-brand font-mono tabular-nums">75% (12 / 16 modules)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden border border-line/50">
                      <div className="h-full w-3/4 bg-brand rounded-full transition-all duration-300" />
                    </div>
                  </div>
                </div>

                {/* Certificate Preview Card */}
                <div className="rounded-xl border border-line/60 bg-surface-2 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Verifiable Credential</span>
                    <span className="text-[10px] font-bold text-good">Issued on Completion</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    Tamper-proof completion certificate with cryptographic signature and LinkedIn badge.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
