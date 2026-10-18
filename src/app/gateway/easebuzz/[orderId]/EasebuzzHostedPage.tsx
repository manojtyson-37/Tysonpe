"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { settleEasebuzzDemoAction } from "@/app/actions/checkout";
import { SkipLink } from "@/components/SkipLink";
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
} from "@/components/gateway-icons";
import { IconArrowLeft, IconCheck, IconClock, IconInfo, IconLock, IconX } from "@/components/icons";
import { EASEBUZZ_WINDOW_SECONDS, countdownNotice, formatCountdown, isCountdownUrgent } from "@/lib/gateway-demo";

interface OrderData {
  id: string;
  providerOrderId: string;
  totalPaise: number;
  subtotalPaise?: number;
  gstPaise?: number;
  product: {
    title: string;
    slug?: string;
  };
}

interface UserData {
  name: string;
  email: string;
}

type Tab = "upi" | "cards" | "netbanking" | "wallet";
type Outcome = "success" | "failure" | "cancel";

// The look is the gateway's own, kept on purpose, and lives in the [data-skin="easebuzz"] block of globals.css.
// Nothing below names a colour: everything reads a --skin-* variable.
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--skin-accent)";
const PRESS = "transition-[background-color,border-color,color,transform] duration-150 ease-(--ease-standard) active:scale-[0.98]";
const TOUCH = "pointer-coarse:min-h-11";
const LABEL = "t-label mb-1 block text-(--skin-muted)";
const INPUT = `w-full rounded-control border border-(--skin-line-strong) bg-(--skin-surface) px-3.5 py-2.5 text-sm text-(--skin-ink) placeholder:text-(--skin-muted) focus:border-(--skin-accent) ${TOUCH} ${FOCUS}`;

/** A pick-one tile (UPI app, bank) or segment: a native button that reports its state with aria-pressed. */
function choiceClass(selected: boolean) {
  return `${PRESS} ${TOUCH} ${FOCUS} border ${
    selected
      ? "border-(--skin-accent) bg-(--skin-accent-soft) text-(--skin-ink) ring-1 ring-(--skin-accent)"
      : "border-(--skin-line) bg-(--skin-surface) text-(--skin-ink) hover:bg-(--skin-surface-2)"
  }`;
}

export function EasebuzzHostedPage({
  order,
  user,
}: {
  order: OrderData;
  user: UserData;
}) {
  const [tab, setTab] = useState<Tab>("upi");
  const [outcome, setOutcome] = useState<Outcome>("success");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("Redirecting to your bank authentication portal…");

  // 15-minute countdown timer (starts at 900 seconds)
  const [secondsLeft, setSecondsLeft] = useState(EASEBUZZ_WINDOW_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const timeFormatted = formatCountdown(secondsLeft);

  const formattedAmount = (order.totalPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Client form dummy states
  const [upiMode, setUpiMode] = useState<"apps" | "qr" | "id">("apps");
  const [selectedApp, setSelectedApp] = useState("gpay");
  const [selectedBank, setSelectedBank] = useState("hdfc");
  const [cardDigits, setCardDigits] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [vpa, setVpa] = useState("");

  async function handleFormSubmit() {
    setIsProcessing(true);
    setProcessingMsg("Contacting Easebuzz authorization switch…");
    await new Promise((r) => setTimeout(r, 600));
    setProcessingMsg("Authenticating simulated payment with issuer bank…");
    await new Promise((r) => setTimeout(r, 600));
    await settleEasebuzzDemoAction(order.id, outcome);
  }

  const methods: { id: Tab; name: string; icon: ReactNode }[] = [
    { id: "upi", name: "UPI / QR", icon: <UpiIcon className="h-5 w-5" /> },
    { id: "cards", name: "Cards", icon: <CreditCardIcon className="h-5 w-5" /> },
    { id: "netbanking", name: "Net Banking", icon: <BankIcon className="h-5 w-5" /> },
    { id: "wallet", name: "Wallets", icon: <WalletIcon className="h-5 w-5" /> },
  ];

  const outcomes: { id: Outcome; name: string; icon: ReactNode; on: string }[] = [
    {
      id: "success",
      name: "Success",
      icon: <IconCheck size={14} />,
      on: "peer-checked:border-(--skin-good) peer-checked:bg-(--skin-good-soft) peer-checked:text-(--skin-good)",
    },
    {
      id: "failure",
      name: "Decline",
      icon: <IconX size={14} />,
      on: "peer-checked:border-(--skin-bad) peer-checked:bg-(--skin-bad-soft) peer-checked:text-(--skin-bad)",
    },
    {
      id: "cancel",
      name: "Cancel",
      icon: <IconArrowLeft size={14} />,
      on: "peer-checked:border-(--skin-accent) peer-checked:bg-(--skin-accent-soft) peer-checked:text-(--skin-accent)",
    },
  ];

  return (
    <div data-skin="easebuzz" className="flex min-h-screen flex-col bg-(--skin-bg) font-sans text-(--skin-ink)">
      <SkipLink />
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-(--skin-line) bg-(--skin-surface)">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center text-2xl font-extrabold tracking-tight">
              easebuzz<span className="text-3xl leading-none text-(--skin-dot)">.</span>
            </span>
            <span className="rounded-full border border-(--skin-line-strong) px-2.5 py-0.5 text-xs font-semibold text-(--skin-muted)">
              Simulated
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* 15-minute countdown: only the digits change. The timer role does not announce each tick; the status line below speaks at 5:00, 1:00 and 0:00. */}
            <div className="flex items-center gap-2 rounded-full border border-(--skin-line) bg-(--skin-surface-2) px-3.5 py-1.5 text-xs">
              <IconClock size={14} className="shrink-0 text-(--skin-muted)" />
              <span className="hidden text-(--skin-muted) sm:inline">Expires in</span>
              <span
                role="timer"
                aria-label="Time left"
                className={`t-ledger inline-block min-w-[5ch] text-sm font-semibold ${
                  isCountdownUrgent(secondsLeft) ? "text-(--skin-bad)" : "text-(--skin-ink)"
                }`}
              >
                {timeFormatted}
              </span>
            </div>
            <p role="status" className="sr-only">
              {countdownNotice(secondsLeft)}
            </p>

            <div className="hidden text-right sm:block">
              <span className="t-label block text-(--skin-muted)">Total payable</span>
              <span className="text-base font-semibold tabular-nums text-(--skin-money)">₹{formattedAmount}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center p-4 focus:outline-none sm:p-6 lg:p-8">
        <div className="grid w-full grid-cols-1 overflow-hidden rounded-dialog border border-(--skin-line) bg-(--skin-surface) lg:grid-cols-[340px_1fr]">
          {/* Left column: order summary */}
          <div className="flex flex-col justify-between border-b border-(--skin-line) bg-(--skin-surface-2) p-6 sm:p-7 lg:border-b-0 lg:border-r">
            <div className="space-y-6">
              <div>
                <span className="t-label text-(--skin-muted)">Tysonpe store</span>
                <h1 className="mt-1 text-lg font-semibold leading-snug">{order.product.title}</h1>
              </div>

              <dl className="space-y-2 rounded-card border border-(--skin-line) bg-(--skin-surface) p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-(--skin-muted)">Order reference</dt>
                  <dd className="t-ledger max-w-36 truncate text-xs">{order.providerOrderId}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-(--skin-muted)">Customer</dt>
                  <dd className="max-w-36 truncate">{user.name}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-(--skin-line) pt-2 font-semibold">
                  <dt>Amount due</dt>
                  <dd className="text-lg tabular-nums text-(--skin-money)">₹{formattedAmount}</dd>
                </div>
              </dl>

              <ul className="space-y-2.5 text-sm text-(--skin-muted)">
                <li className="flex items-start gap-2">
                  <IconInfo size={16} className="mt-0.5 shrink-0" />
                  <span>Test mode. No real money moves.</span>
                </li>
                <li className="flex items-start gap-2">
                  <IconInfo size={16} className="mt-0.5 shrink-0" />
                  <span>No real card, UPI or bank details are sent.</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 border-t border-(--skin-line) pt-4">
              <Link
                href={`/checkout/pay/${order.id}`}
                className={`inline-flex items-center gap-1.5 rounded-control text-sm text-(--skin-muted) hover:text-(--skin-ink) ${PRESS} ${TOUCH} ${FOCUS}`}
              >
                <IconArrowLeft size={16} />
                <span>Cancel and return to store</span>
              </Link>
            </div>
          </div>

          {/* Right column: payment methods */}
          <div className="flex flex-col justify-between space-y-6 p-6 sm:p-8">
            {isProcessing ? (
              <div role="status" className="space-y-5 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-(--skin-line) bg-(--skin-surface-2) text-(--skin-accent)">
                  <IconLock size={22} />
                </div>
                <div className="mx-auto max-w-md space-y-1.5">
                  <p className="text-lg font-semibold">{processingMsg}</p>
                  <p className="t-meta text-(--skin-muted)">
                    Simulated payment. Please do not close or refresh this browser tab.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Method navigation */}
                <div role="group" aria-labelledby="eb-method-label">
                  <p id="eb-method-label" className={`${LABEL} mb-2`}>
                    Select payment method
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {methods.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={tab === m.id}
                        onClick={() => setTab(m.id)}
                        className={`flex flex-col items-center gap-1.5 rounded-card border p-3 text-sm font-semibold ${PRESS} ${TOUCH} ${FOCUS} ${
                          tab === m.id
                            ? "border-(--skin-accent) bg-(--skin-accent) text-(--skin-accent-ink)"
                            : "border-(--skin-line) bg-(--skin-surface) text-(--skin-ink) hover:bg-(--skin-surface-2)"
                        }`}
                      >
                        {m.icon}
                        <span>{m.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Method view */}
                <div className="rounded-card border border-(--skin-line) bg-(--skin-surface-2) p-5">
                  {tab === "upi" && (
                    <div className="space-y-4">
                      <div role="group" aria-label="UPI method" className="flex gap-1 rounded-control bg-(--skin-line) p-1 text-sm font-semibold">
                        {(
                          [
                            ["apps", "UPI apps"],
                            ["qr", "Scan QR"],
                            ["id", "Enter VPA"],
                          ] as const
                        ).map(([id, name]) => (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={upiMode === id}
                            onClick={() => setUpiMode(id)}
                            className={`flex-1 rounded-control px-2 py-1.5 ${PRESS} ${TOUCH} ${FOCUS} ${
                              upiMode === id
                                ? "bg-(--skin-surface) text-(--skin-ink)"
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
                              aria-pressed={selectedApp === app.id}
                              onClick={() => setSelectedApp(app.id)}
                              className={`flex flex-col items-center justify-center gap-2 rounded-card p-3 text-xs font-semibold ${choiceClass(selectedApp === app.id)}`}
                            >
                              {app.icon}
                              <span className="w-full truncate text-center">{app.name}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {upiMode === "qr" && (
                        <div className="flex flex-col items-center justify-center space-y-3 rounded-card border border-(--skin-line) bg-(--skin-surface) p-4">
                          <div className="rounded-control border border-(--skin-line) p-2">
                            <QrCodeIcon className="h-24 w-24 text-(--skin-ink)" />
                          </div>
                          <p className="text-sm font-semibold">Scan and pay with any UPI app</p>
                        </div>
                      )}

                      {upiMode === "id" && (
                        <div className="space-y-1.5">
                          <label htmlFor="eb-vpa" className={LABEL}>
                            Virtual payment address (VPA)
                          </label>
                          <input
                            id="eb-vpa"
                            type="text"
                            inputMode="email"
                            autoComplete="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            value={vpa}
                            onChange={(e) => setVpa(e.target.value)}
                            placeholder="mobile-number@upi"
                            className={INPUT}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {tab === "cards" && (
                    <div className="space-y-3">
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label htmlFor="eb-card-num" className="t-label text-(--skin-muted)">
                            Card number
                          </label>
                          <div className="flex gap-1.5">
                            <VisaIcon className="h-3.5 w-6" />
                            <MastercardIcon className="h-3.5 w-5" />
                            <RupayIcon className="h-3.5 w-6" />
                          </div>
                        </div>
                        <input
                          id="eb-card-num"
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          value={cardDigits}
                          onChange={(e) => setCardDigits(e.target.value)}
                          className={`${INPUT} t-ledger`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="eb-card-exp" className={LABEL}>
                            Expiry (MM/YY)
                          </label>
                          <input
                            id="eb-card-exp"
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
                          <label htmlFor="eb-card-cvv" className={LABEL}>
                            CVV
                          </label>
                          <input
                            id="eb-card-cvv"
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
                        <label htmlFor="eb-card-holder" className={LABEL}>
                          Cardholder name
                        </label>
                        <input
                          id="eb-card-holder"
                          type="text"
                          autoComplete="cc-name"
                          defaultValue={user.name}
                          className={INPUT}
                        />
                      </div>
                    </div>
                  )}

                  {tab === "netbanking" && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold">Select a net banking provider</p>
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
                            className={`flex items-center gap-2.5 rounded-card p-3 text-xs font-semibold ${choiceClass(selectedBank === bank.id)}`}
                          >
                            {bank.icon}
                            <span className="truncate">{bank.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === "wallet" && (
                    <div role="radiogroup" aria-label="Wallet" className="space-y-2">
                      <p className="text-sm font-semibold">Digital wallets</p>
                      {[
                        { name: "Paytm Wallet", icon: <PaytmIcon className="h-3 w-6" /> },
                        { name: "PhonePe Wallet", icon: <PhonePeIcon className="h-5 w-5" /> },
                        { name: "Mobikwik", icon: <WalletIcon className="h-5 w-5 text-(--skin-ink)" /> },
                      ].map((w, idx) => (
                        <label
                          key={w.name}
                          className={`flex cursor-pointer items-center justify-between rounded-card border border-(--skin-line) bg-(--skin-surface) p-3 text-sm font-semibold hover:bg-(--skin-surface-2) ${TOUCH} ${PRESS} has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--skin-accent)`}
                        >
                          <span className="flex items-center gap-3">
                            {w.icon}
                            <span>{w.name}</span>
                          </span>
                          <input type="radio" name="eb_wallets" defaultChecked={idx === 0} className="h-4 w-4 accent-(--skin-accent)" />
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outcome the simulation will settle with */}
                <fieldset className="space-y-2 rounded-card border border-(--skin-line) bg-(--skin-surface-2) p-3">
                  <legend className="t-label px-1 text-(--skin-muted)">Simulated outcome</legend>
                  <p className="t-meta text-(--skin-muted)">You return to the store when this finishes.</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {outcomes.map((o) => (
                      <label key={o.id} className="relative block">
                        <input
                          type="radio"
                          name="eb-outcome"
                          value={o.id}
                          checked={outcome === o.id}
                          onChange={() => setOutcome(o.id)}
                          className="peer sr-only"
                        />
                        <span
                          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-control border border-(--skin-line) bg-(--skin-surface) p-2 font-semibold text-(--skin-muted) ${PRESS} ${TOUCH} ${o.on} peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--skin-accent)`}
                        >
                          {o.icon}
                          {o.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {/* Pay */}
                <div className="space-y-3">
                  <form action={handleFormSubmit}>
                    <button
                      type="submit"
                      disabled={secondsLeft <= 0}
                      className={`flex w-full items-center justify-center gap-2 rounded-control bg-(--skin-accent) px-4 py-3.5 text-base font-semibold text-(--skin-accent-ink) hover:bg-(--skin-accent-hover) disabled:pointer-events-none disabled:opacity-50 ${PRESS} ${TOUCH} ${FOCUS}`}
                    >
                      <IconLock size={18} />
                      <span className="tabular-nums">Pay ₹{formattedAmount}</span>
                    </button>
                  </form>

                  <div className="text-center">
                    <form action={settleEasebuzzDemoAction.bind(null, order.id, "cancel")}>
                      <button
                        type="submit"
                        className={`inline-flex items-center justify-center rounded-control px-2 py-1 text-sm font-medium text-(--skin-muted) underline hover:text-(--skin-ink) ${PRESS} ${TOUCH} ${FOCUS}`}
                      >
                        Cancel transaction and return to store
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-1.5 border-t border-(--skin-line) pt-3 text-xs text-(--skin-muted)">
              <IconInfo size={14} className="shrink-0" />
              <span>Simulated hosted page in test mode.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
