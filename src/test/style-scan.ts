/**
 * Static scan of a source file for the legacy styling the UI rebuild removes. It reads double-quoted, single-quoted
 * and template literals (where class names live), so `!product` in code is not mistaken for a `!` utility. Returns one
 * human-readable line per finding; an empty list means clean.
 *
 *  - Tailwind `!` overrides, leading ("!w-auto", "sm:!py-1.5") or Tailwind v4 trailing ("w-auto!", "sm:py-1.5!"):
 *    they fight the token classes instead of using them. A trailing `!` needs a hyphen in the token, so copy like
 *    "Saved!" is not a finding.
 *  - `rounded-xl`: radii come from `rounded-control` / `rounded-card`.
 *  - legacy `.btn` / `.card` / `.badge` class strings: use Button, Badge and ruled sections.
 *  - glyph arrows and icons typed as text: use icons.tsx.
 *  - `title="..."` tooltips (also `title='...'`, `title={"..."}`, title={`...`}): invisible on touch, so the text
 *    goes in the row.
 */
export function legacyStyleFindings(source: string): string[] {
  const findings: string[] = [];
  const literals = [...source.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
  for (const literal of literals) {
    for (const token of literal.split(/\s+/).filter(Boolean)) {
      if (/^(?:[^\s:]+:)*!(?=[a-z[-])/i.test(token)) findings.push(`important override: ${token}`);
      if (/^(?:[^\s:]+:)*[a-z][\w\-[\]/.]*-[\w[\]/.]*!$/.test(token)) findings.push(`important override: ${token}`);
      if (/(?:^|:)rounded-xl$/.test(token)) findings.push(`rounded-xl: ${token}`);
      if (/^(?:btn|card|badge)$/.test(token) || /^(?:btn|badge)-/.test(token)) findings.push(`legacy class: ${token}`);
    }
  }
  for (const glyph of source.match(/[↑↓↗→←↖↘]/g) ?? []) findings.push(`glyph: ${glyph}`);
  if (/\stitle=(?:["']|\{\s*["'`])/.test(source)) findings.push("title= tooltip");
  return findings;
}
