import type { Metadata } from "next";
import { createCoupon, deleteCoupon, setCouponActive, updateCoupon } from "@/app/actions/creator";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CouponForm } from "@/components/CouponForm";
import { IconChevronDown } from "@/components/icons";
import { Badge, Button, ButtonLink, Money, PageHeader } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { COUPON_STATUS_BADGE, couponStatus } from "@/lib/coupon";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { nowMs } from "@/lib/time";

// A constant, not `title="..."` in JSX: the style scan flags that spelling because on a host element it is a tooltip.
const PAGE_TITLE = "Coupons";
export const metadata: Metadata = { title: PAGE_TITLE };

const COARSE = "pointer-coarse:min-h-11";
// States the rule deleteCoupon applies, so the dialog never promises a delete that will not happen.
const DELETE_CONFIRM = "Delete this coupon? Coupons already used are deactivated instead.";

export default async function CouponsPage() {
  const { creator } = await requireCreator();
  const coupons = await db.coupon.findMany({ where: { creatorId: creator.id }, orderBy: { createdAt: "desc" } });
  const now = nowMs();
  return (
    <>
      <PageHeader
        title={PAGE_TITLE}
        sub="Discount codes buyers enter at checkout."
        actions={<ButtonLink href="#new-coupon" variant="secondary" size="sm" className="xl:hidden">New coupon</ButtonLink>}
      />
      <div className="flex flex-col gap-10 xl:grid xl:grid-cols-[1fr_380px] xl:gap-12">
        <div className="min-w-0">
          {coupons.length === 0 ? (
            <div className="border-y border-line py-10 text-center">
              <p className="text-sm font-semibold">No coupons yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Create a code with the form below. Buyers enter it at checkout.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line border-y border-line" aria-label="Coupons">
              {coupons.map((c) => {
                const status = COUPON_STATUS_BADGE[couponStatus(c, now)];
                return (
                  <li key={c.id}>
                    <details className="group">
                      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 py-3 [&::-webkit-details-marker]:hidden">
                        <code className="rounded-control bg-surface-2 px-2 py-1 font-mono text-sm font-semibold">{c.code}</code>
                        <span className="font-semibold">
                          {c.percentOff ? `${c.percentOff}% off` : <><Money paise={c.flatOffPaise ?? 0} /> off</>}
                        </span>
                        <span className="t-meta">
                          {c.redeemed}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""} used · {c.expiresAt ? `until ${formatDate(c.expiresAt)}` : "no expiry"}
                        </span>
                        <span className="ml-auto flex items-center gap-2">
                          <Badge tone={status.tone}>{status.label}</Badge>
                          <IconChevronDown size={16} className="text-muted transition-transform duration-(--dur-fast) ease-(--ease-standard) group-open:rotate-180" />
                        </span>
                      </summary>
                      <div className="space-y-4 border-t border-line pb-5 pt-4">
                        <CouponForm action={updateCoupon.bind(null, c.id)} coupon={c} submitLabel="Save coupon" />
                        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                          <form action={setCouponActive.bind(null, c.id, !c.active)}>
                            <Button type="submit" variant="secondary" size="sm" className={COARSE} aria-label={`${c.active ? "Deactivate" : "Activate"} coupon ${c.code}`}>
                              {c.active ? "Deactivate" : "Activate"}
                            </Button>
                          </form>
                          <form action={deleteCoupon.bind(null, c.id)} className="ml-auto">
                            <ConfirmButton className={COARSE} aria-label={`Delete coupon ${c.code}`} message={DELETE_CONFIRM} confirmLabel="Delete coupon">
                              Delete
                            </ConfirmButton>
                          </form>
                        </div>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <section id="new-coupon" aria-labelledby="new-coupon-h" className="scroll-mt-24 min-w-0 xl:border-l xl:border-line xl:pl-8">
          <h2 id="new-coupon-h" className="mb-3 text-base font-semibold">New coupon</h2>
          <CouponForm action={createCoupon} submitLabel="Create coupon" />
        </section>
      </div>
    </>
  );
}
