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

type TabKey = "razorpay" | "easebuzz" | "calculator";

export function HomeInteractiveDemo() {
  const [activeTab, setActiveTab] = useState<TabKey>("razorpay");
  const [demoState, setDemoState] = useState<"idle" | "processing" | "success" | "failure">("idle");
  const [selectedMethod, setSelectedMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [countdown, setCountdown] = useState(894); // 14:54

  // Interactive Fee Calculator State
  const [monthlyVolume, setMonthlyVolume] = useState(150000); // 1.5 Lakhs
  const [selectedPlan, setSelectedPlan] = useState<"Basic" | "Pro" | "Advanced" | "Ultimate">("Pro");

  // Timer simulation for Easebuzz
  useEffect(() => {
    if (activeTab !== "easebuzz") return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 900));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSimulate = (outcome: "success" | "failure") => {
    setDemoState("processing");
    setTimeout(() => {
      setDemoState(outcome);
    }, 450);
  };

  const resetDemo = () => {
    setDemoState("idle");
  };

  // Calculator computations
  const planRates = {
    Basic: 0.10,
    Pro: 0.055,
    Advanced: 0.035,
    Ultimate: 0.0,
  };
  const platformFee = Math.round(monthlyVolume * planRates[selectedPlan]);
  const gatewayFee = Math.round(monthlyVolume * 0.018);
  const netTakeHome = monthlyVolume - platformFee - gatewayFee;

  return (
    <div className="card overflow-hidden border border-line bg-surface shadow-xl">
      {/* Top Header & Segmented Tab Switcher (Skiper UI style) */}
      <div className="border-b border-line bg-surface-2/60 px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-good" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Live Sandbox Simulator
            </span>
          </div>

          {/* Segmented Tab Controls */}
          <div className="inline-flex rounded-xl border border-line bg-surface p-1 shadow-xs">
            <button
              type="button"
              onClick={() => { setActiveTab("razorpay"); resetDemo(); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                activeTab === "razorpay"
                  ? "bg-brand text-brand-ink shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              Razorpay Modal
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("easebuzz"); resetDemo(); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                activeTab === "easebuzz"
                  ? "bg-brand text-brand-ink shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              Easebuzz Hosted
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("calculator"); resetDemo(); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                activeTab === "calculator"
                  ? "bg-brand text-brand-ink shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              Payout Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Tab Panel 1: Razorpay Modal Simulator */}
      {activeTab === "razorpay" && (
        <div className="p-4 sm:p-6">
          <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
            {/* Modal Header */}
            <div className="bg-[#0c2340] px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Standard Checkout
                    </p>
                  </div>
                  <h4 className="mt-0.5 text-sm font-bold text-white">Asha Rao · Cohort Masterclass</h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-300">Amount to Pay</span>
                  <p className="font-mono text-base font-extrabold text-white">₹1,180.00</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {demoState === "idle" && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Preferred Payment Methods
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod("upi")}
                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-xs font-medium transition-all duration-150 active:scale-[0.98] ${
                        selectedMethod === "upi"
                          ? "border-brand bg-brand-soft/40 text-brand font-semibold shadow-xs"
                          : "border-line bg-surface hover:bg-surface-2 text-ink"
                      }`}
                    >
                      <GooglePayIcon className="h-4 w-7" />
                      <span>Instant UPI QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod("card")}
                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-xs font-medium transition-all duration-150 active:scale-[0.98] ${
                        selectedMethod === "card"
                          ? "border-brand bg-brand-soft/40 text-brand font-semibold shadow-xs"
                          : "border-line bg-surface hover:bg-surface-2 text-ink"
                      }`}
                    >
                      <VisaIcon className="h-4 w-7" />
                      <span>Credit / Debit Card</span>
                    </button>
                  </div>

                  {selectedMethod === "upi" ? (
                    <div className="mt-3 rounded-xl border border-line/70 bg-surface-2/40 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">Simulated UPI Apps</span>
                        <span className="badge badge-good !text-[10px]">Zero MDR</span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-around gap-2">
                        <div className="flex flex-col items-center gap-1">
                          <GooglePayIcon className="h-6 w-9" />
                          <span className="text-[10px] text-muted">GPay</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <PhonePeIcon className="h-6 w-9" />
                          <span className="text-[10px] text-muted">PhonePe</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <PaytmIcon className="h-6 w-9" />
                          <span className="text-[10px] text-muted">Paytm</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <BhimUpiIcon className="h-6 w-9" />
                          <span className="text-[10px] text-muted">BHIM</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2 rounded-xl border border-line/70 bg-surface-2/40 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Card network</span>
                        <div className="flex gap-1.5">
                          <VisaIcon className="h-4 w-6" />
                          <MastercardIcon className="h-4 w-6" />
                          <RupayIcon className="h-4 w-6" />
                        </div>
                      </div>
                      <p className="font-mono text-xs text-ink">•••• •••• •••• 4242</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSimulate("success")}
                      className="btn btn-primary btn-sm flex-1 !bg-brand font-semibold active:scale-[0.98]"
                    >
                      Simulate Paid ₹1,180
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimulate("failure")}
                      className="btn btn-secondary btn-sm text-bad hover:bg-bad-soft active:scale-[0.98]"
                    >
                      Simulate Fail
                    </button>
                  </div>
                </>
              )}

              {demoState === "processing" && (
                <div className="py-8 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                  <p className="mt-3 text-xs font-semibold text-ink">Authorizing test transaction...</p>
                  <p className="text-[11px] text-muted">Verifying HMAC SHA256 signature server-side</p>
                </div>
              )}

              {demoState === "success" && (
                <div className="py-5 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-good-soft text-good">
                    <ShieldCheckBadge className="h-6 w-6" />
                  </div>
                  <h5 className="mt-2 text-sm font-bold text-good">Payment Verified Successfully!</h5>
                  <p className="mt-1 font-mono text-xs text-muted">order_rcptid_mock_9824</p>
                  <p className="mt-2 text-xs text-ink">
                    Learner unlocked instantly. GST Invoice #TY-2026-0042 dispatched.
                  </p>
                  <button
                    type="button"
                    onClick={resetDemo}
                    className="btn btn-secondary btn-sm mt-3"
                  >
                    Test Another Simulation
                  </button>
                </div>
              )}

              {demoState === "failure" && (
                <div className="py-5 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-bad-soft text-bad">
                    <span className="text-base font-bold">✕</span>
                  </div>
                  <h5 className="mt-2 text-sm font-bold text-bad">Payment Cancelled / Declined</h5>
                  <p className="mt-1 text-xs text-muted">
                    Zero customer lock-in. Retry route active with fallback gateway.
                  </p>
                  <button
                    type="button"
                    onClick={resetDemo}
                    className="btn btn-secondary btn-sm mt-3"
                  >
                    Reset Simulator
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-line bg-surface-2/40 px-4 py-2 text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <LockBadge className="h-3 w-3 text-good" />
                256-bit Encrypted
              </span>
              <span>Secured by Razorpay</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Panel 2: Easebuzz Hosted Simulator */}
      {activeTab === "easebuzz" && (
        <div className="p-4 sm:p-6">
          <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
            {/* Easebuzz Header */}
            <div className="bg-[#12233c] px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-300">Easebuzz Payment Gateway</p>
                  <p className="text-xs font-semibold text-white">Merchant: Tysonpe Platform</p>
                </div>
                <div className="rounded-md bg-amber-500/20 px-2 py-0.5 text-right border border-amber-500/30">
                  <span className="text-[9px] uppercase tracking-wider text-amber-200">Session Timer</span>
                  <p className="font-mono text-xs font-bold text-amber-300">{formatTimer(countdown)}</p>
                </div>
              </div>
            </div>

            {/* Easebuzz Body */}
            <div className="p-4">
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 p-2.5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted">Transaction ID</span>
                  <p className="font-mono text-xs font-semibold text-ink">EB_9281734_DEMO</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-muted">Total (incl. GST)</span>
                  <p className="font-mono text-sm font-extrabold text-brand">₹1,180.00</p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Supported Netbanking & UPI
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-2 hover:border-brand transition">
                    <HdfcBankIcon className="h-5 w-5" />
                    <span className="mt-1 text-[10px] font-medium text-muted">HDFC</span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-2 hover:border-brand transition">
                    <SbiBankIcon className="h-5 w-5" />
                    <span className="mt-1 text-[10px] font-medium text-muted">SBI</span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-2 hover:border-brand transition">
                    <IciciBankIcon className="h-5 w-5" />
                    <span className="mt-1 text-[10px] font-medium text-muted">ICICI</span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-2 hover:border-brand transition">
                    <AxisBankIcon className="h-5 w-5" />
                    <span className="mt-1 text-[10px] font-medium text-muted">Axis</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSimulate("success")}
                  className="btn btn-primary btn-sm flex-1 font-semibold active:scale-[0.98]"
                >
                  Confirm Easebuzz Pay
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate("failure")}
                  className="btn btn-secondary btn-sm text-bad hover:bg-bad-soft active:scale-[0.98]"
                >
                  Cancel Return
                </button>
              </div>

              {demoState === "success" && (
                <div className="mt-3 rounded-xl border border-good/30 bg-good-soft p-2.5 text-center text-xs text-good font-semibold">
                  ✓ Easebuzz Hash Validated · 303 Redirect to Order Confirmation
                </div>
              )}
            </div>

            <div className="border-t border-line bg-surface-2/40 px-4 py-2 text-center text-[10px] text-muted">
              Auto-return redirect enabled on sandbox webhook response
            </div>
          </div>
        </div>
      )}

      {/* Tab Panel 3: Interactive Payout Ledger (Details.so / Refero inspired) */}
      {activeTab === "calculator" && (
        <div className="p-4 sm:p-6">
          <div className="rounded-2xl border border-line bg-surface-2/30 p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <span className="badge badge-brand">Dynamic Earnings Ledger</span>
                <h4 className="mt-1 text-sm font-bold">Simulate Your Monthly Take-Home</h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted">Monthly Gross Volume:</span>
                <p className="font-mono text-lg font-extrabold text-ink">
                  ₹{monthlyVolume.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* Slider */}
            <div className="mt-4">
              <input
                type="range"
                min="20000"
                max="1000000"
                step="10000"
                value={monthlyVolume}
                onChange={(e) => setMonthlyVolume(Number(e.target.value))}
                className="w-full accent-brand cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-muted">
                <span>₹20,000 / mo</span>
                <span>₹5,00,000 / mo</span>
                <span>₹10,00,000 / mo</span>
              </div>
            </div>

            {/* Plan selector pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              {(["Basic", "Pro", "Advanced", "Ultimate"] as const).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                    selectedPlan === plan
                      ? "border border-brand bg-brand text-brand-ink shadow-xs"
                      : "border border-line bg-surface text-ink hover:bg-surface-2"
                  }`}
                >
                  {plan} ({(planRates[plan] * 100).toFixed(1)}%)
                </button>
              ))}
            </div>

            {/* Breakdown Ledger Table */}
            <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-line">
                    <td className="px-3.5 py-2.5 text-muted">Gross Sales Volume</td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-medium text-ink">
                      ₹{monthlyVolume.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr className="border-b border-line">
                    <td className="px-3.5 py-2.5 text-muted">
                      Tysonpe Platform Fee ({selectedPlan} Plan)
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-bad">
                      - ₹{platformFee.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr className="border-b border-line">
                    <td className="px-3.5 py-2.5 text-muted">Estimated Gateway Fee (1.8% UPI / Cards)</td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-bad">
                      - ₹{gatewayFee.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr className="bg-good-soft/40 font-bold">
                    <td className="px-3.5 py-3 text-good">
                      Net Bank Deposit (T+1 Automated Settlement)
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono text-sm text-good">
                      ₹{netTakeHome.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-2.5 text-[11px] text-muted">
              *GST is calculated on fee invoices automatically. You receive full buyer invoices with HSN codes.
            </p>
          </div>
        </div>
      )}

      {/* Simulator Footer Link */}
      <div className="flex items-center justify-between border-t border-line bg-surface-2/50 px-4 py-3 sm:px-6">
        <span className="text-xs text-muted">
          Want to test the full live checkout flow?
        </span>
        <Link
          href="/demo"
          className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1 active:scale-[0.98]"
        >
          Open Dedicated Sandbox Playground →
        </Link>
      </div>
    </div>
  );
}
