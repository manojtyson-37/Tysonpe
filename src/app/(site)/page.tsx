import Link from "next/link";

const sellables = [
  { t: "Courses", d: "Video, PDF and text lessons your learners open from their library." },
  { t: "Memberships", d: "Recurring access for your community, with a free-trial-ready price model." },
  { t: "Live webinars", d: "Sell seats to workshops and sessions with your own join link." },
  { t: "Digital downloads", d: "Templates, notebooks, presets: paid file delivery after checkout." },
  { t: "1:1 consultations", d: "Sell your time with a booking link delivered at purchase." },
];

const features = [
  { t: "Your own storefront", d: "A clean public page at /c/your-handle listing every product you publish." },
  { t: "UPI, cards & netbanking", d: "Razorpay-powered checkout. Payments verified server-side, never trusted from the browser." },
  { t: "GST-ready invoices", d: "Every paid order gets a numbered invoice with the GST component broken out." },
  { t: "Coupons that convert", d: "Percent or flat discounts with expiry dates and redemption caps." },
  { t: "Instant learner library", d: "Buyers get access the second payment clears. Refund and access is revoked." },
  { t: "Clear payout ledger", d: "See gross, platform fee, gateway fee and net on every single order." },
];

const plans = [
  { name: "Basic", price: "Free", fee: "10%", note: "Zero fixed fee", live: true },
  { name: "Pro", price: "₹5,000/mo", fee: "5.5%", note: "Unlimited learners", live: false },
  { name: "Advanced", price: "₹15,000/mo", fee: "3.5%", note: "Community & affiliates", live: false },
  { name: "Ultimate", price: "₹30,000/mo", fee: "0%", note: "1.5% gateway only", live: false },
];

const next = ["Course builder with drip & quizzes", "Community feed & gamification", "Affiliates & funnels", "Live sessions via Zoom", "Branded mobile apps"];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <p className="badge badge-brand">Built for creators in India</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Turn what you know into a business that pays you.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Sell courses, memberships, webinars and downloads from one storefront. Get paid by UPI and cards, with GST invoices and a payout ledger built in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup?role=creator" className="btn btn-primary btn-lg">Start selling free</Link>
            <Link href="/c/asha-rao" className="btn btn-secondary btn-lg">See a live storefront</Link>
          </div>
          <p className="mt-4 text-sm text-muted">No setup fee on Basic. You pay only when you earn.</p>
        </div>
      </section>

      <section className="border-y border-line bg-surface-2/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Sell it all, from one place</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {sellables.map((s) => (
              <div key={s.t} className="card p-5">
                <h3 className="font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Everything between “buy” and “paid”</h2>
        <div className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.t}>
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-y border-line bg-surface-2/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Pricing that grows with you</h2>
          <p className="mt-2 text-sm text-muted">Platform fee on each sale. Higher plans lower the fee.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <div key={p.name} className={`card p-6 ${p.live ? "ring-2 ring-brand" : ""}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{p.name}</h3>
                  {!p.live && <span className="badge badge-muted">Soon</span>}
                </div>
                <p className="mt-3 text-2xl font-bold">{p.price}</p>
                <p className="mt-4 text-3xl font-extrabold text-brand">{p.fee}</p>
                <p className="text-sm text-muted">platform fee · {p.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">Plan upgrades and billing ship with the platform release. Every account starts on Basic.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">On the roadmap</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {next.map((n) => (
            <li key={n} className="badge badge-muted !px-4 !py-2 !text-sm">{n}</li>
          ))}
        </ul>
        <div className="card mt-14 flex flex-col items-start justify-between gap-5 bg-ink p-8 text-bg sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold">Open your store in five minutes.</h2>
            <p className="mt-1 text-sm opacity-70">Pick a handle, add a product, share the link.</p>
          </div>
          <Link href="/signup?role=creator" className="btn btn-lg bg-bg text-ink hover:opacity-90">Start selling free</Link>
        </div>
      </section>
    </>
  );
}
