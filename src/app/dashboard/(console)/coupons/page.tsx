import { ConfirmButton } from "@/components/ConfirmButton";
import type { Metadata } from "next";
import { createCoupon, deleteCoupon, setCouponActive, updateCoupon } from "@/app/actions/creator";
import { CouponForm } from "@/components/CouponForm";
import { Money, PageHeader, dateFmt } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const { creator } = await requireCreator();
  const coupons = await db.coupon.findMany({ where: { creatorId: creator.id }, orderBy: { createdAt: "desc" } });
  const now = nowMs();
  return (
    <>
      <PageHeader title="Coupons" sub="Discount codes buyers enter at checkout." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {coupons.length === 0 && <p className="card p-6 text-sm text-muted">No coupons yet. Create one on the right.</p>}
          {coupons.map((c) => {
            const expired = !!c.expiresAt && c.expiresAt.getTime() <= now;
            const exhausted = c.maxRedemptions !== null && c.redeemed >= c.maxRedemptions;
            const status = !c.active ? "inactive" : expired || exhausted ? "failed" : "active";
            return (
              <div key={c.id} className="card">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                    <code className="rounded-md bg-surface-2 px-2 py-1 text-sm font-bold">{c.code}</code>
                    <span className="font-semibold">{c.percentOff ? `${c.percentOff}% off` : <><Money paise={c.flatOffPaise ?? 0} /> off</>}</span>
                    <span className="text-xs text-muted">{c.redeemed}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""} used · {c.expiresAt ? `until ${dateFmt(c.expiresAt)}` : "no expiry"}</span>
                    <span className="ml-auto"><span className={`badge ${status === "active" ? "badge-good" : status === "failed" ? "badge-bad" : "badge-muted"}`}>{status === "failed" ? (expired ? "expired" : "used up") : status}</span></span>
                  </summary>
                  <div className="space-y-4 border-t border-line p-5">
                    <CouponForm action={updateCoupon.bind(null, c.id)} coupon={c} submitLabel="Save coupon" />
                    <div className="flex gap-2 border-t border-line pt-3">
                      <form action={setCouponActive.bind(null, c.id, !c.active)}><button className="btn btn-secondary btn-sm">{c.active ? "Deactivate" : "Activate"}</button></form>
                      <form action={deleteCoupon.bind(null, c.id)} className="ml-auto"><ConfirmButton className="btn btn-danger btn-sm" message="Delete this coupon? Coupons already used are deactivated instead.">Delete</ConfirmButton></form>
                    </div>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
        <section className="card h-fit p-5 xl:sticky xl:top-24">
          <h2 className="mb-3 font-semibold">New coupon</h2>
          <CouponForm action={createCoupon} submitLabel="Create coupon" />
        </section>
      </div>
    </>
  );
}
