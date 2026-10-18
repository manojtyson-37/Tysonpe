import Link from "next/link";
import { HomeInteractiveDemo } from "@/components/HomeInteractiveDemo";
import { Logo } from "@/components/Logo";
import { CheckoutFragment, InvoiceFragment, PayoutsFragment } from "@/components/landing/Fragments";
import { HeroLedger } from "@/components/landing/HeroLedger";
import { ButtonLink, MoneyCell, Table, Td, HeadRow, Th } from "@/components/ui";
import { DEMO_HANDLE } from "@/lib/demo";
import { DEFAULT_LEDGER, PLAN_OPTIONS, ledgerFor } from "@/lib/landing-ledger";
import { formatINR } from "@/lib/money";
import { GST_RATES } from "@/lib/validation";

// Every figure on this page is derived from the one sample sale in landing-ledger.ts, which runs money.ts.
const SALE = DEFAULT_LEDGER;
const SALE_TEXT = formatINR(SALE.salePaise);
const NET_TEXT = formatINR(SALE.netPaise);

const BUILT = [
  { name: "Courses and lessons", note: "Sections, drip schedules, quizzes with attempt limits, progress and verifiable completion certificates.", status: "Beta" },
  { name: "Storefront and checkout", note: "A page at /c/your-handle. Coupons, GST-inclusive pricing, and checkout by UPI or cards.", status: "Test mode" },
  { name: "GST invoices and payout ledger", note: "A numbered tax invoice for every paid order. The ledger splits platform fee, gateway fee and your net.", status: "Test mode" },
  { name: "Community and points", note: "Channels with posts, comments and likes, points and levels, a leaderboard, and pin, delete and ban tools for the creator.", status: "Beta" },
];

const NOT_BUILT = [
  { name: "Live sessions and bookings", note: "Paid webinars and 1:1 calls with slots and reminders.", status: "Not built" },
  { name: "Affiliates, funnels, cart recovery", note: "Growth tooling for creators who already sell.", status: "Not built" },
  { name: "Paid plan billing", note: "Every creator is on Basic. Pro, Advanced and Ultimate prices below are drafts.", status: "Not live" },
];

// One row per plan, each run through the same ledger maths as the hero at the default sale.
const PLANS = PLAN_OPTIONS.map((p) => ({ ...p, ledger: ledgerFor(SALE.rupees, SALE.gstRate, p.key) }));

// The marketing page limits all-caps micro-labels, so the table heads read as ordinary 14px text (utilities beat the components-layer label style).
const HEAD = "normal-case tracking-normal text-sm";

type StatusRow = { name: string; note: string; status: string };
function StatusList({ rows, muted = false }: { rows: StatusRow[]; muted?: boolean }) {
  return (
    <ul>
      {rows.map((f) => (
        <li key={f.name} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[1fr_auto] sm:gap-6">
          <div>
            <p className={`text-base font-semibold ${muted ? "text-muted" : ""}`}>{f.name}</p>
            <p className="mt-1 max-w-lg text-base leading-relaxed text-muted">{f.note}</p>
          </div>
          <p className="text-sm text-muted sm:pt-1">{f.status}</p>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <div>
      {/* Hero: the headline and the live ledger come from the same sale. */}
      <section data-layout="hero-split" aria-labelledby="hero-h" className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-16 lg:pb-28">
          <div>
            <h1 id="hero-h" className="text-[2rem] font-semibold leading-[1.06] sm:text-5xl xl:text-6xl">
              <span className="block">{SALE_TEXT} sale.</span>{" "}
              <span className="block">
                <span className="tabular-nums text-good">{NET_TEXT}</span> net.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Storefront, UPI and card checkout, numbered GST invoices and a payout ledger for creators in India. Change the
              price, GST rate or plan beside this and the rows follow; they come from the code that writes your ledger.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ButtonLink href="/signup?role=creator" size="lg">Open a storefront</ButtonLink>
              <a
                href="#sandbox-demo"
                className="inline-flex items-center text-sm font-semibold text-ink underline decoration-line decoration-2 underline-offset-4 transition-colors hover:decoration-ink pointer-coarse:min-h-11"
              >
                Run a test checkout
              </a>
            </div>
            <p className="mt-4 text-sm text-muted">Test mode: no real money moves.</p>
          </div>
          <HeroLedger gstRates={GST_RATES} />
        </div>
      </section>

      {/* Interactive checkout simulation: HomeInteractiveDemo and its tabs live in components/demo. */}
      <section id="sandbox-demo" data-layout="header-split-wide" aria-labelledby="demo-h" className="border-b border-line py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
            <h2 id="demo-h" className="text-3xl font-semibold sm:text-4xl">Pay the way your learners will.</h2>
            <p className="max-w-lg text-base leading-relaxed text-muted lg:pt-2">
              Scan the QR or tap a UPI app, then watch the order, GST invoice and course access appear. Switch to the
              Easebuzz tab for the redirect flow, or the fee calculator to see what you keep per month.
            </p>
          </div>
          <div className="mt-12">
            <HomeInteractiveDemo />
          </div>
        </div>
      </section>

      {/* The learner's side: checkout, then the invoice. */}
      <section data-layout="sticky-left-fragments" aria-labelledby="trail-h" className="border-b border-line py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h2 id="trail-h" className="text-3xl font-semibold sm:text-4xl">What the learner sees, and what they keep.</h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
              The checkout shows the GST that is already inside the total. Once the order is paid it becomes a numbered tax
              invoice with that GST split out.
            </p>
          </div>
          <div className="divide-y divide-line">
            <div className="pb-12">
              <h3 className="text-lg font-semibold">At checkout</h3>
              <p className="mt-1 max-w-md text-base leading-relaxed text-muted">Price, coupon and the GST inside the total, then a gateway.</p>
              <div className="mt-6"><CheckoutFragment /></div>
            </div>
            <div className="pt-12">
              <h3 className="text-lg font-semibold">After payment</h3>
              <p className="mt-1 max-w-md text-base leading-relaxed text-muted">A tax invoice for the order, kept with the learner and the creator.</p>
              <div className="mt-6"><InvoiceFragment /></div>
            </div>
          </div>
        </div>
      </section>

      {/* The creator's side: the payouts strip. */}
      <section data-layout="strip" aria-labelledby="payouts-h" className="border-b border-line py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="payouts-h" className="max-w-2xl text-3xl font-semibold sm:text-4xl">Your payouts page shows the same split.</h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Gross sales, platform fees, gateway fees and net earnings for every paid order, in one ledger.
          </p>
          <div className="mt-10"><PayoutsFragment /></div>
        </div>
      </section>

      {/* Honest status: working today vs not built */}
      <section data-layout="sticky-left-rules" aria-labelledby="status-h" className="border-b border-line bg-surface-2/50 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h2 id="status-h" className="text-3xl font-semibold sm:text-4xl">What works today, and what doesn&apos;t.</h2>
            {DEMO_HANDLE && (
              <Link
                href={`/c/${DEMO_HANDLE}`}
                className="mt-6 inline-flex items-center text-sm font-semibold underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink pointer-coarse:min-h-11"
              >
                Open the sample storefront
              </Link>
            )}
          </div>
          <div>
            <h3 className="border-b border-ink pb-2 text-base font-semibold">Working</h3>
            <StatusList rows={BUILT} />
            <h3 className="mt-12 border-b border-ink pb-2 text-base font-semibold">Not built or not live</h3>
            <StatusList rows={NOT_BUILT} muted />
          </div>
        </div>
      </section>

      {/* Fees: one table, figures computed from the ledger maths */}
      <section id="pricing" data-layout="table" aria-labelledby="fees-h" className="border-b border-line py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="fees-h" className="max-w-2xl text-3xl font-semibold sm:text-4xl">
            What lands in the ledger from one {SALE_TEXT} sale, by plan.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Every creator is on Basic today with no monthly fee. The other plans are draft pricing and billing is not live.
          </p>
          {/* Plain rows (marketing rows are not clickable, so no Tr hover fill) that still carry the role="row" the Table pins for WebKit's stack mode. */}
          <Table caption={`Fees by plan for one ${SALE_TEXT} sale`} stack labelCase="sentence" className="mt-10">
            <thead>
              <HeadRow>
                <Th className={HEAD}>Plan</Th>
                <Th align="right" className={HEAD}>Monthly</Th>
                <Th align="right" className={HEAD}>Platform fee</Th>
                <Th align="right" className={HEAD}>Gateway fee</Th>
                <Th align="right" className={HEAD}>Net after fees</Th>
              </HeadRow>
            </thead>
            <tbody>
              {PLANS.map((p) => (
                <tr key={p.key} role="row" className={p.live ? "bg-surface" : "text-muted"}>
                  <Td label="Plan">
                    {/* One flex item, so the stacked mobile row keeps the name and its status together. */}
                    <span>
                      <span className="font-semibold">{p.name}</span>
                      <span className="ml-2 text-sm text-muted">{p.live ? "Available now" : "Draft"}</span>
                    </span>
                  </Td>
                  <MoneyCell label="Monthly" paise={p.monthlyPaise} mono />
                  <Td label="Platform fee" align="right" className="font-mono tabular-nums">{p.ledger.platformRate}</Td>
                  <Td label="Gateway fee" align="right" className="font-mono tabular-nums">{p.ledger.gatewayRate}</Td>
                  <MoneyCell label="Net after fees" paise={p.ledger.netPaise} tone={p.live ? "good" : "default"} mono className="font-semibold" />
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="mt-4 max-w-xl text-sm text-muted">
            Amounts are GST-inclusive and before the GST you remit. Plan monthly fees are not netted here.
          </p>
        </div>
      </section>

      {/* Closing band: the wordmark at display size and the page's last call to action. */}
      <section data-layout="wordmark" aria-labelledby="close-h" className="bg-surface-2 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Logo bakes in text-xl and a 26px mark; the child selectors outrank it by specificity, so no important flag is needed. */}
          <div className="[&>span]:text-5xl sm:[&>span]:text-7xl [&_svg]:size-10 sm:[&_svg]:size-14">
            <Logo />
          </div>
          <div className="mt-12 flex flex-col gap-8 border-t border-line pt-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <h2 id="close-h" className="text-3xl font-semibold sm:text-4xl">See where every {SALE_TEXT} goes.</h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Open a storefront in test mode, publish a course and watch checkout, the GST invoice and enrolment happen end to end.
              </p>
            </div>
            <ButtonLink href="/signup?role=creator" size="lg">Open a storefront</ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
