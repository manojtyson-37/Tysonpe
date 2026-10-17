/**
 * Static scan of a source file for the legacy styling the UI rebuild removes. It reads string and template
 * literals (where class names live), so `!product` in code is not mistaken for a `!` utility. Returns one
 * human-readable line per finding; an empty list means clean.
 *
 *  - Tailwind `!` overrides ("!w-auto", "sm:!py-1.5"): they fight the token classes instead of using them.
 *  - `rounded-xl`: radii come from `rounded-control` / `rounded-card`.
 *  - legacy `.btn` / `.card` / `.badge` class strings: use Button, Badge and ruled sections.
 *  - glyph arrows and icons typed as text: use icons.tsx.
 *  - `title="..."` tooltips: invisible on touch, so the text goes in the row.
 */
export function legacyStyleFindings(source: string): string[] {
  const findings: string[] = [];
  const literals = [...source.matchAll(/"([^"\n]*)"|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? "");
  for (const literal of literals) {
    for (const token of literal.split(/\s+/).filter(Boolean)) {
      if (/^(?:[^\s:]+:)*!(?=[a-z[-])/i.test(token)) findings.push(`important override: ${token}`);
      if (/(?:^|:)rounded-xl$/.test(token)) findings.push(`rounded-xl: ${token}`);
      if (/^(?:btn|card|badge)$/.test(token) || /^(?:btn|badge)-/.test(token)) findings.push(`legacy class: ${token}`);
    }
  }
  for (const glyph of source.match(/[↑↓↗→←↖↘]/g) ?? []) findings.push(`glyph: ${glyph}`);
  if (/\stitle=(?:"|\{`)/.test(source)) findings.push("title= tooltip");
  return findings;
}
