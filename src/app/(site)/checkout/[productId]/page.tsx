import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { startCheckout } from "@/app/actions/checkout";
import { ActionForm, FormError, Input, SubmitButton } from "@/components/form";
import { IconArrowLeft } from "@/components/icons";
import { Button, Callout, MetricList, MetricRow, Money, PageHeader, Surface } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { priceOrder } from "@/lib/money";

export const metadata: Metadata = { title: "Checkout" };

const reasonText: Record<string, string> = {
  inactive: "This coupon is no longer active.",
  expired: "This coupon has expired.",
  exhausted: "This coupon has been fully redeemed.",
  invalid: "This coupon is not valid.",
};

export default async function CheckoutPage({ params, searchParams }: PageProps<"/checkout/[productId]">) {
  const { productId } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/checkout/${productId}`);

  const product = await db.product.findFirst({
    where: { id: productId, status: "published" },
    include: { creator: true },
  });
  if (!product) notFound();
  if (product.creator.userId === user.id) redirect(`/dashboard/products/${product.id}`);
  const enrolled = await db.enrollment.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  if (enrolled) redirect(`/library/${productId}`);

  const code = (typeof sp.coupon === "string" ? sp.coupon : "").trim().toUpperCase();
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

  const action = startCheckout.bind(null, product.id);
  const isFree = priced.totalPaise === 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader title="Checkout" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8">
        <div className="space-y-5">
          <Surface as="section" aria-labelledby="order-heading" padding="lg">
            <h2 id="order-heading" className="t-label">Your order</h2>
            <p className="mt-2 text-lg font-semibold">{product.title}</p>
            <p className="text-sm text-muted">by {product.creator.displayName}</p>
            <MetricList className="mt-4 border-t border-line">
              <MetricRow label="Price" value={<Money paise={priced.subtotalPaise} free />} />
              {priced.discountPaise > 0 && (
                <MetricRow
                  label="Discount"
                  sub={coupon ? coupon.code : undefined}
                  value={<Money paise={priced.discountPaise} sign="−" tone="good" />}
                />
              )}
              <MetricRow label="Total" value={<Money paise={priced.totalPaise} free />} strong />
              {priced.gstPaise > 0 && (
                <MetricRow label={`Includes GST (${product.gstRatePct}%)`} value={<Money paise={priced.gstPaise} />} />
              )}
            </MetricList>
          </Surface>

          <Surface as="section" aria-labelledby="coupon-heading" padding="lg">
            <h2 id="coupon-heading" className="t-label">Coupon</h2>
            <form method="get" className="mt-3 flex items-end gap-2">
              <Input
                name="coupon"
                label="Coupon code"
                defaultValue={code}
                placeholder="Enter code"
                autoComplete="off"
                className="min-w-0 flex-1 [&_input]:uppercase"
              />
              <Button type="submit" variant="secondary" className="pointer-coarse:min-h-11">Apply</Button>
            </form>
            {couponNote && (
              <Callout tone={couponNote.ok ? "good" : "bad"} className="mt-3">
                {couponNote.text}
                {couponNote.ok && <Money paise={priced.discountPaise} />}
                {couponNote.ok && "."}
              </Callout>
            )}
          </Surface>
        </div>

        <aside aria-label="Order total">
          <Surface padding="lg">
            <p className="t-label">Total</p>
            <p className="mt-1.5">
              <Money paise={priced.totalPaise} free size="xl" />
            </p>
            <ActionForm action={action} className="mt-5 space-y-3">
              <input type="hidden" name="coupon" value={coupon ? coupon.code : ""} />
              <FormError />
              <SubmitButton pendingText="Creating order…" size="lg" className="w-full">
                {isFree ? "Get access" : "Continue to payment"}
              </SubmitButton>
            </ActionForm>
            <Link
              href={`/c/${product.creator.handle}/${product.slug}`}
              className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted transition-colors hover:text-ink pointer-coarse:min-h-11"
            >
              <IconArrowLeft size={16} />
              Back to product
            </Link>
          </Surface>
        </aside>
      </div>
    </div>
  );
}
