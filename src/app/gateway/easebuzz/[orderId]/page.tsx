import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isOrderFresh } from "@/lib/orders";
import { EasebuzzHostedPage } from "./EasebuzzHostedPage";

export const metadata: Metadata = {
  title: "Easebuzz Payment Gateway — Demo",
};

export default async function EasebuzzGatewayRoute({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const user = await requireUser();
  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { product: true },
  });

  if (!order) notFound();
  if (order.status === "paid") redirect(`/checkout/success/${order.id}`);
  if (order.status === "refunded") redirect("/library");
  if (!isOrderFresh(order.createdAt)) redirect(`/checkout/${order.productId}`);

  return <EasebuzzHostedPage order={order} user={user} />;
}
