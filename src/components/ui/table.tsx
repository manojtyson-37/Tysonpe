import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { formatDate, formatDateTime } from "@/lib/format";
import { Money, type MoneySign, type MoneyTone } from "./money";

type Align = "left" | "right";

const join = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

// Right-edge scroll hint: a mask fade (not a gradient background) plus matching end padding, so content that
// fits is never covered. With `stack` nothing scrolls below sm, so the hint starts at sm.
const FADE =
  "pr-5 [mask-image:linear-gradient(to_right,#000_calc(100%_-_1.25rem),transparent)]";
const FADE_FROM_SM =
  "sm:pr-5 sm:[mask-image:linear-gradient(to_right,#000_calc(100%_-_1.25rem),transparent)]";

// Head hairline is a border; a sticky header gets an inset 1px line instead because borders do not travel with sticky cells.
const HEAD_STATIC = "[&_thead]:border-b [&_thead]:border-line";
const HEAD_STICKY =
  "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-surface-2 [&_thead_th]:shadow-[inset_0_-1px_0_var(--line)]";

// Below sm: the head is kept for screen readers only, rows and body become blocks, and every cell becomes a
// label/value line that prints its data-label first. Cells with a colspan (EmptyRow) are left alone.
// Class names are written out in full: Tailwind finds them by scanning source text, so they cannot be interpolated.
const STACK_TABLE = [
  "max-sm:block max-sm:[&_thead]:sr-only max-sm:[&_tbody]:block max-sm:[&_tr]:block max-sm:[&_tr]:py-3",
  "max-sm:[&_td:not([colspan])]:flex max-sm:[&_td:not([colspan])]:items-baseline max-sm:[&_td:not([colspan])]:justify-between",
  "max-sm:[&_td:not([colspan])]:gap-4 max-sm:[&_td:not([colspan])]:px-0 max-sm:[&_td:not([colspan])]:py-1.5",
  "max-sm:[&_td:not([colspan])]:before:content-[attr(data-label)] max-sm:[&_td:not([colspan])]:before:shrink-0 max-sm:[&_td:not([colspan])]:before:text-left",
].join(" ");

// How the printed label looks. Micro-label (the default): small, bold, uppercase, tracked. Sentence: plain text for pages
// that are already at their quota of micro-labels on a phone.
const STACK_LABEL_UPPER = [
  "max-sm:[&_td:not([colspan])]:before:text-xs max-sm:[&_td:not([colspan])]:before:font-semibold max-sm:[&_td:not([colspan])]:before:uppercase",
  "max-sm:[&_td:not([colspan])]:before:tracking-[0.06em] max-sm:[&_td:not([colspan])]:before:text-muted",
].join(" ");
const STACK_LABEL_SENTENCE = "max-sm:[&_td:not([colspan])]:before:text-sm max-sm:[&_td:not([colspan])]:before:text-muted";

// The scroll wrapper is focusable, so it must have a name: pass a caption, an aria-label, or both.
type TableName =
  | {
      /** Visually hidden table title; also names the scroll region. */
      caption: string;
      /** Accessible name. Wins over `caption` for the region name. */
      "aria-label"?: string;
    }
  | {
      caption?: string;
      /** Accessible name. Wins over `caption` for the region name. */
      "aria-label": string;
    };

export type TableProps = TableName & {
  children: ReactNode;
  /** Classes for the scroll wrapper. With `stickyHeader`, cap its height here (for example `max-h-96`). */
  className?: string;
  /** Pins the head cells while the body scrolls inside the wrapper. Needs a height cap via `className`. */
  stickyHeader?: boolean;
  /** Below sm, render each row as label/value blocks (CSS only; pass `label` to each Td). */
  stack?: boolean;
  /** With `stack`: how the printed label looks below sm. `upper` (default) is the uppercase tracked micro-label; `sentence` is plain text. */
  labelCase?: "upper" | "sentence";
};

/**
 * A real <table> in a keyboard-focusable horizontal scroll wrapper. No card box: rows are separated by
 * hairlines and the head carries the `.t-label` style. Compose with <thead>/<tbody>, Tr, Th and Td.
 *
 * The wrapper always reserves a fixed `pr-5` of end padding (from `sm` up with `stack`) for the scroll fade,
 * so do not override its right padding via `className`. Header rows should use a plain <tr>, not Tr, which
 * applies a hover fill meant for body rows. Needs `caption` or `aria-label` (it names the focusable region).
 */
export function Table({ children, className, caption, "aria-label": ariaLabel, stickyHeader = false, stack = false, labelCase = "upper" }: TableProps) {
  const regionName = ariaLabel ?? caption;
  // The mask clips the global outside focus outline, so the ring is drawn inset on the wrapper.
  const wrapperCls = join("overflow-x-auto focus-visible:outline-offset-[-2px]", stack ? FADE_FROM_SM : FADE, className);
  const tableCls = join(
    "w-full text-left text-sm [&_tbody]:divide-y [&_tbody]:divide-line",
    stickyHeader ? HEAD_STICKY : HEAD_STATIC,
    stack && STACK_TABLE,
    stack && (labelCase === "sentence" ? STACK_LABEL_SENTENCE : STACK_LABEL_UPPER),
  );
  return (
    <div
      className={wrapperCls}
      tabIndex={0}
      role="region"
      aria-label={regionName}
    >
      <table role="table" className={tableCls} aria-label={ariaLabel} data-stack={stack ? "true" : undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function Th({
  align = "left",
  scope = "col",
  className,
  ...rest
}: ComponentPropsWithoutRef<"th"> & { align?: Align; scope?: "col" | "row" }) {
  return (
    <th
      scope={scope}
      role={scope === "row" ? "rowheader" : "columnheader"}
      className={join("t-label px-3 py-2.5 align-bottom", align === "right" ? "text-right" : "text-left", className)}
      {...rest}
    />
  );
}

/** A row with a hover fill and no other motion. */
export function Tr({ className, ...rest }: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      role="row"
      className={join("transition-colors duration-(--dur-fast) ease-(--ease-standard) hover:bg-surface-2", className)}
      {...rest}
    />
  );
}

export function Td({
  align = "left",
  label,
  className,
  ...rest
}: ComponentPropsWithoutRef<"td"> & {
  align?: Align;
  /** Column name printed before the value when the table is in `stack` mode below sm. */
  label?: string;
}) {
  return (
    <td
      role="cell"
      data-label={label}
      className={join("px-3 py-3 align-middle text-sm", align === "right" && "text-right", className)}
      {...rest}
    />
  );
}

/** A right-aligned, tabular rupee amount. Formatting and sign handling come from `Money`. */
export function MoneyCell({
  paise,
  tone,
  sign,
  mono,
  label,
  className,
}: {
  paise: number;
  tone?: MoneyTone;
  sign?: MoneySign;
  /** Ledger face for columns of figures. */
  mono?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <Td align="right" label={label} className={join("whitespace-nowrap tabular-nums", className)}>
      <Money paise={paise} tone={tone} sign={sign} mono={mono} />
    </Td>
  );
}

/** A date in IST. A missing or invalid date prints an em dash. */
export function DateCell({
  date,
  style = "short",
  time = false,
  label,
  className,
}: {
  date: Date | null | undefined;
  style?: "short" | "long";
  /** Add the time of day ("15 Oct 2026, 3:30 pm"); `style` is ignored when set. */
  time?: boolean;
  label?: string;
  className?: string;
}) {
  const valid = date instanceof Date && !Number.isNaN(date.getTime());
  return (
    <Td label={label} className={join("whitespace-nowrap", className)}>
      {valid ? (
        <time dateTime={date.toISOString()}>{time ? formatDateTime(date) : formatDate(date, style)}</time>
      ) : (
        formatDate(null)
      )}
    </Td>
  );
}

/**
 * The cell for a row's buttons or links, right-aligned. Give its column a screen-reader heading,
 * for example <Th><span className="sr-only">Actions</span></Th>.
 */
export function RowActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Td align="right" className={join("whitespace-nowrap", className)}>
      <div className="flex items-center justify-end gap-1">{children}</div>
    </Td>
  );
}

/** A full-width row for a table with nothing in it: say what is missing and offer the next step. */
export function EmptyRow({
  colSpan,
  title,
  body,
  action,
}: {
  colSpan: number;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <tr role="row">
      <td role="cell" colSpan={colSpan} className="px-3 py-10 text-center">
        <p className="text-sm font-semibold">{title}</p>
        {body && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>}
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </td>
    </tr>
  );
}
