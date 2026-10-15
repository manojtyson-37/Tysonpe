"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { settleDemoAction } from "@/app/actions/checkout";
import {
  AxisBankIcon,
  BankIcon,
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
} from "./gateway-icons";

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
  const [processingStep, setProcessingStep] = useState("Connecting to bank authorization gateway…");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Simulated visual states (purely presentational: never sent to server)
  const [upiMode, setUpiMode] = useState<"apps" | "qr" | "id">("apps");
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("4111 •••• •••• 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("•••");
  const [cardName, setCardName] = useState(buyer.name || "Customer");
  const [selectedBank, setSelectedBank] = useState("hdfc");

  const formattedAmount = (amountPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
    setProcessingStep("Connecting to payment network…");

    await new Promise((r) => setTimeout(r, 650));
    setProcessingStep("Authorizing simulated transaction with bank…");

    await new Promise((r) => setTimeout(r, 650));

    try {
      const res = await settleDemoAction(orderId, outcome);
      if (res.ok) {
        setStatus("success");
        setProcessingStep("Payment Approved! Enrolling you now…");
        await new Promise((r) => setTimeout(r, 800));
        router.push(res.to);
      } else {
        setStatus("failed");
        setErrorMsg(res.error || "Transaction was declined by the simulated bank (Error 05: Do Not Honor).");
      }
    } catch {
      setStatus("failed");
      setErrorMsg("An unexpected network error occurred during demo payment.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rzp-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-[490px] overflow-hidden rounded-[24px] bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-slate-200/80 text-slate-800 text-left">
        {/* Header Bar */}
        <div className="bg-[#0b1c33] text-white p-5 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-black tracking-tight text-white font-sans flex items-center">
                Razorpay
              </span>
              <span className="rounded-full bg-amber-400/15 border border-amber-400/35 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                SANDBOX
              </span>
            </div>

            {status !== "processing" && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close payment modal"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition flex items-center justify-center text-sm"
              >
                ✕
              </button>
            )}
          </div>

          <div className="relative z-10 mt-4 flex items-baseline justify-between border-t border-white/10 pt-3.5">
            <div>
              <p className="text-[11px] font-medium text-slate-400 tracking-wide uppercase">Merchant</p>
              <h2 id="rzp-modal-title" className="text-sm font-semibold text-white truncate max-w-[240px]">
                {productTitle}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium text-slate-400 tracking-wide uppercase">Amount to pay</p>
              <p className="text-xl font-extrabold text-emerald-400 tracking-tight">₹{formattedAmount}</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        {status === "processing" ? (
          <div className="p-10 text-center space-y-5">
            <div className="relative mx-auto w-16 h-16">
              <div className="w-16 h-16 rounded-full border-4 border-blue-100" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <LockIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">{processingStep}</h3>
              <p className="text-xs text-slate-500">Secure end-to-end simulated transaction. Please wait.</p>
            </div>
          </div>
        ) : status === "success" ? (
          <div className="p-10 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-emerald-500/30 animate-in zoom-in-75 duration-300">
              ✓
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900">Payment Successful!</h3>
              <p className="text-xs text-slate-500 font-medium">Redirecting to order confirmation and receipt…</p>
            </div>
          </div>
        ) : status === "failed" ? (
          <div className="p-8 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-3xl font-bold">
              ✕
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">Payment Declined</h3>
              <p className="text-xs text-rose-600 font-medium px-4">{errorMsg}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Payment Method Tabs */}
            <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setTab("upi")}
                className={`py-3 px-1 flex flex-col items-center gap-1.5 border-b-2 transition ${
                  tab === "upi"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                <UpiIcon className="w-5 h-5" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setTab("card")}
                className={`py-3 px-1 flex flex-col items-center gap-1.5 border-b-2 transition ${
                  tab === "card"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                <CreditCardIcon className="w-5 h-5" />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => setTab("netbanking")}
                className={`py-3 px-1 flex flex-col items-center gap-1.5 border-b-2 transition ${
                  tab === "netbanking"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                <BankIcon className="w-5 h-5" />
                <span>Netbanking</span>
              </button>

              <button
                type="button"
                onClick={() => setTab("wallet")}
                className={`py-3 px-1 flex flex-col items-center gap-1.5 border-b-2 transition ${
                  tab === "wallet"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                <WalletIcon className="w-5 h-5" />
                <span>Wallet</span>
              </button>
            </div>

            {/* Tab Panel */}
            <div className="p-5 space-y-4">
              {tab === "upi" && (
                <div className="space-y-4">
                  {/* UPI Mode Switcher */}
                  <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
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
                      Scan QR Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiMode("id")}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        upiMode === "id" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                      }`}
                    >
                      Enter UPI ID
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
                          onClick={() => setSelectedUpiApp(app.id)}
                          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-2 transition ${
                            selectedUpiApp === app.id
                              ? "border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600 shadow-xs"
                              : "border-slate-200 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          {app.icon}
                          <span className="text-[11px] truncate w-full text-center">{app.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {upiMode === "qr" && (
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                      <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
                        <QrCodeIcon className="w-28 h-28 text-slate-800" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-800">Scan with any UPI App</p>
                        <p className="text-[11px] text-slate-500">Google Pay, PhonePe, Paytm, or BHIM</p>
                      </div>
                    </div>
                  )}

                  {upiMode === "id" && (
                    <div className="space-y-1.5">
                      <label htmlFor="rzp-upi-id" className="text-xs font-semibold text-slate-700 block">
                        Enter UPI Virtual Payment Address (VPA)
                      </label>
                      <input
                        id="rzp-upi-id"
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@okhdfcbank"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                      <p className="text-[11px] text-slate-500">A payment collect request will be simulated.</p>
                    </div>
                  )}
                </div>
              )}

              {tab === "card" && (
                <div className="space-y-3.5">
                  {/* Card Visual Preview */}
                  <div className="rounded-xl p-3.5 bg-gradient-to-r from-slate-900 to-blue-950 text-white shadow-sm flex flex-col justify-between h-28 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] tracking-widest text-slate-300 font-mono">SIMULATED CARD</span>
                      <div className="flex gap-1.5">
                        <VisaIcon className="w-7 h-4" />
                        <MastercardIcon className="w-6 h-4" />
                        <RupayIcon className="w-7 h-4" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-mono tracking-widest text-white/90">{cardNumber}</p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-300">
                        <span className="truncate max-w-[180px] uppercase font-medium">{cardName}</span>
                        <span className="font-mono">{cardExpiry}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label htmlFor="rzp-card-num" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                        Card Number
                      </label>
                      <input
                        id="rzp-card-num"
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label htmlFor="rzp-card-exp" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Expiry
                        </label>
                        <input
                          id="rzp-card-exp"
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label htmlFor="rzp-card-cvv" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          CVV
                        </label>
                        <input
                          id="rzp-card-cvv"
                          type="text"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="123"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="rzp-card-name" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                        Cardholder Name
                      </label>
                      <input
                        id="rzp-card-name"
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {tab === "netbanking" && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-700">Select Bank:</p>
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
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition ${
                          selectedBank === bank.id
                            ? "border-blue-600 bg-blue-50/60 text-blue-900 ring-2 ring-blue-600 shadow-xs"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        {bank.icon}
                        <span className="truncate">{bank.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-1">
                    <label htmlFor="rzp-other-banks" className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Or Other Popular Banks
                    </label>
                    <select
                      id="rzp-other-banks"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-hidden bg-white"
                    >
                      <option>Kotak Mahindra Bank</option>
                      <option>Punjab National Bank</option>
                      <option>Bank of Baroda</option>
                      <option>IndusInd Bank</option>
                      <option>Yes Bank</option>
                    </select>
                  </div>
                </div>
              )}

              {tab === "wallet" && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700">Supported Digital Wallets:</p>
                  {[
                    { name: "PhonePe Wallet", icon: <PhonePeIcon className="w-5 h-5" /> },
                    { name: "Paytm Balance", icon: <PaytmIcon className="w-7 h-3.5" /> },
                    { name: "Mobikwik", icon: <WalletIcon className="w-5 h-5 text-ink" /> },
                  ].map((w, idx) => (
                    <label
                      key={w.name}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold"
                    >
                      <div className="flex items-center gap-3">
                        {w.icon}
                        <span>{w.name}</span>
                      </div>
                      <input type="radio" name="rzp_wallet" defaultChecked={idx === 0} className="text-blue-600" />
                    </label>
                  ))}
                </div>
              )}

              {/* Developer Sandbox Simulation Strip */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600" />
                    Simulation Sandbox Outcome
                  </span>
                  <span className="text-[10px] text-slate-400">Sales Demo Mode</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setOutcome("success")}
                    className={`py-1.5 px-2.5 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition ${
                      outcome === "success"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs ring-1 ring-emerald-500"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>✓ Simulate Success</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcome("failure")}
                    className={`py-1.5 px-2.5 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition ${
                      outcome === "failure"
                        ? "border-rose-500 bg-rose-50 text-rose-800 shadow-xs ring-1 ring-rose-500"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>✕ Simulate Decline</span>
                  </button>
                </div>
              </div>

              {/* Pay Button */}
              <button
                type="button"
                onClick={handlePay}
                className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 active:bg-blue-800 transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
              >
                <LockIcon className="w-4 h-4" />
                <span>Pay ₹{formattedAmount}</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-bit SSL Secure</span>
          </div>
          <div>
            <span>Secured by <strong className="text-slate-800 font-bold">RAZORPAY DEMO</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
