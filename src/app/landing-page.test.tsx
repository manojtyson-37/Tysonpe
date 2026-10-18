import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));

import { Input } from "@/components/form";
import { HomeInteractiveDemo } from "@/components/HomeInteractiveDemo";
import { Logo } from "@/components/Logo";
import { HeroLedger } from "@/components/landing/HeroLedger";
import { SAMPLE_INVOICE_NO } from "@/components/landing/Fragments";
import { Table } from "@/components/ui";
import { DEFAULT_LEDGER, PLAN_OPTIONS } from "@/lib/landing-ledger";
import { feeBreakdown, formatINR, gstComponent, planRates } from "@/lib/money";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import Home from "./(site)/page";

const ROOT = new URL("../", import.meta.url);
const SOURCES = ["app/(site)/page.tsx", "components/landing/HeroLedger.tsx", "components/landing/Fragments.tsx", "lib/landing-ledger.ts"].map(
  (rel) => [rel, readFileSync(new URL(rel, ROOT), "utf8")] as const,
);
const PAGE_SOURCE = SOURCES[0][1];

const html = renderToStaticMarkup(<Home />);
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

// Sections, in page order. Every section is covered, the interactive checkout (HomeInteractiveDemo) included.
const sections = [...html.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].map((m) => m[0]);
const layoutOf = (s: string) => /data-layout="([^"]+)"/.exec(s)![1];
const demo = sections.find((s) => s.includes('id="sandbox-demo"'))!;
const myHtml = sections.join("\n");
const hero = sections[0];
const closing = sections[sections.length - 1];
const count = (h: string, needle: string | RegExp) =>
  typeof needle === "string" ? h.split(needle).length - 1 : (h.match(needle) ?? []).length;

// Independent oracle: the sale and its net, in paise, worked out by hand.
const SALE_PAISE = 299900;
const NET_PAISE = 263912;

describe("landing: headline", () => {
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];

  it("has exactly one h1", () => {
    expect(h1s).toHaveLength(1);
  });

  it("reads '<sale> sale. <net> net.' from money.ts, not from typed digits", () => {
    const fees = feeBreakdown(SALE_PAISE, "basic");
    expect(fees.netPaise).toBe(NET_PAISE);
    expect(text(h1s[0][1])).toBe(`${formatINR(SALE_PAISE)} sale. ${formatINR(fees.netPaise)} net.`);
    expect(text(h1s[0][1])).toBe("₹2,999 sale. ₹2,639.12 net.");
    // the source holds no money literal for the headline
    expect(PAGE_SOURCE).not.toMatch(/2,?999|2,?639/);
  });

  it("is short enough for two lines at 390px and breaks into exactly two blocks, with no <br>", () => {
    const t = text(h1s[0][1]);
    expect(t.length).toBeLessThanOrEqual(32);
    expect(h1s[0][1]).not.toContain("<br");
    expect(count(h1s[0][1], '<span class="block">')).toBe(2);
    // each line is short enough to fit on its own at 32px on a 358px column (about 20px per character, generously)
    for (const line of [...h1s[0][1].matchAll(/<span class="block">([\s\S]*?)<\/span>(?=\s*(?:<span|$))/g)]) {
      expect(text(line[1]).length).toBeLessThanOrEqual(16);
    }
  });

  it("has no gradient text and keeps heading typography off the h1 itself where the global rule beats it", () => {
    const tag = /<h1\b[^>]*>/.exec(html)![0];
    expect(tag).not.toMatch(/gradient|bg-clip-text|text-transparent/);
    expect(tag).not.toMatch(/tracking-|font-sans|font-display/);
  });
});

describe("landing: no eyebrows, no pulsing, no pills", () => {
  it("has no uppercase micro-label immediately above any heading", () => {
    const micro = /<(?:p|span|div)\b[^>]*class="[^"]*(?:uppercase|t-label|tracking-wider|tracking-widest)[^"]*"[^>]*>[^<]*<\/(?:p|span|div)>\s*<h[1-6]\b/;
    expect(micro.test(myHtml)).toBe(false);
    // positive control: the same pattern does catch an eyebrow
    expect(micro.test('<p class="text-xs font-semibold uppercase tracking-wider text-muted">Status</p><h2>x</h2>')).toBe(true);
  });

  it("writes no uppercase or wide-tracking micro-label anywhere in the landing sources", () => {
    for (const [file, src] of SOURCES) {
      expect(src, file).not.toMatch(/\buppercase\b|tracking-(wider|widest)|\bt-label\b/);
    }
  });

  it("has no animate- class anywhere in the sections (the demo included), no pulsing dot and no ping", () => {
    expect(myHtml).not.toContain("animate-");
    for (const [file, src] of SOURCES) expect(src, file).not.toContain("animate-");
  });

  it("states test mode as one plain sentence under the hero call to action, not a pill", () => {
    const h = hero;
    expect(text(h)).toContain("Test mode: no real money moves.");
    const sentence = /<p class="([^"]*)">Test mode: no real money moves\.<\/p>/.exec(h);
    expect(sentence).not.toBeNull();
    expect(sentence![1]).not.toMatch(/rounded|bg-|border|uppercase/);
    expect(h.indexOf("Open a storefront")).toBeLessThan(h.indexOf("Test mode: no real money moves."));
    expect(count(html, "Test mode: no real money moves.")).toBe(1);
  });

  it("uses no badge or pill class in the status list", () => {
    const status = sections.find((s) => layoutOf(s) === "sticky-left-rules")!;
    expect(status).not.toMatch(/badge|rounded-full|rounded-pill/);
  });
});

describe("landing: one ink call to action per band", () => {
  it("has at most one filled primary button per section, and exactly one in the hero and the closing band", () => {
    for (const s of sections) expect(count(s, "btn-primary"), layoutOf(s)).toBeLessThanOrEqual(1);
    expect(count(hero, "btn-primary")).toBe(1);
    expect(count(closing, "btn-primary")).toBe(1);
  });

  it("keeps the hero's second action quiet: a text link, not a second button", () => {
    expect(count(hero, /class="[^"]*\bbtn\b/g)).toBe(1);
    expect(hero).toMatch(/<a href="#sandbox-demo"[^>]*>Run a test checkout<\/a>/);
  });

  it("the switched-off sample buttons are not ink", () => {
    const trail = sections.find((s) => layoutOf(s) === "sticky-left-fragments")!;
    expect(count(trail, "btn-primary")).toBe(0);
    expect(count(trail, /<button\b[^>]*\bdisabled\b/g)).toBe(3);
  });
});

describe("landing: section rhythm and layouts", () => {
  it("never repeats a layout from one band to the next", () => {
    const layouts = sections.map(layoutOf);
    expect(layouts.length).toBeGreaterThanOrEqual(7);
    for (let i = 1; i < layouts.length; i++) expect(layouts[i], `band ${i}`).not.toBe(layouts[i - 1]);
  });

  it("gives every band after the hero 80 to 112px of vertical padding", () => {
    for (const s of sections.slice(1)) expect(/<section\b[^>]*class="[^"]*\bpy-20 sm:py-28\b/.test(s), layoutOf(s)).toBe(true);
    expect(/class="[^"]*\bpb-20\b[^"]*\bpt-16\b/.test(hero) || /class="[^"]*\bpt-16\b[^"]*\bpb-20\b/.test(hero)).toBe(true);
  });

  it("keeps the in-page anchors the nav and the hero link to", () => {
    expect(html).toContain('id="sandbox-demo"');
    expect(html).toContain('id="pricing"');
  });

  it("uses 4px-multiple spacing and no resting shadow in the landing sources", () => {
    const half = /(?:^|[\s"'`:])-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-\d+\.5(?=[\s"'`]|$)/;
    for (const [file, src] of SOURCES) {
      expect(src, file).not.toMatch(half);
      expect(src, file).not.toMatch(/\bshadow-(?!none)/);
      expect(src, file).not.toMatch(/box-shadow|style=\{\{/);
    }
    expect(half.test(' class="mt-1.5 gap-3"')).toBe(true); // positive control
  });

  it("uses no gradient, blur blob or glass in the landing sources", () => {
    for (const [file, src] of SOURCES) expect(src, file).not.toMatch(/gradient|blur-|backdrop-|mask-image/);
  });
});

describe("landing: the hero is one live ledger from true numbers", () => {
  it("server-renders the default sale as the static ledger a visitor without JavaScript sees", () => {
    const t = text(hero);
    for (const part of [
      "Learner pays, GST included",
      "₹2,999",
      "of which GST at 18%",
      "₹457.47",
      "Platform fee, Basic 10%",
      "−₹299.90",
      "Gateway fee 2%",
      "−₹59.98",
      "Net after fees",
      "₹2,639.12",
    ]) {
      expect(t, part).toContain(part);
    }
    expect(t).toContain("Sample sale");
    expect(t).toContain("Real settlement starts after launch");
  });

  it("derives its numbers from money.ts", () => {
    expect(DEFAULT_LEDGER.gstPaise).toBe(gstComponent(SALE_PAISE, 18));
    expect(DEFAULT_LEDGER.netPaise).toBe(NET_PAISE);
    expect({ platform: DEFAULT_LEDGER.platformRate, gateway: DEFAULT_LEDGER.gatewayRate }).toEqual(planRates("basic"));
  });

  it("announces only the net row, as one polite value", () => {
    expect(count(hero, "aria-live")).toBe(1);
    expect(hero).toMatch(/<output[^>]*aria-live="polite"/);
  });

  it("names its fields and offers the real plans", () => {
    for (const label of ["Sale price, GST included", "GST rate", "Plan"]) expect(hero).toContain(`>${label}</label>`);
    for (const p of PLAN_OPTIONS) expect(hero).toContain(`value="${p.key}"`);
    expect(hero).toMatch(/inputmode="numeric"/i);
    expect(hero).toMatch(/autocomplete="off"/i);
  });
});

describe("landing: real UI fragments, each labelled as a sample", () => {
  const figures = [...html.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/g)].map((m) => m[0]);

  it("has the ledger, checkout, invoice and payouts fragments, and every one says Sample", () => {
    expect(figures).toHaveLength(4);
    for (const f of figures) expect(text(f)).toMatch(/\bSample\b|\bsample\b/);
    for (const f of figures.slice(1)) expect(f).toMatch(/<figcaption[^>]*>[^<]*[Ss]ample/);
  });

  it("the checkout fragment is the pay page's summary: total, GST, coupon field, the gateway buttons (switched off)", () => {
    const f = text(figures[1]);
    expect(f).toContain("Total payable ₹2,999");
    expect(f).toContain("Includes GST (18%) ₹457.47");
    expect(f).toContain("Coupon code");
    expect(f).toContain("Pay ₹2,999 with Razorpay");
    expect(f).toContain("Continue to Easebuzz");
    expect(count(figures[1], /<button\b[^>]*\bdisabled\b/g)).toBe(3);
    expect(figures[1]).toMatch(/<input\b[^>]*\bdisabled\b/);
  });

  it("the invoice fragment splits the GST out of the price and uses the invoice number format", () => {
    const f = text(figures[2]);
    expect(SAMPLE_INVOICE_NO).toBe("TP/2026-27/00001");
    expect(f).toContain("Tax invoice");
    expect(f).toContain(SAMPLE_INVOICE_NO);
    expect(f).toContain("Taxable value ₹2,541.53"); // 299900 - 45747 = 254153 paise
    expect(f).toContain("GST @ 18% (included) ₹457.47");
    expect(f).toContain("Total paid ₹2,999");
    expect(f).toContain("Sample creator");
    expect(f).toContain("Sample learner");
  });

  it("the payouts strip carries the page's own fees and net, with the Payouts page's labels", () => {
    const f = text(figures[3]);
    expect(f).toContain("Gross sales ₹2,999");
    expect(f).toContain("Platform fees −₹299.90");
    expect(f).toContain("Gateway fees −₹59.98");
    expect(f).toContain("Net earnings ₹2,639.12");
    expect(f).toMatch(/not a customer/);
  });

  it("invents no customers, counts, ratings or testimonials", () => {
    const t = text(myHtml).toLowerCase();
    for (const claim of ["testimonial", "rated", "stars", "customers", "creators trust", "trusted by", "learners enrolled", "uptime", "% of"]) {
      expect(t, claim).not.toContain(claim);
    }
    expect(t).not.toMatch(/\b\d[\d,]*\+?\s+(creators|learners|students|customers|courses|orders)\b/);
  });
});

describe("landing: status and fees", () => {
  const status = sections.find((s) => layoutOf(s) === "sticky-left-rules")!;
  const fees = sections.find((s) => layoutOf(s) === "table")!;

  it("status is two ruled lists with plain-text status, and billing stays 'not live'", () => {
    expect(count(status, "<ul>")).toBe(2);
    const items = [...status.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]));
    expect(items).toHaveLength(7);
    expect(items.find((i) => i.startsWith("Paid plan billing"))).toMatch(/Not live$/);
    expect(items.filter((i) => /Not built$/.test(i))).toHaveLength(2);
    expect(count(status, 'class="grid gap-1 border-b border-line')).toBe(7);
  });

  it("the community line says only what the code does", () => {
    const line = text(status);
    expect(line).toContain("Community and points");
    expect(line).toMatch(/posts, comments and likes, points and levels, a leaderboard, and pin, delete and ban tools/);
    expect(line).not.toMatch(/still being finished/);
    expect(line).not.toMatch(/gamif/i);
  });

  it("fees are one real Table with a row per plan, amounts from money.ts", () => {
    expect(count(fees, "<table")).toBe(1);
    expect(count(fees, "<tr")).toBe(PLAN_OPTIONS.length + 1);
    expect(fees).toMatch(/<div class="[^"]*overflow-x-auto[^"]*"[^>]*tabindex="0"[^>]*role="region"/);
    const rows = [...fees.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => text(m[1])).slice(1);
    for (const [i, p] of PLAN_OPTIONS.entries()) {
      const fee = feeBreakdown(SALE_PAISE, p.key);
      const rates = planRates(p.key);
      expect(rows[i]).toContain(p.name);
      expect(rows[i]).toContain(rates.platform);
      expect(rows[i]).toContain(rates.gateway);
      expect(rows[i]).toContain(formatINR(fee.netPaise));
      expect(rows[i]).toContain(p.live ? "Available now" : "Draft");
    }
    expect(rows.map((r) => r.match(/(₹[\d,.]+)$/)![1])).toEqual(["₹2,639.12", "₹2,774.07", "₹2,834.05", "₹2,954.01"]);
    expect(text(fees)).toContain("Plan monthly fees are not netted here.");
    // the page's own mask-image hack is gone (the Table primitive supplies the scroll fade; the sources test covers the page)
    expect(PAGE_SOURCE).not.toMatch(/mask-image/);
  });

  it("keeps the GST and settlement caveats", () => {
    const t = text(html);
    expect(t).toContain("sits inside the price and is yours to remit");
    expect(t).toContain("Real settlement starts after launch");
    expect(t).toContain("Amounts are GST-inclusive and before the GST you remit");
  });
});

describe("landing: the interactive demo band", () => {
  it("is labelled a simulation, is one tab list with one ink button, and nests its headings under the band's h2", () => {
    expect(text(demo)).toContain("Simulated checkout, test mode");
    expect(count(demo, 'role="tablist"')).toBe(1);
    expect(count(demo, "btn-primary")).toBe(1);
    expect(count(demo, 'role="status"')).toBe(1);
    const levels = [...demo.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    expect(levels[0]).toBe(2);
    for (const level of levels.slice(1)) expect(level).toBe(3);
    expect(demo).not.toMatch(/animate-|infinite|gradient|shadow-/);
  });
});

describe("landing: closing band", () => {
  it("has the wordmark at display size through a non-important child selector, and one ink call to action", () => {
    expect(closing).toContain("Tysonpe");
    expect(closing).toMatch(/<div class="\[&amp;&gt;span\]:text-5xl sm:\[&amp;&gt;span\]:text-7xl[^"]*"><span class="inline-flex[^"]*font-display/);
    expect(count(closing, "btn-primary")).toBe(1);
    expect(closing).toMatch(/<h2\b[^>]*>See where every ₹2,999 goes\.<\/h2>/);
    expect(PAGE_SOURCE).not.toMatch(/!important|\w!\s|-\w+!(?=["\s])/);
  });

  it("is coupled to Logo rendering a <span> root, which the wrapper's child selector needs", () => {
    expect(renderToStaticMarkup(<Logo />)).toMatch(/^<span /);
  });
});

describe("landing: copy lint", () => {
  const visible = text(myHtml);

  it("uses none of the banned words or phrases", () => {
    for (const banned of ["seamless", "unlock", "all-in-one", "elevate", "supercharge", "get started", "learn more", "game-chang", "revolution", "effortless", "powerful", "world-class", "next-level"]) {
      expect(visible.toLowerCase(), banned).not.toContain(banned);
    }
  });

  it("has no exclamation mark in the rendered text or in a string of the page source", () => {
    expect(visible).not.toContain("!");
    expect(visible.includes("!")).toBe(false);
  });

  it("keeps headings in sentence case", () => {
    const headings = [...myHtml.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/g)].map((m) => text(m[1]));
    expect(headings.length).toBeGreaterThanOrEqual(8);
    for (const h of headings) expect(h, h).not.toMatch(/\b[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+\b/);
  });

  it("orders headings without skipping a level", () => {
    const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `heading ${i}`).toBeLessThanOrEqual(1);
  });
});

describe("landing: source hygiene", () => {
  it("has no legacy classes, ! utilities, glyph icons or title tooltips in any touched source", () => {
    for (const [file, src] of SOURCES) expect(legacyStyleFindings(src), file).toEqual([]);
  });

  it("imports nothing from gateway-icons (a file this task does not own)", () => {
    for (const [file, src] of SOURCES) expect(src, file).not.toContain("gateway-icons");
  });

  it("uses no emoji or arrow glyph as an icon", () => {
    for (const [file, src] of SOURCES) expect(src, file).not.toMatch(/[→←↗✓✔★☆]|\p{Extended_Pictographic}/u);
  });
});

describe("landing: RSC boundary", () => {
  const BOUNDARIES: unknown[] = [HeroLedger, HomeInteractiveDemo, Input];

  it("passes no function props, with the client components declared as boundaries", () => {
    const visited = new Set<unknown>();
    const implicit: string[] = [];
    const found = functionProps(Home() as ReactNode, BOUNDARIES, { onVisit: (t) => visited.add(t), onImplicitBoundary: (n) => implicit.push(n) });
    expect(found).toEqual([]);
    expect(implicit).toEqual([]);
    for (const type of [HeroLedger, HomeInteractiveDemo, Input, Table, Logo]) expect(visited.has(type)).toBe(true);
  });

  it("positive control: the same walk reports a function prop planted in the page tree", () => {
    const planted = (
      <>
        {Home()}
        <button onClick={() => {}}>x</button>
      </>
    );
    expect(functionProps(planted, BOUNDARIES)).toEqual(["<button>.onClick"]);
  });

  it("hands the hero only serialisable props", () => {
    const tree = Home() as { props: { children: unknown } };
    const walk = (n: unknown, out: Array<{ type: unknown; props: Record<string, unknown> }> = []): typeof out => {
      if (Array.isArray(n)) n.forEach((c) => walk(c, out));
      else if (n && typeof n === "object" && "props" in n) {
        const el = n as { type: unknown; props: Record<string, unknown> };
        out.push(el);
        walk(el.props.children, out);
      }
      return out;
    };
    const ledger = walk(tree).find((e) => e.type === HeroLedger)!;
    expect(Object.keys(ledger.props)).toEqual(["gstRates"]);
    expect(Array.isArray(ledger.props.gstRates)).toBe(true);
  });
});
