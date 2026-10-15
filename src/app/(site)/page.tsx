import Link from "next/link";
import { AuroraHero } from "@/components/AuroraHero";
import { HomeInteractiveDemo } from "@/components/HomeInteractiveDemo";
import { DEMO_HANDLE } from "@/lib/demo";
import { feeBreakdown, formatINR, gstComponent } from "@/lib/money";

const SALE_PRICE = 2999;
const salePaise = SALE_PRICE * 100;
const saleGst = gstComponent(salePaise, 18);
const saleFees = feeBreakdown(salePaise, "basic");
const SALE_ROWS = [
  { label: "Learner pays (GST-inclusive)", value: formatINR(salePaise) },
  { label: "  of which GST @ 18%", value: formatINR(saleGst) },
  { label: "Platform fee (Basic, 10%)", value: `− ${formatINR(saleFees.platformFeePaise)}` },
  { label: "Gateway fee (2%)", value: `− ${formatINR(saleFees.gatewayFeePaise)}` },
  { label: "Creator net", value: formatINR(saleFees.netPaise), strong: true },
];

const creatorFormats = [
  {
    title: "Video courses & LMS",
    desc: "Sections and lessons, drip schedules, quizzes with attempt limits, progress tracking and verifiable completion certificates.",
    tag: "Live",
    stat: "Beta",
    live: true,
  },
  {
    title: "Storefront & checkout",
    desc: "Branded creator page at /c/your-handle. Coupons, GST-inclusive pricing, UPI and card checkout in test mode.",
    tag: "Live",
    stat: "Test mode",
    live: true,
  },
  {
    title: "GST invoices & payout ledger",
    desc: "A numbered tax invoice for every paid order, and a ledger that splits platform fee, gateway fee and your net payout.",
    tag: "Live",
    stat: "SAC 999293",
    live: true,
  },
  {
    title: "Community & gamification",
    desc: "Discussion spaces, points and badges for learners. Design is written; build starts after the beta demo.",
    tag: "Planned",
    stat: "Next",
    live: false,
  },
  {
    title: "Live sessions & bookings",
    desc: "Paid webinars and 1:1 calls with slots and reminders. Not built yet.",
    tag: "Planned",
    stat: "Roadmap",
    live: false,
  },
  {
    title: "Growth tools",
    desc: "Affiliates, funnels and abandoned-cart recovery. Not built yet.",
    tag: "Planned",
    stat: "Roadmap",
    live: false,
  },
];

const plans = [
  {
    name: "Basic",
    price: "₹0",
    cadence: "Free forever",
    fee: "10%",
    note: "Zero fixed fee. Pay only when you sell.",
    features: [
      "Storefront at /c/your-handle",
      "Instant UPI QR & Cards",
      "GST-compliant tax invoices",
      "Course LMS library access",
    ],
    cta: "Start selling free",
    live: true,
  },
  {
    name: "Pro",
    price: "₹5,000",
    cadence: "/ month",
    fee: "5.5%",
    note: "Lower fee as your volume scales.",
    features: [
      "Everything in Basic",
      "Quiz gating & certificates",
      "Drip lesson scheduler",
      "Lower platform fee",
    ],
    cta: "Join Pro waitlist",
    live: false,
  },
  {
    name: "Advanced",
    price: "₹15,000",
    cadence: "/ month",
    fee: "3.5%",
    note: "For established creator academies.",
    features: [
      "Everything in Pro",
      "Lower platform fee",
      "Affiliate funnels (planned)",
    ],
    cta: "Contact sales",
    live: false,
  },
  {
    name: "Ultimate",
    price: "₹30,000",
    cadence: "/ month",
    fee: "0%",
    note: "1.5% gateway cost only. Pure volume.",
    features: [
      "Zero platform fee",
      "Gateway cost only",
      "Multi-seat team (planned)",
    ],
    cta: "Custom setup",
    live: false,
  },
];

export default function Home() {
  return (
    <div className="-mt-16 bg-[#08090d] text-white">
      {/* 1. Aurora-Style Cinematic Video Hero (Asymmetric Left-Anchored) */}
      <AuroraHero />

      {/* 2. Interactive Sandbox Simulation Section */}
      <section id="sandbox-demo" className="relative scroll-mt-16 border-b border-white/10 bg-[#08090d] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live Gateway Simulation
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Experience the Zero-Drop Checkout
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-400">
              Test how Indian learners experience instant UPI dynamic QR, one-tap mobile intent simulation, and automatic GST invoice delivery.
            </p>
          </div>

          <div className="mt-12 max-w-4xl mx-auto">
            <HomeInteractiveDemo />
          </div>
        </div>
      </section>

      {/* 4. The 6 Product Formats */}
      <section className="border-b border-white/10 bg-[#08090d] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Product status
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                What is built, and what is next.
              </h2>
            </div>
            {DEMO_HANDLE && (
              <Link
                href={`/c/${DEMO_HANDLE}`}
                className="text-xs font-bold text-emerald-400 hover:underline inline-flex items-center gap-1 active:scale-[0.98]"
              >
                Browse the demo storefront →
              </Link>
            )}
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creatorFormats.map((f) => (
              <div
                key={f.title}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-white/[0.05]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${f.live ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/15 bg-white/5 text-slate-400"}`}>
                      {f.tag}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-300">{f.stat}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">{f.desc}</p>
                </div>
                <div className="mt-6 border-t border-white/10 pt-3 flex items-center justify-between text-xs font-semibold text-emerald-400">
                  <span>{f.live ? "Available in the beta" : "On the roadmap"}</span>
                  <span aria-hidden>{f.live ? "→" : "·"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Anatomy of one sale: real figures from the money module */}
      <section className="border-b border-white/10 bg-[#0a0c12] py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Where the money goes</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            One ₹{SALE_PRICE.toLocaleString("en-IN")} course sale, line by line.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            Prices are GST-inclusive. These are the same functions the ledger runs, shown for a Basic-plan creator.
          </p>
          <dl className="mt-10 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] font-mono text-sm tabular-nums">
            {SALE_ROWS.map((r) => (
              <div key={r.label} className={`flex items-baseline justify-between gap-4 px-5 py-3.5 ${r.strong ? "bg-emerald-500/[0.06]" : ""}`}>
                <dt className={r.strong ? "font-bold text-white" : "text-slate-400"}>{r.label}</dt>
                <dd className={r.strong ? "font-extrabold text-emerald-400" : "text-slate-200"}>{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 6. Transparent Pricing Matrix */}
      <section id="pricing" className="border-b border-white/10 bg-[#08090d] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-white">
              Transparent Economics
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Keep more of what you earn.
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Start on Basic with no monthly fee. Plan prices shown are drafts; paid plan billing is not live yet.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col justify-between rounded-2xl border p-6 transition-all duration-200 ${
                  p.live
                    ? "border-emerald-500/50 bg-white/[0.05] shadow-2xl ring-1 ring-emerald-500/30"
                    : "border-white/10 bg-white/[0.02] opacity-80"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-white">{p.name}</h3>
                    {p.live ? (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-400">
                        Coming Soon
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-3xl font-extrabold text-white">{p.price}</span>
                      <span className="text-xs text-slate-400">{p.cadence}</span>
                    </div>
                    <div className="mt-3 rounded-lg bg-white/[0.04] border border-white/10 p-2 text-center">
                      <p className="font-mono text-2xl font-black text-emerald-400">{p.fee}</p>
                      <p className="text-[11px] text-slate-400">{p.note}</p>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-400">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 border-t border-white/10 pt-4">
                  {p.live ? (
                    <Link
                      href="/signup?role=creator"
                      className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black shadow-md hover:bg-white/90 active:scale-[0.98] transition-all"
                    >
                      {p.cta}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                    >
                      {p.cta}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center text-xs text-slate-400">
            All plans include GST calculations and numbered tax invoices. Payments run in test mode until launch.
          </div>
        </div>
      </section>

      {/* 7. Pre-footer High-Impact Call to Action */}
      <section className="bg-[#08090d] py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#0c1017] via-[#0f1722] to-[#08090d] p-8 sm:p-14 text-white shadow-2xl">
            <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-xl">
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  Test-mode beta
                </span>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                  Open a storefront and run a test sale.
                </h2>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Pick your handle, publish a course, and watch checkout, GST invoice and enrolment happen end to end. No real money moves.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link
                  href="/signup?role=creator"
                  className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-black shadow-xl hover:bg-white/90 active:scale-[0.98] transition-all text-center"
                >
                  Start selling free
                </Link>
                <a
                  href="#sandbox-demo"
                  className="rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/15 active:scale-[0.98] transition-all text-center backdrop-blur-md"
                >
                  Test Gateway Sandbox
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
