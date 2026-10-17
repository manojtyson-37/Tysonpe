import type { Metadata } from "next";
import { refundOrderAction } from "@/app/actions/creator";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  Badge,
  ButtonLink,
  Callout,
  DateCell,
  EmptyRow,
  MoneyCell,
  PageHeader,
  RowActions,
  StatusBadge,
  Table,
  Tabs,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";

// A constant, not `title="..."` in JSX: the style scan flags that spelling because on a host element it is a tooltip.
const PAGE_TITLE = "Orders";
export const metadata: Metadata = { title: PAGE_TITLE };

const FILTERS = ["all", "paid", "refunded", "failed", "created"] as const;
type Filter = (typeof FILTERS)[number];
// "created" is a checkout that has not been paid yet; creators read it as Pending.
const FILTER_LABEL: Record<Filter, string> = { all: "All", paid: "Paid", refunded: "Refunded", failed: "Failed", created: "Pending" };

// The cap keeps a busy account from loading an unbounded page; the note below the table appears only when more
// orders match than are shown (a count, so exactly 200 says nothing).
const ORDER_LIMIT = 200;
const COARSE = "pointer-coarse:min-h-11";

// What marking refunded really does (see refundOrder): access and payout effects only. No gateway is called, and the
// gateway may be the demo one, so the copy names no provider.
const REFUND_CONFIRM =
  "Mark this order refunded? The buyer loses access immediately. This does not return any money: refund it through your payment gateway.";

export default async function OrdersPage({ searchParams }: PageProps<"/dashboard/orders">) {
  const { creator } = await requireCreator();
  const sp = await searchParams;
  const status = FILTERS.find((f) => f === sp.status) ?? "all";
  const where = { creatorId: creator.id, ...(status === "all" ? {} : { status }) };
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: ORDER_LIMIT,
      include: { user: true, product: true, coupon: true },
    }),
    db.order.count({ where }),
  ]);
  const emptyTitle = status === "all" ? "No orders yet" : `No ${FILTER_LABEL[status].toLowerCase()} orders`;
  return (
    <>
      <PageHeader title={PAGE_TITLE} sub="Every checkout, with its outcome." />
      {typeof sp.error === "string" && (
        <Callout tone="bad" className="mb-4">{sp.error.slice(0, 200)}</Callout>
      )}
      <Tabs
        ariaLabel="Filter by status"
        className="mb-4 flex-wrap"
        items={FILTERS.map((f) => ({
          href: f === "all" ? "/dashboard/orders" : `/dashboard/orders?status=${f}`,
          label: FILTER_LABEL[f],
          current: status === f,
        }))}
      />
      <Table aria-label="Orders" stack>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Buyer</Th>
            <Th>Product</Th>
            <Th align="right">Total</Th>
            <Th>Status</Th>
            <Th><span className="sr-only">Actions</span></Th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <EmptyRow
              colSpan={6}
              title={emptyTitle}
              body={status === "all" ? "Orders appear as soon as someone starts checkout." : "No orders have this status."}
            />
          ) : (
            orders.map((o) => (
              <Tr key={o.id}>
                <DateCell date={o.createdAt} label="Date" className="text-muted" />
                <Td label="Buyer">
                  <div className="min-w-0 max-w-xs">
                    <p className="truncate font-medium">{o.user.name}</p>
                    <p className="t-meta truncate">{o.user.email}</p>
                  </div>
                </Td>
                <Td label="Product">
                  <div className="flex min-w-0 max-w-xs flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="break-words">{o.product.title}</span>
                    {o.coupon && <Badge>{o.coupon.code}</Badge>}
                  </div>
                </Td>
                <MoneyCell paise={o.totalPaise} label="Total" className="font-semibold" />
                <Td label="Status"><StatusBadge status={o.status} /></Td>
                <RowActions>
                  {(o.status === "paid" || o.status === "refunded") && (
                    <ButtonLink
                      variant="ghost"
                      size="sm"
                      href={`/orders/${o.id}/invoice`}
                      aria-label={`Invoice for ${o.product.title}, ${o.user.name}`}
                      className={COARSE}
                    >
                      Invoice
                    </ButtonLink>
                  )}
                  {o.status === "paid" && (
                    <form action={refundOrderAction.bind(null, o.id)}>
                      <ConfirmButton
                        className={COARSE}
                        aria-label={`Mark refunded: ${o.product.title}, ${o.user.name}`}
                        message={REFUND_CONFIRM}
                        confirmLabel="Mark refunded"
                      >
                        Mark refunded
                      </ConfirmButton>
                    </form>
                  )}
                </RowActions>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {total > orders.length && (
        <p className="t-meta mt-3">
          Showing the latest {orders.length} of {total} {status === "all" ? "" : `${FILTER_LABEL[status].toLowerCase()} `}orders.
        </p>
      )}
      <p className="t-meta mt-3">
        “Mark refunded” revokes the buyer&apos;s access and removes the order from payouts. It does not return any money: refund the buyer through your payment gateway.
      </p>
    </>
  );
}
