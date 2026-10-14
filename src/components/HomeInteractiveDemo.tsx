"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GooglePayIcon,
  PhonePeIcon,
  PaytmIcon,
  BhimUpiIcon,
  VisaIcon,
  MastercardIcon,
  RupayIcon,
  HdfcBankIcon,
  SbiBankIcon,
  IciciBankIcon,
  AxisBankIcon,
  ShieldCheckBadge,
  LockBadge,
} from "./gateway-icons";

type DemoTab = "razorpay-qr" | "easebuzz-hosted" | "card-checkout" | "competitor-compare";

export function HomeInteractiveDemo() {
  const [activeTab, setActiveTab] = useState<DemoTab>("razorpay-qr");
  const [step, setStep] = useState<"checkout" | "phone-prompt" | "processing" | "success" | "failed">("checkout");
  const [selectedApp, setSelectedApp] = useState<"gpay" | "phonepe" | "paytm" | "bhim">("gpay");
  const [countdown, setCountdown] = useState(892); // 14:52
  const [monthlySales, setMonthlySales] = useState(250000); // ₹2,50,000

  // Timer for Easebuzz & session expiration
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 900));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Trigger Phone Simulator Push Notification
  const handleScanOrAppClick = (app: "gpay" | "phonepe" | "paytm" | "bhim") => {
    setSelectedApp(app);
    setStep("phone-prompt");
  };

  const handleApprovePayment = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("success");
    }, 1400);
  };

  const handleDeclinePayment = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("failed");
    }, 800);
  };

  const handleReset = () => {
    setStep("checkout");
  };

  // Competitor economics calculations
  const tagmangoCut = Math.round(monthlySales * 0.18); // Avg 18% (15% platform + 3% gateway/pg)
  const graphyCut = Math.round(monthlySales * 0.10 + 3999); // 10% + ₹3,999/mo plan
  const tysonpeProCut = Math.round(monthlySales * 0.055 + monthlySales * 0.018); // 5.5% + 1.8% pg
  const savedVsTagmango = Math.max(0, tagmangoCut - tysonpeProCut);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl transition-all duration-200">
      {/* 1. Device Chrome & Browser Topbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-line bg-surface-2/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {/* macOS window dots */}
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          </div>

          {/* Browser URL pill */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-line/80 bg-surface px-2.5 py-1 text-[11px] font-mono text-muted">
            <LockBadge className="h-3 w-3 text-good" />
            <span>checkout.tysonpe.com/c/asha-rao</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-xs">
          <button
            type="button"
            onClick={() => { setActiveTab("razorpay-qr"); handleReset(); }}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
              activeTab === "razorpay-qr"
                ? "bg-brand text-brand-ink shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            UPI Dynamic QR
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("easebuzz-hosted"); handleReset(); }}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
              activeTab === "easebuzz-hosted"
                ? "bg-brand text-brand-ink shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            Easebuzz Netbanking
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("competitor-compare"); handleReset(); }}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
              activeTab === "competitor-compare"
                ? "bg-brand text-brand-ink shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            vs TagMango
          </button>
        </div>
      </div>

      {/* 2. Simulator Body: Realistic Checkout View */}
      {activeTab === "razorpay-qr" && (
        <div className="p-4 sm:p-6">
          {/* Main Checkout Frame */}
          <div className="relative mx-auto max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
            {/* Creator / Order Banner (Authentic TagMango / Razorpay style) */}
            <div className="border-b border-line bg-gradient-to-r from-slate-900 to-[#121c2d] p-4 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Creator Avatar */}
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/30 border border-brand/50 font-display text-base font-bold text-white shadow-xs">
                    AR
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-white">Asha Rao</h4>
                      <span className="inline-flex items-center rounded-full bg-blue-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-blue-300 border border-blue-500/30">
                        ✓ CA & Coach
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">Personal Finance Masterclass · 6-Week Cohort</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs text-slate-400 line-through">₹2,999</span>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      60% OFF
                    </span>
                  </div>
                  <p className="font-mono text-lg font-extrabold text-white">₹1,180.00</p>
                  <p className="text-[10px] text-slate-400">incl. 18% GST (₹180)</p>
                </div>
              </div>
            </div>

            {/* CHECKOUT STATE 1: Interactive Dynamic QR & UPI Intent */}
            {step === "checkout" && (
              <div className="p-5">
                <div className="grid gap-6 sm:grid-cols-12 sm:items-center">
                  {/* Left Column: High-Fidelity SVG QR Code with live scanning laser */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center">
                    <div className="relative overflow-hidden rounded-xl border-2 border-brand/30 bg-white p-3 shadow-md">
                      {/* Laser scanner line moving up and down */}
                      <div className="animate-scan pointer-events-none absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent shadow-[0_0_8px_#5b3df5]" />

                      {/* Genuine Stylized SVG QR Code */}
                      <svg className="h-32 w-32" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Position Markers */}
                        <rect x="5" y="5" width="30" height="30" rx="4" fill="#0f172a" />
                        <rect x="10" y="10" width="20" height="20" rx="2" fill="white" />
                        <rect x="15" y="15" width="10" height="10" rx="1" fill="#0f172a" />

                        <rect x="85" y="5" width="30" height="30" rx="4" fill="#0f172a" />
                        <rect x="90" y="10" width="20" height="20" rx="2" fill="white" />
                        <rect x="95" y="15" width="10" height="10" rx="1" fill="#0f172a" />

                        <rect x="5" y="85" width="30" height="30" rx="4" fill="#0f172a" />
                        <rect x="10" y="90" width="20" height="20" rx="2" fill="white" />
                        <rect x="15" y="95" width="10" height="10" rx="1" fill="#0f172a" />

                        {/* Data Matrix Dots */}
                        <circle cx="45" cy="15" r="3" fill="#0f172a" />
                        <circle cx="55" cy="15" r="3" fill="#0f172a" />
                        <circle cx="65" cy="15" r="3" fill="#0f172a" />
                        <circle cx="75" cy="15" r="3" fill="#0f172a" />

                        <circle cx="45" cy="25" r="3" fill="#0f172a" />
                        <circle cx="65" cy="25" r="3" fill="#0f172a" />
                        <circle cx="45" cy="35" r="3" fill="#0f172a" />
                        <circle cx="55" cy="35" r="3" fill="#0f172a" />
                        <circle cx="75" cy="35" r="3" fill="#0f172a" />

                        {/* Central UPI Logo Badge */}
                        <rect x="42" y="42" width="36" height="36" rx="8" fill="white" stroke="#5b3df5" strokeWidth="2" />
                        <path d="M52 50L62 60L52 70" stroke="#097939" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M58 50L68 60L58 70" stroke="#E65100" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                        <circle cx="15" cy="55" r="3" fill="#0f172a" />
                        <circle cx="25" cy="55" r="3" fill="#0f172a" />
                        <circle cx="15" cy="65" r="3" fill="#0f172a" />
                        <circle cx="35" cy="65" r="3" fill="#0f172a" />
                        <circle cx="25" cy="75" r="3" fill="#0f172a" />

                        <circle cx="85" cy="55" r="3" fill="#0f172a" />
                        <circle cx="105" cy="55" r="3" fill="#0f172a" />
                        <circle cx="95" cy="65" r="3" fill="#0f172a" />
                        <circle cx="105" cy="75" r="3" fill="#0f172a" />

                        <circle cx="45" cy="85" r="3" fill="#0f172a" />
                        <circle cx="65" cy="85" r="3" fill="#0f172a" />
                        <circle cx="55" cy="95" r="3" fill="#0f172a" />
                        <circle cx="75" cy="95" r="3" fill="#0f172a" />
                        <circle cx="65" cy="105" r="3" fill="#0f172a" />
                      </svg>
                    </div>

                    <div className="mt-2.5 text-center">
                      <span className="badge badge-brand !text-[10px]">
                        Scan with any UPI App
                      </span>
                      <p className="mt-1 font-mono text-[10px] text-muted">
                        Expires in <span className="font-semibold text-ink">{formatTimer(countdown)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Column: One-Tap App Selection & Direct Intent Simulation */}
                  <div className="sm:col-span-7 space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Or Pay Directly Via Installed App
                      </p>
                      <p className="text-[11px] text-muted">
                        Click any app below to simulate instant phone payment:
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleScanOrAppClick("gpay")}
                        className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2.5 text-left text-xs font-semibold hover:border-brand hover:bg-surface-2 transition-all duration-150 active:scale-[0.98]"
                      >
                        <GooglePayIcon className="h-5 w-7" />
                        <div>
                          <p className="text-ink text-xs">Google Pay</p>
                          <p className="text-[10px] text-muted font-normal">Fast 1-tap UPI</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleScanOrAppClick("phonepe")}
                        className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2.5 text-left text-xs font-semibold hover:border-brand hover:bg-surface-2 transition-all duration-150 active:scale-[0.98]"
                      >
                        <PhonePeIcon className="h-5 w-7" />
                        <div>
                          <p className="text-ink text-xs">PhonePe</p>
                          <p className="text-[10px] text-muted font-normal">UPI Intent</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleScanOrAppClick("paytm")}
                        className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2.5 text-left text-xs font-semibold hover:border-brand hover:bg-surface-2 transition-all duration-150 active:scale-[0.98]"
                      >
                        <PaytmIcon className="h-4 w-7" />
                        <div>
                          <p className="text-ink text-xs">Paytm</p>
                          <p className="text-[10px] text-muted font-normal">Wallet & UPI</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleScanOrAppClick("bhim")}
                        className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2.5 text-left text-xs font-semibold hover:border-brand hover:bg-surface-2 transition-all duration-150 active:scale-[0.98]"
                      >
                        <BhimUpiIcon className="h-5 w-7" />
                        <div>
                          <p className="text-ink text-xs">BHIM UPI</p>
                          <p className="text-[10px] text-muted font-normal">NPCI Certified</p>
                        </div>
                      </button>
                    </div>

                    {/* Quick Simulation Trigger */}
                    <button
                      type="button"
                      onClick={() => handleScanOrAppClick("gpay")}
                      className="btn btn-primary w-full text-xs font-bold active:scale-[0.98] !py-2.5 shadow-sm"
                    >
                      Test Mobile UPI Checkout (₹1,180) →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CHECKOUT STATE 2: Realistic Phone Prompt Simulation */}
            {step === "phone-prompt" && (
              <div className="p-6">
                <div className="mx-auto max-w-sm rounded-2xl border-2 border-brand/40 bg-surface-2 p-4 shadow-xl">
                  {/* Phone Notification Banner */}
                  <div className="flex items-center justify-between border-b border-line pb-2.5">
                    <div className="flex items-center gap-2">
                      {selectedApp === "gpay" && <GooglePayIcon className="h-4 w-6" />}
                      {selectedApp === "phonepe" && <PhonePeIcon className="h-4 w-6" />}
                      {selectedApp === "paytm" && <PaytmIcon className="h-4 w-6" />}
                      {selectedApp === "bhim" && <BhimUpiIcon className="h-4 w-6" />}
                      <span className="text-[11px] font-bold text-ink uppercase">
                        {selectedApp.toUpperCase()} · Payment Request
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted">Just now</span>
                  </div>

                  <div className="py-4 text-center">
                    <p className="text-xs text-muted">Asha Rao via Tysonpe is requesting</p>
                    <p className="mt-1 font-mono text-2xl font-black text-ink">₹1,180.00</p>
                    <p className="mt-0.5 text-[11px] text-muted font-mono">VPA: asha-rao@tysonpe</p>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-good">
                      <ShieldCheckBadge className="h-3 w-3" />
                      <span>Verified NPCI Merchant Rail</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleApprovePayment}
                      className="btn btn-primary btn-sm flex-1 !bg-good font-bold active:scale-[0.98]"
                    >
                      Authorize & Pay (Enter PIN)
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclinePayment}
                      className="btn btn-secondary btn-sm text-bad hover:bg-bad-soft active:scale-[0.98]"
                    >
                      Decline
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[11px] text-muted hover:underline"
                  >
                    ← Back to QR & methods
                  </button>
                </div>
              </div>
            )}

            {/* CHECKOUT STATE 3: Cryptographic Signature & Webhook Verification */}
            {step === "processing" && (
              <div className="py-12 px-6 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-brand border-t-transparent" />
                <h5 className="mt-4 text-sm font-bold text-ink">Verifying Transaction Signature</h5>
                <p className="mt-1 text-xs text-muted">
                  Executing server-side HMAC-SHA256 checksum verification...
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[11px] font-mono text-muted border border-line">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand animate-ping" />
                  <span>Webhook listener active (T+0.4s)</span>
                </div>
              </div>
            )}

            {/* CHECKOUT STATE 4: Authentic Success & Instant Provisioning */}
            {step === "success" && (
              <div className="p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-good-soft text-good shadow-sm">
                  <ShieldCheckBadge className="h-7 w-7" />
                </div>
                <h4 className="mt-3 text-base font-extrabold text-good">
                  Payment Confirmed · ₹1,180 Paid
                </h4>
                <p className="mt-0.5 font-mono text-xs text-muted">
                  Bank Reference ID: RRN_9281734912 · Order #ORD-7821
                </p>

                <div className="mt-4 rounded-xl border border-line bg-surface-2/60 p-3 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted">Learner:</span>
                    <span className="font-semibold text-ink">ravi@demo.tysonpe.test</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Tax Invoice:</span>
                    <span className="font-mono text-brand font-semibold">TY-2026-0084 (GSTIN Included)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Access Provisioned:</span>
                    <span className="text-good font-semibold">Unlocked in /library</span>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn btn-secondary btn-sm flex-1 text-xs active:scale-[0.98]"
                  >
                    Test Another Simulation
                  </button>
                  <Link
                    href="/demo"
                    className="btn btn-primary btn-sm flex-1 text-xs font-bold active:scale-[0.98]"
                  >
                    Open Full Screen Demo →
                  </Link>
                </div>
              </div>
            )}

            {/* CHECKOUT STATE 5: Failure Recovery */}
            {step === "failed" && (
              <div className="p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bad-soft text-bad">
                  <span className="text-xl font-bold">✕</span>
                </div>
                <h4 className="mt-3 text-base font-extrabold text-bad">
                  Payment Declined by User
                </h4>
                <p className="mt-1 text-xs text-muted">
                  Simulated user cancelled PIN entry on phone. Zero state lock-in.
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-primary btn-sm mt-4 text-xs font-bold active:scale-[0.98]"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Footer Trust Ribbon */}
            <div className="flex items-center justify-between border-t border-line bg-surface-2/50 px-4 py-2.5 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <LockBadge className="h-3.5 w-3.5 text-good" />
                <span>PCI-DSS Level 1 & 256-Bit SSL</span>
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 opacity-80">
                  <VisaIcon className="h-3 w-5" />
                  <MastercardIcon className="h-3 w-5" />
                  <RupayIcon className="h-3 w-5" />
                </div>
                <span>NPCI UPI Rail · Razorpay</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Simulator Tab: Easebuzz Hosted Checkout */}
      {activeTab === "easebuzz-hosted" && (
        <div className="p-4 sm:p-6">
          <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
            {/* Easebuzz Corporate Header */}
            <div className="bg-[#12233c] px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white tracking-wide">EASEBUZZ</span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase font-mono text-slate-300">
                      Smart Hosted Portal
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">Merchant: Tysonpe Technologies</p>
                </div>
                <div className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-right">
                  <span className="text-[9px] uppercase tracking-wider text-amber-200">Expires In</span>
                  <p className="font-mono text-xs font-black text-amber-300">{formatTimer(countdown)}</p>
                </div>
              </div>
            </div>

            {/* Easebuzz Body */}
            <div className="p-5">
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/60 p-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted">Order ID / Txn</span>
                  <p className="font-mono text-xs font-bold text-ink">EB_20261015_9281A</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-muted">Payable Amount</span>
                  <p className="font-mono text-base font-extrabold text-brand">₹1,180.00</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Select Netbanking Rail (50+ Banks)
                </p>
                <div className="mt-2.5 grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={handleApprovePayment}
                    className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-2.5 hover:border-brand hover:bg-surface-2 transition active:scale-[0.98]"
                  >
                    <HdfcBankIcon className="h-6 w-6" />
                    <span className="mt-1 text-[10px] font-bold text-ink">HDFC Bank</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApprovePayment}
                    className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-2.5 hover:border-brand hover:bg-surface-2 transition active:scale-[0.98]"
                  >
                    <SbiBankIcon className="h-6 w-6" />
                    <span className="mt-1 text-[10px] font-bold text-ink">SBI</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApprovePayment}
                    className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-2.5 hover:border-brand hover:bg-surface-2 transition active:scale-[0.98]"
                  >
                    <IciciBankIcon className="h-6 w-6" />
                    <span className="mt-1 text-[10px] font-bold text-ink">ICICI Bank</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApprovePayment}
                    className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-2.5 hover:border-brand hover:bg-surface-2 transition active:scale-[0.98]"
                  >
                    <AxisBankIcon className="h-6 w-6" />
                    <span className="mt-1 text-[10px] font-bold text-ink">Axis Bank</span>
                  </button>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={handleApprovePayment}
                  className="btn btn-primary btn-sm flex-1 font-bold active:scale-[0.98]"
                >
                  Simulate Easebuzz Netbanking Pay
                </button>
                <button
                  type="button"
                  onClick={handleDeclinePayment}
                  className="btn btn-secondary btn-sm text-bad hover:bg-bad-soft active:scale-[0.98]"
                >
                  Simulate Cancel
                </button>
              </div>

              {step === "success" && (
                <div className="mt-4 rounded-xl border border-good/40 bg-good-soft p-3 text-center text-xs text-good font-semibold">
                  ✓ Easebuzz SHA-512 Hash Verified · 303 Redirect to Order Confirmation
                </div>
              )}
            </div>

            <div className="border-t border-line bg-surface-2/40 px-4 py-2 text-center text-[10px] text-muted">
              Auto-return redirect enabled on verified Easebuzz webhook response
            </div>
          </div>
        </div>
      )}

      {/* 4. Simulator Tab: TagMango & Competitor Fee Comparison */}
      {activeTab === "competitor-compare" && (
        <div className="p-4 sm:p-6">
          <div className="rounded-2xl border border-line bg-surface-2/40 p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="badge badge-brand !text-xs font-bold">
                  Competitor Fee Calculator
                </span>
                <h4 className="mt-1 text-base font-extrabold text-ink">
                  How Much Do You Save vs TagMango & Graphy?
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted">Monthly Creator Revenue:</span>
                <p className="font-mono text-xl font-black text-brand">
                  ₹{monthlySales.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* Interactive Slider */}
            <div className="mt-5">
              <input
                type="range"
                min="50000"
                max="1000000"
                step="25000"
                value={monthlySales}
                onChange={(e) => setMonthlySales(Number(e.target.value))}
                className="w-full accent-brand cursor-pointer h-2"
              />
              <div className="flex justify-between text-[11px] font-mono text-muted mt-1">
                <span>₹50,000 / mo</span>
                <span>₹5,00,000 / mo</span>
                <span>₹10,00,000 / mo</span>
              </div>
            </div>

            {/* Savings Callout Banner (TagMango Comparison) */}
            <div className="mt-5 rounded-xl border border-good/30 bg-good-soft/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-good">
                    Estimated Monthly Take-Home Boost
                  </p>
                  <p className="font-mono text-2xl font-black text-good">
                    + ₹{savedVsTagmango.toLocaleString("en-IN")} / month
                  </p>
                </div>
                <div className="text-right">
                  <span className="badge badge-good !text-xs font-bold">
                    Keep up to 100%
                  </span>
                  <p className="text-[10px] text-muted mt-1">Zero Lock-In</p>
                </div>
              </div>
            </div>

            {/* Side-by-side comparison table */}
            <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface-2/60 text-muted">
                    <th className="px-3.5 py-2 text-left font-semibold">Platform</th>
                    <th className="px-3.5 py-2 text-center font-semibold">Platform Cut</th>
                    <th className="px-3.5 py-2 text-right font-semibold">Net Payout to Bank</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-line bg-good-soft/20 font-bold">
                    <td className="px-3.5 py-2.5 text-brand flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-brand" />
                      Tysonpe (Pro)
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-mono">5.5% + 1.8% PG</td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-good text-sm">
                      ₹{(monthlySales - tysonpeProCut).toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr className="border-b border-line">
                    <td className="px-3.5 py-2.5 text-muted">TagMango</td>
                    <td className="px-3.5 py-2.5 text-center font-mono text-bad">~18% (15% + 3% PG)</td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-ink">
                      ₹{(monthlySales - tagmangoCut).toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2.5 text-muted">Graphy</td>
                    <td className="px-3.5 py-2.5 text-center font-mono text-bad">10% + ₹3,999/mo</td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-ink">
                      ₹{(monthlySales - graphyCut).toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar: Playground Link */}
      <div className="flex items-center justify-between border-t border-line bg-surface-2/50 px-4 py-3 sm:px-6">
        <span className="text-xs text-muted">
          Need full screen testing with custom webhook endpoints?
        </span>
        <Link
          href="/demo"
          className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1 active:scale-[0.98]"
        >
          Open Dedicated Sandbox Playground →
        </Link>
      </div>
    </div>
  );
}
