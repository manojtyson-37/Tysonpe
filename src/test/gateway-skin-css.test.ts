import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The replicas read their colours from --skin-* variables. A variable the JSX reads but the skin block does not define
// resolves to nothing in a browser (the property is dropped), which no render test can see.
const css = readFileSync(path.join(__dirname, "../app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const block = (skin: string) => {
  const m = css.match(new RegExp(`\\[data-skin="${skin}"\\]\\s*\\{([^{}]*)\\}`));
  expect(m, `no [data-skin="${skin}"] block`).not.toBeNull();
  return m![1];
};
const used = (file: string) =>
  new Set([...readFileSync(path.join(__dirname, file), "utf8").matchAll(/--skin-[a-z0-9-]+/g)].map((m) => m[0]));

describe("gateway skin variables", () => {
  for (const [skin, file] of [
    ["razorpay", "../components/RazorpayDemoModal.tsx"],
    ["easebuzz", "../app/gateway/easebuzz/[orderId]/EasebuzzHostedPage.tsx"],
  ] as const) {
    it(`${skin}: every --skin-* the component reads is defined in its own block`, () => {
      const b = block(skin);
      const names = used(file);
      expect(names.size).toBeGreaterThan(5);
      for (const v of names) expect(b, `${v} is not defined in [data-skin="${skin}"]`).toMatch(new RegExp(`(^|[;\\s])${v}\\s*:`));
    });
  }

  it("--skin-money is defined by both skins", () => {
    for (const skin of ["razorpay", "easebuzz"]) expect(block(skin)).toMatch(/--skin-money\s*:/);
  });

  it("--skin-* variables are defined only inside the two [data-skin] blocks (no leak to :root or another scope)", () => {
    const owners = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => /(^|[;\s])--skin-[a-z0-9-]+\s*:/.test(m[2]));
    expect(owners.map((m) => m[1].trim()).sort()).toEqual(['[data-skin="easebuzz"]', '[data-skin="razorpay"]']);
  });
});
