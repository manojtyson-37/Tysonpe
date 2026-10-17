/** Focus ring that stays visible on a light creator brand (>=3:1): see brandRingColor. */
export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-ring)]";
/** Brand focus ring plus the 44px floor on coarse pointers: what every community button and button-link carries. */
export const touchButton = `${focusRing} pointer-coarse:min-h-11`;
