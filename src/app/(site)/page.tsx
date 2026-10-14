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
  ShieldCheckBadge,
} from "@/components/gateway-icons";

const sellables = [
  {
    title: "Video & Text Courses",
    desc: "Lessons with quiz gates, file attachments, and drip scheduling delivered directly to learner libraries.",
    metric: "Instant Access",
  },
  {
    title: "Recurring Memberships",
    desc: "Subscription access for private communities with automated renewals and zero manual payment chasing.",
    metric: "Auto-renew",
  },
  {
    title: "Live Workshops",
    desc: "Sell paid seats to webinars and cohorts. Protected join links revealed only after confirmed webhook payment.",
    metric: "Capacity Cap",
  },
  {
    title: "Digital Downloads",
    desc: "Deliver Figma files, code templates, or PDFs with signed download links and rate-limited tokens.",
    metric: "Anti-leak",
  },
];

const bentoFeatures = [
  {
    badge: "Dual Gateway Engine",
    title: "Razorpay Modal & Easebuzz Hosted Checkout",
    desc: "Switch between Razorpay Standard Checkout popup or Easebuzz redirect at will. Payments are verified server-side using cryptographic signatures (HMAC SHA256 & SHA512) — client tampering is impossible.",
    highlight: "Zero Trust Architecture",
  },
  {
    badge: "Compliance",
    title: "Automated GST Invoices & B2B Tax Splits",
    desc: "Every successful payment generates a compliant, downloadable PDF invoice with your GSTIN, state code, and SAC code 999293 broken down into CGST + SGST.",
    highlight: "SAC 999293",
  },
  {
    badge: "Learning Platform",
    title: "Integrated LMS with Quiz Gates & Progress",
    desc: "Keep learners inside your ecosystem. Video lessons, progress tracking, quiz pass requirements, and verifiable completion certificates.",
    highlight: "Built-in LMS",
  },
  {
    badge: "Transparent Finance",
    title: "Granular Payout Ledger & Settlement Tickers",
    desc: "See gross sales, platform fee, gateway MDR, and net bank deposit on every single transaction with zero hidden deductions.",
    highlight: "T+1 Settlement",
  },
];

const plans = [
  {
    name: "Basic",
    price: "₹0",
    cadence: "Free forever",
    fee: "10%",
    note: "Zero fixed fee. Pay only when you sell.",
    features: ["Storefront at /c/your-handle", "Standard UPI & Cards", "GST-compliant invoices", "Learner library access"],
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
    note: "For established creators & academies.",
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
      {/* 1. Asymmetric Editorial Hero with Live Interactive Playground */}
      <section className="relative border-b border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Editorial Value Proposition */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft/60 px-3 py-1 text-xs font-semibold text-brand">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                </span>
                Creator Commerce & Payments Infrastructure
              </div>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-ink leading-[1.08]">
                Monetize your knowledge with zero checkout friction.
              </h1>

              <p className="mt-5 text-base sm:text-lg text-muted leading-relaxed">
                Deploy your branded storefront in 5 minutes. Accept payments via UPI, Google Pay, PhonePe, and cards with automated GST invoices, LMS library delivery, and T+1 bank payouts.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup?role=creator"
                  className="btn btn-primary btn-lg shadow-sm hover:brightness-105 active:scale-[0.98]"
                >
                  Start selling free
                </Link>
                <Link
                  href="/demo"
                  className="btn btn-secondary btn-lg shadow-xs hover:border-brand/40 active:scale-[0.98]"
                >
                  Open Gateway Demo
                </Link>
              </div>

              {/* Trust Badges Bar */}
              <div className="mt-8 border-t border-line/70 pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Seamlessly Compatible With
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-muted">
                  <div className="flex items-center gap-1.5 grayscale hover:grayscale-0 transition opacity-80 hover:opacity-100">
                    <GooglePayIcon className="h-4 w-7" />
                    <span className="text-xs font-medium">GPay</span>
                  </div>
                  <div className="flex items-center gap-1.5 grayscale hover:grayscale-0 transition opacity-80 hover:opacity-100">
                    <PhonePeIcon className="h-4 w-7" />
                    <span className="text-xs font-medium">PhonePe</span>
                  </div>
                  <div className="flex items-center gap-1.5 grayscale hover:grayscale-0 transition opacity-80 hover:opacity-100">
                    <PaytmIcon className="h-4 w-7" />
                    <span className="text-xs font-medium">Paytm</span>
                  </div>
                  <div className="flex items-center gap-1.5 grayscale hover:grayscale-0 transition opacity-80 hover:opacity-100">
                    <BhimUpiIcon className="h-4 w-7" />
                    <span className="text-xs font-medium">BHIM</span>
                  </div>
                  <div className="flex items-center gap-1.5 grayscale hover:grayscale-0 transition opacity-80 hover:opacity-100">
                    <VisaIcon className="h-3.5 w-6" />
                    <MastercardIcon className="h-3.5 w-6" />
                    <RupayIcon className="h-3.5 w-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Sandbox Simulator */}
            <div className="lg:col-span-6">
              <HomeInteractiveDemo />
            </div>
          </div>
        </div>
      </section>

      {/* 2. What You Can Sell — Editorial Cards (Skiper UI style) */}
      <section className="border-b border-line bg-surface-2/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Product Architecture
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-ink">
                Built for every format creators produce.
              </h2>
            </div>
            <Link
              href="/c/asha-rao"
              className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1 active:scale-[0.98]"
            >
              Browse Live Creator Storefront →
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sellables.map((item) => (
              <div
                key={item.title}
                className="card card-hover flex flex-col justify-between p-5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="badge badge-brand !text-[11px]">{item.metric}</span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-ink">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{item.desc}</p>
                </div>
                <div className="mt-5 border-t border-line/60 pt-3 text-[11px] font-semibold text-brand">
                  Ready to publish in 2 clicks
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. The Bento Grid: Fintech-Grade Infrastructure */}
      <section className="border-b border-line bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">
              End-to-End Infrastructure
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl text-ink">
              Everything between the click and your bank account.
            </h2>
            <p className="mt-3 text-sm text-muted">
              Engineered with zero third-party lock-in. Run with Razorpay, Easebuzz, or both simultaneously.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {bentoFeatures.map((f) => (
              <div
                key={f.title}
                className="card card-hover flex flex-col justify-between p-6 sm:p-7"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="badge badge-muted !text-xs">{f.badge}</span>
                    <span className="font-mono text-xs font-bold text-brand">{f.highlight}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-ink">{f.title}</h3>
                  <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-muted">{f.desc}</p>
                </div>

                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-good">
                  <ShieldCheckBadge className="h-4 w-4" />
                  <span>Production-tested on Indian payment rails</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Pricing Matrix — High-Clarity Table (UI UX Pro Max Standard) */}
      <section id="pricing" className="border-b border-line bg-surface-2/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Transparent Economics
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl text-ink">
              Pricing that aligns with your revenue.
            </h2>
            <p className="mt-3 text-sm text-muted">
              Start on Basic with zero upfront cost. Upgrade only when lower platform fees save you money.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`card flex flex-col justify-between p-6 transition-all duration-200 ${
                  p.live ? "border-brand shadow-md ring-1 ring-brand/30" : "opacity-90"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-ink">{p.name}</h3>
                    {p.live ? (
                      <span className="badge badge-good !text-[10px]">Active</span>
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
                      className="btn btn-primary w-full text-xs font-semibold shadow-xs active:scale-[0.98]"
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

      {/* 5. Pre-footer Call to Action (High-Contrast Editorial Banner) */}
      <section className="bg-surface py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-[#16130f] p-8 sm:p-12 text-[#f5f1e8] shadow-2xl">
            <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div className="max-w-xl">
                <span className="badge !border-white/20 !bg-white/10 !text-white text-xs font-semibold">
                  Zero Technical Overhead
                </span>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl text-white">
                  Open your creator store in five minutes.
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Pick your handle, connect your preferred gateway demo, upload your first module, and start taking UPI payments today.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup?role=creator"
                  className="btn btn-lg bg-brand text-white hover:brightness-110 active:scale-[0.98] font-bold"
                >
                  Start selling free
                </Link>
                <Link
                  href="/demo"
                  className="btn btn-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 active:scale-[0.98] font-bold"
                >
                  Test Demo First
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
