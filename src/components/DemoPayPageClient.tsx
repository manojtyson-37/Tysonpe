"use client";

import { useState } from "react";
import { GATEWAYS, type GatewayId } from "@/lib/payments/gateways";
import { Badge, Button, ButtonLink, Callout, Money } from "@/components/ui";
import { InputGroup, RadioCard } from "./form";
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
}

export function DemoPayPageClient({
  orderId,
  amountPaise,
  productTitle,
  initialGateway,
  buyer,
}: DemoPayPageClientProps) {
  const [activeGw, setActiveGw] = useState<GatewayId>(initialGateway);
  const [isRzpModalOpen, setIsRzpModalOpen] = useState(false);
  const [phone, setPhone] = useState("9876543210");

  return (
    <div className="space-y-6">
      {/* A standing statement about the environment, not a failure: info tone, no role="alert", no heartbeat. */}
      <Callout tone="info">
        <p className="font-semibold">Gateway simulation</p>
        <p className="mt-0.5 text-sm font-normal text-muted">
          Test mode. No real money moves and no credentials are needed. Pick a gateway to rehearse the flow.
        </p>
      </Callout>

      <fieldset>
        <legend className="t-label mb-2.5">Payment gateway</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GATEWAYS.map((gw) => (
            <RadioCard
              key={gw.id}
              name="gateway"
              value={gw.id}
              checked={activeGw === gw.id}
              onChange={() => setActiveGw(gw.id)}
              title={gw.name}
              description={gw.blurb}
              trailing={<Badge>{gw.id === "razorpay" ? "Popup" : "Hosted page"}</Badge>}
            >
              <span className="mt-3 flex items-center gap-1.5 border-t border-line pt-3">
                {gw.id === "razorpay" ? (
                  <>
                    <UpiIcon className="h-4 w-4" />
                    <GPayIcon className="h-4 w-4" />
                    <PhonePeIcon className="h-4 w-4" />
                    <PaytmIcon className="h-3 w-6" />
                    <VisaIcon className="h-3 w-5" />
                    <MastercardIcon className="h-3 w-5" />
                  </>
                ) : (
                  <>
                    <ClockIcon className="h-3.5 w-3.5 text-muted" />
                    <span className="text-xs text-muted">15-minute session timer</span>
                  </>
                )}
              </span>
            </RadioCard>
          ))}
        </div>
      </fieldset>

      <div className="border-t border-line pt-4">
        {activeGw === "razorpay" ? (
          <div className="space-y-3">
            <Button size="lg" icon={<LockIcon className="h-4 w-4" />} onClick={() => setIsRzpModalOpen(true)} className="w-full">
              <span>
                Pay <Money paise={amountPaise} /> with Razorpay
              </span>
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-good" />
              <span>Opens the simulated Razorpay checkout over this page.</span>
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
            <InputGroup
              label="Mobile number"
              hint="Pre-filled for the simulation. Easebuzz requires one."
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              prefix="+91"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
            />

            <ButtonLink size="lg" href={`/gateway/easebuzz/${orderId}`} icon={<LockIcon className="h-4 w-4" />} className="w-full">
              Continue to Easebuzz
            </ButtonLink>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-good" />
              <span>Redirects to the Easebuzz hosted page, which expires after 15 minutes.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
