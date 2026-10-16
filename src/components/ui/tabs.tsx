"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { LazyMotion, MotionConfig, domMax, m } from "framer-motion";

/* ------------------------------------------------------------------ pure helpers */

/**
 * Roving-focus target for a tab or segment list. Arrow keys wrap around, Home and End jump to the ends, any other
 * key (or an empty list) returns `current` unchanged so callers can tell nothing moved.
 */
export function nextIndex(current: number, key: string, count: number): number {
  if (count <= 0) return current;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return current;
  }
}

export type TabMatch = "exact" | "prefix";

/** Whether `pathname` is "inside" `href`. `prefix` (default) respects segment boundaries: /a matches /a/b but not /ab. */
export function isLinkActive(pathname: string, href: string, match: TabMatch = "prefix"): boolean {
  const target = href.split(/[?#]/)[0] || "/";
  if (match === "exact") return pathname === target;
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}

/** Stable DOM ids that tie a tab to its panel. Used by `Tabs` and by `TabPanel`. */
export function tabId(base: string, value: string): string {
  return `${base}-tab-${value}`;
}
export function tabPanelId(base: string, value: string): string {
  return `${base}-panel-${value}`;
}

/* ------------------------------------------------------------------ shared pieces */

// 200ms with --ease-out (cubic-bezier .25,1,.5,1): the same values as --dur-base and --ease-out in globals.css.
const INDICATOR_TRANSITION = { duration: 0.2, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] };

const ITEM_BASE =
  "relative inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-control px-3.5 text-sm font-medium " +
  "transition-[color,scale] duration-(--dur-fast) ease-(--ease-standard) active:scale-(--scale-press)";

const ITEM_TONE = {
  active: "text-ink",
  idle: "text-muted hover:text-ink",
};

type Variant = "tabs" | "segmented";

// Tabs: the active item gets a tone-step pill on the canvas. Segmented: a recessed track with a raised hairline thumb.
const INDICATOR_CLASS: Record<Variant, string> = {
  tabs: "absolute inset-0 rounded-control bg-surface-2",
  segmented: "absolute inset-0 rounded-control border border-line-strong bg-surface",
};

const LIST_CLASS: Record<Variant, string> = {
  tabs: "flex items-center gap-1",
  segmented: "inline-flex items-center gap-0.5 rounded-control bg-surface-2 p-0.5",
};

function Motion({ children }: { children: ReactNode }) {
  // reducedMotion="user" turns layout (transform) animations into instant jumps under prefers-reduced-motion.
  return (
    <LazyMotion features={domMax}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

function Indicator({ layoutId, variant }: { layoutId: string; variant: Variant }) {
  // initial={false}: the first paint is the final state, so there is no entrance animation.
  return <m.span layoutId={layoutId} initial={false} transition={INDICATOR_TRANSITION} className={INDICATOR_CLASS[variant]} aria-hidden="true" />;
}

/* ------------------------------------------------------------------ Tabs */

export type LinkTabItem = {
  href: string;
  label: ReactNode;
  /** `prefix` (default) stays active on nested routes; `exact` only on the same path (use for an overview tab). */
  match?: TabMatch;
  /** Overrides the pathname check, e.g. for filters held in the query string that the server already resolved. */
  current?: boolean;
};

export type StateTabItem = { value: string; label: ReactNode };

type CommonProps = { ariaLabel: string; className?: string };

export type LinkTabsProps = CommonProps & { items: LinkTabItem[] };

export type StateTabsProps = CommonProps & {
  items: StateTabItem[];
  value: string;
  onChange: (value: string) => void;
  /** Base id for tab/panel linkage; pass the same value to each `TabPanel`. */
  id: string;
};

export type TabsProps = LinkTabsProps | StateTabsProps;

function isStateTabs(props: TabsProps): props is StateTabsProps {
  return "onChange" in props;
}

/**
 * Two modes, picked by the props:
 * - Link mode (`items` with `href`): a `nav` of links; the active one comes from `usePathname()` and carries
 *   `aria-current="page"`. Ordinary Tab-key order, no roving.
 * - State mode (`value` + `onChange` + `id`): ARIA `tablist`, roving tabindex, arrow/Home/End keys, with
 *   `aria-controls` pointing at the matching `TabPanel`.
 */
export function Tabs(props: TabsProps) {
  return isStateTabs(props) ? <StateTabs {...props} /> : <LinkTabs {...props} />;
}

function LinkTabs({ items, ariaLabel, className }: LinkTabsProps) {
  const pathname = usePathname() ?? "";
  const uid = useId();
  const layoutId = `${uid}-indicator`;
  return (
    <Motion>
      <nav aria-label={ariaLabel} className={[LIST_CLASS.tabs, className].filter(Boolean).join(" ")}>
        {items.map((item) => {
          const active = item.current ?? isLinkActive(pathname, item.href, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${ITEM_BASE} ${active ? ITEM_TONE.active : ITEM_TONE.idle}`}
            >
              {active && <Indicator layoutId={layoutId} variant="tabs" />}
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </Motion>
  );
}

function StateTabs({ items, value, onChange, id, ariaLabel, className }: StateTabsProps) {
  const uid = useId();
  const layoutId = `${uid}-indicator`;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = items.findIndex((i) => i.value === value);
  // If `value` matches nothing, keep the first tab reachable by keyboard.
  const tabStop = selectedIndex === -1 ? 0 : selectedIndex;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextIndex(index, event.key, items.length);
    if (next === index) return;
    event.preventDefault();
    refs.current[next]?.focus();
    onChange(items[next].value);
  };

  return (
    <Motion>
      <div role="tablist" aria-label={ariaLabel} className={[LIST_CLASS.tabs, className].filter(Boolean).join(" ")}>
        {items.map((item, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              key={item.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={tabId(id, item.value)}
              aria-selected={selected}
              aria-controls={tabPanelId(id, item.value)}
              tabIndex={index === tabStop ? 0 : -1}
              onClick={() => onChange(item.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`${ITEM_BASE} ${selected ? ITEM_TONE.active : ITEM_TONE.idle}`}
            >
              {selected && <Indicator layoutId={layoutId} variant="tabs" />}
              <span className="relative">{item.label}</span>
            </button>
          );
        })}
      </div>
    </Motion>
  );
}

/** Panel for a state-mode tab. Unselected panels stay in the DOM (so `aria-controls` resolves) but are `hidden`. */
export function TabPanel({
  id,
  value,
  selected,
  className,
  children,
}: {
  id: string;
  value: string;
  selected: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={tabPanelId(id, value)}
      aria-labelledby={tabId(id, value)}
      hidden={!selected}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ SegmentedControl */

export type SegmentedOption = { value: string; label: ReactNode };

export type SegmentedControlProps = {
  /** Two or three options; more belongs in `Tabs`. */
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
};

/**
 * A compact switch for 2 or 3 mutually exclusive modes (for example UPI collect vs intent). It selects a value
 * and controls no panel, so it is a `radiogroup` rather than a tablist: arrow keys move and select, one tab stop.
 */
export function SegmentedControl({ options, value, onChange, ariaLabel, className }: SegmentedControlProps) {
  const uid = useId();
  const layoutId = `${uid}-indicator`;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const tabStop = selectedIndex === -1 ? 0 : selectedIndex;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextIndex(index, event.key, options.length);
    if (next === index) return;
    event.preventDefault();
    refs.current[next]?.focus();
    onChange(options[next].value);
  };

  return (
    <Motion>
      <div role="radiogroup" aria-label={ariaLabel} className={[LIST_CLASS.segmented, className].filter(Boolean).join(" ")}>
        {options.map((option, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={index === tabStop ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`${ITEM_BASE} ${selected ? ITEM_TONE.active : ITEM_TONE.idle}`}
            >
              {selected && <Indicator layoutId={layoutId} variant="segmented" />}
              <span className="relative">{option.label}</span>
            </button>
          );
        })}
      </div>
    </Motion>
  );
}
