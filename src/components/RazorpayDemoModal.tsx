"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { settleDemoAction } from "@/app/actions/checkout";
import { canDismissRazorpay, settledView } from "@/lib/gateway-demo";
import { Dialog } from "@/components/ui/dialog";
import {
  AxisBankIcon,
  BankIcon,
  CreditCardIcon,
  GPayIcon,
  HdfcBankIcon,
  IciciBankIcon,
  MastercardIcon,
  PaytmIcon,
  PhonePeIcon,
  QrCodeIcon,
  RupayIcon,
  SbiBankIcon,
  UpiIcon,
  VisaIcon,
  WalletIcon,
} from "./gateway-icons";
import { IconCheck, IconInfo, IconLock, IconX } from "./icons";

export interface RazorpayDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amountPaise: number;
  productTitle: string;
  buyer: { name: string; email: string };
}

type Tab = "upi" | "cards" | "netbanking" | "wallet";
type Status = "idle" | "processing" | "success" | "failed";
type Outcome = "success" | "failure";

// The look is the gateway's own, kept on purpose, and lives in the [data-skin="razorpay"] block of globals.css.
// Nothing below names a colour: everything reads a --skin-* variable.
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--skin-accent)";
// Inset ring for controls that sit flush against the panel edge, where an offset ring would be clipped.
const FOCUS_INSET = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--skin-accent)";
const PRESS = "transition-[background-color,border-color,color,transform] duration-150 ease-(--ease-standard) active:scale-[0.98]";
const TOUCH = "pointer-coarse:min-h-11";
const LABEL = "t-label mb-1 block text-(--skin-muted)";
const INPUT = `w-full rounded-control border border-(--skin-line-strong) bg-(--skin-surface) px-3 py-2 text-sm text-(--skin-ink) placeholder:text-(--skin-muted) focus:border-(--skin-accent) ${TOUCH} ${FOCUS}`;
const PRIMARY = `flex w-full items-center justify-center gap-2 rounded-control bg-(--skin-accent) px-4 py-3 text-sm font-semibold text-(--skin-accent-ink) hover:bg-(--skin-accent-hover) ${PRESS} ${TOUCH} ${FOCUS}`;
const SECONDARY = `w-full rounded-control border border-(--skin-line-strong) bg-(--skin-surface) px-4 py-2.5 text-sm font-semibold text-(--skin-ink) hover:bg-(--skin-surface-2) ${PRESS} ${TOUCH} ${FOCUS}`;

/** A pick-one tile (UPI app, bank) or segment: a native button that reports its state with aria-pressed. */
function choiceClass(selected: boolean) {
  return `${PRESS} ${TOUCH} ${FOCUS} border ${
    selected
      ? "border-(--skin-accent) bg-(--skin-accent-soft) text-(--skin-ink) ring-1 ring-(--skin-accent)"
      : "border-(--skin-line) bg-(--skin-surface) text-(--skin-ink) hover:bg-(--skin-surface-2)"
  }`;
}

const NOOP = () => {};
const DECLINED = "Transaction was declined by the simulated bank (Error 05: Do Not Honor).";

export function RazorpayDemoModal({
  isOpen,
  onClose,
  orderId,
  amountPaise,
  productTitle,
  buyer,
}: RazorpayDemoModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upi");
  const [outcome, setOutcome] = useState<Outcome>("success");
  const [status, setStatus] = useState<Status>("idle");
  const [processingStep, setProcessingStep] = useState("Connecting to the simulated bank…");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Simulated visual states (purely presentational: never sent to server)
  const [upiMode, setUpiMode] = useState<"apps" | "qr" | "id">("apps");
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");
  const [upiId, setUpiId] = useState("");
  // Standard test values, not real card data. They only fill the preview card; nothing here is sent anywhere.
  const [cardNumber, setCardNumber] = useState("4111 1111 1111 1111");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [cardName, setCardName] = useState(buyer.name || "Customer");
  const [selectedBank, setSelectedBank] = useState("hdfc");

  // The body below is swapped for a status view while settling; focus follows it so a screen reader reads the new state.
  const stateRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (status !== "idle") stateRef.current?.focus({ preventScroll: true });
  }, [status]);

  const formattedAmount = (amountPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  async function handlePay() {
    setStatus("processing");
    setErrorMsg(null);
    setProcessingStep("Connecting to the simulated payment network…");

    await new Promise((r) => setTimeout(r, 650));
    setProcessingStep("Authorizing the simulated transaction with the bank…");

    await new Promise((r) => setTimeout(r, 650));

    try {
      const res = await settleDemoAction(orderId, outcome);
      const view = settledView(res);
      if (view === "success") {
        setStatus("success");
        setProcessingStep("Payment approved. Enrolling you now…");
        await new Promise((r) => setTimeout(r, 800));
        router.push(res.to);
      } else if (view === "declined") {
        // The action answers ok with the failure page for a decline. The modal stays on the declined screen with Try again
        // and Cancel; a forced redirect would race them.
        setStatus("failed");
        setErrorMsg(DECLINED);
      } else {
        setStatus("failed");
        setErrorMsg(res.error || DECLINED);
      }
    } catch {
      setStatus("failed");
      setErrorMsg("An unexpected network error occurred during demo payment.");
    }
  }

  const methods: { id: Tab; name: string; icon: ReactNode }[] = [
    { id: "upi", name: "UPI / QR", icon: <UpiIcon className="h-5 w-5" /> },
    { id: "cards", name: "Card", icon: <CreditCardIcon className="h-5 w-5" /> },
    { id: "netbanking", name: "Netbanking", icon: <BankIcon className="h-5 w-5" /> },
    { id: "wallet", name: "Wallet", icon: <WalletIcon className="h-5 w-5" /> },
  ];

  return (
    // Escape and a click outside go through Dialog's onClose; while the payment is being settled they do nothing.
    <Dialog
      open={isOpen}
      onClose={canDismissRazorpay(status) ? onClose : NOOP}
      title={`Razorpay simulated checkout for ${productTitle}`}
      bare
      className="sm:max-w-lg"
    >
      <div data-skin="razorpay" className="bg-(--skin-surface) text-left text-(--skin-ink)">
        {/* Header band */}
        <div className="bg-(--skin-head-bg) px-5 pb-4 pt-5 text-(--skin-head-ink)">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-extrabold tracking-tight">Razorpay</span>
              <span className="rounded-full border border-(--skin-head-line) px-2.5 py-0.5 text-xs font-semibold text-(--skin-head-warn)">
                Simulated
              </span>
            </div>

            {status !== "processing" && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close payment modal"
                className={`flex h-8 w-8 items-center justify-center rounded-full border border-(--skin-head-line) text-(--skin-head-muted) hover:text-(--skin-head-ink) pointer-coarse:h-11 pointer-coarse:w-11 ${PRESS} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--skin-head-ink)`}
              >
                <IconX size={16} />
              </button>
            )}
          </div>

          <div className="mt-4 flex items-end justify-between gap-4 border-t border-(--skin-head-line) pt-3.5">
            <div className="min-w-0">
              <p className="t-label text-(--skin-head-muted)">Merchant</p>
              <p className="line-clamp-2 text-sm font-semibold">{productTitle}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="t-label whitespace-nowrap text-(--skin-head-muted)">Amount to pay</p>
              <p className="text-xl font-semibold tabular-nums text-(--skin-head-money)">₹{formattedAmount}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        {status === "processing" ? (
          <div ref={stateRef} tabIndex={-1} role="status" className="space-y-4 px-8 py-10 text-center outline-none">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-(--skin-line) bg-(--skin-surface-2) text-(--skin-accent)">
              <IconLock size={22} />
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-semibold">{processingStep}</p>
              <p className="t-meta text-(--skin-muted)">Simulated transaction. Nothing real is charged. Please wait.</p>
            </div>
          </div>
        ) : status === "success" ? (
          <div ref={stateRef} tabIndex={-1} role="status" className="space-y-4 px-8 py-10 text-center outline-none">
            <div className="reveal-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-(--skin-good) text-(--skin-accent-ink)">
              <IconCheck size={28} />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">Payment successful</p>
              <p className="t-meta text-(--skin-muted)">Redirecting to your order confirmation…</p>
            </div>
          </div>
        ) : status === "failed" ? (
          <div className="space-y-5 px-6 py-8 text-center">
            <div ref={stateRef} tabIndex={-1} role="alert" className="space-y-4 outline-none">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-(--skin-bad-soft) text-(--skin-bad)">
                <IconX size={28} />
              </div>
              <div className="space-y-1.5">
                <p className="text-lg font-semibold">Payment declined</p>
                <p className="text-sm font-medium text-(--skin-bad)">{errorMsg}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button type="button" onClick={() => setStatus("idle")} className={PRIMARY}>
                Try again
              </button>
              <button type="button" onClick={onClose} className={SECONDARY}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Payment method */}
            <div
              role="group"
              aria-label="Payment method"
              className="grid grid-cols-4 border-b border-(--skin-line) bg-(--skin-surface-2)"
            >
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={tab === m.id}
                  onClick={() => setTab(m.id)}
                  className={`flex flex-col items-center gap-1.5 border-b-2 px-1 py-3 text-xs font-semibold ${PRESS} ${TOUCH} ${FOCUS_INSET} ${
                    tab === m.id
                      ? "border-(--skin-accent) bg-(--skin-surface) text-(--skin-accent)"
                      : "border-transparent text-(--skin-muted) hover:bg-(--skin-surface) hover:text-(--skin-ink)"
                  }`}
                >
                  {m.icon}
                  <span>{m.name}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4 p-5">
              {tab === "upi" && (
                <div className="space-y-4">
                  <div role="group" aria-label="UPI method" className="flex gap-1 rounded-control bg-(--skin-surface-2) p-1 text-xs font-semibold">
                    {(
                      [
                        ["apps", "UPI apps"],
                        ["qr", "Scan QR"],
                        ["id", "UPI ID"],
                      ] as const
                    ).map(([id, name]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={upiMode === id}
                        onClick={() => setUpiMode(id)}
                        className={`flex-1 rounded-control px-2 py-1.5 ${PRESS} ${TOUCH} ${FOCUS} ${
                          upiMode === id
                            ? "bg-(--skin-surface) text-(--skin-ink) ring-1 ring-(--skin-line)"
                            : "text-(--skin-muted) hover:text-(--skin-ink)"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>

                  {upiMode === "apps" && (
                    <div role="group" aria-label="UPI app" className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: "gpay", name: "Google Pay", icon: <GPayIcon className="h-6 w-6" /> },
                        { id: "phonepe", name: "PhonePe", icon: <PhonePeIcon className="h-6 w-6" /> },
                        { id: "paytm", name: "Paytm", icon: <PaytmIcon className="h-4 w-8" /> },
                      ].map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          aria-pressed={selectedUpiApp === app.id}
                          onClick={() => setSelectedUpiApp(app.id)}
                          className={`flex flex-col items-center justify-center gap-2 rounded-card p-3 text-xs font-semibold ${choiceClass(selectedUpiApp === app.id)}`}
                        >
                          {app.icon}
                          <span className="w-full truncate text-center">{app.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {upiMode === "qr" && (
                    <div className="flex flex-col items-center justify-center space-y-3 rounded-card border border-(--skin-line) bg-(--skin-surface-2) p-4">
                      <div className="rounded-control border border-(--skin-line) bg-(--skin-surface) p-3">
                        <QrCodeIcon className="h-28 w-28 text-(--skin-ink)" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold">Scan with any UPI app</p>
                        <p className="t-meta text-(--skin-muted)">Google Pay, PhonePe, Paytm or BHIM</p>
                      </div>
                    </div>
                  )}

                  {upiMode === "id" && (
                    <div className="space-y-1.5">
                      <label htmlFor="rzp-upi-id" className={LABEL}>
                        UPI ID (VPA)
                      </label>
                      <input
                        id="rzp-upi-id"
                        type="text"
                        inputMode="email"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@okhdfcbank"
                        className={INPUT}
                      />
                      <p className="t-meta text-(--skin-muted)">A collect request is simulated. Nothing is sent.</p>
                    </div>
                  )}
                </div>
              )}

              {tab === "cards" && (
                <div className="space-y-3.5">
                  {/* Preview of the simulated card */}
                  <div className="flex h-28 flex-col justify-between rounded-card bg-(--skin-head-bg) p-3.5 text-(--skin-head-ink)">
                    <div className="flex items-center justify-between">
                      <span className="t-label text-(--skin-head-muted)">Simulated card</span>
                      <div className="flex gap-1.5">
                        <VisaIcon className="h-4 w-7" />
                        <MastercardIcon className="h-4 w-6" />
                        <RupayIcon className="h-4 w-7" />
                      </div>
                    </div>
                    <div>
                      <p className="t-ledger text-sm tracking-widest">{cardNumber}</p>
                      <div className="mt-1 flex items-center justify-between text-xs text-(--skin-head-muted)">
                        <span className="max-w-48 truncate font-medium uppercase">{cardName}</span>
                        <span className="t-ledger">{cardExpiry}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label htmlFor="rzp-card-num" className={LABEL}>
                        Card number
                      </label>
                      <input
                        id="rzp-card-num"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className={`${INPUT} t-ledger`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label htmlFor="rzp-card-exp" className={LABEL}>
                          Expiry
                        </label>
                        <input
                          id="rzp-card-exp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className={`${INPUT} t-ledger`}
                        />
                      </div>
                      <div>
                        <label htmlFor="rzp-card-cvv" className={LABEL}>
                          CVV
                        </label>
                        <input
                          id="rzp-card-cvv"
                          type="password"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="123"
                          className={`${INPUT} t-ledger`}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="rzp-card-name" className={LABEL}>
                        Cardholder name
                      </label>
                      <input
                        id="rzp-card-name"
                        type="text"
                        autoComplete="cc-name"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className={INPUT}
                      />
                    </div>
                  </div>
                </div>
              )}

              {tab === "netbanking" && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Select a bank</p>
                  <div role="group" aria-label="Bank" className="grid grid-cols-2 gap-2">
                    {[
                      { id: "hdfc", name: "HDFC Bank", icon: <HdfcBankIcon className="h-5 w-5" /> },
                      { id: "sbi", name: "State Bank of India", icon: <SbiBankIcon className="h-5 w-5" /> },
                      { id: "icici", name: "ICICI Bank", icon: <IciciBankIcon className="h-5 w-5" /> },
                      { id: "axis", name: "Axis Bank", icon: <AxisBankIcon className="h-5 w-5" /> },
                    ].map((bank) => (
                      <button
                        key={bank.id}
                        type="button"
                        aria-pressed={selectedBank === bank.id}
                        onClick={() => setSelectedBank(bank.id)}
                        className={`flex items-center gap-2.5 rounded-card p-2.5 text-xs font-semibold ${choiceClass(selectedBank === bank.id)}`}
                      >
                        {bank.icon}
                        <span className="truncate">{bank.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-1">
                    <label htmlFor="rzp-other-banks" className={LABEL}>
                      Other banks
                    </label>
                    <select id="rzp-other-banks" className={INPUT}>
                      <option>Kotak Mahindra Bank</option>
                      <option>Punjab National Bank</option>
                      <option>Bank of Baroda</option>
                      <option>IndusInd Bank</option>
                      <option>Yes Bank</option>
                    </select>
                  </div>
                </div>
              )}

              {tab === "wallet" && (
                <div role="radiogroup" aria-label="Wallet" className="space-y-2">
                  <p className="text-sm font-semibold">Wallets</p>
                  {[
                    { name: "PhonePe Wallet", icon: <PhonePeIcon className="h-5 w-5" /> },
                    { name: "Paytm Balance", icon: <PaytmIcon className="h-3.5 w-7" /> },
                    { name: "Mobikwik", icon: <WalletIcon className="h-5 w-5 text-(--skin-ink)" /> },
                  ].map((w, idx) => (
                    <label
                      key={w.name}
                      className={`flex cursor-pointer items-center justify-between rounded-card border border-(--skin-line) p-3 text-sm font-semibold hover:bg-(--skin-surface-2) ${TOUCH} ${PRESS} has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--skin-accent)`}
                    >
                      <span className="flex items-center gap-3">
                        {w.icon}
                        <span>{w.name}</span>
                      </span>
                      <input type="radio" name="rzp_wallet" defaultChecked={idx === 0} className="h-4 w-4 accent-(--skin-accent)" />
                    </label>
                  ))}
                </div>
              )}

              {/* Outcome the simulation will settle with */}
              <fieldset className="rounded-card border border-(--skin-line) bg-(--skin-surface-2) p-2.5">
                <legend className="t-label px-1 text-(--skin-muted)">Simulated outcome</legend>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <label className="relative block">
                    <input
                      type="radio"
                      name="rzp-outcome"
                      value="success"
                      checked={outcome === "success"}
                      onChange={() => setOutcome("success")}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-control border border-(--skin-line) bg-(--skin-surface) px-2.5 py-1.5 font-semibold text-(--skin-muted) ${PRESS} ${TOUCH} peer-checked:border-(--skin-good) peer-checked:bg-(--skin-good-soft) peer-checked:text-(--skin-good) peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--skin-accent)`}
                    >
                      <IconCheck size={14} />
                      Simulate success
                    </span>
                  </label>
                  <label className="relative block">
                    <input
                      type="radio"
                      name="rzp-outcome"
                      value="failure"
                      checked={outcome === "failure"}
                      onChange={() => setOutcome("failure")}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-control border border-(--skin-line) bg-(--skin-surface) px-2.5 py-1.5 font-semibold text-(--skin-muted) ${PRESS} ${TOUCH} peer-checked:border-(--skin-bad) peer-checked:bg-(--skin-bad-soft) peer-checked:text-(--skin-bad) peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--skin-accent)`}
                    >
                      <IconX size={14} />
                      Simulate decline
                    </span>
                  </label>
                </div>
              </fieldset>

              <button type="button" onClick={handlePay} className={PRIMARY}>
                <IconLock size={16} />
                <span className="tabular-nums">Pay ₹{formattedAmount}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-1.5 border-t border-(--skin-line) bg-(--skin-surface-2) px-5 py-3 text-xs font-medium text-(--skin-muted)">
          <IconInfo size={14} className="shrink-0" />
          <span>Simulated checkout in test mode. No real card, UPI or bank details are sent.</span>
        </div>
      </div>
    </Dialog>
  );
}
