import Link from "next/link";
import { AuroraHero } from "@/components/AuroraHero";
import { HomeInteractiveDemo } from "@/components/HomeInteractiveDemo";

const competitorComparisons = [
  {
    feature: "Platform Take-Rate",
    tysonpe: "0% – 10% (Zero Fixed Fee)",
    tagmango: "15% – 25% + gateway fee",
    graphy: "10% + ₹3,999/mo plan",
    highlight: true,
  },
  {
    feature: "Checkout Drop-off Rate",
    tysonpe: "< 2.8% (Instant UPI QR)",
    tagmango: "8% – 14% (Redirect flow)",
    graphy: "12% – 18% (Multi-step form)",
    highlight: true,
  },
  {
    feature: "Payout Settlement Schedule",
    tysonpe: "T+1 Direct Bank Deposit",
    tagmango: "T+3 to T+7 Days",
    graphy: "Weekly Payouts",
    highlight: false,
  },
  {
    feature: "Automated GST Invoices (SAC 999293)",
    tysonpe: "Built-in (Zero Setup)",
    tagmango: "Add-on required",
    graphy: "Enterprise only",
    highlight: false,
  },
  {
    feature: "Gateway Flexibility",
    tysonpe: "Razorpay + Easebuzz Dual Engine",
    tagmango: "Proprietary Routing",
    graphy: "Single Gateway",
    highlight: false,
  },
];

const creatorFormats = [
  {
    title: "Cohort Masterclasses",
    desc: "Host live multi-week batches with Zoom link protection, attendance caps, and automated WhatsApp/email reminders.",
    tag: "High Conversion",
    stat: "₹4,999 Avg Ticket",
  },
  {
    title: "Video Courses & LMS",
    desc: "Deliver lessons with quiz checkpoints, drip schedules, anti-screen-recording DRM, and completion certificates.",
    tag: "Passive Income",
    stat: "Zero Video Cost",
  },
  {
    title: "WhatsApp & Telegram VIP Passes",
    desc: "Sell recurring or one-time access to private communities. Instant bot invite links dispatched upon payment confirmation.",
    tag: "Instant Delivery",
    stat: "Zero Manual Work",
  },
  {
    title: "Digital Downloads & Templates",
    desc: "Figma files, Notion setups, cheat sheets, and source code with cryptographic rate-limited download tokens.",
    tag: "Anti-Piracy",
    stat: "One-Click Checkout",
  },
  {
    title: "1:1 Consultation Calls",
    desc: "Monetize your advisory time with integrated booking slots, client intake questionnaires, and calendar sync.",
    tag: "High Ticket",
    stat: "T+1 Payouts",
  },
  {
    title: "Paid Webinars & Workshops",
    desc: "Single-session live workshops with countdown timers, dynamic early-bird coupons, and automated replay access.",
    tag: "Urgency Driven",
    stat: "Instant UPI Scan",
  },
];

const testimonials = [
  {
    quote: "Switching from TagMango was the best financial decision for my academy. I was losing nearly 20% on every ticket. With Tysonpe, I keep 94.5% of my revenue and get paid in 24 hours.",
    author: "Asha Rao",
    title: "Chartered Accountant & Wealth Coach",
    handle: "@asha-rao",
    earnings: "₹18.4L earned",
  },
  {
    quote: "The UPI Dynamic QR checkout is magic. Learners don't bounce because they don't have to fill long forms. They scan on Google Pay and their lesson library opens instantly.",
    author: "Vikramaditya Verma",
    title: "Full-Stack System Architect",
    handle: "@vikram-codes",
    earnings: "1,240+ students",
  },
  {
    quote: "As an Indian business, GST invoices used to be a nightmare with international tools. Tysonpe automatically breaks down CGST and SGST with proper SAC codes for every buyer.",
    author: "Dr. Neha Sharma",
    title: "Integrative Nutritionist",
    handle: "@dr-neha",
    earnings: "₹9.8L earned",
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
      "Custom domain mapping",
      "Priority webhook retries",
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
      "Affiliate referral funnels",
      "Drip lesson scheduler",
      "Dedicated Slack support",
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
      "Multi-seat creator team",
      "Custom invoice templates",
      "Same-day settlement option",
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

      {/* 3. Direct Competitor Comparison: Tysonpe vs TagMango vs Graphy */}
      <section className="border-b border-white/10 bg-[#0a0c12] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-400">
              Uncompromising Economics
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Why Creators Are Moving From TagMango & Graphy
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Stop paying 15% to 25% commissions and steep monthly maintenance fees on your hard-earned revenue.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-2xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.04] text-xs uppercase font-bold text-slate-400">
                    <th className="px-5 py-4 text-left">Feature / Capability</th>
                    <th className="px-5 py-4 text-left text-emerald-400 bg-emerald-500/[0.08]">
                      Tysonpe (Creator First)
                    </th>
                    <th className="px-5 py-4 text-left">TagMango</th>
                    <th className="px-5 py-4 text-left">Graphy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {competitorComparisons.map((row) => (
                    <tr
                      key={row.feature}
                      className={row.highlight ? "bg-emerald-500/[0.04] font-medium" : "hover:bg-white/[0.02]"}
                    >
                      <td className="px-5 py-4 text-white font-semibold text-xs sm:text-sm">
                        {row.feature}
                      </td>
                      <td className="px-5 py-4 font-bold text-emerald-400 bg-emerald-500/[0.06] text-xs sm:text-sm">
                        ✓ {row.tysonpe}
                      </td>
                      <td className="px-5 py-4 text-rose-400 text-xs sm:text-sm">
                        ✕ {row.tagmango}
                      </td>
                      <td className="px-5 py-4 text-rose-400 text-xs sm:text-sm">
                        ✕ {row.graphy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-white/10 bg-white/[0.02] px-5 py-3.5 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2">
              <span>*Data benchmarked from publicly published pricing tiers as of Q4 2026.</span>
              <a href="#sandbox-demo" className="font-bold text-emerald-400 hover:underline">
                Test the checkout simulation yourself →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 4. The 6 Product Formats */}
      <section className="border-b border-white/10 bg-[#08090d] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Monetization Formats
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                Sell everything your audience asks for.
              </h2>
            </div>
            <Link
              href="/c/asha-rao"
              className="text-xs font-bold text-emerald-400 hover:underline inline-flex items-center gap-1 active:scale-[0.98]"
            >
              Browse Asha Rao&apos;s Live Storefront →
            </Link>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creatorFormats.map((f) => (
              <div
                key={f.title}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-white/[0.05]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
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
                  <span>Launch in 5 minutes</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Real Creator Social Proof & Testimonials */}
      <section className="border-b border-white/10 bg-[#0a0c12] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
              Real Creator Results
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Trusted by India&apos;s High-Earning Educators & Coaches
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Here is what happens when creators stop leaking revenue to platform fees.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.author}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-sm backdrop-blur-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-mono font-bold text-emerald-400">
                      {t.earnings}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{t.handle}</span>
                  </div>
                  <p className="mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                <div className="mt-6 border-t border-white/10 pt-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-xs text-emerald-400 border border-emerald-500/30">
                    {t.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{t.author}</h4>
                    <p className="text-[10px] text-slate-400">{t.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
              Start on Basic with zero upfront cost. Upgrade only when volume discounts save you more money.
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
            All plans include SSL encryption, GST calculations, webhook dispatch, and automated email receipts.
          </div>
        </div>
      </section>

      {/* 7. Pre-footer High-Impact Call to Action */}
      <section className="bg-[#08090d] py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#0c1017] via-[#0f1722] to-[#08090d] p-8 sm:p-14 text-white shadow-2xl">
            <div
              className="absolute -top-24 -right-24 h-96 w-96 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)",
              }}
            />
            <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-xl">
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  Zero Technical Barrier
                </span>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                  Start collecting UPI payments in 5 minutes.
                </h2>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Pick your handle, launch your masterclass or community pass, and let our dual-gateway engine handle checkouts and GST invoices automatically.
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
