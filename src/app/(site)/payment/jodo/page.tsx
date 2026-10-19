import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { JodoPayIcon } from "@/components/gateway-icons";
import { JodoPaymentForm } from "@/components/payments/JodoPaymentForm";

export const metadata: Metadata = {
  title: "Jodo Pay Gateway Checkout | Tysonpe",
  description: "Seamless course checkout and instant automated enrollment via Jodo payment gateway.",
};

export default async function JodoCheckoutPage() {
  const [products, creators] = await Promise.all([
    db.product.findMany({
      where: { status: "published" },
      orderBy: { createdAt: "desc" },
      include: { creator: true },
      take: 6,
    }),
    db.creator.findMany({
      take: 1,
      orderBy: { createdAt: "asc" },
      select: { id: true, displayName: true, handle: true },
    }),
  ]);

  const defaultCreator = creators[0];

  const productOptions = products.map((p) => ({
    id: p.id,
    title: p.title,
    pricePaise: p.pricePaise,
    creatorName: p.creator.displayName,
    creatorId: p.creatorId,
  }));

  return (
    <div className="min-h-screen bg-bg text-ink py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between text-xs text-muted">
          <Link href="/" className="hover:text-ink transition-colors flex items-center gap-1">
            <span>←</span>
            <span>Back to Tysonpe</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950/40 dark:text-emerald-400">
              Jodo DevTest1 Gateway Active
            </span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-line text-xs font-semibold text-muted">
            <JodoPayIcon className="w-4 h-4 shrink-0" />
            <span>Institutional & Enterprise Payment Integration</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink font-display">
            Direct Checkout with Jodo Pay
          </h1>
          <p className="text-sm sm:text-base text-muted">
            Enter your details below to initiate a secure transaction via the Jodo Create Order API.
            Upon successful payment, curriculum access and sequential GST tax invoices are automatically generated.
          </p>
        </div>

        {/* Main Card with Form */}
        <div className="card p-6 sm:p-8 bg-surface rounded-[24px] border border-line shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Gateway Endpoint</p>
              <p className="text-sm font-mono font-semibold text-ink mt-0.5">
                https://ext.devtest1.jodopay.com
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300">
              API Key: 81329eb5c322
            </span>
          </div>

          <JodoPaymentForm
            products={productOptions}
            defaultCreatorId={defaultCreator?.id}
          />
        </div>

        {/* Integration Architecture Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="card p-4 bg-surface/60 border-line/80 space-y-1">
            <div className="font-bold text-ink flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px]">1</span>
              <span>Create Order API</span>
            </div>
            <p className="text-muted">
              Sends payer Name, Phone, and Email to generate a hosted checkout URL.
            </p>
          </div>

          <div className="card p-4 bg-surface/60 border-line/80 space-y-1">
            <div className="font-bold text-ink flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px]">2</span>
              <span>Hosted Checkout</span>
            </div>
            <p className="text-muted">
              Customer pays via UPI, Netbanking, or Debit card on Jodo&apos;s interface.
            </p>
          </div>

          <div className="card p-4 bg-surface/60 border-line/80 space-y-1">
            <div className="font-bold text-ink flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px]">3</span>
              <span>Course Unlock</span>
            </div>
            <p className="text-muted">
              Callback verifies status via Get Order API and unlocks course instant access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
