"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { settleEasebuzzDemoAction } from "@/app/actions/checkout";

interface OrderData {
  id: string;
  providerOrderId: string;
  totalPaise: number;
  product: {
    title: string;
  };
}

interface UserData {
  name: string;
  email: string;
}

export function EasebuzzHostedPage({
  order,
  user,
}: {
  order: OrderData;
  user: UserData;
}) {
  const [tab, setTab] = useState<"upi" | "card" | "netbanking" | "wallet">("upi");
  const [outcome, setOutcome] = useState<"success" | "failure" | "cancel">("success");
  const [isProcessing, setIsProcessing] = useState(false);

  // 15-minute countdown timer (starts at 900 seconds)
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const formattedAmount = (order.totalPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Client dummy state for forms (purely visual)
  const [selectedApp, setSelectedApp] = useState("gpay");
  const [selectedBank, setSelectedBank] = useState("hdfc");
  const [cardDigits, setCardDigits] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");

  return (
    <div className="min-h-screen bg-[#f1f3f7] text-slate-800 flex flex-col font-sans">
      {/* Top Demo Safety Notice */}
      <div className="bg-amber-400 text-slate-950 px-4 py-2 text-xs font-bold text-center tracking-wide uppercase flex items-center justify-center gap-2 border-b border-amber-500 shadow-xs">
        <span className="text-base leading-none">⚠️</span>
        <span>DEMO CHECKOUT ENVIRONMENT — NO REAL CARD, UPI OR BANK MONEY INVOLVED</span>
      </div>

      {/* Main Container */}
      <div className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Easebuzz Dark Navy Header */}
          <header className="bg-[#0c2340] text-white p-6 relative">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black tracking-tight text-white flex items-center">
                  easebuzz<span className="text-amber-400 text-3xl leading-none">.</span>
                </span>
                <span className="rounded-md bg-white/10 border border-white/20 px-2 py-0.5 text-[11px] font-semibold text-slate-200 uppercase">
                  SIMULATED GATEWAY
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-300 block">Total Payable</span>
                <span className="text-2xl font-bold text-emerald-400">₹{formattedAmount}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
              <div>
                <p>
                  <strong className="text-white">Merchant:</strong> Tysonpe Store
                </p>
                <p className="mt-0.5">
                  <strong className="text-white">Order:</strong> {order.product.title}
                </p>
              </div>
              <div className="text-right font-mono">
                <p>
                  <strong className="text-white">Tr ID:</strong> {order.providerOrderId}
                </p>
                <p className="mt-0.5">
                  <strong className="text-white">Customer:</strong> {user.name} ({user.email})
                </p>
              </div>
            </div>

            {/* 15-Minute Link Timer Strip */}
            <div className="mt-4 -mx-6 -mb-6 bg-[#07172b] px-6 py-2.5 flex items-center justify-between text-xs border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300">Payment link expires in:</span>
                <span className={`font-mono font-bold text-sm ${secondsLeft < 120 ? "text-rose-400" : "text-amber-400"}`}>
                  {timeFormatted}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">15-minute secure session</span>
            </div>
          </header>

          {/* Payment Interface Grid: Sidebar + Details */}
          {isProcessing ? (
            <div className="p-16 text-center space-y-4">
              <div className="mx-auto w-14 h-14 border-4 border-[#0c2340] border-t-transparent rounded-full animate-spin" />
              <h2 className="text-xl font-bold text-slate-800">Processing Payment…</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Securely communicating with bank authorization servers. Please do not refresh or hit the back button.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] min-h-[420px]">
              {/* Method Sidebar */}
              <aside className="border-r border-slate-200 bg-slate-50/70 p-3 space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase px-3 py-2 tracking-wider">Payment Options</p>
                {[
                  ["upi", "UPI / QR", "📱"],
                  ["card", "Cards (Credit/Debit)", "💳"],
                  ["netbanking", "Net Banking", "🏦"],
                  ["wallet", "Wallets", "👛"],
                ].map(([id, label, icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id as typeof tab)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-semibold text-left transition ${
                      tab === id
                        ? "bg-[#0c2340] text-white shadow-xs"
                        : "text-slate-700 hover:bg-slate-200/60"
                    }`}
                  >
                    <span className="text-base">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}

                <div className="pt-6 px-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-500">
                    <p className="font-semibold text-slate-700 mb-1">Easebuzz Hosted</p>
                    <p>Authentic full-page redirect simulation. Completes via 303 HTTP return.</p>
                  </div>
                </div>
              </aside>

              {/* Method Content Panel */}
              <main className="p-6 flex flex-col justify-between space-y-6">
                <div>
                  {tab === "upi" && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-base text-slate-800">Pay via Instant UPI</h3>
                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          ["gpay", "Google Pay", "🟢"],
                          ["phonepe", "PhonePe", "🟣"],
                          ["paytm", "Paytm", "🔵"],
                        ].map(([id, name, badge]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setSelectedApp(id)}
                            className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                              selectedApp === id
                                ? "border-[#0c2340] bg-slate-100 text-[#0c2340] ring-1 ring-[#0c2340]"
                                : "border-slate-200 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span className="text-xl">{badge}</span>
                            <span>{name}</span>
                          </button>
                        ))}
                      </div>

                      <div className="pt-2">
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Or Enter Virtual Payment Address (VPA)</label>
                        <input
                          type="text"
                          placeholder="e.g. mobile@upi or name@bank"
                          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#0c2340] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  )}

                  {tab === "card" && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-base text-slate-800">Card Payment (Simulated)</h3>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Card Number</label>
                        <input
                          type="text"
                          value={cardDigits}
                          onChange={(e) => setCardDigits(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono focus:border-[#0c2340] focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">Expiry Date</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/YY"
                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono focus:border-[#0c2340] focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">CVV</label>
                          <input
                            type="text"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="123"
                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono focus:border-[#0c2340] focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Name on Card</label>
                        <input
                          type="text"
                          defaultValue={user.name}
                          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#0c2340] focus:outline-hidden"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">Supports Visa, MasterCard, RuPay and Maestro demo cards.</p>
                    </div>
                  )}

                  {tab === "netbanking" && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-base text-slate-800">Internet Banking</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          ["hdfc", "HDFC Bank"],
                          ["sbi", "State Bank of India"],
                          ["icici", "ICICI Bank"],
                          ["axis", "Axis Bank"],
                          ["kotak", "Kotak Bank"],
                          ["bob", "Bank of Baroda"],
                        ].map(([id, name]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setSelectedBank(id)}
                            className={`p-3 rounded-xl border text-xs font-semibold text-left transition ${
                              selectedBank === id
                                ? "border-[#0c2340] bg-slate-100 text-[#0c2340] ring-1 ring-[#0c2340]"
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
                    <div className="space-y-3">
                      <h3 className="font-bold text-base text-slate-800">Select Digital Wallet</h3>
                      {["Paytm Wallet", "PhonePe Wallet", "Mobikwik", "Airtel Money"].map((w, idx) => (
                        <label
                          key={w}
                          className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold"
                        >
                          <input type="radio" name="eb_wallet" defaultChecked={idx === 0} className="text-[#0c2340]" />
                          <span>{w}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Simulation Control Bar */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Demo Simulation Outcome:
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <label
                      className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer font-medium transition ${
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
                      <span>🟢 Success</span>
                    </label>
                    <label
                      className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer font-medium transition ${
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
                      <span>🔴 Failure</span>
                    </label>
                    <label
                      className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer font-medium transition ${
                        outcome === "cancel"
                          ? "border-amber-500 bg-amber-50 text-amber-800"
                          : "border-slate-200 hover:bg-white text-slate-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="outcome"
                        value="cancel"
                        checked={outcome === "cancel"}
                        onChange={() => setOutcome("cancel")}
                        className="sr-only"
                      />
                      <span>🟡 Cancel</span>
                    </label>
                  </div>
                </div>

                {/* Pay Action Form */}
                <div className="space-y-3">
                  <form
                    action={async () => {
                      setIsProcessing(true);
                      await new Promise((r) => setTimeout(r, 1200));
                      await settleEasebuzzDemoAction(order.id, outcome);
                    }}
                  >
                    <button
                      type="submit"
                      disabled={secondsLeft <= 0}
                      className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 active:bg-emerald-800 transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                    >
                      Pay ₹{formattedAmount}
                    </button>
                  </form>

                  <div className="text-center">
                    <form action={settleEasebuzzDemoAction.bind(null, order.id, "cancel")}>
                      <button
                        type="submit"
                        className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                      >
                        Cancel transaction and return to Tysonpe
                      </button>
                    </form>
                  </div>
                </div>
              </main>
            </div>
          )}

          {/* Easebuzz Hosted Footer */}
          <footer className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
            <div className="flex items-center gap-1.5">
              <span>🔒 256-Bit SSL Encrypted</span>
              <span>•</span>
              <span>PCI-DSS Level 1 Certified Demo</span>
            </div>
            <div>
              <span>Secured by <strong className="text-slate-700">Easebuzz Simulated Checkout</strong></span>
            </div>
          </footer>
        </div>

        <div className="mt-4 text-center">
          <Link href={`/checkout/pay/${order.id}`} className="text-xs text-slate-500 hover:text-slate-800 underline">
            ← Return to Tysonpe checkout options
          </Link>
        </div>
      </div>
    </div>
  );
}
