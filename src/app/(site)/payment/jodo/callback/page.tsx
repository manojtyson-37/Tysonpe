import type { Metadata } from "next";
import Link from "next/link";
import { JodoPayIcon } from "@/components/gateway-icons";
import { JodoCallbackClient } from "@/components/payments/JodoCallbackClient";

export const metadata: Metadata = {
  title: "Jodo Pay Return & Status Verification | Tysonpe",
  description: "Verifying order status with Jodo API and unlocking course content.",
};

export default async function JodoCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const rawOrderId = sp.order_id || sp.order || sp.id || "";
  const initialOrderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

  return (
    <div className="min-h-screen bg-bg text-ink py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-muted">
          <Link href="/payment/jodo" className="hover:text-ink transition-colors flex items-center gap-1">
            <span>←</span>
            <span>Return to Jodo Checkout</span>
          </Link>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
            <JodoPayIcon className="w-3.5 h-3.5" />
            <span>DevTest1 Sync</span>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-1 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink font-display">
            Payment Verification & Course Unlock
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Confirming transaction status with Jodo Get Order API and synchronizing your curriculum access.
          </p>
        </div>

        {/* Interactive Verification Client */}
        <JodoCallbackClient initialOrderId={initialOrderId} />
      </div>
    </div>
  );
}
