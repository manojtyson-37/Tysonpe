import Link from "next/link";
import { HomeInteractiveDemo } from "@/components/HomeInteractiveDemo";
import { DEMO_HANDLE } from "@/lib/demo";
import { feeBreakdown, formatINR, gstComponent, planRates } from "@/lib/money";

const SALE_PRICE = 2999;
const salePaise = SALE_PRICE * 100;
const saleGst = gstComponent(salePaise, 18);
const saleFees = feeBreakdown(salePaise, "basic");
const saleRates = planRates("basic");
const SALE_ROWS = [
  { label: "Learner pays, GST included", value: formatINR(salePaise) },
  { label: "of which GST at 18%", value: formatINR(saleGst), sub: true },
  { label: `Platform fee, Basic ${saleRates.platform}`, value: `− ${formatINR(saleFees.platformFeePaise)}` },
  { label: `Gateway fee ${saleRates.gateway}`, value: `− ${formatINR(saleFees.gatewayFeePaise)}` },
];

const BUILT = [
  { name: "Courses and lessons", note: "Sections, drip schedules, quizzes with attempt limits, progress and verifiable completion certificates.", tag: "Beta" },
  { name: "Storefront and checkout", note: "A page at /c/your-handle. Coupons, GST-inclusive pricing, UPI and card checkout.", tag: "Test mode" },
  { name: "GST invoices and payout ledger", note: "A numbered tax invoice for every paid order. The ledger splits platform fee, gateway fee and your net.", tag: "Test mode" },
];

const NOT_BUILT = [
  { name: "Community and gamification", note: "Channels, posts, points and a leaderboard exist in the demo and are still being finished." },
  { name: "Live sessions and bookings", note: "Paid webinars and 1:1 calls with slots and reminders." },
  { name: "Affiliates, funnels, cart recovery", note: "Growth tooling for creators who already sell." },
  { name: "Paid plan billing", note: "Every creator is on Basic. Pro, Advanced and Ultimate prices below are drafts." },
];

const PLANS = [
  { key: "basic", name: "Basic", monthly: "₹0", live: true },
  { key: "pro", name: "Pro", monthly: "₹5,000", live: false },
  { key: "advanced", name: "Advanced", monthly: "₹15,000", live: false },
  { key: "ultimate", name: "Ultimate", monthly: "₹30,000", live: false },
].map((p) => ({ ...p, rates: planRates(p.key), net: feeBreakdown(salePaise, p.key).netPaise }));

export default function Home() {
  return (
    <div>
      {/* Hero: one concrete sale, computed by the same functions the ledger runs. */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-16 lg:pb-24">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" aria-hidden />
              Test-mode beta · no real money moves
            </p>
            <h1 className="mt-5 text-[2rem] font-semibold leading-[1.06] tracking-[-0.035em] sm:text-5xl lg:text-[3.6rem]">
              Sell a ₹{SALE_PRICE.toLocaleString("en-IN")} course.
              <br />
              Net <span className="tabular-nums text-good">{formatINR(saleFees.netPaise)}</span> after fees.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Storefront, UPI and card checkout, numbered GST invoices and a payout ledger for creators in India. The
              figures on the right come from the same code that writes your ledger.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/signup?role=creator" className="btn btn-primary btn-lg">Start selling free</Link>
              <a href="#sandbox-demo" className="text-sm font-semibold text-ink underline decoration-line decoration-2 underline-offset-4 transition-colors hover:decoration-ink">
                Run a test checkout
              </a>
            </div>
          </div>

          <figure className="relative">
            <div className="rounded-lg border border-line bg-surface font-mono text-[13px] tabular-nums shadow-[0_1px_3px_rgba(22,19,15,0.05),0_10px_28px_rgba(22,19,15,0.04)]">
              <div className="flex items-baseline justify-between border-b border-dashed border-line px-5 py-3.5 text-[11px] uppercase tracking-wider text-muted">
                <span>Order ledger · sample</span>
                <span>Test mode</span>
              </div>
              <dl className="px-5 py-2">
                {SALE_ROWS.map((r) => (
                  <div key={r.label} className="flex items-baseline justify-between gap-4 py-2">
                    <dt className={`min-w-0 ${r.sub ? "pl-4 text-muted" : "text-ink"}`}>{r.label}</dt>
                    <dd className={r.sub ? "text-muted" : "text-ink"}>{r.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex items-baseline justify-between border-t border-ink px-5 py-4">
                <span className="font-semibold">Net after fees</span>
                <span className="text-xl font-semibold text-good">{formatINR(saleFees.netPaise)}</span>
              </div>
            </div>
            <figcaption className="mt-3 text-xs text-muted">
              Basic plan. The ₹457.47 GST sits inside the price and is yours to remit; the ledger does not deduct it. Real settlement starts after launch.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Interactive checkout simulation */}
      <section id="sandbox-demo" className="scroll-mt-14 border-b border-line py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Checkout, simulated</p>
              <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Pay the way your learners will.</h2>
            </div>
            <p className="max-w-lg text-sm leading-relaxed text-muted lg:pt-7">
              Scan the QR or tap a UPI app, then watch the order, GST invoice and course access appear. Switch to the
              Easebuzz tab for the redirect flow, or the fee calculator to see what you keep per month.
            </p>
          </div>
          <div className="mt-10">
            <HomeInteractiveDemo />
          </div>
        </div>
      </section>

      {/* Honest status: working today vs not built */}
      <section className="border-b border-line bg-surface-2/50 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Status</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">What works today, and what doesn&apos;t.</h2>
            {DEMO_HANDLE && (
              <Link href={`/c/${DEMO_HANDLE}`} className="mt-5 inline-block text-sm font-semibold underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink">
                Open the sample storefront
              </Link>
            )}
          </div>
          <div>
            <p className="border-b border-ink pb-2 text-xs font-semibold uppercase tracking-wider">Working</p>
            <ul>
              {BUILT.map((f) => (
                <li key={f.name} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[1fr_auto] sm:gap-6">
                  <div>
                    <h3 className="font-sans text-base font-semibold tracking-normal">{f.name}</h3>
                    <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">{f.note}</p>
                  </div>
                  <span className="font-mono text-xs text-good sm:pt-1">{f.tag}</span>
                </li>
              ))}
            </ul>
            <p className="mt-10 border-b border-line pb-2 text-xs font-semibold uppercase tracking-wider text-muted">In progress or planned</p>
            <ul>
              {NOT_BUILT.map((f) => (
                <li key={f.name} className="border-b border-line py-4">
                  <h3 className="font-sans text-base font-semibold tracking-normal text-muted">{f.name}</h3>
                  <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">{f.note}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Fees: one table, figures computed from the ledger maths */}
      <section id="pricing" className="scroll-mt-14 border-b border-line py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Fees</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold sm:text-4xl">
            What lands in the ledger from one ₹{SALE_PRICE.toLocaleString("en-IN")} sale, by plan.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Every creator is on Basic today with no monthly fee. The other plans are draft pricing and billing is not live.
          </p>
          <div className="mt-10 overflow-x-auto [mask-image:linear-gradient(to_right,#000_90%,transparent)] sm:[mask-image:none]">
            <table className="table min-w-[560px] tabular-nums">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Monthly</th>
                  <th>Platform fee</th>
                  <th>Gateway fee</th>
                  <th className="text-right">Net after fees</th>
                </tr>
              </thead>
              <tbody>
                {PLANS.map((p) => (
                  <tr key={p.key} className={p.live ? "bg-surface" : "text-muted"}>
                    <td className="font-semibold">
                      {p.name}
                      <span className={`ml-2 font-mono text-xs font-normal ${p.live ? "text-good" : "text-muted"}`}>
                        {p.live ? "available" : "draft"}
                      </span>
                    </td>
                    <td className="font-mono">{p.monthly}</td>
                    <td className="font-mono">{p.rates.platform}</td>
                    <td className="font-mono">{p.rates.gateway}</td>
                    <td className={`text-right font-mono font-semibold ${p.live ? "text-good" : ""}`}>{formatINR(p.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted">Amounts are GST-inclusive and before the GST you remit. Plan monthly fees are not netted here.</p>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold sm:text-4xl">See where every ₹{SALE_PRICE.toLocaleString("en-IN")} goes.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              Open a storefront in test mode, publish a course and watch checkout, the GST invoice and enrolment happen end to end.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/signup?role=creator" className="btn btn-primary btn-lg">Start selling free</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
