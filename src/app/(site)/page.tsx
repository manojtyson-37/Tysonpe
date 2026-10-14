import Link from "next/link";
import { HomeInteractiveDemo } from "@/components/HomeInteractiveDemo";
import {
  GooglePayIcon,
  PhonePeIcon,
  PaytmIcon,
  BhimUpiIcon,
  VisaIcon,
  MastercardIcon,
  RupayIcon,
} from "@/components/gateway-icons";

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
    stat: "Zero Video Hosting Cost",
  },
  {
    title: "WhatsApp & Telegram VIP Passes",
    desc: "Sell recurring or one-time access to private communities. Instant bot invite links dispatched upon payment confirmation.",
    tag: "Instant Delivery",
    stat: "Zero Manual Approvals",
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
    title: "Chartered Accountant & Money Coach",
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
    features: ["Storefront at /c/your-handle", "Instant UPI QR & Cards", "GST-compliant tax invoices", "Course LMS library access"],
    cta: "Start selling free",
    live: true,
  },
  {
    name: "Pro",
    price: "₹5,000",
    cadence: "/ month",
    fee: "5.5%",
    note: "Lower fee as your volume scales.",
    features: ["Everything in Basic", "Quiz gating & certificates", "Custom domain mapping", "Priority webhook retries"],
    cta: "Join Pro waitlist",
    live: false,
  },
  {
    name: "Advanced",
    price: "₹15,000",
    cadence: "/ month",
    fee: "3.5%",
    note: "For established creator academies.",
    features: ["Everything in Pro", "Affiliate referral funnels", "Drip lesson scheduler", "Dedicated Slack support"],
    cta: "Contact sales",
    live: false,
  },
  {
    name: "Ultimate",
    price: "₹30,000",
    cadence: "/ month",
    fee: "0%",
    note: "1.5% gateway cost only. Pure volume.",
    features: ["Zero platform fee", "Multi-seat creator team", "Custom invoice templates", "Same-day settlement option"],
    cta: "Custom setup",
    live: false,
  },
];

export default function Home() {
  return (
    <>
      {/* 1. High-Energy Hero with Realistic Checkout Sandbox */}
      <section className="relative border-b border-line bg-surface/50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-10">
            {/* Left Column: Value Prop for Indian Creators */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft/60 px-3.5 py-1.5 text-xs font-bold text-brand shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                </span>
                The High-Payout Alternative to TagMango & Graphy
              </div>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[54px] text-ink leading-[1.08]">
                Keep 94.5% to 100% of your earnings. Zero checkout drop-offs.
              </h1>

              <p className="mt-5 text-base sm:text-lg text-muted leading-relaxed">
                Launch your branded creator store in 5 minutes. Accept instant payments via UPI QR, GPay, PhonePe, and cards with automated GST tax invoices, course delivery, and T+1 direct bank payouts.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup?role=creator"
                  className="btn btn-primary btn-lg font-bold shadow-md hover:brightness-105 active:scale-[0.98]"
                >
                  Start selling free (Zero Fixed Fee)
                </Link>
                <Link
                  href="/demo"
                  className="btn btn-secondary btn-lg font-semibold shadow-xs hover:border-brand/40 active:scale-[0.98]"
                >
                  Live Gateway Sandbox
                </Link>
              </div>

              {/* Social Proof Stats Bar */}
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-line/80 pt-6">
                <div>
                  <p className="font-mono text-2xl font-black text-ink">₹50 Cr+</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Volume Processed</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-black text-brand">99.4%</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">UPI Success Rate</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-black text-good">T+1</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Bank Payouts</p>
                </div>
              </div>

              {/* Verified Payment Partners */}
              <div className="mt-6 flex flex-wrap items-center gap-3 text-muted">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Powered By</span>
                <div className="flex items-center gap-3">
                  <GooglePayIcon className="h-4 w-7" />
                  <PhonePeIcon className="h-4 w-7" />
                  <PaytmIcon className="h-4 w-7" />
                  <BhimUpiIcon className="h-4 w-7" />
                  <VisaIcon className="h-3.5 w-6" />
                  <MastercardIcon className="h-3.5 w-6" />
                  <RupayIcon className="h-3.5 w-6" />
                </div>
              </div>
            </div>

            {/* Right Column: High-Fidelity Realistic Checkout Simulator */}
            <div className="lg:col-span-6">
              <HomeInteractiveDemo />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Direct Comparison: Tysonpe vs TagMango vs Graphy */}
      <section className="border-b border-line bg-surface-2/40 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="badge badge-brand !text-xs font-bold">Uncompromising Economics</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-ink">
              Why Creators Are Moving From TagMango & Graphy
            </h2>
            <p className="mt-3 text-sm text-muted">
              Stop paying 15% to 25% commissions and steep monthly maintenance fees on your hard-earned revenue.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2/70 text-xs uppercase font-bold text-muted">
                    <th className="px-5 py-3.5 text-left">Feature / Capability</th>
                    <th className="px-5 py-3.5 text-left text-brand bg-brand-soft/30">
                      Tysonpe (Creator First)
                    </th>
                    <th className="px-5 py-3.5 text-left">TagMango</th>
                    <th className="px-5 py-3.5 text-left">Graphy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {competitorComparisons.map((row) => (
                    <tr
                      key={row.feature}
                      className={row.highlight ? "bg-good-soft/10 font-medium" : "hover:bg-surface-2/30"}
                    >
                      <td className="px-5 py-3.5 text-ink font-semibold text-xs sm:text-sm">
                        {row.feature}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-good bg-brand-soft/20 text-xs sm:text-sm">
                        ✓ {row.tysonpe}
                      </td>
                      <td className="px-5 py-3.5 text-bad text-xs sm:text-sm">
                        ✕ {row.tagmango}
                      </td>
                      <td className="px-5 py-3.5 text-bad text-xs sm:text-sm">
                        ✕ {row.graphy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-line bg-surface-2/50 px-5 py-3 flex flex-col sm:flex-row justify-between items-center text-xs text-muted gap-2">
              <span>*Data benchmarked from publicly published pricing tiers as of Q4 2026.</span>
              <Link href="/demo" className="font-bold text-brand hover:underline">
                Test the checkout simulation yourself →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The 6 Product Formats (TagMango style) */}
      <section className="border-b border-line bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                Monetization Formats
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-ink">
                Sell everything your audience asks for.
              </h2>
            </div>
            <Link
              href="/c/asha-rao"
              className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1 active:scale-[0.98]"
            >
              Browse Asha Rao&apos;s Live Storefront →
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {creatorFormats.map((f) => (
              <div
                key={f.title}
                className="card card-hover flex flex-col justify-between p-6 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="badge badge-brand !text-[11px] font-semibold">{f.tag}</span>
                    <span className="font-mono text-xs font-bold text-good">{f.stat}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-ink">{f.title}</h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted">{f.desc}</p>
                </div>
                <div className="mt-6 border-t border-line/70 pt-3 flex items-center justify-between text-xs font-semibold text-brand">
                  <span>Launch in 5 minutes</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Social Proof & Creator Testimonials */}
      <section className="border-b border-line bg-surface-2/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="badge badge-good !text-xs font-bold">Real Creator Results</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-ink">
              Trusted by India&apos;s High-Earning Educators & Coaches
            </h2>
            <p className="mt-2 text-sm text-muted">
              Here is what happens when creators stop leaking revenue to platform fees.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.author}
                className="card flex flex-col justify-between p-6 bg-surface shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="badge badge-good !text-[10px] font-mono font-bold">
                      {t.earnings}
                    </span>
                    <span className="text-xs text-muted font-mono">{t.handle}</span>
                  </div>
                  <p className="mt-4 text-xs sm:text-sm text-ink leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                <div className="mt-6 border-t border-line pt-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 font-bold text-xs text-brand border border-brand/20">
                    {t.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">{t.author}</h4>
                    <p className="text-[10px] text-muted">{t.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Transparent Pricing Matrix */}
      <section id="pricing" className="border-b border-line bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="badge badge-brand !text-xs font-bold">Transparent Economics</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-ink">
              Keep more of what you earn.
            </h2>
            <p className="mt-2 text-sm text-muted">
              Start on Basic with zero upfront cost. Upgrade only when volume discounts save you more money.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`card flex flex-col justify-between p-6 transition-all duration-200 ${
                  p.live ? "border-brand shadow-lg ring-1 ring-brand/30" : "opacity-90"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-ink">{p.name}</h3>
                    {p.live ? (
                      <span className="badge badge-good !text-[10px] font-bold">Active</span>
                    ) : (
                      <span className="badge badge-muted !text-[10px]">Coming Soon</span>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-3xl font-extrabold text-ink">{p.price}</span>
                      <span className="text-xs text-muted">{p.cadence}</span>
                    </div>
                    <div className="mt-3 rounded-lg bg-surface-2 p-2 text-center">
                      <p className="font-mono text-2xl font-black text-brand">{p.fee}</p>
                      <p className="text-[11px] text-muted">{p.note}</p>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-muted">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2">
                        <span className="text-good font-bold">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 border-t border-line/80 pt-4">
                  {p.live ? (
                    <Link
                      href="/signup?role=creator"
                      className="btn btn-primary w-full text-xs font-bold shadow-xs active:scale-[0.98]"
                    >
                      {p.cta}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="btn btn-secondary w-full text-xs font-semibold opacity-60 cursor-not-allowed"
                    >
                      {p.cta}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center text-xs text-muted">
            All plans include SSL encryption, GST calculations, webhook dispatch, and automated email receipts.
          </div>
        </div>
      </section>

      {/* 6. Pre-footer High-Impact Call to Action */}
      <section className="bg-surface-2/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-slate-950 via-[#0d1322] to-slate-900 p-8 sm:p-12 text-[#f5f1e8] shadow-2xl">
            <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div className="max-w-xl">
                <span className="badge !border-white/20 !bg-white/10 !text-white text-xs font-semibold">
                  Zero Technical Barrier
                </span>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl text-white">
                  Start collecting UPI payments in 5 minutes.
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Pick your handle, launch your masterclass or community pass, and let our dual-gateway engine handle checkouts and GST invoices automatically.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup?role=creator"
                  className="btn btn-lg bg-brand text-white hover:brightness-110 active:scale-[0.98] font-bold shadow-lg"
                >
                  Start selling free
                </Link>
                <Link
                  href="/demo"
                  className="btn btn-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 active:scale-[0.98] font-bold"
                >
                  Open Sandbox Demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
