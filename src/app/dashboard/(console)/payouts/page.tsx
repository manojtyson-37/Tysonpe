import type { Metadata } from "next";
import { DateCell, EmptyRow, Money, MoneyCell, PageHeader, StatStrip, Table, Td, Th, Tr } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";

// A constant, not `title="..."` in JSX: the style scan flags that spelling because on a host element it is a tooltip.
const PAGE_TITLE = "Payouts";
export const metadata: Metadata = { title: PAGE_TITLE };

// The table shows the latest 200 entries; the note below it appears only when more exist (a count, so exactly 200 says nothing).
const LEDGER_LIMIT = 200;

export default async function PayoutsPage() {
  const { creator } = await requireCreator();
  const where = { creatorId: creator.id, order: { status: "paid" } }; // refunded orders drop out
  const entries = await db.ledgerEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: LEDGER_LIMIT,
    include: { order: { include: { product: true, user: true } } },
  });
  // Totals come from the database over ALL entries; the table below shows only the latest 200.
  const [total, count] = await Promise.all([
    db.ledgerEntry.aggregate({
      where,
      _sum: { grossPaise: true, platformFeePaise: true, gatewayFeePaise: true, netPaise: true },
    }),
    db.ledgerEntry.count({ where }),
  ]);
  const sum = (k: "grossPaise" | "platformFeePaise" | "gatewayFeePaise" | "netPaise") => total._sum[k] ?? 0;
  // The plan is printed as stored: src/lib has fee rates per plan key but no display label for it.
  return (
    <>
      <PageHeader title={PAGE_TITLE} sub={`Plan: ${creator.planKey}. This ledger shows what each sale earns you.`} />
      <StatStrip
        items={[
          { label: "Gross sales", value: <Money paise={sum("grossPaise")} /> },
          { label: "Platform fees", value: <Money paise={sum("platformFeePaise")} sign="−" /> },
          { label: "Gateway fees", value: <Money paise={sum("gatewayFeePaise")} sign="−" /> },
          { label: "Net earnings", value: <Money paise={sum("netPaise")} /> },
        ]}
      />
      <Table aria-label="Ledger" stack className="mt-6">
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Order</Th>
            <Th align="right">Gross</Th>
            <Th align="right">Platform</Th>
            <Th align="right">Gateway</Th>
            <Th align="right">Net</Th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <EmptyRow colSpan={6} title="Nothing to pay out yet" body="Each paid order adds a line here with its fees and your net amount." />
          ) : (
            entries.map((e) => (
              <Tr key={e.id}>
                <DateCell date={e.createdAt} label="Date" className="text-muted" />
                <Td label="Order">
                  <p className="break-words font-medium">{e.order.product.title}</p>
                  <p className="t-meta break-words">{e.order.user.name}</p>
                </Td>
                <MoneyCell paise={e.grossPaise} label="Gross" mono />
                <MoneyCell paise={e.platformFeePaise} label="Platform" sign="−" tone="muted" mono />
                <MoneyCell paise={e.gatewayFeePaise} label="Gateway" sign="−" tone="muted" mono />
                <MoneyCell paise={e.netPaise} label="Net" mono className="font-semibold" />
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {count > entries.length && (
        <p className="t-meta mt-3">Showing the latest {entries.length} of {count} entries. Totals above include all of them.</p>
      )}
      <p className="t-meta mt-3">
        Ledger only. Tysonpe does not move money in this version and payments run in test mode, so these amounts are not bank transfers.
      </p>
    </>
  );
}
