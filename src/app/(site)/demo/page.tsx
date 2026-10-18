import type { Metadata } from "next";
import { resetDemoEnrollmentAction, startCheckout } from "@/app/actions/checkout";
import { setPreferredGateway } from "@/app/actions/auth";
import { GatewayChooser, type GatewayOption } from "@/components/GatewayChooser";
import { ActionForm, FormError, SubmitButton } from "@/components/form";
import { IconCheck, IconLock } from "@/components/icons";
import { Button, ButtonLink, EmptyState, Money, PageHeader, TYPE_LABEL } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { gatewayFormId } from "@/lib/gateway-form";
import { gstComponent } from "@/lib/money";
import { getProvider } from "@/lib/payments";
import { simulatedPaymentsAllowed } from "@/lib/payments/demo-mode";
import { GATEWAYS } from "@/lib/payments/gateways";

export const metadata: Metadata = { title: "Gateway playground" };

// What each replica really does (see DemoPayPageClient, RazorpayDemoModal and the Easebuzz hosted page).
const FACTS: Record<(typeof GATEWAYS)[number]["id"], string> = {
  razorpay: "You choose success or failure; no card, UPI or bank details are sent.",
  easebuzz: "Shows a 15-minute countdown; you choose success, failure or cancel.",
};

const OPTIONS: GatewayOption[] = GATEWAYS.map((gw) => ({ id: gw.id, name: gw.name, blurb: gw.blurb, fact: FACTS[gw.id] }));

export default async function DemoPage() {
  const user = await requireUser("/demo");

  // Test-mode copy, the chooser, checkout and reset are true only where simulated payments are allowed AND the provider
  // is the mock. With live keys the button would create a real order and the reset action would throw.
  const sandbox =
    simulatedPaymentsAllowed() &&
    (() => {
      try {
        return getProvider().name === "mock";
      } catch {
        return false;
      }
    })();

  if (!sandbox) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <PageHeader title="Gateway playground" />
        <p className="max-w-prose text-base text-muted">The gateway playground runs on the demo deployment only.</p>
        <div className="mt-6">
          <ButtonLink href="/library" className="pointer-coarse:min-h-11">
            Open your library
          </ButtonLink>
        </div>
      </div>
    );
  }

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
  const gstPaise = product ? gstComponent(product.pricePaise, product.gstRatePct) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader title="Gateway playground" />
      <p className="max-w-prose text-base text-muted">
        Pick a payment gateway, then buy a published product to follow its checkout from the pay page to the invoice.
      </p>
      <p className="mt-1 text-base font-medium text-ink">Test mode: no real money moves.</p>

      <section aria-labelledby="gateway-heading" className="mt-10">
        <h2 id="gateway-heading" className="text-xl font-semibold">
          Choose a gateway
        </h2>
        <p className="mb-4 mt-1 max-w-prose text-base text-muted">
          Choosing a gateway saves it to your account and pre-selects it on the pay page.
        </p>
        <GatewayChooser options={OPTIONS} selected={currentGateway.id} labelledBy="gateway-heading" />
        <noscript>
          <p className="mt-3 max-w-prose text-base text-muted">Scripts are off: use the buttons below to save a gateway.</p>
        </noscript>
        {/* The radios submit these by id. Without script they cannot, so each form carries its own button. */}
        {GATEWAYS.map((gw) => (
          <form key={gw.id} id={gatewayFormId(gw.id)} action={setPreferredGateway.bind(null, gw.id)}>
            <noscript>
              <Button type="submit" variant="secondary" className="mt-3">
                Use {gw.name}
              </Button>
            </noscript>
          </form>
        ))}
      </section>

      <section aria-labelledby="checkout-heading" className="mt-10 border-t border-line pt-8">
        <h2 id="checkout-heading" className="text-xl font-semibold">
          Buy a product in test mode
        </h2>

        {product ? (
          <div className="mt-4 rounded-card bg-surface-2 px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
              <div className="min-w-0">
                <h3 className="text-xl font-semibold">{product.title}</h3>
                <p className="mt-1 text-base text-muted">
                  {TYPE_LABEL[product.type] ?? product.type} by {product.creator.displayName}
                </p>
              </div>
              <div className="sm:text-right">
                <Money paise={product.pricePaise} size="xl" />
                <p className="mt-1 text-base text-muted">
                  {product.gstRatePct > 0 ? (
                    <>
                      Includes <Money paise={gstPaise} /> GST at {product.gstRatePct}%
                    </>
                  ) : (
                    "No GST on this product (rate 0%)"
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-line pt-5">
              {enrolled ? (
                <div className="space-y-4">
                  <p className="flex items-start gap-2 text-base font-medium text-ink">
                    <IconCheck size={20} className="mt-0.5 shrink-0 text-good" />
                    <span>You already own this. It is unlocked in your library.</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <ButtonLink href={`/library/${product.id}`} className="pointer-coarse:min-h-11">Open in your library</ButtonLink>
                    <form action={resetDemoEnrollmentAction.bind(null, product.id)}>
                      <SubmitButton variant="secondary" pendingText="Resetting…" className="pointer-coarse:min-h-11">
                        Reset and buy again
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              ) : (
                <ActionForm action={startCheckout.bind(null, product.id)} className="space-y-3">
                  <FormError />
                  <SubmitButton size="lg" pendingText="Creating a test order…" className="w-full sm:w-auto">
                    <IconLock size={16} />
                    {`Start checkout with ${currentGateway.name}`}
                  </SubmitButton>
                  <p className="text-base text-muted">
                    Creates a test order and opens the pay page with {currentGateway.name} selected.
                  </p>
                </ActionForm>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            inline
            className="[&>p+p]:text-base"
            actionClassName="pointer-coarse:min-h-11"
            title="No published paid product to buy yet"
            body="Checkout needs a published product with a price. Creators can add one from the dashboard."
            action={{ label: "Create a product", href: "/dashboard/products/new" }}
          />
        )}
      </section>

      <div className="mt-10 flex flex-wrap gap-2 border-t border-line pt-4">
        <ButtonLink variant="ghost" href="/library" className="pointer-coarse:min-h-11">
          Your library
        </ButtonLink>
        {user.creator ? (
          <ButtonLink variant="ghost" href="/dashboard" className="pointer-coarse:min-h-11">
            Creator dashboard
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
