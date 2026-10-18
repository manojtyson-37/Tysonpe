import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// next/font/google needs the Next compiler; the metadata under test does not depend on the fonts.
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "font-var", className: "font-cls" });
  return { Plus_Jakarta_Sans: font, Bricolage_Grotesque: font, JetBrains_Mono: font };
});
vi.mock("@/components/ui", () => ({ Toaster: () => null }));
vi.mock("./globals.css", () => ({}));

import RootLayout, { metadata, viewport } from "./layout";

const EMOJI = /\p{Extended_Pictographic}/u;

describe("root layout metadata", () => {
  it("keeps the title template, default and description", () => {
    const title = metadata.title as { default: string; template: string };
    expect(title.template).toBe("%s · Tysonpe");
    expect(title.default).toMatch(/^Tysonpe/);
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeGreaterThan(40);
  });

  it("declares honest openGraph and twitter cards that mirror the title and description, with no image", () => {
    const title = metadata.title as { default: string };
    const og = metadata.openGraph as Record<string, unknown>;
    expect(og).toBeDefined();
    expect(og.type).toBe("website");
    expect(og.siteName).toBe("Tysonpe");
    expect(og.locale).toBe("en_IN");
    expect(og.title).toBe(title.default);
    expect(og.description).toBe(metadata.description);
    expect(og).not.toHaveProperty("images");
    const tw = metadata.twitter as Record<string, unknown>;
    expect(tw).toBeDefined();
    expect(tw.card).toBe("summary");
    expect(tw).not.toHaveProperty("images");
  });

  it("puts themeColor in viewport (Next 16), not metadata", () => {
    expect(viewport.themeColor).toBe("#fbfaf7");
    expect(metadata).not.toHaveProperty("themeColor");
  });

  it("has no emoji in any metadata string", () => {
    expect(JSON.stringify({ metadata, viewport })).not.toMatch(EMOJI);
  });

  it("renders <html lang=en> and a body", () => {
    const html = renderToStaticMarkup(<RootLayout params={Promise.resolve({})}>x</RootLayout>);
    expect(html).toMatch(/^<html lang="en"/);
  });

  it("ships no leftover create-next-app svgs: public/ is absent or holds no .svg", () => {
    const dir = path.join(process.cwd(), "public");
    const files = existsSync(dir) ? readdirSync(dir) : [];
    expect(files.filter((f) => f.endsWith(".svg"))).toEqual([]);
  });
});

describe("favicon", () => {
  const svg = () => readFileSync(path.join(process.cwd(), "src/app/icon.svg"), "utf8");

  it("icon.svg is the standalone logo mark: emerald square, no fonts or text", () => {
    expect(svg()).toContain('fill="#0f7b4d"');
    expect(svg()).not.toMatch(/<text|font-family|var\(|href=/);
  });

  it("draws the same mark as the Logo: emerald rounded square, white t, amber dot", () => {
    const s = svg();
    expect(s).toMatch(/<rect [^>]*rx="8"[^>]*fill="#0f7b4d"/);
    expect(s).toContain('d="M7 8.5h12M13 8.5V19"');
    expect(s).toMatch(/<circle cx="19.2" cy="17.8" r="2.1" fill="#f59e0b"/);
  });

  it("src/app/favicon.ico does not exist, so icon.svg is the only icon route", () => {
    expect(existsSync(path.join(process.cwd(), "src/app/favicon.ico"))).toBe(false);
  });
});
