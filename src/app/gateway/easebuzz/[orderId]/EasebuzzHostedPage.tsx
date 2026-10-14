"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { settleEasebuzzDemoAction } from "@/app/actions/checkout";
import {
  AxisBankIcon,
  BankIcon,
  ClockIcon,
  CreditCardIcon,
  GPayIcon,
  HdfcBankIcon,
  IciciBankIcon,
  LockIcon,
  MastercardIcon,
  PaytmIcon,
  PhonePeIcon,
  QrCodeIcon,
  RupayIcon,
  SbiBankIcon,
  ShieldCheckIcon,
  UpiIcon,
  VisaIcon,
  WalletIcon,
} from "@/components/gateway-icons";

interface OrderData {
  id: string;
  providerOrderId: string;
  totalPaise: number;
  subtotalPaise?: number;
  gstPaise?: number;
  product: {
    title: string;
    slug?: string;
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
  const [processingMsg, setProcessingMsg] = useState("Redirecting to your bank authentication portal…");

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

  // Client form dummy states
  const [upiMode, setUpiMode] = useState<"apps" | "qr" | "id">("apps");
  const [selectedApp, setSelectedApp] = useState("gpay");
  const [selectedBank, setSelectedBank] = useState("hdfc");
  const [cardDigits, setCardDigits] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [vpa, setVpa] = useState("");

  async function handleFormSubmit() {
    setIsProcessing(true);
    setProcessingMsg("Contacting Easebuzz authorization switch…");
    await new Promise((r) => setTimeout(r, 600));
    setProcessingMsg("Authenticating simulated payment with issuer bank…");
    await new Promise((r) => setTimeout(r, 600));
    await settleEasebuzzDemoAction(order.id, outcome);
  }

  return (
    <div className="min-h-screen bg-[#071324] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-[#0b1c33]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black tracking-tight text-white flex items-center">
              easebuzz<span className="text-amber-400 text-3xl leading-none">.</span>
            </span>
            <span className="rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 tracking-wider uppercase">
              SANDBOX CHECKOUT
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Live 15-Minute Countdown Timer */}
            <div className="flex items-center gap-2 bg-[#061220] px-3.5 py-1.5 rounded-full border border-white/15 text-xs">
              <ClockIcon className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-slate-400 hidden sm:inline">Expires in:</span>
              <span className={`font-mono font-bold ${secondsLeft < 120 ? "text-rose-400" : "text-amber-300"}`}>
                {timeFormatted}
              </span>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Payable</span>
              <span className="text-base font-extrabold text-emerald-400">₹{formattedAmount}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-[340px_1fr] rounded-[24px] overflow-hidden bg-white text-slate-900 shadow-2xl border border-white/10">
          {/* Left Column: Order Summary & Merchant Details */}
          <div className="bg-[#0b1c33] text-white p-6 sm:p-7 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10">
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Tysonpe Store</span>
                <h1 className="text-lg font-bold text-white mt-1 leading-snug">{order.product.title}</h1>
              </div>

              {/* Price Breakdown */}
              <div className="rounded-xl bg-[#061220]/80 p-4 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Order Reference</span>
                  <span className="font-mono text-[11px] text-white truncate max-w-[130px]">{order.providerOrderId}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Customer</span>
                  <span className="text-white truncate max-w-[130px]">{user.name}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between items-baseline font-bold">
                  <span className="text-sm text-white">Amount Due</span>
                  <span className="text-lg text-emerald-400 font-extrabold">₹{formattedAmount}</span>
                </div>
              </div>

              {/* Trust & Compliance */}
              <div className="space-y-2.5 pt-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>256-Bit SSL Bank Grade Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <LockIcon className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>PCI-DSS Level 1 Compliant Gateway</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10">
              <Link
                href={`/checkout/pay/${order.id}`}
                className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
              >
                <span>← Cancel and return to store</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Payment Methods Interface */}
          <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
            {isProcessing ? (
              <div className="py-16 text-center space-y-5">
                <div className="relative mx-auto w-16 h-16">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-200" />
                  <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LockIcon className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h2 className="text-lg font-bold text-slate-900">{processingMsg}</h2>
                  <p className="text-xs text-slate-500">
                    Communicating with your card/UPI issuer. Please do not close or refresh this browser tab.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Method Navigation Grid */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "upi", name: "UPI / QR", icon: <UpiIcon className="w-5 h-5" /> },
                      { id: "card", name: "Cards", icon: <CreditCardIcon className="w-5 h-5" /> },
                      { id: "netbanking", name: "Net Banking", icon: <BankIcon className="w-5 h-5" /> },
                      { id: "wallet", name: "Wallets", icon: <WalletIcon className="w-5 h-5" /> },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setTab(m.id as typeof tab)}
                        className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                          tab === m.id
                            ? "border-[#0b1c33] bg-[#0b1c33] text-white shadow-md shadow-slate-900/15"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        {m.icon}
                        <span>{m.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Views */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
                  {tab === "upi" && (
                    <div className="space-y-4">
                      {/* Sub-tabs for UPI */}
                      <div className="flex rounded-xl bg-slate-200/70 p-1 text-xs font-semibold text-slate-600">
                        <button
                          type="button"
                          onClick={() => setUpiMode("apps")}
                          className={`flex-1 py-1.5 rounded-lg transition ${
                            upiMode === "apps" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                          }`}
                        >
                          UPI Apps
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpiMode("qr")}
                          className={`flex-1 py-1.5 rounded-lg transition ${
                            upiMode === "qr" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                          }`}
                        >
                          Dynamic QR
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpiMode("id")}
                          className={`flex-1 py-1.5 rounded-lg transition ${
                            upiMode === "id" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                          }`}
                        >
                          Enter VPA
                        </button>
                      </div>

                      {upiMode === "apps" && (
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { id: "gpay", name: "Google Pay", icon: <GPayIcon className="w-6 h-6" /> },
                            { id: "phonepe", name: "PhonePe", icon: <PhonePeIcon className="w-6 h-6" /> },
                            { id: "paytm", name: "Paytm", icon: <PaytmIcon className="w-8 h-4" /> },
                          ].map((app) => (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => setSelectedApp(app.id)}
                              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-2 transition ${
                                selectedApp === app.id
                                  ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-600"
                                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              {app.icon}
                              <span className="text-[11px] truncate w-full text-center">{app.name}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {upiMode === "qr" && (
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                          <div className="p-2 border border-slate-200 rounded-lg shadow-xs">
                            <QrCodeIcon className="w-24 h-24 text-slate-800" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700">Scan & Pay using any UPI Application</p>
                        </div>
                      )}

                      {upiMode === "id" && (
                        <div className="space-y-1.5">
                          <label htmlFor="eb-vpa" className="text-xs font-semibold text-slate-700 block">
                            Virtual Payment Address (VPA)
                          </label>
                          <input
                            id="eb-vpa"
                            type="text"
                            value={vpa}
                            onChange={(e) => setVpa(e.target.value)}
                            placeholder="mobile-number@upi"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {tab === "card" && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label htmlFor="eb-card-num" className="text-[11px] font-bold text-slate-600 uppercase">
                            Card Number
                          </label>
                          <div className="flex gap-1.5">
                            <VisaIcon className="w-6 h-3.5" />
                            <MastercardIcon className="w-5 h-3.5" />
                            <RupayIcon className="w-6 h-3.5" />
                          </div>
                        </div>
                        <input
                          id="eb-card-num"
                          type="text"
                          value={cardDigits}
                          onChange={(e) => setCardDigits(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="eb-card-exp" className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                            Expiry (MM/YY)
                          </label>
                          <input
                            id="eb-card-exp"
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/YY"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono focus:border-emerald-600 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label htmlFor="eb-card-cvv" className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                            CVV
                          </label>
                          <input
                            id="eb-card-cvv"
                            type="text"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="123"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono focus:border-emerald-600 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="eb-card-holder" className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                          Cardholder Name
                        </label>
                        <input
                          id="eb-card-holder"
                          type="text"
                          defaultValue={user.name}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  )}

                  {tab === "netbanking" && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-700">Select Net Banking Provider:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "hdfc", name: "HDFC Bank", icon: <HdfcBankIcon className="w-5 h-5" /> },
                          { id: "sbi", name: "State Bank of India", icon: <SbiBankIcon className="w-5 h-5" /> },
                          { id: "icici", name: "ICICI Bank", icon: <IciciBankIcon className="w-5 h-5" /> },
                          { id: "axis", name: "Axis Bank", icon: <AxisBankIcon className="w-5 h-5" /> },
                        ].map((bank) => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => setSelectedBank(bank.id)}
                            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition ${
                              selectedBank === bank.id
                                ? "border-emerald-600 bg-emerald-50/60 text-emerald-900 ring-2 ring-emerald-600"
                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            {bank.icon}
                            <span className="truncate">{bank.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === "wallet" && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700">Digital Wallets:</p>
                      {[
                        { name: "Paytm Wallet", icon: <PaytmIcon className="w-6 h-3" /> },
                        { name: "PhonePe Wallet", icon: <PhonePeIcon className="w-5 h-5" /> },
                        { name: "Mobikwik", icon: <WalletIcon className="w-5 h-5 text-indigo-600" /> },
                      ].map((w, idx) => (
                        <label
                          key={w.name}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold"
                        >
                          <div className="flex items-center gap-3">
                            {w.icon}
                            <span>{w.name}</span>
                          </div>
                          <input type="radio" name="eb_wallets" defaultChecked={idx === 0} className="text-emerald-600" />
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Developer Sandbox Outcome Control */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Easebuzz Sandbox Outcome
                    </span>
                    <span className="text-[10px] text-slate-400">HTTP 303 Redirect Flow</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setOutcome("success")}
                      className={`p-2 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition ${
                        outcome === "success"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>✓ Success</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutcome("failure")}
                      className={`p-2 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition ${
                        outcome === "failure"
                          ? "border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-500"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>✕ Decline</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutcome("cancel")}
                      className={`p-2 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition ${
                        outcome === "cancel"
                          ? "border-amber-500 bg-amber-50 text-amber-800 ring-1 ring-amber-500"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>⤺ Cancel</span>
                    </button>
                  </div>
                </div>

                {/* Pay Action Button */}
                <div className="space-y-3">
                  <form action={handleFormSubmit}>
                    <button
                      type="submit"
                      disabled={secondsLeft <= 0}
                      className="w-full py-4 rounded-xl bg-emerald-600 text-white font-extrabold text-base hover:bg-emerald-700 active:bg-emerald-800 transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <LockIcon className="w-5 h-5" />
                      <span>Pay ₹{formattedAmount}</span>
                    </button>
                  </form>

                  <div className="text-center">
                    <form action={settleEasebuzzDemoAction.bind(null, order.id, "cancel")}>
                      <button
                        type="submit"
                        className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
                      >
                        Cancel transaction and return to store
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
              <span>Secured by Easebuzz Payment Gateway</span>
              <span>PCI-DSS Level 1 Certified</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
