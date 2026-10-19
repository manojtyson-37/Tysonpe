import type { Metadata } from "next";
import Link from "next/link";
import { UpiIcon, JodoPayIcon } from "@/components/gateway-icons";
import { Empty, Money, PageHeader, Stat, dateFmt } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getCreatorIntegrations } from "@/lib/integrations/service";
import { CreatorGatewaysConfigPanel } from "@/components/dashboard/CreatorGatewaysConfigPanel";

export const metadata: Metadata = { title: "Payouts & Payment Methods" };

export default async function PayoutsPage() {
  const { creator } = await requireCreator();
  const [entries, total, count, integrations] = await Promise.all([
    db.ledgerEntry.findMany({
      where: { creatorId: creator.id, order: { status: "paid" } }, // refunded orders drop out
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { order: { include: { product: true, user: true } } },
    }),
    db.ledgerEntry.aggregate({
      where: { creatorId: creator.id, order: { status: "paid" } },
      _sum: { grossPaise: true, platformFeePaise: true, gatewayFeePaise: true, netPaise: true },
    }),
    db.ledgerEntry.count({ where: { creatorId: creator.id, order: { status: "paid" } } }),
    getCreatorIntegrations(creator.id),
  ]);
  const sum = (k: "grossPaise" | "platformFeePaise" | "gatewayFeePaise" | "netPaise") => total._sum[k] ?? 0;
  return (
    <>
      <PageHeader title="Payouts & Payment Gateway" sub={`Plan: ${creator.planKey}. Reconciles your payment gateways, UPI settlements, and sales ledger.`} />

      {/* Payment Gateways Dynamic Configuration */}
      <CreatorGatewaysConfigPanel initialConfig={integrations.paymentGateways} />

      {/* Gateway Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Receiving Settlement UPI Card */}
        <div className="card p-4 flex flex-col justify-between gap-3 border-line/80 bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-good-soft flex items-center justify-center text-good font-bold shrink-0">
              <UpiIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Settlement UPI Handle</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  creator.payoutUpiId ? "bg-good-soft text-good" : "bg-amber-500/10 text-amber-800"
                }`}>
                  {creator.payoutUpiId ? "Connected" : "Action Needed"}
                </span>
              </div>
              <p className="text-sm font-mono font-semibold text-ink mt-0.5">
                {creator.payoutUpiId || "No UPI ID configured"}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="text-xs font-semibold text-brand hover:underline self-start shrink-0"
          >
            {creator.payoutUpiId ? "Update UPI ID →" : "Set Up UPI ID →"}
          </Link>
        </div>

        {/* Jodo Payment Gateway Card */}
        <div className="card p-4 flex flex-col justify-between gap-3 border-line/80 bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0C1B33] flex items-center justify-center shrink-0">
              <JodoPayIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Jodo Pay Gateway</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                  DevTest1 Live
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Create Order API · Hosted Checkout · Auto Course Unlock
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/payment/jodo"
              target="_blank"
              className="text-xs font-bold text-brand hover:underline"
            >
              Test Live Jodo Checkout ↗
            </Link>
            <span className="text-line">·</span>
            <Link
              href="/dashboard/integrations"
              className="text-xs font-medium text-muted hover:text-ink hover:underline"
            >
              Inbound Webhooks
            </Link>
          </div>
        </div>
      </div>


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
