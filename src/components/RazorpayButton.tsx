"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState } from "react";
import { confirmPaymentAction } from "@/app/actions/checkout";
import { Button, Callout } from "@/components/ui";

type RzpResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open(): void; on(ev: string, cb: (r: unknown) => void): void };
  }
}

export function RazorpayButton(props: {
  orderId: string;
  providerOrderId: string;
  keyId: string;
  amountPaise: number;
  title: string;
  buyer: { name: string; email: string };
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pay() {
    if (!window.Razorpay) return setError("Payment widget is still loading. Try again in a moment.");
    setError(null);
    setBusy(true);
    const rzp = new window.Razorpay({
      key: props.keyId,
      amount: props.amountPaise,
      currency: "INR",
      name: "Tysonpe",
      description: props.title,
      order_id: props.providerOrderId,
      prefill: props.buyer,
      theme: { color: "#16130f" },
      modal: { ondismiss: () => setBusy(false) },
      handler: async (r: RzpResponse) => {
        const res = await confirmPaymentAction(props.orderId, r.razorpay_payment_id, r.razorpay_signature);
        if (res.ok) router.push(`/checkout/success/${props.orderId}`);
        else {
          setBusy(false);
          setError(res.error ?? "We couldn't verify your payment. If money was debited it will be auto-refunded.");
        }
      },
    });
    rzp.on("payment.failed", () => {
      setBusy(false);
      setError("Payment failed. You can try again.");
    });
    rzp.open();
  }

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Button size="lg" disabled={busy} onClick={pay} className="w-full">
        {busy ? "Waiting for payment…" : props.label}
      </Button>
      {error && <Callout tone="bad" className="mt-3">{error}</Callout>}
    </div>
  );
}
