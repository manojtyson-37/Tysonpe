"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  settleDemoAction,
  submitUpiPaymentForVerificationAction,
  verifyUpiPaymentAction,
} from "@/app/actions/checkout";
import { buildUpiUri, generateQrSvg } from "@/lib/payments/qr";
import type { GatewayId } from "@/lib/payments/gateways";
import {
  BhimIcon,
  ClockIcon,
  CredIcon,
  GPayIcon,
  LockIcon,
  PaytmIcon,
  PhonePeIcon,
  ShieldCheckIcon,
  UpiIcon,
} from "./gateway-icons";
import { RazorpayDemoModal } from "./RazorpayDemoModal";

interface DemoPayPageClientProps {
  orderId: string;
  amountPaise: number;
  productTitle: string;
  initialGateway: GatewayId;
  buyer: { name: string; email: string };
  failed?: boolean;
  creatorUpiId?: string;
}

export function DemoPayPageClient({
  orderId,
  amountPaise,
  productTitle,
  initialGateway: _initialGateway,
  buyer,
  failed,
  creatorUpiId,
}: DemoPayPageClientProps) {
  const router = useRouter();
  const [method, setMethod] = useState<"upi" | "razorpay" | "easebuzz">("upi");
  const [isRzpModalOpen, setIsRzpModalOpen] = useState(false);
  const [phone, setPhone] = useState("9876543210");
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStage, setVerifyStage] = useState<string | null>(null);
  const [utr, setUtr] = useState("");
  const [utrError, setUtrError] = useState<string | null>(null);

  const formattedAmount = (amountPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const vpaHandle = creatorUpiId?.trim() || "7619671728@ybl";
  const upiUri = buildUpiUri({
    payeeAddress: vpaHandle,
    payeeName: "Asha Rao",
    amountInRupees: amountPaise / 100,
    transactionNote: `Tysonpe Order ${orderId.slice(-6)}`,
    currency: "INR",
  });

  const qrSvg = generateQrSvg(upiUri, 220);

  function handleCopyVpa() {
    navigator.clipboard.writeText(vpaHandle);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  }

  async function handleVerifyUpi(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanUtr = utr.trim().replace(/\s+/g, "");
    if (!cleanUtr) {
      setUtrError("Please enter the 12-digit UPI Reference Number (UTR) from your payment receipt.");
      return;
    }
    if (!/^\d{12}$/.test(cleanUtr)) {
      setUtrError("UTR must be exactly 12 numeric digits (e.g. 428910293847). Check your UPI receipt.");
      return;
    }

    setUtrError(null);
    setIsVerifying(true);
    setVerifyStage("Validating 12-digit UTR format…");

    await new Promise((r) => setTimeout(r, 500));
    setVerifyStage(`Recording transfer to ${vpaHandle}…`);

    try {
      const res = await submitUpiPaymentForVerificationAction(orderId, cleanUtr);
      if (res.ok) {
        setVerifyStage("Payment submitted! Opening verification status…");
        await new Promise((r) => setTimeout(r, 400));
        router.push(res.to);
      } else {
        setUtrError(res.error || "Submission failed. Please check the UTR and try again.");
        setIsVerifying(false);
        setVerifyStage(null);
      }
    } catch {
      setUtrError("Network or submission error. Please retry.");
      setIsVerifying(false);
      setVerifyStage(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Payment Method Switcher Tabs */}
      <div className="flex rounded-2xl bg-surface-2 p-1.5 border border-line text-xs font-bold text-muted">
        <button
          type="button"
          onClick={() => setMethod("upi")}
          className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
            method === "upi"
              ? "bg-surface text-ink shadow-sm ring-1 ring-line"
              : "hover:text-ink hover:bg-surface/50"
          }`}
        >
          <UpiIcon className="w-4 h-4 text-emerald-600" />
          <span>Direct UPI & QR</span>
          <span className="rounded-full bg-emerald-500/15 text-emerald-700 px-1.5 py-0.2 text-[10px] font-extrabold uppercase">
            0% Fee
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMethod("razorpay")}
          className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
            method === "razorpay"
              ? "bg-surface text-ink shadow-sm ring-1 ring-line"
              : "hover:text-ink hover:bg-surface/50"
          }`}
        >
          <span className="font-sans font-black text-blue-600">Razorpay</span>
          <span className="hidden sm:inline text-muted font-normal text-[11px]">Modal</span>
        </button>

        <button
          type="button"
          onClick={() => setMethod("easebuzz")}
          className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
            method === "easebuzz"
              ? "bg-surface text-ink shadow-sm ring-1 ring-line"
              : "hover:text-ink hover:bg-surface/50"
          }`}
        >
          <span className="font-sans font-bold text-amber-600">Easebuzz</span>
          <span className="hidden sm:inline text-muted font-normal text-[11px]">Page</span>
        </button>
      </div>

      {/* 1. Direct UPI Mode (Front & Center) */}
      {method === "upi" && (
        <div className="rounded-[24px] border border-line bg-surface p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-line">
            <div>
              <span className="badge badge-brand text-[10px] font-extrabold uppercase tracking-widest mb-1.5">
                Instant UPI Settlement
              </span>
              <h2 className="text-xl font-bold text-ink font-display">
                Scan & Pay ₹{formattedAmount}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Scan with any UPI app on your phone or tap below to launch.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PhonePeIcon className="w-5 h-5" />
              <GPayIcon className="w-5 h-5" />
              <PaytmIcon className="w-7 h-4" />
              <CredIcon className="w-5 h-5" />
              <BhimIcon className="w-5 h-5" />
            </div>
          </div>

          {/* Genuine Vector QR Display Card */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-surface-2 border border-line space-y-4">
            <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200/80 flex items-center justify-center">
              <div
                className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>

            {/* VPA Handle with Copy */}
            <div className="w-full max-w-sm flex items-center justify-between p-3 rounded-xl bg-white border border-line shadow-2xs text-xs">
              <div className="truncate px-1 font-mono text-ink text-left">
                <span className="text-[10px] text-muted block uppercase font-sans font-semibold">
                  Receiving UPI ID (VPA)
                </span>
                <span className="font-bold text-sm tracking-tight">{vpaHandle}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyVpa}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-[0.98] ${
                  copiedVpa
                    ? "bg-good text-white"
                    : "bg-surface-2 text-ink hover:bg-line"
                }`}
              >
                {copiedVpa ? "Copied!" : "Copy VPA"}
              </button>
            </div>

            {/* Direct Mobile Intent Launch Button */}
            <a
              href={upiUri}
              className="w-full max-w-sm py-3 px-4 text-center rounded-xl bg-brand hover:bg-brand-hover text-brand-ink font-bold text-sm shadow-md shadow-brand/20 transition active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <LockIcon className="w-4 h-4" />
              <span>Tap to Pay ₹{formattedAmount} via UPI App</span>
            </a>
            <p className="text-[11px] text-muted text-center max-w-xs">
              Opens PhonePe, Google Pay, Paytm, or BHIM directly with payee and ₹{formattedAmount} pre-filled.
            </p>
          </div>

          {/* Step 2: UTR Verification Section */}
          <div className="pt-4 border-t border-line space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="upi-utr-input" className="text-xs font-bold text-ink">
                  Step 2: Enter 12-Digit UPI Reference / UTR
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = `4289${Math.floor(10000000 + Math.random() * 90000000)}`;
                    setUtr(sample);
                    setUtrError(null);
                  }}
                  className="text-[11px] text-brand hover:underline font-semibold"
                >
                  Fill Sample UTR
                </button>
              </div>
              <div className="relative">
                <input
                  id="upi-utr-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={utr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                    setUtr(val);
                    if (utrError) setUtrError(null);
                  }}
                  placeholder="e.g. 428912345678"
                  className={`input font-mono text-base tracking-widest pl-3 ${
                    utrError ? "border-bad ring-1 ring-bad" : ""
                  }`}
                  disabled={isVerifying}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted">
                  {utr.length}/12
                </span>
              </div>
              {utrError ? (
                <p className="mt-1.5 text-xs font-semibold text-bad flex items-center gap-1">
                  <span>⚠</span> {utrError}
                </p>
              ) : (
                <p className="hint text-[11px] mt-1 text-muted">
                  Look for &ldquo;UPI Ref No.&rdquo; or &ldquo;UTR&rdquo; in Google Pay, PhonePe, or Paytm receipt after paying ₹{formattedAmount}.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleVerifyUpi}
              disabled={isVerifying || utr.length !== 12}
              className={`btn btn-primary btn-lg w-full flex items-center justify-center gap-2 shadow-lg transition ${
                utr.length === 12
                  ? "shadow-good/20 bg-brand hover:bg-brand-hover text-brand-ink"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              {isVerifying ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>{verifyStage || "Submitting to Creator…"}</span>
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="w-5 h-5" />
                  <span>Submit Payment &amp; UTR for Verification (₹{formattedAmount})</span>
                </>
              )}
            </button>

            {/* Explainer Callout */}
            <div className="p-3.5 rounded-xl bg-surface-2 border border-line text-[11px] text-muted space-y-1.5 leading-relaxed">
              <p className="font-semibold text-ink flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>How Direct UPI Verification Works</span>
              </p>
              <p>
                1. Transfer ₹{formattedAmount} to <code className="font-mono text-ink font-semibold">{vpaHandle}</code> via your UPI app.<br />
                2. Enter your 12-digit UTR from your bank receipt and click Submit.<br />
                3. The creator checks their bank account / PhonePe and activates your course access immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Razorpay Modal View */}
      {method === "razorpay" && (
        <div className="space-y-4 pt-2">
          <div className="card p-6 text-center space-y-4">
            <h3 className="font-bold text-base text-ink">Simulated Razorpay Modal Checkout</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              Opens Razorpay standard pop-up overlay with UPI QR, cards, netbanking, and simulated bank outcomes.
            </p>
            <button
              type="button"
              onClick={() => setIsRzpModalOpen(true)}
              className="btn btn-primary btn-lg w-full max-w-md mx-auto flex items-center justify-center gap-2 shadow-lg shadow-brand/20 hover:shadow-xl transition"
            >
              <LockIcon className="w-4 h-4" />
              <span>Launch Razorpay Modal (₹{formattedAmount})</span>
            </button>
          </div>

          <RazorpayDemoModal
            isOpen={isRzpModalOpen}
            onClose={() => setIsRzpModalOpen(false)}
            orderId={orderId}
            amountPaise={amountPaise}
            productTitle={productTitle}
            buyer={buyer}
            creatorUpiId={vpaHandle}
          />
        </div>
      )}

      {/* 3. Easebuzz View */}
      {method === "easebuzz" && (
        <div className="card p-6 space-y-4">
          <div>
            <label htmlFor="eb-phone-num" className="label text-xs font-bold text-ink">
              Buyer Phone Number (Gateway Pre-requisite)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
                +91
              </span>
              <input
                id="eb-phone-num"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="input pl-11 font-mono text-sm"
              />
            </div>
            <p className="hint text-[11px]">Pre-filled for rapid simulation testing.</p>
          </div>

          <Link
            href={`/gateway/easebuzz/${orderId}`}
            className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2 shadow-lg shadow-brand/20 hover:shadow-xl transition"
          >
            <LockIcon className="w-4 h-4" />
            <span>Proceed to Easebuzz Payment Page →</span>
          </Link>
          <p className="text-center text-xs text-muted flex items-center justify-center gap-1.5">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-good" />
            <span>Redirects to Easebuzz hosted page with 15-minute live expiration timer.</span>
          </p>
        </div>
      )}

      {failed && (
        <div className="rounded-2xl bg-bad-soft p-4 text-xs text-bad font-medium border border-bad/20">
          <p className="font-bold">Payment Attempt Incomplete</p>
          <p className="mt-0.5">The previous transaction was declined or cancelled. No funds were debited. You can retry with any method above.</p>
        </div>
      )}
    </div>
  );
}
