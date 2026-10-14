import type { Metadata } from "next";
import Link from "next/link";
import { resetDemoEnrollmentAction, startCheckout } from "@/app/actions/checkout";
import { setPreferredGateway } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/form";
import { Money } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { GATEWAYS } from "@/lib/payments/gateways";

export const metadata: Metadata = { title: "Payment Gateway Demo" };

export default async function DemoPage() {
  const user = await requireUser("/demo");

  // Find a product from someone else to purchase
  let product = await db.product.findFirst({
    where: {
      creator: { userId: { not: user.id } },
      status: "published",
      pricePaise: { gt: 0 },
    },
    include: { creator: true },
    orderBy: { pricePaise: "desc" },
  });

  // If no other product exists, fall back to any published product
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
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Top Banner */}
      <div className="flex items-center gap-2 mb-3">
        <span className="badge badge-brand text-xs">GATEWAY SIMULATION</span>
        <span className="text-xs text-muted">Safe sandbox mode</span>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        Test Drive Tysonpe Checkout
      </h1>
      <p className="mt-2 text-base text-muted">
        Experience authentic replicas of Razorpay and Easebuzz. Test success, failure and cancel paths without real credentials or currency.
      </p>

      {/* Gateway Preference Switcher */}
      <div className="card mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <h2 className="text-base font-bold text-ink">Active Gateway Preference</h2>
            <p className="text-xs text-muted mt-0.5">
              Configured during sign-up. You can switch anytime below.
            </p>
          </div>
          <span className="badge badge-good text-xs font-semibold py-1 px-3">
            Active: {currentGateway.name}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {GATEWAYS.map((gw) => {
            const isCurrent = user.preferredGateway === gw.id;
            return (
              <form key={gw.id} action={setPreferredGateway.bind(null, gw.id)}>
                <button
                  type="submit"
                  className={`w-full text-left p-4 rounded-xl border transition flex flex-col justify-between h-full ${
                    isCurrent
                      ? "border-brand bg-brand-soft/70 ring-2 ring-brand"
                      : "border-line bg-surface hover:bg-surface-2"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between font-bold text-sm text-ink">
                      <span>{gw.name}</span>
                      {isCurrent ? (
                        <span className="text-xs text-brand font-bold">✓ Selected</span>
                      ) : (
                        <span className="text-xs text-muted font-normal">Click to select</span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-1 leading-snug">{gw.blurb}</p>
                  </div>
                  <div className="mt-3 text-[11px] font-semibold text-brand">
                    {gw.id === "razorpay" ? "⚡ Pop-up Modal" : "🛡️ Hosted Page (15-min timer)"}
                  </div>
                </button>
              </form>
            );
          })}
        </div>
      </div>

      {/* Demo Checkout Launch Card */}
      <div className="card mt-6 p-6">
        <h2 className="text-lg font-bold text-ink">Launch Checkout Flow</h2>
        <p className="text-xs text-muted mt-0.5">
          Simulate purchasing a creator&apos;s product using your selected gateway.
        </p>

        {product ? (
          <div className="mt-6 rounded-xl border border-line bg-surface-2/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="badge badge-muted text-[11px] uppercase tracking-wider">
                  {product.type}
                </span>
                <h3 className="text-lg font-bold text-ink mt-1.5">{product.title}</h3>
                <p className="text-xs text-muted mt-0.5">by {product.creator.displayName}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted block">Demo Price</span>
                <span className="text-2xl font-extrabold text-ink">
                  <Money paise={product.pricePaise} />
                </span>
                <span className="text-[10px] text-muted block">Includes GST</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
              {enrolled ? (
                <div className="w-full space-y-3">
                  <div className="rounded-xl bg-good-soft p-3 text-xs text-good font-semibold flex items-center justify-between">
                    <span>✓ You have completed a demo enrollment for this course!</span>
                    <Link href={`/library/${product.id}`} className="underline">
                      Open in Library →
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    <form action={resetDemoEnrollmentAction.bind(null, product.id)} className="w-full">
                      <button
                        type="submit"
                        className="btn btn-secondary w-full text-xs py-2"
                      >
                        Reset Demo Enrollment (to test again)
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-2">
                  <ActionForm action={startCheckout.bind(null, product.id)} className="w-full">
                    <SubmitButton
                      pendingText="Launching simulated checkout…"
                      className="btn btn-primary btn-lg w-full"
                    >
                      Start Simulated Checkout with {currentGateway.name} →
                    </SubmitButton>
                  </ActionForm>
                  <p className="text-center text-xs text-muted">
                    Takes you to the payment page playing the authentic {currentGateway.name} replica.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No demo product found in database. Run <code className="font-mono bg-surface-2 px-1 py-0.5 rounded">npm run db:seed</code> to populate demo courses.
          </p>
        )}
      </div>

      {/* Architecture & Safety Card */}
      <div className="card mt-6 p-6 space-y-3 text-xs text-muted">
        <h3 className="font-bold text-sm text-ink">How the Gateway Simulation Works</h3>
        <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
          <li>
            <strong>Razorpay Replica:</strong> Renders an in-page modal mimicking Razorpay Standard Checkout with UPI app pills, QR code simulation, dummy card inputs, netbanking bank tiles, and live simulated authorization states.
          </li>
          <li>
            <strong>Easebuzz Replica:</strong> Renders a dedicated hosted page at <code className="font-mono text-ink">/gateway/easebuzz/[orderId]</code> featuring the authentic dark navy header, live 15-minute countdown clock, payment method sidebar, and 303 HTTP return redirects.
          </li>
          <li>
            <strong>HMAC Verification:</strong> When a simulated payment completes, the backend signs and verifies the mock payment ID, creating real ledger entries, unlocking student course access in the library, and issuing official invoices.
          </li>
          <li>
            <strong>Strict Safety:</strong> Labelled DEMO throughout. No real cards, UPI VPA secrets, or banking credentials are read, saved, or transmitted to any server.
          </li>
        </ul>
      </div>

      <div className="mt-6 flex justify-between items-center text-xs text-muted">
        <Link href="/library" className="hover:text-ink underline">
          ← Return to My Library
        </Link>
        <Link href="/dashboard" className="hover:text-ink underline">
          Go to Creator Dashboard →
        </Link>
      </div>
    </div>
  );
}
