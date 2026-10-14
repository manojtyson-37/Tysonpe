import type { Metadata } from "next";
import Link from "next/link";
import { resetDemoEnrollmentAction, startCheckout } from "@/app/actions/checkout";
import { setPreferredGateway } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/form";
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
} from "@/components/gateway-icons";
import { Money } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { GATEWAYS } from "@/lib/payments/gateways";

export const metadata: Metadata = { title: "Gateway Simulation Playground" };

export default async function DemoPage() {
  const user = await requireUser("/demo");

  // Find a product from another creator to purchase
  let product = await db.product.findFirst({
    where: {
      creator: { userId: { not: user.id } },
      status: "published",
      pricePaise: { gt: 0 },
    },
    include: { creator: true },
    orderBy: { pricePaise: "desc" },
  });

  // Fallback to any published product if none from another creator
  if (!product) {
    product = await db.product.findFirst({
      where: { status: "published", pricePaise: { gt: 0 } },
      include: { creator: true },
    });
  }

  const enrolled = product
    ? await db.enrollment.findUnique({
        where: { userId_productId: { userId: user.id, productId: product.id } },
      })
    : null;

  const currentGateway = GATEWAYS.find((g) => g.id === user.preferredGateway) ?? GATEWAYS[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[28px] border border-line bg-gradient-to-b from-surface to-surface-2 p-8 sm:p-10 shadow-sm">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
              INTERACTIVE FINTECH SANDBOX
            </span>
            <span className="text-xs font-semibold text-muted">Test Environment</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink font-display">
            Payment Gateway Simulation
          </h1>

          <p className="text-muted text-sm sm:text-base leading-relaxed">
            Experience Tysonpe&apos;s checkout across India&apos;s leading payment providers. Compare the in-page Razorpay modal with Easebuzz&apos;s full-page hosted redirect without real credentials or funds.
          </p>
        </div>
      </div>

      {/* Gateway Switcher Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Choose Simulation Gateway</h2>
            <p className="text-xs text-muted">Switching here updates your account preference immediately.</p>
          </div>
          <span className="badge badge-brand text-xs font-semibold px-3 py-1">
            Active: {currentGateway.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GATEWAYS.map((gw) => {
            const isSelected = user.preferredGateway === gw.id;
            return (
              <form key={gw.id} action={setPreferredGateway.bind(null, gw.id)} className="h-full">
                <button
                  type="submit"
                  className={`w-full h-full text-left p-6 rounded-[22px] border transition flex flex-col justify-between relative ${
                    isSelected
                      ? "border-brand bg-brand-soft/70 ring-2 ring-brand shadow-md shadow-brand/10"
                      : "border-line bg-surface hover:bg-surface-2"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-extrabold text-ink">{gw.name}</span>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isSelected ? "bg-brand text-brand-ink" : "bg-surface-2 text-muted"
                        }`}
                      >
                        {gw.id === "razorpay" ? "Modal Experience" : "Hosted Page"}
                      </span>
                    </div>

                    <p className="text-xs text-muted leading-relaxed">{gw.blurb}</p>

                    {/* Features breakdown */}
                    <div className="pt-2 text-xs text-muted space-y-1.5">
                      {gw.id === "razorpay" ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-good font-bold">✓</span>
                            <span>Standard Checkout popup over merchant store</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-good font-bold">✓</span>
                            <span>Instant UPI intent, QR scanning & saved cards</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-good font-bold">✓</span>
                            <span>Zero redirect friction — keeps buyer on-site</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-good font-bold">✓</span>
                            <span>Enterprise hosted gateway at dedicated URL</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-good font-bold">✓</span>
                            <span>Live 15-minute countdown clock & transaction timer</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-good font-bold">✓</span>
                            <span>Authentic HTTP 303 return redirect flow</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-line/70 flex items-center justify-between">
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
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <ClockIcon className="w-3.5 h-3.5 text-amber-500" />
                        <span>15-min link expiry timer</span>
                      </div>
                    )}
                    <span className={`text-xs font-bold ${isSelected ? "text-brand" : "text-muted"}`}>
                      {isSelected ? "● Currently Active" : "Click to Activate →"}
                    </span>
                  </div>
                </button>
              </form>
            );
          })}
        </div>
      </section>

      {/* Product Purchase & Simulation Card */}
      <section className="card p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-ink">Launch Checkout Flow</h2>
          <p className="text-xs text-muted mt-0.5">
            Test purchasing an instructor course with authentic HMAC signatures and automated access provisioning.
          </p>
        </div>

        {product ? (
          <div className="rounded-[22px] border border-line bg-surface-2/60 p-6 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <span className="badge badge-brand text-[11px] uppercase tracking-wider font-bold">
                  {product.type}
                </span>
                <h3 className="text-xl font-extrabold text-ink">{product.title}</h3>
                <p className="text-xs text-muted">
                  Created by <strong className="text-ink">{product.creator.displayName}</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted block">Simulated Price</span>
                <span className="text-3xl font-black text-ink tracking-tight">
                  <Money paise={product.pricePaise} />
                </span>
                <span className="text-[11px] text-muted block mt-0.5">Includes 18% GST</span>
              </div>
            </div>

            <div className="border-t border-line pt-5">
              {enrolled ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-good-soft p-4 text-xs text-good font-semibold flex items-center justify-between border border-good/20">
                    <div className="flex items-center gap-2">
                      <ShieldCheckIcon className="w-4 h-4 text-good shrink-0" />
                      <span>You completed a simulated purchase for this course! Access has been unlocked in your library.</span>
                    </div>
                    <Link href={`/library/${product.id}`} className="underline font-bold shrink-0 ml-4">
                      Open Course →
                    </Link>
                  </div>

                  <form action={resetDemoEnrollmentAction.bind(null, product.id)}>
                    <button
                      type="submit"
                      className="btn btn-secondary w-full text-xs py-2.5 flex items-center justify-center gap-1.5"
                    >
                      <span>Reset Demo Enrollment (to test checkout again)</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-3">
                  <ActionForm action={startCheckout.bind(null, product.id)}>
                    <SubmitButton
                      pendingText="Launching simulated checkout…"
                      className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2 shadow-lg shadow-brand/20 hover:shadow-xl transition"
                    >
                      <LockIcon className="w-4 h-4" />
                      <span>Start Checkout with {currentGateway.name} →</span>
                    </SubmitButton>
                  </ActionForm>
                  <p className="text-center text-xs text-muted">
                    Creates a test order and renders the authentic {currentGateway.name} checkout replica.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No demo products available in database.</p>
        )}
      </section>

      {/* Technical Architecture Notes */}
      <section className="rounded-2xl border border-line bg-surface p-6 space-y-4 text-xs text-muted">
        <h3 className="font-bold text-sm text-ink flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4 text-brand" />
          <span>Under the Hood: Enterprise Financial Ledger Integration</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs leading-relaxed">
          <div className="space-y-1">
            <strong className="text-ink block">HMAC Signature Settlement</strong>
            <p>
              When you simulate payment approval, the backend computes SHA-256 signatures identical to genuine webhooks. The order is immutably marked as paid, sequentially generating official Indian tax invoices.
            </p>
          </div>
          <div className="space-y-1">
            <strong className="text-ink block">No Credential Leakage</strong>
            <p>
              Zero credit card numbers, CVVs, or bank secrets are transmitted or stored. The client sends only an outcome intent (<code className="font-mono text-ink">success</code>, <code className="font-mono text-ink">failure</code>, or <code className="font-mono text-ink">cancel</code>).
            </p>
          </div>
        </div>
      </section>

      {/* Quick Navigation Footer */}
      <div className="flex justify-between items-center text-xs text-muted pt-2 border-t border-line">
        <Link href="/library" className="hover:text-ink underline">
          ← Back to Learner Library
        </Link>
        <Link href="/dashboard" className="hover:text-ink underline">
          Go to Creator Dashboard →
        </Link>
      </div>
    </div>
  );
}
