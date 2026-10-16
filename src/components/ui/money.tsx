import { formatINR } from "@/lib/money";

export type MoneyTone = "default" | "good" | "bad" | "muted";
export type MoneySize = "sm" | "md" | "lg" | "xl";
/** "+" shows a credit, "−" (true minus) shows a deduction from a positive amount. */
export type MoneySign = "+" | "−";

const MINUS = "\u2212"; // true minus, never a hyphen

// default inherits colour from the surrounding text; emerald (good) is for money in and success only.
const TONE_CLASS: Record<MoneyTone, string> = {
  default: "",
  good: "text-good",
  bad: "text-bad",
  muted: "text-muted",
};

// md inherits the surrounding type so Money can sit inside any sentence or table cell.
const SIZE_CLASS: Record<MoneySize, string> = {
  sm: "text-sm",
  md: "",
  lg: "text-xl font-semibold",
  xl: "text-2xl font-semibold sm:text-3xl",
};

/** Swaps a leading hyphen-minus for the true minus (U+2212) so negatives set properly. */
export function trueMinus(text: string): string {
  return text.startsWith("-") ? MINUS + text.slice(1) : text;
}

function signFor(paise: number, sign: MoneySign | undefined): string {
  if (paise === 0) return "";
  if (sign === MINUS) return MINUS;
  if (paise < 0) return MINUS;
  return sign === "+" ? "+" : "";
}

/**
 * The only way to print a rupee amount. All formatting goes through formatINR (output is test-pinned);
 * the sign is added here from the absolute value so a hyphen can never leak in.
 */
export function Money({
  paise,
  tone = "default",
  sign,
  free = false,
  size = "md",
  mono = false,
  className,
}: {
  paise: number;
  tone?: MoneyTone;
  sign?: MoneySign;
  /** Print "Free" instead of the amount when paise is zero. */
  free?: boolean;
  size?: MoneySize;
  /** Ledger face (JetBrains Mono) for columns of figures only. */
  mono?: boolean;
  className?: string;
}) {
  const text = free && paise === 0 ? "Free" : signFor(paise, sign) + formatINR(Math.abs(paise));
  const cls = ["tabular-nums whitespace-nowrap", mono && "font-mono", SIZE_CLASS[size], TONE_CLASS[tone], className]
    .filter(Boolean)
    .join(" ");
  return <span className={cls}>{text}</span>;
}

/** An amount with its billing period and tax note: "₹500 / month incl. GST". Zero renders a bare "Free". */
export function Price({
  paise,
  period,
  gstNote,
  size = "md",
  className,
}: {
  paise: number;
  /** Billing period shown as "/ month". */
  period?: string;
  /** Tax note shown after the amount, e.g. "incl. GST". */
  gstNote?: string;
  size?: MoneySize;
  className?: string;
}) {
  const isFree = paise === 0;
  return (
    <span className={["inline-flex flex-wrap items-baseline gap-x-1.5", className].filter(Boolean).join(" ")}>
      <Money paise={paise} free size={size} />
      {!isFree && period && <span className="text-muted">/ {period}</span>}
      {!isFree && gstNote && <span className="t-meta">{gstNote}</span>}
    </span>
  );
}
