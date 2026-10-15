/** Focus ring that stays visible on a light creator brand (>=3:1): see brandRingColor. */
export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-ring)]";
/** Same ring drawn inside the element, for chips in scrolling containers where an outer outline would be clipped. */
export const focusRingInset = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--brand-ring)]";
/** Active nav/tab chip: ink on the brand tint reads at any brand colour. */
export const chipActive = "bg-brand-soft font-semibold text-ink";
export const chipIdle = "text-muted hover:bg-surface-2 hover:text-ink";
/** "Creator" pill: ink on the brand tint instead of brand-on-tint, which fails for light brands. */
export const creatorBadge = "badge bg-brand-soft text-ink";
