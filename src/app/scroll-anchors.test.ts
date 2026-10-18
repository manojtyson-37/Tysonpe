// globals.css gives `html` a scroll-padding-top of 5rem so that an anchor or a focus() target is not hidden under the
// sticky header. Scroll padding and an element's scroll margin ADD, so an anchor that also carries `scroll-mt-*` lands
// twice as far down. This scans the app sources: any scroll margin must be on the allowlist, with the reason.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(import.meta.dirname, "..");
const ALLOWLIST: Record<string, string> = {
  // "src/relative/path.tsx": "why this target is not under the sticky header",
};

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) files(full, out);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

describe("scroll margins against the global scroll padding", () => {
  it("scans a real tree", () => {
    expect(files(SRC).length).toBeGreaterThan(100);
  });

  it("no source carries a scroll-margin utility unless it is on the allowlist", () => {
    const found = files(SRC)
      .map((file) => [path.relative(path.dirname(SRC), file), readFileSync(file, "utf8")] as const)
      .filter(([, src]) => /(?:^|[\s"'`:])-?scroll-m[trblxyse]?-/.test(src))
      .map(([rel]) => rel)
      .filter((rel) => !(rel in ALLOWLIST));
    expect(found).toEqual([]);
  });

  it("the scanner finds a margin utility when there is one (positive control)", () => {
    const re = /(?:^|[\s"'`:])-?scroll-m[trblxyse]?-/;
    for (const sample of ['className="scroll-mt-24 min-w-0"', 'class="outline-none scroll-mt-14"', "md:scroll-mt-20", "`scroll-my-4`"]) {
      expect(re.test(sample), sample).toBe(true);
    }
    expect(re.test('className="scroll-smooth"')).toBe(false);
  });
});
