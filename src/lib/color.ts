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
