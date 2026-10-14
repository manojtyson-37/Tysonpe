"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { settleDemoAction } from "@/app/actions/checkout";

export interface RazorpayDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amountPaise: number;
  productTitle: string;
  buyer: { name: string; email: string };
}

type Tab = "upi" | "card" | "netbanking" | "wallet";
type Status = "idle" | "processing" | "success" | "failed";

export function RazorpayDemoModal({
  isOpen,
  onClose,
  orderId,
  amountPaise,
  productTitle,
  buyer,
}: RazorpayDemoModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upi");
  const [outcome, setOutcome] = useState<"success" | "failure">("success");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dummy form state (purely presentational: never sent to server)
  const [upiId, setUpiId] = useState("");
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [cardName, setCardName] = useState(buyer.name || "Customer");
  const [selectedBank, setSelectedBank] = useState("hdfc");

  const formattedAmount = (amountPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && status !== "processing") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, status, onClose]);

  if (!isOpen) return null;

  async function handlePay() {
    setStatus("processing");
    setErrorMsg(null);

    // Simulate authentic network latency for authorization
    await new Promise((r) => setTimeout(r, 1200));

    try {
      const res = await settleDemoAction(orderId, outcome);
      if (res.ok) {
        setStatus("success");
        await new Promise((r) => setTimeout(r, 800));
        router.push(res.to);
      } else {
        setStatus("failed");
        setErrorMsg(res.error || "Payment was declined by the simulated bank.");
      }
    } catch {
      setStatus("failed");
      setErrorMsg("An unexpected error occurred during demo payment.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rzp-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 text-slate-800 text-left">
        {/* Prominent Demo Safety Banner */}
        <div className="bg-amber-400 text-slate-950 px-3 py-1.5 text-[11px] font-bold text-center tracking-wide uppercase flex items-center justify-center gap-1.5 border-b border-amber-500/30">
          <span>⚠️</span>
          <span>DEMO CHECKOUT — NO REAL MONEY OR CARD DATA USED</span>
        </div>

        {/* Razorpay Brand Header */}
        <div className="bg-[#0c2340] px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white flex items-center">
                Razorpay
                <span className="text-[10px] font-semibold text-blue-300 border border-blue-400/40 rounded px-1.5 py-0.5 ml-1.5 uppercase">
                  DEMO
                </span>
              </span>
            </div>
            {status !== "processing" && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close checkout modal"
                className="rounded-lg p-1 text-slate-300 hover:text-white hover:bg-white/10 transition text-lg leading-none"
              >
                ✕
              </button>
            )}
          </div>

          <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-3">
            <div>
              <p id="rzp-title" className="text-xs text-slate-300 font-medium">Paying to Tysonpe Store</p>
              <p className="text-sm font-semibold truncate max-w-[240px] text-white">{productTitle}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-300 font-medium">Amount</p>
              <p className="text-lg font-bold text-emerald-400">₹{formattedAmount}</p>
            </div>
          </div>
        </div>

        {/* Modal Body: Processing, Success, Failed, or Method Chooser */}
        {status === "processing" ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-base font-semibold text-slate-800">Processing simulated payment…</p>
            <p className="text-xs text-slate-500">Contacting payment network. Please do not close this window.</p>
          </div>
        ) : status === "success" ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <p className="text-lg font-bold text-slate-800">Payment Successful!</p>
            <p className="text-xs text-slate-500">Redirecting to your order confirmation…</p>
          </div>
        ) : status === "failed" ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-2xl font-bold">
              ✕
            </div>
            <p className="text-lg font-bold text-slate-800">Payment Failed</p>
            <p className="text-xs text-rose-600 font-medium">{errorMsg || "The simulated payment failed."}</p>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Payment Method Tabs */}
            <div className="grid grid-cols-4 border-b border-slate-200 text-xs font-semibold bg-slate-50">
              <button
                type="button"
                onClick={() => setTab("upi")}
                className={`py-3 text-center transition border-b-2 ${
                  tab === "upi" ? "border-blue-600 text-blue-600 bg-white" : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                📱 UPI
              </button>
              <button
                type="button"
                onClick={() => setTab("card")}
                className={`py-3 text-center transition border-b-2 ${
                  tab === "card" ? "border-blue-600 text-blue-600 bg-white" : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                💳 Card
              </button>
              <button
                type="button"
                onClick={() => setTab("netbanking")}
                className={`py-3 text-center transition border-b-2 ${
                  tab === "netbanking" ? "border-blue-600 text-blue-600 bg-white" : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                🏦 Netbanking
              </button>
              <button
                type="button"
                onClick={() => setTab("wallet")}
                className={`py-3 text-center transition border-b-2 ${
                  tab === "wallet" ? "border-blue-600 text-blue-600 bg-white" : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                👛 Wallet
              </button>
            </div>

            {/* Tab Panels */}
            <div className="p-5 space-y-4">
              {tab === "upi" && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-slate-600">Select simulated UPI app:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["gpay", "Google Pay", "🟢"],
                      ["phonepe", "PhonePe", "🟣"],
                      ["paytm", "Paytm", "🔵"],
                    ].map(([id, label, icon]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedUpiApp(id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                          selectedUpiApp === id
                            ? "border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="text-base">{icon}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="relative pt-2">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Or simulated UPI ID
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="username@okhdfcbank"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {tab === "card" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Card Number (Simulated)
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Expiry
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">Card details are purely visual and never transmitted.</p>
                </div>
              )}

              {tab === "netbanking" && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-slate-600">Popular Banks:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["hdfc", "HDFC Bank"],
                      ["sbi", "State Bank of India"],
                      ["icici", "ICICI Bank"],
                      ["axis", "Axis Bank"],
                    ].map(([id, name]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedBank(id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                          selectedBank === id
                            ? "border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tab === "wallet" && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">Select Wallet:</p>
                  {["PhonePe Wallet", "Paytm Balance", "Amazon Pay", "Mobikwik"].map((w, idx) => (
                    <label
                      key={w}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold"
                    >
                      <input type="radio" name="wallet" defaultChecked={idx === 0} className="text-blue-600" />
                      <span>{w}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Simulation Outcome Controls (for Sales Demo) */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Demo Simulation Outcome:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer font-medium transition ${
                      outcome === "success"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 hover:bg-white text-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value="success"
                      checked={outcome === "success"}
                      onChange={() => setOutcome("success")}
                      className="sr-only"
                    />
                    <span>🟢 Success (Default)</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer font-medium transition ${
                      outcome === "failure"
                        ? "border-rose-500 bg-rose-50 text-rose-800"
                        : "border-slate-200 hover:bg-white text-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value="failure"
                      checked={outcome === "failure"}
                      onChange={() => setOutcome("failure")}
                      className="sr-only"
                    />
                    <span>🔴 Bank Failure</span>
                  </label>
                </div>
              </div>

              {/* Action Pay Button */}
              <button
                type="button"
                onClick={handlePay}
                className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 active:bg-blue-800 transition shadow-md shadow-blue-600/20"
              >
                Pay ₹{formattedAmount}
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-200 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <span>🔒 Secured by</span>
          <span className="font-bold text-slate-700 tracking-tight">RAZORPAY DEMO</span>
          <span>• 256-bit SSL</span>
        </div>
      </div>
    </div>
  );
}
