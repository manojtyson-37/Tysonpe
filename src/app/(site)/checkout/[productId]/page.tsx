import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { startCheckout } from "@/app/actions/checkout";
import { ActionForm, FormError, SubmitButton } from "@/components/form";
import { Money, TYPE_LABEL } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { priceOrder } from "@/lib/money";
import { getCreatorIntegrations } from "@/lib/integrations/service";
import { recordAffiliateClick } from "@/lib/affiliates/service";
import { TrackingPixels } from "@/components/integrations/TrackingPixels";

export const metadata: Metadata = { title: "Checkout" };

const reasonText: Record<string, string> = {
  inactive: "This coupon is no longer active.",
  expired: "This coupon has expired.",
  exhausted: "This coupon has been fully redeemed.",
  invalid: "This coupon is not valid.",
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams?: Promise<{ coupon?: string; ref?: string }>;
}) {
  const { productId } = await params;
  const sp = searchParams ? await searchParams : {};
  const user = await requireUser(`/checkout/${productId}`);

  const product = await db.product.findFirst({
    where: { id: productId, status: "published" },
    include: { creator: true },
  });
  if (!product) notFound();
  if (product.creator.userId === user.id) redirect(`/dashboard/products/${product.id}`);
  const enrolled = await db.enrollment.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  if (enrolled) redirect(`/library/${productId}`);

  // 1. Process Referral attribution
  const refCode = (typeof sp.ref === "string" ? sp.ref : "").trim().toUpperCase();
  if (refCode) {
    recordAffiliateClick(product.creatorId, refCode).catch((err) =>
      console.error("Affiliate click error at checkout:", err)
    );
  }

  // 2. Coupon & Partner Discount Code handling
  let code = (typeof sp.coupon === "string" ? sp.coupon : "").trim().toUpperCase();
  if (!code && refCode) {
    // Check if referral partner code exists as a valid coupon discount
    const partnerCoupon = await db.coupon.findUnique({
      where: { creatorId_code: { creatorId: product.creatorId, code: refCode } },
    });
    if (partnerCoupon) {
      code = refCode;
    }
  }

  let couponNote: { ok: boolean; text: string } | null = null;
  let coupon = null;
  if (code) {
    coupon = await db.coupon.findUnique({ where: { creatorId_code: { creatorId: product.creatorId, code } } });
    if (!coupon) couponNote = { ok: false, text: "Coupon code not found." };
  }
  let priced = priceOrder(product, coupon, new Date());
  if (!priced.ok) {
    couponNote = { ok: false, text: reasonText[priced.reason] };
    coupon = null;
    priced = priceOrder(product, null, new Date());
  }
  if (!priced.ok) throw new Error("unreachable");
  if (coupon && priced.discountPaise > 0) couponNote = { ok: true, text: `${coupon.code} applied. You save ` };

  // 3. Companion Product / Order Bump query
  const companion = await db.product.findFirst({
    where: {
      creatorId: product.creatorId,
      status: "published",
      id: { not: product.id },
    },
    orderBy: { pricePaise: "asc" },
  });
  const companionEnrolled = companion
    ? await db.enrollment.findUnique({
        where: { userId_productId: { userId: user.id, productId: companion.id } },
      })
    : null;

  // 4. Fetch tracking pixels
  const integrations = await getCreatorIntegrations(product.creatorId);

  const action = startCheckout.bind(null, product.id);

  return (
    <>
      <TrackingPixels
        config={integrations.tracking}
        event={{
          name: "InitiateCheckout",
          valuePaise: priced.totalPaise,
          itemTitle: product.title,
        }}
      />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-display tracking-tight">Checkout</h1>
          {refCode && (
            <span className="badge badge-brand text-xs font-semibold">
              Referred by partner: {refCode}
            </span>
          )}
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="card p-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Your order</h2>
              <p className="mt-3 text-lg font-bold">{product.title}</p>
              <p className="text-sm text-muted">by {product.creator.displayName}</p>
            </section>

            {/* Graphy-style High Conversion Order Bump */}
            {companion && !companionEnrolled && (
              <section className="card border-2 border-brand/30 bg-surface-2/40 p-5 relative overflow-hidden transition-all duration-200 hover:border-brand/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand text-brand-ink">
                      ⚡ 1-Click Order Bump
                    </span>
                    <h3 className="text-base font-bold text-ink mt-1.5">{companion.title}</h3>
                    {companion.tagline && (
                      <p className="text-xs text-muted leading-relaxed">{companion.tagline}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-bold tabular-nums text-ink">
                      {companion.pricePaise === 0 ? "FREE" : <Money paise={companion.pricePaise} />}
                    </span>
                    <span className="block text-[11px] text-muted">
                      {TYPE_LABEL[companion.type] || companion.type}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
                  <span className="text-xs text-muted">Frequently added by other learners</span>
                  <Link
                    href={`/checkout/${companion.id}${refCode ? `?ref=${encodeURIComponent(refCode)}` : ""}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                  >
                    View companion add-on →
                  </Link>
                </div>
              </section>
            )}

            <section className="card p-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Have a coupon?</h2>
              <form method="get" className="mt-3 flex gap-2">
                <input
                  name="coupon"
                  defaultValue={code}
                  placeholder="ENTER CODE"
                  aria-label="Coupon code"
                  className="input uppercase"
                  autoComplete="off"
                />
                {refCode && <input type="hidden" name="ref" value={refCode} />}
                <button className="btn btn-secondary" type="submit">Apply</button>
              </form>
              {couponNote && (
                <p role="status" className={`mt-2 text-sm font-medium ${couponNote.ok ? "text-good" : "text-bad"}`}>
                  {couponNote.text}{couponNote.ok && <Money paise={priced.discountPaise} />}
                </p>
              )}
            </section>
          </div>

          <aside>
            <div className="card p-6 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt>Price</dt><dd className="tabular-nums"><Money paise={priced.subtotalPaise} /></dd></div>
                {priced.discountPaise > 0 && (
                  <div className="flex justify-between text-good"><dt>Discount</dt><dd className="tabular-nums">−<Money paise={priced.discountPaise} /></dd></div>
                )}
                <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
                  <dt>Total</dt><dd className="tabular-nums"><Money paise={priced.totalPaise} /></dd>
                </div>
                {priced.gstPaise > 0 && (
                  <div className="flex justify-between text-xs text-muted"><dt>Includes GST ({product.gstRatePct}%)</dt><dd className="tabular-nums"><Money paise={priced.gstPaise} /></dd></div>
                )}
              </dl>
              <ActionForm action={action} className="mt-5 space-y-3">
                <input type="hidden" name="coupon" value={coupon ? coupon.code : ""} />
                <FormError />
                <SubmitButton pendingText="Creating order…" className="btn btn-primary btn-lg w-full">
                  {priced.totalPaise === 0 ? "Get access" : "Continue to payment"}
                </SubmitButton>
              </ActionForm>
              <Link href={`/c/${product.creator.handle}/${product.slug}`} className="mt-3 block text-center text-sm text-muted hover:text-ink">Back to product</Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
