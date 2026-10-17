import {
  GPayIcon,
  PhonePeIcon,
  PaytmIcon,
  BhimIcon,
  RupayIcon,
  VisaIcon,
  MastercardIcon,
  LockIcon,
  ShieldCheckIcon,
} from "@/components/gateway-icons";

export function StorefrontFooter({ creatorName }: { creatorName: string }) {
  return (
    <footer className="border-t border-line/80 bg-surface text-ink">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 border-b border-line/60 pb-8 sm:flex-row">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-sm font-bold text-ink">
              {creatorName}&apos;s Official Store
            </p>
            <p className="text-xs text-muted">
              Fast, secure digital delivery powered by Tysonpe creator infrastructure.
            </p>
          </div>

          {/* Payment Method Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted mr-1">
              Accepted:
            </span>
            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface p-1 shadow-2xs">
              <GPayIcon className="h-4 w-4" />
              <PhonePeIcon className="h-4 w-4" />
              <PaytmIcon className="h-3 w-10" />
              <BhimIcon className="h-4 w-4" />
              <RupayIcon className="h-3 w-8" />
              <VisaIcon className="h-3 w-7" />
              <MastercardIcon className="h-3 w-5" />
            </div>
          </div>
        </div>

        {/* Security & Compliance Notes */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 text-xs text-muted sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="inline-flex items-center gap-1">
              <LockIcon className="h-3.5 w-3.5 text-good" />
              256-bit SSL Encrypted
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-brand" />
              PCI-DSS Level 1 Compliant
            </span>
            <span>Instant GST-Compliant Invoices</span>
          </div>

          <p className="text-[11px]">
            © {new Date().getFullYear()} Tysonpe. Payments run in test mode.
          </p>
        </div>
      </div>
    </footer>
  );
}
