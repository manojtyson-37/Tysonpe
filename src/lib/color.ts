/** Pick black-ish or white text for a hex background using WCAG relative luminance. */
export function readableOn(hex: string): "#ffffff" | "#16130f" {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contrast vs white = 1.05/(L+.05); vs ink(~0.007) = (L+.05)/.057
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.057 ? "#ffffff" : "#16130f";
}

type RGB = [number, number, number];
const INK: RGB = [0x0f, 0x17, 0x2a]; // slate ink, same as --ink

function parseHex(hex: string): RGB | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  return m ? ([0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as RGB) : null;
}

const toHex = (c: RGB) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function luminance([r, g, b]: RGB): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG 2.x contrast ratio between two #rrggbb colours (1 to 21). Unparseable input counts as white. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(parseHex(a) ?? [255, 255, 255]);
  const lb = luminance(parseHex(b) ?? [255, 255, 255]);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** The creator's brand at 12% over white: what `bg-brand-soft` renders as (see BrandScope's `${color}1f`). */
function tintOnWhite(rgb: RGB): string {
  const a = 0x1f / 255;
  return toHex(rgb.map((v) => 255 * (1 - a) + v * a) as RGB);
}

/** Smallest mix of `rgb` toward ink that satisfies `ok`; ink itself is ~17:1 on white so this always ends. */
function darkenUntil(rgb: RGB, ok: (candidate: string) => boolean): string {
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const candidate = toHex(rgb.map((v, i) => v + (INK[i] - v) * Math.min(t, 1)) as RGB);
    if (ok(candidate)) return candidate;
  }
  return toHex(INK);
}

/**
 * Brand colour usable as TEXT: >= 4.5:1 on white and on the 12% tint of the brand itself.
 * Already-readable brands come back unchanged; light brands are mixed toward ink (hue-preserving). Bad input -> ink.
 */
export function brandTextColor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return toHex(INK);
  const tint = tintOnWhite(rgb);
  return darkenUntil(rgb, (c) => contrastRatio(c, "#ffffff") >= 4.5 && contrastRatio(c, tint) >= 4.5);
}

/**
 * Brand colour usable for non-text UI (focus rings, progress fills): >= 3:1 on white and on the surface-2 track (#f8fafc).
 * Bad input -> ink-mixed default.
 */
export function brandRingColor(hex: string): string {
  const rgb = parseHex(hex) ?? ([0x4f, 0x46, 0xe5] as RGB);
  return darkenUntil(rgb, (c) => contrastRatio(c, "#ffffff") >= 3 && contrastRatio(c, "#f8fafc") >= 3);
}
