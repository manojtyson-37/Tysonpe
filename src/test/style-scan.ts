/**
 * Static scan of a source file for the legacy styling the UI rebuild removes. It reads double-quoted, single-quoted
 * and template literals (where class names live), so `!product` in code is not mistaken for a `!` utility. Comments
 * are dropped first, and a single-quoted literal only counts in a code position (after `= ( , ? : [ { & | +` or
 * `return`), so an apostrophe in JSX copy ("It's done") never pairs up with the next one and swallows what is between. Returns one
 * human-readable line per finding; an empty list means clean.
 *
 *  - Tailwind `!` overrides, leading ("!w-auto", "sm:!py-1.5") or Tailwind v4 trailing ("w-auto!", "sm:py-1.5!",
 *    "sm:hidden!", "bg-[#fff]!", bare "hidden!"): they fight the token classes instead of using them. A trailing `!`
 *    needs a variant prefix, a hyphen or one of a short list of bare utilities, so copy like "Saved!" is not a finding.
 *  - `rounded-xl`: radii come from `rounded-control` / `rounded-card`.
 *  - legacy `.btn` / `.card` / `.badge` class strings: use Button, Badge and ruled sections.
 *  - glyph arrows and icons typed as text: use icons.tsx.
 *  - `title="..."` tooltips on lowercase (intrinsic) tags (also `title='...'`, `title={"..."}`, title={`...`} and
 *    `title={x ? "a" : "b"}`): invisible on touch, so the text goes in the row. A component prop such as
 *    `<PageHeader title="...">` is a heading, not a tooltip.
 */
const BARE_UTILITIES = "hidden|block|flex|grid|inline|contents|truncate|grow|shrink|underline|italic|static|fixed|absolute|relative|sticky";
const LEADING_BANG = /^(?:[^\s:]+:)*!(?=[a-z[-])/i;
const TRAILING_BANG = [
  /^(?:[^\s:/]+:)+[^\s/]+!$/, // any variant: sm:hidden!, hover:text-ink!
  new RegExp(`^(?:${BARE_UTILITIES})!$`), // hidden!
  /^[a-z][\w-]*-(?:\[[^\]]*\]|[\w./%-])*!$/i, // w-auto!, bg-[#fff]!, py-1.5!
];
// A tag whose name starts lowercase, then (through `=>` inside other attributes) a title attribute with a string or a string branch.
const INTRINSIC_TITLE = /<[a-z][\w-]*\b(?:=>|[^>])*?\stitle=(?:["']|\{\s*(?:["'`]|[^}]*?(?:\?|&&|\|\|)\s*["'`]))/;

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|\s)\/\/[^\n]*/g, "$1");
}

export function legacyStyleFindings(rawSource: string): string[] {
  const findings: string[] = [];
  const source = withoutComments(rawSource);
  const literals = [...source.matchAll(/"([^"\n]*)"|`([^`]*)`|(?<=[=(,?:[{&|+]\s*|\breturn\s+)'([^'\n]*)'/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
  for (const literal of literals) {
    for (const token of literal.split(/\s+/).filter(Boolean)) {
      if (LEADING_BANG.test(token) || TRAILING_BANG.some((rule) => rule.test(token))) findings.push(`important override: ${token}`);
      if (/(?:^|:)rounded-xl$/.test(token)) findings.push(`rounded-xl: ${token}`);
      if (/^(?:btn|card|badge)$/.test(token) || /^(?:btn|badge)-/.test(token)) findings.push(`legacy class: ${token}`);
    }
  }
  for (const glyph of source.match(/[↑↓↗→←↖↘]/g) ?? []) findings.push(`glyph: ${glyph}`);
  if (INTRINSIC_TITLE.test(source)) findings.push("title= tooltip");
  return findings;
}
