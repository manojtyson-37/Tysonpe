"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { MotionConfig, m } from "framer-motion";
import { OverlayMotion } from "./motion";

/* ------------------------------------------------------------------ pure helpers */

/** Which arrow keys move the selection. A horizontal tablist uses `horizontal` so Up/Down keep scrolling the page. */
export type ArrowKeys = "horizontal" | "all";

/**
 * Roving-focus target for a tab or segment list. Arrow keys wrap around, Home and End jump to the ends, any other
 * key (or an empty list) returns `current` unchanged so callers can tell nothing moved. With `arrows="horizontal"`
 * ArrowUp and ArrowDown are ignored too.
 */
export function nextIndex(current: number, key: string, count: number, arrows: ArrowKeys = "all"): number {
  if (count <= 0) return current;
  switch (key) {
    case "ArrowDown":
      return arrows === "all" ? (current + 1) % count : current;
    case "ArrowUp":
      return arrows === "all" ? (current - 1 + count) % count : current;
    case "ArrowRight":
      return (current + 1) % count;
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return current;
  }
}

/**
 * Modifier-held arrows are browser and OS shortcuts (back/forward, Spaces, word jumps), so the tablist must
 * leave them alone rather than swallowing them to move the selection.
 */
export function hasSelectionModifier(event: { altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }): boolean {
  return Boolean(event.altKey || event.ctrlKey || event.metaKey);
}

/**
 * A click event with `detail === 0` came from Enter or Space on the focused button, not from a pointer:
 * browsers only set a click count for real pointer clicks.
 */
export function isKeyboardClick(event: { detail: number }): boolean {
  return event.detail === 0;
}

/**
 * Whether the indicator should snap rather than slide after a selection change. Keyboard-driven changes snap,
 * because an indicator chasing arrow-key presses lags behind the focus ring.
 */
export function nextKeyboardDriven(source: "key" | "click", event?: { detail: number }): boolean {
  if (source === "key") return true;
  return event ? isKeyboardClick(event) : false;
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

/**
 * How the sliding indicator travels. Keyboard-initiated changes snap (no motion on keyboard actions); pointer changes
 * slide for 200ms with --ease-out (cubic-bezier .25,1,.5,1), the same values as --dur-base and --ease-out in globals.css.
 */
export function indicatorTransition(keyboardDriven: boolean) {
  return keyboardDriven ? { duration: 0 } : { duration: 0.2, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] };
}

/**
 * Roving tabindex + arrow-key selection shared by the state-mode tablist and the segmented radiogroup. Spread
 * `getItemProps(index)` onto each item button. `keyboardDriven` is true when the last selection change came from the
 * keyboard (arrows, Home/End, Enter/Space) and false after a pointer click, so the indicator can snap or slide.
 */
function useRovingSelection(values: string[], value: string, onChange: (value: string) => void, arrows: ArrowKeys) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [keyboardDriven, setKeyboardDriven] = useState(false);
  const selectedIndex = values.indexOf(value);
  // If `value` matches nothing, keep the first item reachable by keyboard.
  const tabStop = selectedIndex === -1 ? 0 : selectedIndex;

  const getItemProps = (index: number) => ({
    ref: (el: HTMLButtonElement | null) => {
      refs.current[index] = el;
    },
    type: "button" as const,
    tabIndex: index === tabStop ? 0 : -1,
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      setKeyboardDriven(nextKeyboardDriven("click", event));
      onChange(values[index]);
    },
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      // Leave Alt/Ctrl/Meta-held arrows to the browser and OS.
      if (hasSelectionModifier(event)) return;
      const next = nextIndex(index, event.key, values.length, arrows);
      if (next === index) return;
      event.preventDefault();
      setKeyboardDriven(nextKeyboardDriven("key"));
      refs.current[next]?.focus();
      onChange(values[next]);
    },
  });

  return { selectedIndex, keyboardDriven, getItemProps };
}

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
  // The features come from the shared loader (a separate chunk); the indicator uses initial={false}, so first paint
  // never waits on it and a failed load only means the indicator jumps instead of sliding.
  return (
    <OverlayMotion>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </OverlayMotion>
  );
}

function Indicator({ layoutId, variant, keyboardDriven = false }: { layoutId: string; variant: Variant; keyboardDriven?: boolean }) {
  // initial={false}: the first paint is the final state, so there is no entrance animation.
  return (
    <m.span
      layoutId={layoutId}
      initial={false}
      transition={indicatorTransition(keyboardDriven)}
      className={INDICATOR_CLASS[variant]}
      aria-hidden="true"
    />
  );
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
  // A link tab navigates, so the indicator's next move happens on the new pathname. Remember how the last
  // activation was made so a keyboard-activated tab snaps, matching the state-mode tablist.
  const [keyboardDriven, setKeyboardDriven] = useState(false);
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
              onClick={(event) => setKeyboardDriven(nextKeyboardDriven("click", event))}
              className={`${ITEM_BASE} ${active ? ITEM_TONE.active : ITEM_TONE.idle}`}
            >
              {active && <Indicator layoutId={layoutId} variant="tabs" keyboardDriven={keyboardDriven} />}
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
  // Horizontal tablist: Up/Down are left to the page so vertical scrolling is not hijacked.
  const { selectedIndex, keyboardDriven, getItemProps } = useRovingSelection(
    items.map((i) => i.value),
    value,
    onChange,
    "horizontal",
  );

  return (
    <Motion>
      <div role="tablist" aria-label={ariaLabel} className={[LIST_CLASS.tabs, className].filter(Boolean).join(" ")}>
        {items.map((item, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              key={item.value}
              {...getItemProps(index)}
              role="tab"
              id={tabId(id, item.value)}
              aria-selected={selected}
              aria-controls={tabPanelId(id, item.value)}
              className={`${ITEM_BASE} ${selected ? ITEM_TONE.active : ITEM_TONE.idle}`}
            >
              {selected && <Indicator layoutId={layoutId} variant="tabs" keyboardDriven={keyboardDriven} />}
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
  const { selectedIndex, keyboardDriven, getItemProps } = useRovingSelection(
    options.map((o) => o.value),
    value,
    onChange,
    "all",
  );

  return (
    <Motion>
      <div role="radiogroup" aria-label={ariaLabel} className={[LIST_CLASS.segmented, className].filter(Boolean).join(" ")}>
        {options.map((option, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              key={option.value}
              {...getItemProps(index)}
              role="radio"
              aria-checked={selected}
              className={`${ITEM_BASE} ${selected ? ITEM_TONE.active : ITEM_TONE.idle}`}
            >
              {selected && <Indicator layoutId={layoutId} variant="segmented" keyboardDriven={keyboardDriven} />}
              <span className="relative">{option.label}</span>
            </button>
          );
        })}
      </div>
    </Motion>
  );
}
