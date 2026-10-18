// Server-rendered fragments of the real product UI for the landing page. Each one is built from the real components
// (Surface, MetricList, Money, StatStrip, Button, Input) and the real money and invoice functions, fed the page's one
// sample sale. Everything here is labelled "Sample": nothing is a customer, a rating or a count.
import { Input } from "@/components/form";
import { Button, MetricList, MetricRow, Money, StatStrip, Surface } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { fiscalYear, formatInvoiceNo } from "@/lib/invoice";
import { DEFAULT_LEDGER } from "@/lib/landing-ledger";
import { formatINR, priceOrder } from "@/lib/money";

const SALE = DEFAULT_LEDGER;
const SAMPLE_PAID_AT = new Date("2026-10-15T10:00:00+05:30");
export const SAMPLE_INVOICE_NO = formatInvoiceNo(fiscalYear(SAMPLE_PAID_AT), 1);

// priceOrder with no coupon cannot reject, so the narrowing below is only for the compiler.
function sampleOrder() {
  const priced = priceOrder({ pricePaise: SALE.salePaise, gstRatePct: SALE.gstRate }, null, SAMPLE_PAID_AT);
  if (!priced.ok) throw new Error("a sale without a coupon is always priced");
  return priced;
}

/** The pay page's order summary, coupon field and gateway buttons, switched off. The working checkout is the demo below. */
export function CheckoutFragment() {
  const order = sampleOrder();
  return (
    <figure className="min-w-0">
      <Surface tone="inset" padding="lg">
        <p className="text-sm text-muted">Your order</p>
        <p className="mt-1 text-lg font-semibold">Sample course</p>
        <p className="text-sm text-muted">by Sample creator</p>
        <MetricList className="mt-4 border-t border-line">
          <MetricRow label="Total payable" value={<Money paise={order.totalPaise} size="lg" />} strong />
          <MetricRow label={`Includes GST (${SALE.gstRate}%)`} value={<Money paise={order.gstPaise} />} />
        </MetricList>
        <div className="mt-4 flex items-end gap-2">
          <Input label="Coupon code" placeholder="Enter code" disabled autoComplete="off" className="min-w-0 flex-1" />
          <Button variant="secondary" disabled className="pointer-coarse:min-h-11">Apply</Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" size="lg" disabled>
            Pay {formatINR(order.totalPaise)} with Razorpay
          </Button>
          <Button variant="secondary" size="lg" disabled>
            Continue to Easebuzz
          </Button>
        </div>
      </Surface>
      <figcaption className="mt-3 text-sm text-muted">
        Sample checkout for a {formatINR(order.subtotalPaise)} course. The buttons are switched off here; the working one is the test checkout above.
      </figcaption>
    </figure>
  );
}

/** The tax invoice a paid order gets: GST split out of the price, a TP/year/sequence number. */
export function InvoiceFragment() {
  const taxable = SALE.salePaise - SALE.gstPaise;
  return (
    <figure className="min-w-0">
      <Surface as="article" tone="inset" padding="lg" aria-label="Sample tax invoice">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="font-display text-xl font-extrabold">Tax invoice</p>
            <p className="mt-1 font-mono text-sm text-muted">{SAMPLE_INVOICE_NO}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted">Date</p>
            <p className="font-semibold">{formatDate(SAMPLE_PAID_AT)}</p>
          </div>
        </header>
        <div className="grid gap-4 border-b border-line py-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted">Sold by</p>
            <p className="mt-1 font-semibold">Sample creator</p>
          </div>
          <div>
            <p className="text-muted">Billed to</p>
            <p className="mt-1 font-semibold">Sample learner</p>
          </div>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-3 text-sm">
          <p>Sample course</p>
          <Money paise={SALE.salePaise} />
        </div>
        <MetricList className="ml-auto w-full max-w-xs border-t border-line">
          <MetricRow label="Taxable value" value={<Money paise={taxable} />} />
          <MetricRow label={`GST @ ${SALE.gstRate}% (included)`} value={<Money paise={SALE.gstPaise} />} />
          <MetricRow label="Total paid" value={<Money paise={SALE.salePaise} />} strong />
        </MetricList>
      </Surface>
      <figcaption className="mt-3 text-sm text-muted">
        Sample invoice. Real ones carry the creator&apos;s and the learner&apos;s names, and are numbered consecutively per seller and financial year.
      </figcaption>
    </figure>
  );
}

/** The Payouts page's strip, for the same sale. */
export function PayoutsFragment() {
  return (
    <figure className="min-w-0">
      <StatStrip
        items={[
          { label: "Gross sales", value: <Money paise={SALE.salePaise} /> },
          { label: "Platform fees", value: <Money paise={SALE.platformFeePaise} sign="−" /> },
          { label: "Gateway fees", value: <Money paise={SALE.gatewayFeePaise} sign="−" /> },
          { label: "Net earnings", value: <Money paise={SALE.netPaise} tone="good" /> },
        ]}
        labelCase="sentence"
      />
      <figcaption className="mt-3 text-sm text-muted">
        Sample figures for one {formatINR(SALE.salePaise)} sale on Basic, laid out as on the Payouts page. They are not a customer&apos;s numbers.
      </figcaption>
    </figure>
  );
}
