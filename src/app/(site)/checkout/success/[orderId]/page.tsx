import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Money } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "You're in" };

export default async function SuccessPage({ params }: PageProps<"/checkout/success/[orderId]">) {
  const { orderId } = await params;
  const user = await requireUser();
  const order = await db.order.findFirst({ where: { id: orderId, userId: user.id }, include: { product: true, creator: true } });
  if (!order) notFound();
  if (order.status !== "paid") redirect(`/checkout/pay/${order.id}`);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-good-soft text-2xl text-good" aria-hidden>✓</div>
      <h1 className="mt-5 text-3xl font-extrabold">You&apos;re in!</h1>
      <p className="mt-2 text-muted">
        {order.product.title} by {order.creator.displayName} is now in your library.
      </p>
      <div className="card mt-8 p-5 text-left text-sm">
        <div className="flex justify-between"><span className="text-muted">Invoice</span><span className="font-mono">{order.invoiceNo}</span></div>
        <div className="mt-2 flex justify-between"><span className="text-muted">{order.totalPaise === 0 ? "Total" : "Paid"}</span><span className="font-semibold">{order.totalPaise === 0 ? "Free" : <Money paise={order.totalPaise} />}</span></div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={`/library/${order.productId}`} className="btn btn-primary btn-lg">Start now</Link>
        <Link href={`/orders/${order.id}/invoice`} className="btn btn-secondary btn-lg">View invoice</Link>
      </div>
    </div>
  );
}
