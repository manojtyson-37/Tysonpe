import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { startCheckout } from "@/app/actions/checkout";
import { ActionForm, FormError, SubmitButton } from "@/components/form";
import { Money } from "@/components/ui";
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Your order</h2>
            <p className="mt-3 text-lg font-bold">{product.title}</p>
            <p className="text-sm text-muted">by {product.creator.displayName}</p>
          </section>

          <section className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Have a coupon?</h2>
            <form method="get" className="mt-3 flex gap-2">
              <input name="coupon" defaultValue={code} placeholder="ENTER CODE" aria-label="Coupon code" className="input uppercase" autoComplete="off" />
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
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt>Price</dt><dd><Money paise={priced.subtotalPaise} /></dd></div>
              {priced.discountPaise > 0 && (
                <div className="flex justify-between text-good"><dt>Discount</dt><dd>−<Money paise={priced.discountPaise} /></dd></div>
              )}
              <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
                <dt>Total</dt><dd><Money paise={priced.totalPaise} /></dd>
              </div>
              {priced.gstPaise > 0 && (
                <div className="flex justify-between text-xs text-muted"><dt>Includes GST ({product.gstRatePct}%)</dt><dd><Money paise={priced.gstPaise} /></dd></div>
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
  );
}
