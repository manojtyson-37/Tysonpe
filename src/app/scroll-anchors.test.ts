// globals.css gives `html` a scroll-padding-top of 5rem so that an anchor or a focus() target is not hidden under the
// sticky header. Scroll padding and an element's scroll margin ADD, so an anchor that also carries a scroll margin
// lands twice as far down. This scans the app sources (TS, TSX and CSS) for every spelling of a scroll margin: the
// utilities (`scroll-mt-24`, `scroll-m-4`, with an `!` prefix or a variant), the arbitrary property
// (`[scroll-margin-top:6rem]`), the CSS property and the React style key. Each hit must be on the allowlist, keyed by
// file AND the exact token, with a reason. A stale entry (no longer in the source) or an empty reason fails too.
// The sample strings below are built by concatenation so Tailwind does not compile dead utilities from this file.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(import.meta.dirname, "..");
const ALLOWLIST: Record<string, string> = {
  // "src/relative/path.tsx::token": "why this target is not under the sticky header",
};

const SCROLL = "scroll-";
const MARGIN = "margin";
/** Utility (optionally `!`-prefixed or after variants), arbitrary property, CSS property, React style key. */
const TOKEN = new RegExp(
  `!?-?${SCROLL}m[trblxyse]?-[^\\s"'\`}]*|\\[${SCROLL}${MARGIN}[^\\]]*\\]|${SCROLL}${MARGIN}[\\w-]*|scrollMargin\\w*`,
  "g",
);

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) files(full, out);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

const tokensIn = (src: string) => src.match(TOKEN) ?? [];

describe("scroll margins against the global scroll padding", () => {
  const found = files(SRC).flatMap((file) =>
    tokensIn(readFileSync(file, "utf8")).map((token) => `${path.relative(path.dirname(SRC), file)}::${token}`),
  );

  it("scans a real tree", () => {
    expect(files(SRC).length).toBeGreaterThan(100);
  });

  it("no source carries a scroll margin unless that file and token are on the allowlist", () => {
    expect(found.filter((key) => !(key in ALLOWLIST))).toEqual([]);
  });

  it("every allowlist entry is still in the source and says why", () => {
    for (const [key, reason] of Object.entries(ALLOWLIST)) {
      expect(found, key).toContain(key);
      expect(reason.trim().length, key).toBeGreaterThan(10);
    }
  });

  it("the scanner finds every spelling (positive control)", () => {
    const m = SCROLL + "m";
    const spellings: Array<[string, string]> = [
      [`className="${m}t-24 min-w-0"`, `${m}t-24`],
      [`class="outline-none ${m}t-14"`, `${m}t-14`],
      [`"!${m}t-24"`, `!${m}t-24`],
      [`md:${m}y-4`, `${m}y-4`],
      [`-${m}t-2`, `-${m}t-2`],
      [`"[${SCROLL}${MARGIN}-top:6rem]"`, `[${SCROLL}${MARGIN}-top:6rem]`],
      [`style={{ scrollMarginTop: 96 }}`, "scrollMarginTop"],
      [`.x { ${SCROLL}${MARGIN}-top: 6rem; }`, `${SCROLL}${MARGIN}-top`],
      [`.x { ${SCROLL}${MARGIN}: 0 }`, `${SCROLL}${MARGIN}`],
    ];
    for (const [sample, token] of spellings) expect(tokensIn(sample), sample).toContain(token);
  });

  it("and ignores neighbours that are not margins", () => {
    for (const sample of [`className="${SCROLL}smooth"`, `scroll-padding-top: 5rem`, `className="scroll-pt-20"`, `scrollBehavior: "smooth"`]) {
      expect(tokensIn(sample), sample).toEqual([]);
    }
  });
});
