"use client";

import { useState, useEffect } from "react";
import { feeBreakdown, planRates } from "@/lib/money";
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

type DemoTab = "razorpay-qr" | "easebuzz-hosted" | "fee-calculator";

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
    }, 1200);
  };

  const handleDeclinePayment = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("failed");
    }, 600);
  };

  const handleReset = () => {
    setStep("checkout");
  };

  // Fee calculator: real plan rates from src/lib/money.ts, no competitor figures.
  const planRows = ["basic", "pro", "advanced", "ultimate"].map((key) => {
    const rates = planRates(key);
    return {
      key,
      label: key[0].toUpperCase() + key.slice(1),
      rate: `${rates.platform} + ${rates.gateway} gateway`,
      ...feeBreakdown(monthlySales * 100, key),
    };
  });
  const basicNet = planRows[0].netPaise / 100;
  const ultimateNet = planRows[3].netPaise / 100;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-200">
      {/* 1. Device Chrome & Browser Topbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {/* macOS window dots */}
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          </div>

          {/* Browser URL pill */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-mono text-slate-500 shadow-2xs">
            <LockBadge className="h-3 w-3 text-emerald-600" />
            <span>checkout.tysonpe.com/c/asha-rao</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => { setActiveTab("razorpay-qr"); handleReset(); }}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
              activeTab === "razorpay-qr"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            UPI Dynamic QR
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("easebuzz-hosted"); handleReset(); }}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
              activeTab === "easebuzz-hosted"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Easebuzz Netbanking
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("fee-calculator"); handleReset(); }}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
              activeTab === "fee-calculator"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Fee calculator
          </button>
        </div>
      </div>

      {/* 2. Simulator Body: Realistic Checkout View */}
      {activeTab === "razorpay-qr" && (
        <div className="p-4 sm:p-5">
          {/* Main Checkout Frame */}
          <div className="relative mx-auto max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Creator / Order Banner */}
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Creator Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-400/40 text-sm font-bold text-white shadow-xs">
                    AR
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-white">Asha Rao</h4>
                      <span className="inline-flex items-center rounded-full bg-indigo-400/20 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-200 border border-indigo-400/30">
                        ✓ Verified Coach
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">Personal Finance Masterclass · 6-Week Cohort</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs text-slate-400 line-through">₹2,999</span>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                      60% OFF
                    </span>
                  </div>
                  <p className="font-mono text-base font-extrabold text-white">₹1,180.00</p>
                  <p className="text-[10px] text-slate-400">incl. 18% GST (₹180)</p>
                </div>
              </div>
            </div>

            {/* CHECKOUT STATE 1: Interactive Dynamic QR & UPI Intent */}
            {step === "checkout" && (
              <div className="p-4 sm:p-5">
                <div className="grid gap-5 sm:grid-cols-12 sm:items-center">
                  {/* Left Column: High-Fidelity SVG QR Code with live scanning laser */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center">
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                      {/* Laser scanner line moving up and down */}
                      <div className="animate-scan pointer-events-none absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-600 to-transparent shadow-[0_0_8px_#4f46e5]" />

                      {/* Genuine Stylized SVG QR Code */}
                      <svg className="h-28 w-28 sm:h-32 sm:w-32" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                        <rect x="42" y="42" width="36" height="36" rx="8" fill="white" stroke="#4f46e5" strokeWidth="2" />
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

                    <div className="mt-2 text-center">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        Scan with any UPI App
                      </span>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                        Session expires: <span className="font-semibold text-slate-800">{formatTimer(countdown)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Column: One-Tap App Selection & Direct Intent Simulation */}
                  <div className="sm:col-span-7 space-y-2.5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Or Tap App to Pay (Simulate Intent)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Select your preferred UPI app to simulate mobile checkout:
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleScanOrAppClick("gpay")}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-left text-xs font-semibold hover:border-indigo-500 hover:bg-indigo-50/30 transition-all duration-150 active:scale-[0.98] shadow-2xs"
                      >
                        <GooglePayIcon className="h-5 w-7" />
                        <div>
                          <p className="text-slate-900 text-xs font-bold">Google Pay</p>
                          <p className="text-[10px] text-slate-500 font-normal">Fast 1-tap</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleScanOrAppClick("phonepe")}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-left text-xs font-semibold hover:border-indigo-500 hover:bg-indigo-50/30 transition-all duration-150 active:scale-[0.98] shadow-2xs"
                      >
                        <PhonePeIcon className="h-5 w-7" />
                        <div>
                          <p className="text-slate-900 text-xs font-bold">PhonePe</p>
                          <p className="text-[10px] text-slate-500 font-normal">UPI Intent</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleScanOrAppClick("paytm")}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-left text-xs font-semibold hover:border-indigo-500 hover:bg-indigo-50/30 transition-all duration-150 active:scale-[0.98] shadow-2xs"
                      >
                        <PaytmIcon className="h-4 w-7" />
                        <div>
                          <p className="text-slate-900 text-xs font-bold">Paytm</p>
                          <p className="text-[10px] text-slate-500 font-normal">UPI & Wallet</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleScanOrAppClick("bhim")}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-left text-xs font-semibold hover:border-indigo-500 hover:bg-indigo-50/30 transition-all duration-150 active:scale-[0.98] shadow-2xs"
                      >
                        <BhimUpiIcon className="h-5 w-7" />
                        <div>
                          <p className="text-slate-900 text-xs font-bold">BHIM UPI</p>
                          <p className="text-[10px] text-slate-500 font-normal">Simulated UPI</p>
                        </div>
                      </button>
                    </div>

                    {/* Quick Simulation Trigger */}
                    <button
                      type="button"
                      onClick={() => handleScanOrAppClick("gpay")}
                      className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-[0.98] transition-all"
                    >
                      Simulate Phone Approval (₹1,180) →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CHECKOUT STATE 2: Realistic Phone Prompt Simulation */}
            {step === "phone-prompt" && (
              <div className="p-5">
                <div className="mx-auto max-w-sm rounded-xl border-2 border-indigo-200 bg-slate-50 p-4 shadow-md">
                  {/* Phone Notification Banner */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      {selectedApp === "gpay" && <GooglePayIcon className="h-4 w-6" />}
                      {selectedApp === "phonepe" && <PhonePeIcon className="h-4 w-6" />}
                      {selectedApp === "paytm" && <PaytmIcon className="h-4 w-6" />}
                      {selectedApp === "bhim" && <BhimUpiIcon className="h-4 w-6" />}
                      <span className="text-[11px] font-bold text-slate-900 uppercase">
                        {selectedApp.toUpperCase()} · Payment Request
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">Just now</span>
                  </div>

                  <div className="py-4 text-center">
                    <p className="text-xs text-slate-600">Asha Rao via Tysonpe is requesting</p>
                    <p className="mt-1 font-mono text-2xl font-black text-slate-900">₹1,180.00</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 font-mono">VPA: asha-rao@tysonpe</p>
                    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      <ShieldCheckBadge className="h-3 w-3" />
                      <span>Test mode · no real money</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleApprovePayment}
                      className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98] transition-all"
                    >
                      Authorize & Pay (Enter PIN)
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclinePayment}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition-all"
                    >
                      Decline
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[11px] text-slate-500 hover:text-slate-800 hover:underline"
                  >
                    ← Back to QR & methods
                  </button>
                </div>
              </div>
            )}

            {/* CHECKOUT STATE 3: Cryptographic Signature & Webhook Verification */}
            {step === "processing" && (
              <div className="py-10 px-6 text-center">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
                <h5 className="mt-4 text-sm font-bold text-slate-900">Verifying Transaction Signature</h5>
                <p className="mt-1 text-xs text-slate-500">
                  Executing server-side HMAC-SHA256 signature verification...
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-mono text-slate-600 border border-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping" />
                  <span>Webhook listener active (T+0.4s)</span>
                </div>
              </div>
            )}

            {/* CHECKOUT STATE 4: Authentic Success & Instant Provisioning */}
            {step === "success" && (
              <div className="p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                  <ShieldCheckBadge className="h-7 w-7" />
                </div>
                <h4 className="mt-3 text-base font-extrabold text-emerald-700">
                  Payment Confirmed · ₹1,180 Paid
                </h4>
                <p className="mt-0.5 font-mono text-xs text-slate-500">
                  Bank Reference ID: RRN_9281734912 · Order #ORD-7821
                </p>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Learner:</span>
                    <span className="font-semibold text-slate-900">ravi@demo.tysonpe.test</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax Invoice:</span>
                    <span className="font-mono text-indigo-700 font-semibold">TY-2026-0084 (GSTIN Included)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Access Provisioned:</span>
                    <span className="text-emerald-700 font-semibold">Unlocked in /library</span>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
                  >
                    Test Another Simulation
                  </button>
                  <Link
                    href="/demo"
                    className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1"
                  >
                    Open Full Screen Demo →
                  </Link>
                </div>
              </div>
            )}

            {/* CHECKOUT STATE 5: Failure Recovery */}
            {step === "failed" && (
              <div className="p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <span className="text-xl font-bold">✕</span>
                </div>
                <h4 className="mt-3 text-base font-extrabold text-rose-700">
                  Payment Declined by User
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Simulated user cancelled PIN entry on phone. Zero state lock-in.
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 active:scale-[0.98] transition-all"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Footer Trust Ribbon */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <LockBadge className="h-3.5 w-3.5 text-emerald-600" />
                <span>PCI-DSS Level 1 & 256-Bit SSL</span>
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 opacity-80">
                  <VisaIcon className="h-3 w-5" />
                  <MastercardIcon className="h-3 w-5" />
                  <RupayIcon className="h-3 w-5" />
                </div>
                <span>Simulated Razorpay checkout</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Simulator Tab: Easebuzz Hosted Checkout */}
      {activeTab === "easebuzz-hosted" && (
        <div className="p-4 sm:p-5">
          <div className="mx-auto max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Order ID / Txn</span>
                  <p className="font-mono text-xs font-bold text-slate-900">EB_20261015_9281A</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Payable Amount</span>
                  <p className="font-mono text-base font-extrabold text-indigo-600">₹1,180.00</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Select Netbanking Rail (50+ Banks)
                </p>
                <div className="mt-2.5 grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={handleApprovePayment}
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 hover:border-indigo-600 hover:bg-slate-50 transition active:scale-[0.98] shadow-2xs"
                  >
                    <HdfcBankIcon className="h-6 w-6" />
                    <span className="mt-1 text-[10px] font-bold text-slate-900">HDFC</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApprovePayment}
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 hover:border-indigo-600 hover:bg-slate-50 transition active:scale-[0.98] shadow-2xs"
                  >
                    <SbiBankIcon className="h-6 w-6" />
                    <span className="mt-1 text-[10px] font-bold text-slate-900">SBI</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApprovePayment}
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 hover:border-indigo-600 hover:bg-slate-50 transition active:scale-[0.98] shadow-2xs"
                  >
                    <IciciBankIcon className="h-6 w-6" />
                    <span className="mt-1 text-[10px] font-bold text-slate-900">ICICI</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApprovePayment}
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 hover:border-indigo-600 hover:bg-slate-50 transition active:scale-[0.98] shadow-2xs"
                  >
                    <AxisBankIcon className="h-6 w-6" />
                    <span className="mt-1 text-[10px] font-bold text-slate-900">Axis</span>
                  </button>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={handleApprovePayment}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-[0.98] transition-all"
                >
                  Simulate Easebuzz Netbanking Pay
                </button>
                <button
                  type="button"
                  onClick={handleDeclinePayment}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 active:scale-[0.98] transition-all"
                >
                  Simulate Cancel
                </button>
              </div>

              {step === "success" && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs text-emerald-700 font-semibold">
                  ✓ Easebuzz SHA-512 Hash Verified · 303 Redirect to Order Confirmation
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-center text-[10px] text-slate-500">
              Auto-return redirect enabled on verified Easebuzz webhook response
            </div>
          </div>
        </div>
      )}

      {/* 4. Fee calculator: what lands in the bank on each plan */}
      {activeTab === "fee-calculator" && (
        <div className="p-4 sm:p-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  Fee calculator
                </span>
                <h4 className="mt-1 text-base font-extrabold text-slate-900">
                  What lands in your bank on each plan
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">Monthly sales:</span>
                <p className="font-mono text-xl font-black text-indigo-600 tabular-nums">
                  ₹{monthlySales.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <input
                type="range"
                aria-label="Monthly sales"
                min="50000"
                max="1000000"
                step="25000"
                value={monthlySales}
                onChange={(e) => setMonthlySales(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-2"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1">
                <span>₹50,000 / mo</span>
                <span>₹5,00,000 / mo</span>
                <span>₹10,00,000 / mo</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-800">Extra take-home on Ultimate vs Basic</p>
              <p className="font-mono text-2xl font-black text-emerald-700 tabular-nums">
                + ₹{(ultimateNet - basicNet).toLocaleString("en-IN")} / month
              </p>
              <p className="mt-1 text-[10px] text-emerald-700">Before GST on fees. Plan prices are drafts.</p>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="px-3.5 py-2 text-left">Plan</th>
                    <th className="px-3.5 py-2 text-center">Fees</th>
                    <th className="px-3.5 py-2 text-right">Net payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {planRows.map((r) => (
                    <tr key={r.key}>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-800">{r.label}</td>
                      <td className="px-3.5 py-2.5 text-center font-mono text-slate-600">{r.rate}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-slate-900 tabular-nums">
                        ₹{(r.netPaise / 100).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar: Playground Link */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
        <span className="text-xs text-slate-500">
          Want full-screen live checkout simulation?
        </span>
        <Link
          href="/demo"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 active:scale-[0.98]"
        >
          Open Dedicated Sandbox Playground →
        </Link>
      </div>
    </div>
  );
}
