/**
 * Static scan of a source file for the legacy styling the UI rebuild removes. It reads double-quoted, single-quoted
 * and template literals (where class names live), so `!product` in code is not mistaken for a `!` utility. Comments
 * are dropped first, and a single-quoted literal only counts in a code position (after `= ( , ? : [ { & | +` or
 * `return` / `case`), so an apostrophe in JSX copy ("It's done") never pairs up with the next one and swallows what is between. Returns one
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
  /^[a-z][\w-]*-(?:\[[^\]]*\]|[\w./%-])*!$/, // w-auto!, bg-[#fff]!, py-1.5! (case-sensitive: "Well-done!" is copy)
];
// After `<tag`, an attribute named title whose value is a string, or a braced expression with a string branch.
const TITLE_ATTR = /\stitle=(?:["']|\{\s*(?:["'`]|[^}]*?(?:\?|&&|\|\|)\s*["'`]))/y;
const IN_CODE_POSITION = /(?:[=(,?:[{&|+]|\b(?:return|case))\s*$/;

/** Index just past the string/template literal that opens at `start`, or -1 when a quote has no partner (a template may span lines). */
function literalEnd(source: string, start: number): number {
  const quote = source[start];
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === "\\") i++;
    else if (source[i] === quote) return i + 1;
    else if (source[i] === "\n" && quote !== "`") return -1;
  }
  return -1;
}

/**
 * Blanks comments (newlines kept) without looking inside a string: `accept="image/*"` does not open a block comment and
 * `"a // b"` is not a line comment. A line comment needs line start or whitespace before it, so `http://x` in JSX copy
 * stays text, and a single quote only opens a string in a code position, so an apostrophe in JSX copy opens nothing.
 */
function withoutComments(source: string): string {
  let out = "";
  const blank = (text: string) => text.replace(/[^\n]/g, " ");
  for (let i = 0; i < source.length; ) {
    const c = source[i];
    if (c === '"' || c === "`" || (c === "'" && IN_CODE_POSITION.test(out.slice(-24)))) {
      const end = literalEnd(source, i);
      if (end !== -1) {
        out += source.slice(i, end);
        i = end;
        continue;
      }
    } else if (c === "/" && source[i + 1] === "*") {
      const close = source.indexOf("*/", i + 2);
      const end = close === -1 ? source.length : close + 2;
      out += " " + blank(source.slice(i + 1, end));
      i = end;
      continue;
    } else if (c === "/" && source[i + 1] === "/" && (i === 0 || /\s/.test(source[i - 1]))) {
      const nl = source.indexOf("\n", i);
      const end = nl === -1 ? source.length : nl;
      out += blank(source.slice(i, end));
      i = end;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Index just past the `{...}` that opens at `start`, skipping strings and nested braces; source.length when unbalanced. */
function braceEnd(source: string, start: number): number {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (c === '"' || c === "'" || c === "`") {
      const end = literalEnd(source, i);
      if (end !== -1) i = end - 1;
    } else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i + 1;
  }
  return source.length;
}

/**
 * True when a tag whose name starts lowercase (an intrinsic element, not a component) has a title attribute with a
 * string or a string branch. Attributes are walked, not pattern-matched, so a `>` inside a quoted or braced value
 * (`className="[&>svg]:x"`, `onClick={() => f(a > b)}`) does not end the tag early.
 */
function hasIntrinsicTitle(source: string): boolean {
  for (const open of source.matchAll(/<[a-z][\w-]*/g)) {
    for (let i = open.index + open[0].length; i < source.length; ) {
      const c = source[i];
      TITLE_ATTR.lastIndex = i;
      if (TITLE_ATTR.test(source)) return true;
      if (c === '"' || c === "'") {
        const end = literalEnd(source, i);
        i = end === -1 ? i + 1 : end;
      } else if (c === "{") i = braceEnd(source, i);
      else if (c === ">" && source[i - 1] !== "=") break;
      else i++;
    }
  }
  return false;
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
  if (hasIntrinsicTitle(source)) findings.push("title= tooltip");
  return findings;
}
