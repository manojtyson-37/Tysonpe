"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { JodoPayIcon } from "@/components/gateway-icons";
import { verifyAndUnlockJodoOrderAction, queryJodoOrderStatusAction } from "@/app/actions/jodo-payment";

interface CallbackProps {
  initialOrderId?: string;
  tysonpeOrderId?: string;
}

export function JodoCallbackClient({ initialOrderId, tysonpeOrderId }: CallbackProps) {
  const [orderId, setOrderId] = useState<string>(initialOrderId || "");
  const [isPending, startTransition] = useTransition();
  const [statusResult, setStatusResult] = useState<{
    checked: boolean;
    ok: boolean;
    status: string;
    invoiceNo?: string;
    courseTitle?: string;
    customerName?: string;
    customerEmail?: string;
    amountPaise?: number;
    alreadyUnlocked?: boolean;
    error?: string;
    rawOrder?: Record<string, unknown>;
  } | null>(null);

  const checkAndUnlock = (targetOrderId: string) => {
    if (!targetOrderId.trim()) return;
    startTransition(async () => {
      // First attempt complete unlock with tysonpeOrderId if present
      const unlockRes = await verifyAndUnlockJodoOrderAction(targetOrderId.trim(), tysonpeOrderId);

      if (unlockRes.ok) {
        setStatusResult({
          checked: true,
          ok: true,
          status: "paid",
          invoiceNo: unlockRes.invoiceNo,
          courseTitle: unlockRes.courseTitle,
          customerName: unlockRes.customerName,
          customerEmail: unlockRes.customerEmail,
          amountPaise: unlockRes.amountPaise,
          alreadyUnlocked: unlockRes.alreadyUnlocked,
        });
      } else {
        // If unlock failed or status is not paid, fetch raw status for full transparency
        const rawRes = await queryJodoOrderStatusAction(targetOrderId.trim());
        setStatusResult({
          checked: true,
          ok: false,
          status: rawRes.data?.status || unlockRes.status || "unpaid",
          error: unlockRes.error || rawRes.error || "Order status is not paid yet",
          rawOrder: rawRes.data as unknown as Record<string, unknown>,
        });
      }
    });
  };

  useEffect(() => {
    if (initialOrderId) {
      checkAndUnlock(initialOrderId);
    }
  }, [initialOrderId]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    checkAndUnlock(orderId);
  };

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isPending && (
        <div className="card p-8 text-center bg-surface border-line space-y-4">
          <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-brand/30 animate-ping" />
            <span className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink">Verifying with Jodo Payment Gateway…</h2>
            <p className="text-xs text-muted mt-1">
              Calling <code className="text-brand font-mono">GET /api/v1/integrations/pay/orders/:order_id</code>
            </p>
          </div>
        </div>
      )}

      {/* Success & Unlocked State */}
      {!isPending && statusResult?.ok && (
        <div className="card p-6 sm:p-8 bg-surface border-line rounded-[24px] shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-500/20 dark:text-emerald-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950/40 dark:text-emerald-400">
                Payment Confirmed
              </span>
              <h2 className="text-2xl font-black text-ink font-display mt-0.5">
                🎉 Course Unlocked Successfully!
              </h2>
            </div>
          </div>

          {/* Details Card */}
          <div className="p-4 rounded-2xl bg-surface-2/60 border border-line/80 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-line/60">
              <span className="text-xs text-muted font-medium">Program / Course</span>
              <span className="text-xs font-bold text-ink">{statusResult.courseTitle || "Course Offering"}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-line/60">
              <span className="text-xs text-muted font-medium">Student Name</span>
              <span className="text-xs font-bold text-ink">{statusResult.customerName || "Ron Rivest"}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-line/60">
              <span className="text-xs text-muted font-medium">Registered Email</span>
              <span className="text-xs font-mono font-medium text-ink">{statusResult.customerEmail}</span>
            </div>

            {statusResult.invoiceNo && (
              <div className="flex items-center justify-between pb-3 border-b border-line/60">
                <span className="text-xs text-muted font-medium">GST Tax Invoice No.</span>
                <span className="text-xs font-mono font-bold text-brand bg-brand/5 px-2 py-0.5 rounded border border-brand/20">
                  {statusResult.invoiceNo}
                </span>
              </div>
            )}

            {statusResult.amountPaise && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-medium">Total Paid</span>
                <span className="text-base font-extrabold text-ink tabular-nums">
                  ₹{(statusResult.amountPaise / 100).toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {tysonpeOrderId ? (
              <Link
                href={`/checkout/success/${tysonpeOrderId}`}
                className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-brand text-brand-ink font-bold text-xs tracking-wide text-center hover:opacity-95 active:scale-[0.98] transition-all shadow-md shadow-brand/20"
              >
                View Order Receipt &amp; Access →
              </Link>
            ) : null}

            <Link
              href="/library"
              className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-ink text-surface font-bold text-xs tracking-wide text-center hover:opacity-95 active:scale-[0.98] transition-all"
            >
              Go to Your Course Library →
            </Link>

            <Link
              href="/payment/jodo"
              className="w-full sm:w-auto py-3 px-4 rounded-xl border border-line bg-surface text-ink font-semibold text-xs text-center hover:bg-surface-2 active:scale-[0.98] transition-all"
            >
              Simulate Another Order
            </Link>
          </div>
        </div>
      )}

      {/* Unpaid / Pending State */}
      {!isPending && statusResult?.checked && !statusResult.ok && (
        <div className="card p-6 sm:p-8 bg-surface border-line rounded-[24px] shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center shrink-0 border border-amber-500/20 dark:text-amber-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full dark:bg-amber-950/40 dark:text-amber-400">
                Status: {statusResult.status}
              </span>
              <h2 className="text-xl font-bold text-ink mt-0.5">Payment Incomplete or Awaiting Settlement</h2>
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            {statusResult.error || "The payment has not been marked as 'paid' yet on Jodo's servers. If you just finished checkout, please click Re-check Status."}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => checkAndUnlock(orderId)}
              className="py-2.5 px-4 rounded-xl bg-brand text-white font-semibold text-xs hover:bg-brand/90 active:scale-[0.98] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Re-check Order Status API</span>
            </button>

            <Link
              href="/payment/jodo"
              className="py-2.5 px-4 rounded-xl border border-line bg-surface text-ink font-semibold text-xs hover:bg-surface-2 transition-all"
            >
              Return to Checkout
            </Link>
          </div>
        </div>
      )}

      {/* Manual Order ID Lookup Card */}
      <div className="card p-5 bg-surface/70 border border-line/80 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <JodoPayIcon className="w-4 h-4 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
            Inspect Any Jodo Order ID
          </h3>
        </div>
        <p className="text-xs text-muted">
          Want to test an existing order ID from your Jodo dashboard or API response? Paste it below to fetch status and trigger course unlock.
        </p>

        <form onSubmit={handleManualSearch} className="flex gap-2">
          <input
            type="text"
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g. gAAAAAAAAAAAcy_NwaNloWi3ereDc2Fo8iac..."
            className="flex-1 px-3 py-2 rounded-xl border border-line bg-surface text-xs font-mono text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <button
            type="submit"
            disabled={isPending}
            className="py-2 px-3.5 rounded-xl bg-ink text-surface text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isPending ? "Checking…" : "Fetch Status"}
          </button>
        </form>
      </div>
    </div>
  );
}
