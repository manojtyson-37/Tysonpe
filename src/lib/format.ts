// Display formatters. Dates render in IST regardless of the host timezone so server and client agree.
// Money formatting stays in money.ts (output is test-pinned); it is re-exported here for one import site.

export { formatINR } from "./money";

const IST = "Asia/Kolkata";
const DASH = "—";

const dateShort = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" });
const dateLong = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "long", year: "numeric" });
const dateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const dateTimeNoYear = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
// en-CA yields ISO-style YYYY-MM-DD.
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: IST });

/** "15 Oct 2026" (short) or "15 October 2026" (long); an em dash when there is no date. */
export function formatDate(d: Date | null | undefined, style: "short" | "long" = "short"): string {
  if (!d) return DASH;
  return (style === "long" ? dateLong : dateShort).format(d);
}

/** "15 Oct 2026, 3:30 pm", or "15 Oct, 3:30 pm" with `year: false`; an em dash when there is no date. */
export function formatDateTime(d: Date | null | undefined, opts: { year?: boolean } = {}): string {
  if (!d) return DASH;
  return (opts.year === false ? dateTimeNoYear : dateTime).format(d);
}

/** "YYYY-MM-DD" of the IST calendar day containing `d` (chart buckets, grouping keys). */
export function istDay(d: Date): string {
  return dayKey.format(d);
}

/** Like `istDay` but for optional values: "" when there is no date (form default values). */
export function istDate(d: Date | null | undefined): string {
  return d ? istDay(d) : "";
}
