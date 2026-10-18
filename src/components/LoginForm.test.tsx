// Server-render checks for LoginForm. Click-level behaviour (the demo fill) is in LoginForm.interactions.test.tsx.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const H = vi.hoisted(() => ({ state: undefined as unknown }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useActionState = () => [H.state, () => {}];
  return { ...actual, default: { ...actual, useActionState }, useActionState };
});
vi.mock("@/app/actions/auth", () => ({ login: async () => ({}) }));

import { legacyStyleFindings } from "@/test/style-scan";
import { LoginForm } from "./LoginForm";

const render = (props: { next?: string; demoPassword?: string } = {}, state?: unknown) => {
  H.state = state;
  return renderToStaticMarkup(<LoginForm {...props} />);
};
const lc = (s?: string) => (s ?? "").toLowerCase();
const tags = (html: string, tag: string) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))].map((m) => m[0]);
const input = (html: string, name: string) => tags(html, "input").find((t) => t.includes(`name="${name}"`));

describe("LoginForm fields", () => {
  it("posts email, password and (only when the page has one) next", () => {
    const names = (html: string) => tags(html, "input").map((t) => /name="([^"]+)"/.exec(t)?.[1]).filter(Boolean);
    expect(names(render())).toEqual(["email", "password"]);
    expect(names(render({ next: "/library/p1" })).sort()).toEqual(["email", "next", "password"]);
    expect(input(render({ next: "/library/p1" }), "next")).toContain('type="hidden"');
  });

  it("sets autofill and keyboard hints", () => {
    const html = render();
    expect(lc(input(html, "email"))).toContain('autoComplete="email"'.toLowerCase());
    expect(lc(input(html, "email"))).toContain('inputMode="email"'.toLowerCase());
    expect(input(html, "email")).toContain('type="email"');
    expect(lc(input(html, "password"))).toContain('autoComplete="current-password"'.toLowerCase());
    expect(input(html, "password")).toContain('type="password"');
    expect(input(html, "email")).toContain("required");
    expect(input(html, "password")).toContain("required");
  });

  it("labels both fields", () => {
    const html = render();
    expect(html).toMatch(/<label[^>]*for="[^"]+"[^>]*>Email<\/label>/);
    expect(html).toMatch(/<label[^>]*for="[^"]+"[^>]*>Password<\/label>/);
  });

  it("shows a failed login as an inline role=alert, and nothing on a fresh form", () => {
    expect(render()).not.toContain('role="alert"');
    expect(render({}, { error: "Incorrect email or password." })).toMatch(/role="alert"[^>]*>Incorrect email or password\./);
  });

  it("owns fields only: no heading, card, or footer link", () => {
    const html = render({ demoPassword: "pw" });
    expect(html).not.toMatch(/<h[1-6]\b|<a\b/);
    expect(html).not.toMatch(/class="[^"]*(?<![-\w])card(?![-\w])/);
  });

  it("submits with a Log in button", () => {
    expect(render()).toMatch(/<button\b[^>]*type="submit"[^>]*>[\s\S]*Log in[\s\S]*<\/button>/);
  });
});

describe("LoginForm demo accounts", () => {
  it("are not rendered on a deployment that does not advertise them", () => {
    const html = render();
    expect(html).not.toContain("Asha");
    expect(html).not.toContain("Ravi");
    expect(html).not.toContain("demo.tysonpe.test");
  });

  it("render as two type=button buttons that never submit, with the route they open", () => {
    const html = render({ demoPassword: "pw" });
    const buttons = tags(html, "button").filter((t) => !t.includes('type="submit"'));
    expect(buttons).toHaveLength(2);
    for (const b of buttons) expect(b).toContain('type="button"');
    expect(html).toContain("Asha (creator)</span><span");
    expect(html).toContain("Opens /dashboard");
    expect(html).toContain("Opens /library");
    expect(html).toContain("Ravi");
  });

  it("drop the route line when a next target will override it", () => {
    const html = render({ demoPassword: "pw", next: "/library/p1" });
    expect(html).not.toContain("Opens /dashboard");
    expect(html).not.toContain("Opens /library");
  });

  it("never print the demo password into the markup", () => {
    expect(render({ demoPassword: "tysonpe-demo-1" })).not.toContain("tysonpe-demo-1");
  });
});

describe("LoginForm follows the design rules", () => {
  const source = readFileSync(path.resolve(import.meta.dirname, "LoginForm.tsx"), "utf8");
  it("passes the legacy style scan", () => {
    expect(legacyStyleFindings(source)).toEqual([]);
  });
  it("has no glyphs typed as text, no emoji", () => {
    expect(source).not.toMatch(/[→←·—✓●○⚡🛡]/u);
    expect(source).not.toMatch(/\p{Extended_Pictographic}/u);
  });
  it.each([
    ["a pixel font size", /text-\[\d+px\]/],
    ["!important or a ! utility", /!important|\s!\w[\w-]*(?=[\s"`])/],
    ["transition-all", /transition-all/],
    ["an off-scale radius", /rounded-(?:xl|2xl|3xl|lg|md|sm)\b|rounded-\[/],
    ["a resting shadow", /\bshadow(?:-\w+|-\[[^\]]*\])?\b/],
    ["a gradient", /gradient/],
    ["a palette class", /\b(?:text|bg|border)-(?:slate|gray|zinc|neutral|white|black|red|green|blue|amber)\b/],
    ["a raw hex colour", /#[0-9a-fA-F]{3,8}\b/],
    ["a legacy button class string", /"[^"]*\bbtn\b[^"]*"/],
    ["an active:scale hand-roll", /active:scale/],
  ])("has no %s", (_label, re) => {
    expect(source).not.toMatch(re);
  });
  it("carries none of the invented claims", () => {
    for (const phrase of ["256-bit", "PCI", "T+1", "tysonpe.com", "Secure", "Instant UPI", "1-Click Fill"]) expect(source).not.toContain(phrase);
  });
});
