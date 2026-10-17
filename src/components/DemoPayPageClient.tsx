"use client";

import Link from "next/link";
import { useState } from "react";
import { GATEWAYS, type GatewayId } from "@/lib/payments/gateways";
import {
  ClockIcon,
  GPayIcon,
  LockIcon,
  MastercardIcon,
  PaytmIcon,
  PhonePeIcon,
  ShieldCheckIcon,
  UpiIcon,
  VisaIcon,
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
  initialGateway,
  buyer,
  failed,
  creatorUpiId,
}: DemoPayPageClientProps) {
  const [activeGw, setActiveGw] = useState<GatewayId>(initialGateway);
  const [isRzpModalOpen, setIsRzpModalOpen] = useState(false);
  const [phone, setPhone] = useState("9876543210");

  const formattedAmount = (amountPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-6">
      {/* Sandbox Indicator Strip */}
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 text-xs text-amber-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="uppercase tracking-wider text-[11px]">Gateway Simulation Environment</span>
          </div>
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            Safe Mode
          </span>
        </div>
        <p className="mt-1 text-muted text-[11px] leading-relaxed">
          Demonstration mode active. Zero real currency or credentials required. Select your preferred checkout gateway below.
        </p>
      </div>

      {/* Gateway Switcher Cards */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-2.5">
          Choose Payment Experience
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GATEWAYS.map((gw) => {
            const isSelected = activeGw === gw.id;
            return (
              <button
                key={gw.id}
                type="button"
                onClick={() => setActiveGw(gw.id)}
                className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                  isSelected
                    ? "border-brand bg-brand-soft/70 ring-2 ring-brand shadow-sm shadow-brand/10"
                    : "border-line bg-surface hover:bg-surface-2"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-ink">{gw.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isSelected
                          ? "bg-brand text-brand-ink"
                          : "bg-surface-2 text-muted"
                      }`}
                    >
                      {gw.id === "razorpay" ? "Popup Modal" : "Hosted Page"}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1.5 leading-relaxed">{gw.blurb}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-[11px]">
                  {gw.id === "razorpay" ? (
                    <div className="flex items-center gap-1.5 opacity-80">
                      <UpiIcon className="w-4 h-4" />
                      <GPayIcon className="w-4 h-4" />
                      <PhonePeIcon className="w-4 h-4" />
                      <PaytmIcon className="w-6 h-3" />
                      <VisaIcon className="w-5 h-3" />
                      <MastercardIcon className="w-5 h-3" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-muted">
                      <ClockIcon className="w-3.5 h-3.5 text-amber-500" />
                      <span>15-min session timer</span>
                    </div>
                  )}
                  <span className={`font-bold text-xs ${isSelected ? "text-brand" : "text-muted"}`}>
                    {isSelected ? "● Selected" : "○ Select"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment Action Section */}
      <div className="pt-2 border-t border-line">
        {activeGw === "razorpay" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsRzpModalOpen(true)}
              className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2 shadow-lg shadow-brand/20 hover:shadow-xl transition"
            >
              <LockIcon className="w-4 h-4" />
              <span>Pay ₹{formattedAmount} via Razorpay Modal</span>
            </button>
            <p className="text-center text-xs text-muted flex items-center justify-center gap-1.5">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-good" />
              <span>Opens the simulated Razorpay standard checkout overlay.</span>
            </p>

            <RazorpayDemoModal
              isOpen={isRzpModalOpen}
              onClose={() => setIsRzpModalOpen(false)}
              orderId={orderId}
              amountPaise={amountPaise}
              productTitle={productTitle}
              buyer={buyer}
              creatorUpiId={creatorUpiId}
            />
          </div>
        ) : (
          <div className="space-y-4">
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
      </div>

      {failed && (
        <div className="rounded-2xl bg-bad-soft p-4 text-xs text-bad font-medium border border-bad/20">
          <p className="font-bold">Payment Attempt Incomplete</p>
          <p className="mt-0.5">The previous transaction was declined or cancelled. No funds were debited. You can retry with either gateway above.</p>
        </div>
      )}
    </div>
  );
}
