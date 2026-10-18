// The Easebuzz replica keeps the gateway's own look only through the [data-skin="easebuzz"] variables in globals.css. These
// tests render the page to HTML and scan its source for what the rebuild removed.
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/checkout", () => ({ settleEasebuzzDemoAction: vi.fn() }));

import { EasebuzzHostedPage } from "./EasebuzzHostedPage";
import { skinSourceFindings } from "@/test/gateway-skin";

const order = {
  id: "ord_9",
  providerOrderId: "EB-20261018-0007",
  totalPaise: 118000,
  subtotalPaise: 100000,
  gstPaise: 18000,
  product: { title: "Pricing Workshop", slug: "pricing-workshop" },
};
const user = { name: "Ravi Menon", email: "ravi@example.com" };
const html = () => renderToStaticMarkup(createElement(EasebuzzHostedPage, { order, user }));
const source = readFileSync(path.join(__dirname, "EasebuzzHostedPage.tsx"), "utf8");

describe("EasebuzzHostedPage: skin and honesty", () => {
  it("puts data-skin=easebuzz on the root element, once", () => {
    const out = html();
    expect(out.startsWith('<div data-skin="easebuzz"')).toBe(true);
    expect(out.match(/data-skin=/g)).toHaveLength(1);
  });

  it("labels itself Simulated and says no real details are sent", () => {
    const out = html();
    expect(out).toMatch(/>Simulated</);
    expect(out).toContain("No real card, UPI or bank details are sent.");
    expect(out).toContain("Test mode. No real money moves.");
  });

  it("drops the encryption and compliance claims the old page made", () => {
    expect(html()).not.toMatch(/SSL|PCI|Bank Grade|encrypt|256|Secured by|Certified/i);
  });

  it("shows the order the props describe, amount in rupees with tabular figures", () => {
    const out = html();
    expect(out).toContain("Pricing Workshop");
    expect(out).toContain("EB-20261018-0007");
    expect(out).toContain("Ravi Menon");
    expect(out).toContain("₹1,180.00");
    expect(out).toMatch(/tabular-nums[^>]*>Pay ₹1,180\.00</);
  });

  it("links back to the store page for this order, with an icon and not an arrow glyph", () => {
    const out = html();
    expect(out).toMatch(/<a [^>]*href="\/checkout\/pay\/ord_9"/);
    expect(out).not.toMatch(/[←→✓✕×•⤺]/);
    expect(out).toContain("<svg");
  });

  it("has no exclamation marks in the copy it renders", () => {
    // React appends its form-replay script after a page with a function form action; that script is not copy.
    expect(html().replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]*>/g, " ")).not.toContain("!");
  });
});

describe("EasebuzzHostedPage: the 15-minute clock", () => {
  it("starts at 15:00 in a timer element with tabular figures, and the timer does not announce itself", () => {
    const timer = html().match(/<span[^>]*role="timer"[^>]*>[^<]*<\/span>/)![0];
    expect(timer).toContain(">15:00<");
    expect(timer).toContain("t-ledger");
    expect(timer).not.toMatch(/aria-live/);
  });

  it("amounts read the money variable, not the dark-band one", () => {
    // The Easebuzz page is light throughout (no dark band), so it never reads --skin-head-money.
    expect(source.match(/text-\(--skin-money\)/g)).toHaveLength(2);
    expect(source).not.toMatch(/--skin-head-money/);
  });

  it("keeps announcements in one separate, empty-at-start status line that is visually hidden", () => {
    const out = html();
    expect(out.match(/role="status"/g)).toHaveLength(1);
    expect(out).toMatch(/<p role="status" class="sr-only"><\/p>/);
    expect(out).not.toMatch(/aria-live="(polite|assertive)"/);
  });

  it("is not animated: no pulse, ping, spin or bounce anywhere in the page", () => {
    expect(html()).not.toMatch(/animate-/);
  });

  it("reserves a fixed width for the digits so the header does not shift as they change", () => {
    expect(html()).toMatch(/role="timer"[^>]*class="[^"]*min-w-\[5ch\]/);
  });
});

describe("EasebuzzHostedPage: controls", () => {
  it("names the three outcome choices, each with its icon before the label", () => {
    const out = html();
    for (const label of ["Success", "Decline", "Cancel"]) expect(out).toMatch(new RegExp(`</svg>${label}</span>`));
  });

  it("the outcome note is plain language, not a developer term", () => {
    const out = html();
    expect(out).toContain("You return to the store after paying.");
    expect(out).not.toMatch(/HTTP|303/);
  });

  it("the three UPI sub-tabs have short labels that stay on one line at 390px", () => {
    const out = html();
    for (const label of ["UPI apps", "Scan QR", "Enter VPA"]) expect(out).toContain(`>${label}<`);
    expect(out).not.toContain("Dynamic QR");
  });

  it("the pay form and the cancel form are separate forms, each with a 44px-on-touch submit button", () => {
    const out = html();
    expect(out.match(/<form /g)).toHaveLength(2);
    const submits = [...out.matchAll(/<button[^>]*type="submit"[^>]*>/g)].map((m) => m[0]);
    expect(submits).toHaveLength(2);
    for (const s of submits) expect(s).toContain("pointer-coarse:min-h-11");
  });

  it("outcomes are three native radios in a labelled fieldset, success checked", () => {
    const out = html();
    expect(out).toMatch(/<legend[^>]*>Simulated outcome<\/legend>/);
    const radios = [...out.matchAll(/<input[^>]*name="eb-outcome"[^>]*>/g)].map((m) => m[0]);
    expect(radios.map((r) => r.match(/value="(\w+)"/)![1])).toEqual(["success", "failure", "cancel"]);
    expect(radios.filter((r) => r.includes('checked=""'))).toHaveLength(1);
    expect(radios[0]).toContain('checked=""');
  });

  it("method choices are toggle buttons in a labelled group", () => {
    const out = html();
    expect(out).toMatch(/role="group" aria-labelledby="eb-method-label"/);
    expect(out).toMatch(/id="eb-method-label"/);
    expect(out.match(/aria-pressed="(true|false)"/g)!.length).toBeGreaterThanOrEqual(4);
  });
});

describe("EasebuzzHostedPage: source scan", () => {
  it("has no palette colour, hex or rgb, pixel text size, glyph, rounded-xl, title tooltip, shadow or looping animation", () => {
    expect(skinSourceFindings(source)).toEqual([]);
  });

  it("reads every colour from the skin variables", () => {
    expect(source).toMatch(/bg-\(--skin-surface\)/);
    expect(source).toMatch(/text-\(--skin-ink\)/);
    expect(source).toMatch(/border-\(--skin-line\)/);
  });

  it("sets autocomplete and input mode on the card and VPA fields", () => {
    for (const token of ['autoComplete="cc-number"', 'autoComplete="cc-exp"', 'autoComplete="cc-csc"', 'autoComplete="cc-name"', 'inputMode="email"', 'autoComplete="off"'])
      expect(source).toContain(token);
  });

  it("keeps the settle calls as they were", () => {
    expect(source).toContain("await settleEasebuzzDemoAction(order.id, outcome)");
    expect(source).toContain('settleEasebuzzDemoAction.bind(null, order.id, "cancel")');
  });
});
