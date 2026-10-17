// Pure derivation behind the settings colour preview. It mirrors what the storefront does with a creator's colour:
// BrandScope (components/Brand.tsx) accepts only `#rrggbb` and otherwise falls back to ink, then derives the button
// text, the readable text shade and the ring shade with the helpers in color.ts. Nothing here is a client module, so a
// server page or a test can import it.
import { brandRingColor, brandTextColor, contrastRatio, readableOn } from "./color";

/** BrandScope's fallback for a colour that is not six-digit hex. */
export const FALLBACK_BRAND = "#16130f";
/** BrandScope's validity rule, verbatim: three-digit hex and anything with trailing characters are NOT valid. */
export const HEX6 = /^#[0-9a-f]{6}$/i;

/**
 * True while the text in the colour box is not a complete `#rrggbb` (mid-typing, a typo, or emptied). The colour field only
 * reports valid colours, so during this time the preview still describes the last valid one; this is the signal that says so.
 */
export const isPendingHex = (value: string): boolean => !HEX6.test(value);

export interface BrandPreviewInfo {
  /** False when the input is not `#rrggbb`; `color` is then the ink fallback, exactly as on the storefront. */
  valid: boolean;
  /** The colour the storefront will actually use (the input as typed when valid, else ink). */
  color: string;
  /** Text colour on a brand-filled button. */
  buttonText: "#ffffff" | "#16130f";
  buttonTextName: "white" | "ink";
  /** WCAG contrast of the button text on the brand fill. */
  buttonRatio: number;
  /**
   * Whether that text reaches 4.5:1 (WCAG AA for normal text). White-or-ink is the best of two choices, not a
   * guarantee: mid-tone colours near #777 top out around 4.3:1, so the storefront button is then hard to read.
   */
  buttonOk: boolean;
  /** Brand shade used for text. Equal to `color` when it is already readable. */
  textColor: string;
  /** True when the text shade differs from the picked colour. */
  textAdjusted: boolean;
  /** Contrast of the text shade on white. */
  textRatio: number;
  /** Brand shade used for focus rings and progress fills (non-text UI). */
  ringColor: string;
  ringAdjusted: boolean;
  ringRatio: number;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function brandPreview(input: string): BrandPreviewInfo {
  const valid = HEX6.test(input);
  const color = valid ? input : FALLBACK_BRAND;
  const buttonText = readableOn(color);
  const buttonRatio = contrastRatio(color, buttonText);
  const textColor = brandTextColor(color);
  const ringColor = brandRingColor(color);
  return {
    valid,
    color,
    buttonText,
    buttonTextName: buttonText === "#ffffff" ? "white" : "ink",
    buttonRatio,
    buttonOk: buttonRatio >= 4.5,
    textColor,
    textAdjusted: !same(textColor, color),
    textRatio: contrastRatio(textColor, "#ffffff"),
    ringColor,
    ringAdjusted: !same(ringColor, color),
    ringRatio: contrastRatio(ringColor, "#ffffff"),
  };
}

/** "4.6:1". Truncated, never rounded up, so a displayed 4.5 always means at least 4.5 (4.49 prints 4.4). */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 10 + 1e-9) / 10).toFixed(1)}:1`;
}
