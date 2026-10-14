"use client";

import Link from "next/link";
import { useState } from "react";
import { GATEWAYS, type GatewayId } from "@/lib/payments/gateways";
import { RazorpayDemoModal } from "./RazorpayDemoModal";

interface DemoPayPageClientProps {
  orderId: string;
  amountPaise: number;
  productTitle: string;
  initialGateway: GatewayId;
  buyer: { name: string; email: string };
  failed?: boolean;
}

export function DemoPayPageClient({
  orderId,
  amountPaise,
  productTitle,
  initialGateway,
  buyer,
  failed,
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
      {/* Demo Mode Notice */}
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2 font-bold mb-1">
          <span>⚠️</span>
          <span>GATEWAY SIMULATION DEMO</span>
        </div>
        <p>No real money or bank accounts are accessed. Toggle between Razorpay and Easebuzz checkout experiences below.</p>
      </div>

      {/* In-Page Gateway Switcher */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-2">
          Select Gateway Experience to Simulate
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {GATEWAYS.map((gw) => {
            const isSelected = activeGw === gw.id;
            return (
              <button
                key={gw.id}
                type="button"
                onClick={() => setActiveGw(gw.id)}
                className={`p-3.5 rounded-xl border text-left transition ${
                  isSelected
                    ? "border-brand bg-brand-soft/60 text-brand ring-2 ring-brand"
                    : "border-line bg-surface hover:bg-surface-2 text-ink"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-sm">
                  <span>{gw.name}</span>
                  {isSelected && <span className="text-xs">✓ Active</span>}
                </div>
                <div className="text-xs text-muted mt-1 leading-snug">{gw.blurb}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gateway View: Razorpay vs Easebuzz */}
      <div className="pt-2">
        {activeGw === "razorpay" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsRzpModalOpen(true)}
              className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2"
            >
              <span>Pay ₹{formattedAmount} via Razorpay (Demo)</span>
            </button>
            <p className="text-center text-xs text-muted">
              Opens the simulated Razorpay checkout modal overlay.
            </p>

            <RazorpayDemoModal
              isOpen={isRzpModalOpen}
              onClose={() => setIsRzpModalOpen(false)}
              orderId={orderId}
              amountPaise={amountPaise}
              productTitle={productTitle}
              buyer={buyer}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="eb-phone" className="label text-xs">
                Buyer mobile number (required by Easebuzz)
              </label>
              <input
                id="eb-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="input"
              />
              <p className="hint">Pre-filled for simulation.</p>
            </div>

            <Link
              href={`/gateway/easebuzz/${orderId}`}
              className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2"
            >
              <span>Proceed to Easebuzz Payment Page →</span>
            </Link>
            <p className="text-center text-xs text-muted">
              Redirects to the simulated Easebuzz hosted page with 15-minute countdown timer.
            </p>
          </div>
        )}
      </div>

      {failed && (
        <div className="rounded-xl bg-bad-soft p-3 text-xs text-bad font-medium">
          The last payment attempt failed or was cancelled. You can retry with either gateway above.
        </div>
      )}
    </div>
  );
}
