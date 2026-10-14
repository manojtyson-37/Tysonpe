import type { Metadata } from "next";
import { Empty, Money, PageHeader, Stat, dateFmt } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Payouts" };

export default async function PayoutsPage() {
  const { creator } = await requireCreator();
  const entries = await db.ledgerEntry.findMany({
    where: { creatorId: creator.id, order: { status: "paid" } }, // refunded orders drop out
    orderBy: { createdAt: "desc" }, take: 200,
    include: { order: { include: { product: true, user: true } } },
  });
  // Totals come from the database over ALL entries; the table below shows only the latest 200.
  const [total, count] = await Promise.all([
    db.ledgerEntry.aggregate({
      where: { creatorId: creator.id, order: { status: "paid" } },
      _sum: { grossPaise: true, platformFeePaise: true, gatewayFeePaise: true, netPaise: true },
    }),
    db.ledgerEntry.count({ where: { creatorId: creator.id, order: { status: "paid" } } }),
  ]);
  const sum = (k: "grossPaise" | "platformFeePaise" | "gatewayFeePaise" | "netPaise") => total._sum[k] ?? 0;
  return (
    <>
      <PageHeader title="Payouts" sub={`Plan: ${creator.planKey}. This ledger shows what each sale earns you.`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Gross sales" value={<Money paise={sum("grossPaise")} />} />
        <Stat label="Platform fees" value={<Money paise={sum("platformFeePaise")} />} />
        <Stat label="Gateway fees" value={<Money paise={sum("gatewayFeePaise")} />} />
        <Stat label="Net earnings" value={<Money paise={sum("netPaise")} />} />
      </div>
      <div className="mt-6">
        {entries.length === 0 ? (
          <Empty title="Nothing to pay out yet" body="Each paid order adds a line here with its fees and your net amount." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="table">
              <thead><tr><th>Date</th><th>Order</th><th className="text-right">Gross</th><th className="text-right">Platform</th><th className="text-right">Gateway</th><th className="text-right">Net</th></tr></thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-muted">{dateFmt(e.createdAt)}</td>
                    <td><p className="font-medium">{e.order.product.title}</p><p className="text-xs text-muted">{e.order.user.name}</p></td>
                    <td className="text-right tabular-nums"><Money paise={e.grossPaise} /></td>
                    <td className="text-right tabular-nums text-muted">−<Money paise={e.platformFeePaise} /></td>
                    <td className="text-right tabular-nums text-muted">−<Money paise={e.gatewayFeePaise} /></td>
                    <td className="text-right font-semibold tabular-nums"><Money paise={e.netPaise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {count > entries.length && <p className="mt-3 text-xs text-muted">Showing the latest {entries.length} of {count} entries. Totals above include all of them.</p>}
      <p className="mt-3 text-xs text-muted">Ledger only. Settlements arrive in your Razorpay account on its own schedule; Tysonpe does not move money in this version.</p>
    </>
  );
}
