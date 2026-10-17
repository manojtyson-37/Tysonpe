import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as styles from "./styles";

const SRC = path.resolve(import.meta.dirname, "../..");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? (name === "generated" ? [] : files(full)) : /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });

describe("community styles", () => {
  it("has no dead exports: every constant is read by some other source file", () => {
    const others = files(SRC).filter((f) => !f.endsWith("community/styles.ts"));
    const sources = others.map((f) => readFileSync(f, "utf8"));
    for (const name of Object.keys(styles)) {
      expect(
        sources.some((s) => new RegExp(`\\b${name}\\b`).test(s)),
        `${name} is exported but unused`,
      ).toBe(true);
    }
  });

  it("the touch floor carries the brand focus ring and the coarse-pointer 44px floor", () => {
    expect(styles.touchButton).toContain(styles.focusRing);
    expect(styles.touchButton).toContain("pointer-coarse:min-h-11");
    expect(styles.focusRing).toContain("var(--brand-ring)");
  });
});
