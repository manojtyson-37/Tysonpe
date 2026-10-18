import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));

import { HomeInteractiveDemo } from "@/components/HomeInteractiveDemo";
import { PLAN_MONTHLY_PAISE, feeBreakdown, formatINR } from "@/lib/money";
import { DEFAULT_SALES_RUPEES, DEMO_BANKS, ultimateDeltaPaise, feeRows } from "@/lib/demo-model";
import { legacyStyleFindings } from "@/test/style-scan";
import { FeeCalc } from "./FeeCalc";
import { HostedTab } from "./HostedTab";
import { QrTab } from "./QrTab";
import { SampleQr } from "./qr";

const DIR = new URL("./", import.meta.url);
const COMPONENTS = new URL("../", import.meta.url);
const read = (url: URL) => readFileSync(url, "utf8");
const demoFiles = readdirSync(DIR).filter((f) => /\.(tsx?|ts)$/.test(f) && !/\.test\./.test(f));
// Every source the demo is made of, as [label, text].
const SOURCES: Array<readonly [string, string]> = [
  ["HomeInteractiveDemo.tsx", read(new URL("HomeInteractiveDemo.tsx", COMPONENTS))],
  ["lib/demo-model.ts", read(new URL("../../lib/demo-model.ts", import.meta.url))],
  ...demoFiles.map((f) => [`demo/${f}`, read(new URL(f, DIR))] as const),
];
const NOT_QR = SOURCES.filter(([f]) => f !== "demo/qr.tsx");

const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const count = (h: string, needle: string | RegExp) => (typeof needle === "string" ? h.split(needle).length - 1 : (h.match(needle) ?? []).length);

const shell = renderToStaticMarkup(<HomeInteractiveDemo />);
const qr = renderToStaticMarkup(<QrTab countdown={892} />);
const hosted = renderToStaticMarkup(<HostedTab countdown={892} />);
const fees = renderToStaticMarkup(<FeeCalc />);

// The legacy scan this task exists to satisfy. Patterns the pass-1 demo used; the old file is red against this.
const BANNED_PALETTE = /\b(?:stone|emerald|rose|amber|sky|slate|indigo|violet)-\d/;
const BANNED_MOTION = /\banimate-(?:ping|spin|pulse|scan|bounce)\b|\binfinite\b/;
const OLD_SNIPPET = `
  <div className="animate-scan bg-gradient-to-r shadow-[0_0_8px_#0f7b4d]" />
  <span className="h-1.5 w-1.5 rounded-full bg-good animate-ping" />
  <button className="rounded-xl bg-stone-900 text-white">x</button>
  <div className="bg-[#12233c] text-amber-300 border-amber-500/40" />
  <rect fill="#0f172a" stroke="#4f46e5" />
`;

describe("demo scan: positive controls (the pass-1 patterns are caught)", () => {
  it("flags palette classes, loops, gradients, arbitrary hex and rounded-xl in the old shapes", () => {
    expect(BANNED_PALETTE.test(OLD_SNIPPET)).toBe(true);
    expect(BANNED_MOTION.test(OLD_SNIPPET)).toBe(true);
    expect(/gradient/.test(OLD_SNIPPET)).toBe(true);
    expect(/bg-\[#/.test(OLD_SNIPPET)).toBe(true);
    expect(legacyStyleFindings(OLD_SNIPPET).join("\n")).toMatch(/rounded-xl/);
    expect(/#[0-9a-fA-F]{3,8}\b/.test(OLD_SNIPPET)).toBe(true);
  });
});

describe("demo sources: tokens only, no loops", () => {
  it("passes the legacy style scan (no ! utilities, rounded-xl, .btn/.card/.badge strings, glyph icons, title tooltips)", () => {
    for (const [file, src] of SOURCES) expect(legacyStyleFindings(src), file).toEqual([]);
  });

  it("uses no stone/emerald/rose/amber/sky/slate/indigo/violet class", () => {
    for (const [file, src] of SOURCES) expect(src, file).not.toMatch(BANNED_PALETTE);
  });

  it("has no raw hex colour outside qr.tsx, and no bg-[#...] anywhere", () => {
    for (const [file, src] of NOT_QR) expect(src, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?![\w-])/);
    for (const [file, src] of SOURCES) expect(src, file).not.toMatch(/(?:bg|text|border|fill|stroke|shadow)-\[#/);
    for (const [file, src] of NOT_QR) expect(src, file).not.toMatch(/\b(?:rgb|rgba|hsl)\(/);
  });

  it("has no infinite loop, ping, spin, pulse or laser, no gradient, glow, blur blob or inline style", () => {
    for (const [file, src] of SOURCES) {
      expect(src, file).not.toMatch(BANNED_MOTION);
      expect(src, file).not.toMatch(/gradient|blur-|backdrop-|\bshadow-|box-shadow|style=\{\{/);
      expect(src, file).not.toMatch(/transition-all|\btransition\b(?!-)/);
    }
  });

  it("writes no emoji or arrow glyph as an icon", () => {
    for (const [file, src] of SOURCES) expect(src, file).not.toMatch(/[→←↗✓✔✕★☆]|\p{Extended_Pictographic}/u);
  });

  it("imports only gateway-icons symbols that are identical in HEAD (never the re-aliased BhimUpiIcon, CredIcon, BhimIcon)", () => {
    const ALLOWED = new Set(["GooglePayIcon", "PhonePeIcon", "PaytmIcon", "UpiIcon", "BankIcon"]);
    for (const [file, src] of SOURCES) {
      for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*"[^"]*gateway-icons"/g)) {
        for (const name of m[1].split(",").map((n) => n.trim()).filter(Boolean)) expect(ALLOWED.has(name), `${file}: ${name}`).toBe(true);
      }
      expect(src, file).not.toMatch(/BhimUpiIcon|CredIcon|BhimIcon/);
    }
  });

  it("keeps the pure logic out of the client modules: the model has no 'use client' and no react import", () => {
    const model = SOURCES.find(([f]) => f === "lib/demo-model.ts")![1];
    expect(model).not.toMatch(/^"use client"|from "react"/m);
    for (const f of ["HomeInteractiveDemo.tsx", "demo/QrTab.tsx", "demo/HostedTab.tsx", "demo/FeeCalc.tsx"]) {
      const src = SOURCES.find(([n]) => n === f)![1];
      expect(src.startsWith('"use client"'), f).toBe(true);
      // only components are exported from a client module
      expect([...src.matchAll(/^export (?:const|let|var|type|class|enum)\b/gm)].map((m) => m[0]), f).toEqual([]);
    }
  });

  it("drops the pass-1 globals: no animate-scan class or looping scan keyframe, one one-shot scan with a reduced-motion fallback", () => {
    const css = read(new URL("../../app/globals.css", import.meta.url));
    expect(css).not.toContain("animate-scan");
    expect(css).not.toMatch(/@keyframes qr-scan(?![\w-])/);
    expect(css).toMatch(/\.qr-scan-once\s*\{[^}]*qr-scan-once[^}]*\b1 both/);
    expect(css).not.toMatch(/\.qr-scan-once\s*\{[^}]*infinite/);
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(/\.qr-scan-once\s*\{[^}]*animation:\s*none/);
  });
});

describe("qr.tsx: the only place raw hexes live", () => {
  const qrSource = SOURCES.find(([f]) => f === "demo/qr.tsx")![1];

  it("holds the QR's own colours, with ink instead of the banned indigo stroke", () => {
    expect(qrSource).toMatch(/#[0-9a-fA-F]{6}/);
    expect(qrSource).not.toMatch(/4f46e5|0f172a/i);
    expect(qrSource).toContain('const INK = "#16130f"');
  });

  it("draws a labelled, non-scannable sample", () => {
    const svg = renderToStaticMarkup(<SampleQr className="size-32" />);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="Sample QR code, not scannable"');
    expect(count(svg, "<circle")).toBe(23);
    expect(count(svg, "<rect")).toBe(10); // 3 finders x 3 squares + the centre badge
    expect(svg).not.toMatch(/animate|<style|<script/);
  });
});

describe("shell: the Tabs primitive in state mode", () => {
  it("renders one tablist with three roving tabs, the first selected", () => {
    expect(count(shell, 'role="tablist"')).toBe(1);
    const tabs = [...shell.matchAll(/<button\b[^>]*role="tab"[^>]*>/g)].map((m) => m[0]);
    expect(tabs).toHaveLength(3);
    expect(tabs.map((t) => /aria-selected="(true|false)"/.exec(t)![1])).toEqual(["true", "false", "false"]);
    expect(tabs.map((t) => /tabindex="(-?\d)"/.exec(t)![1])).toEqual(["0", "-1", "-1"]);
    expect(shell).toContain('aria-label="Demo screens"');
    expect(text(shell)).toContain("UPI QR");
    expect(text(shell)).toContain("Easebuzz");
    expect(text(shell)).toContain("Fee calculator");
  });

  it("links every tab to a panel that exists and is labelled by it, and hides the unselected panels", () => {
    for (const value of ["upi-qr", "easebuzz", "fees"]) {
      const tab = new RegExp(`<button\\b[^>]*id="([^"]*-tab-${value})"[^>]*aria-controls="([^"]*-panel-${value})"`).exec(shell);
      expect(tab, value).not.toBeNull();
      const panel = new RegExp(`<div\\b[^>]*role="tabpanel"[^>]*id="${tab![2]}"[^>]*aria-labelledby="${tab![1]}"[^>]*>`).exec(shell);
      expect(panel, value).not.toBeNull();
      expect(/\bhidden\b/.test(panel![0]), value).toBe(value !== "upi-qr");
    }
  });

  it("mounts only the selected panel's content", () => {
    expect(shell).toContain("Pay by UPI");
    expect(shell).not.toContain("Simulated Easebuzz hosted page");
    expect(shell).not.toContain("Net payout in the ledger");
  });

  it("is labelled simulated at the top and links to the full sandbox at 44px", () => {
    expect(text(shell)).toContain("Simulated checkout, test mode");
    expect(shell).toMatch(/<a\b[^>]*class="[^"]*min-h-11[^"]*"[^>]*href="\/demo"/);
  });

  it("has no looping animation class, no important override and no resting shadow", () => {
    expect(shell).not.toMatch(/animate-|infinite|shadow-|gradient/);
  });

  it("makes no claim a visitor could mistake for real: no bank list, no invented IDs, no webhook timing", () => {
    const t = text(shell + hosted + qr);
    for (const claim of ["50+", "HDFC", "SBI", "ICICI", "Axis", "RRN_", "ORD-", "EB_2026", "HMAC", "T+0.4", "asha-rao", "Asha Rao"]) expect(t, claim).not.toContain(claim);
  });
});

describe("QrTab: the checkout step", () => {
  it("labels the QR a sample, with the session clock in tabular digits", () => {
    expect(qr).toContain('aria-label="Sample QR code, not scannable"');
    expect(text(qr)).toContain("Sample QR, not scannable");
    expect(text(qr)).toContain("Session ends in 14:52");
    expect(qr).toMatch(/<span class="font-semibold tabular-nums text-ink">14:52<\/span>/);
  });

  it("shows the order total with the GST inside it, from money.ts", () => {
    expect(text(qr)).toContain("₹1,180");
    expect(text(qr)).toContain("incl. 18% GST (₹180)");
  });

  it("offers four app buttons that name their action, at the 44px floor", () => {
    expect(qr).toContain('role="group" aria-label="UPI apps"');
    const names = [...qr.matchAll(/<button\b[^>]*class="[^"]*min-h-11[^"]*"[^>]*>([\s\S]*?)<\/button>/g)].map((m) => text(m[1].replace(/<svg[\s\S]*?<\/svg>/g, "")));
    expect(names).toEqual(["Pay with Google Pay", "Pay with PhonePe", "Pay with Paytm", "Pay with Other UPI app"]);
  });

  it("has one real heading, one ink button and one polite status region that is not an alert", () => {
    expect(count(qr, /<h3\b[^>]*tabindex="-1"/g)).toBe(1);
    expect(count(qr, "btn-primary")).toBe(1);
    expect(count(qr, 'role="status"')).toBe(1);
    expect(qr).not.toContain('role="alert"');
    expect(text(qr)).toContain("Simulated checkout: scan the sample QR or pick a UPI app.");
  });

  it("mounts the one-shot scan overlay as decorative, not as a looping class", () => {
    expect(qr).toMatch(/<div aria-hidden="true" class="qr-scan-once [^"]*"><\/div>/);
    expect(qr).not.toContain("animate-");
  });

  it("does not animate the first paint: no enter class before the visitor acts", () => {
    expect(qr).not.toMatch(/class="enter"/);
  });

  it("is labelled a test-mode simulation in its footer", () => {
    expect(text(qr)).toContain("Simulated checkout. Test mode, no gateway called, no real card data.");
  });
});

describe("HostedTab: the Easebuzz hosted page, in app tokens", () => {
  it("is labelled a simulated page and shows the 15-minute clock in tabular digits", () => {
    expect(text(hosted)).toContain("Simulated Easebuzz hosted page");
    expect(text(hosted)).toContain("Page expires in 14:52");
    expect(hosted).toMatch(/class="text-lg font-semibold tabular-nums text-ink">14:52</);
    expect(text(hosted)).toContain("Simulated return flow. Test mode, no gateway is called.");
  });

  it("picks from neutral sample banks in a native radio group with a checked default", () => {
    expect(hosted).toMatch(/<fieldset\b/);
    const radios = [...hosted.matchAll(/<input\b[^>]*type="radio"[^>]*>/g)].map((m) => m[0]);
    expect(radios).toHaveLength(DEMO_BANKS.length);
    expect(radios.every((r) => /name="hosted-bank"/.test(r))).toBe(true);
    expect(radios.filter((r) => /\bchecked\b/.test(r))).toHaveLength(1);
    expect(radios[0]).toMatch(/\bchecked\b/);
    for (const name of DEMO_BANKS) expect(text(hosted)).toContain(name);
  });

  it("names the pay and cancel actions and uses the app's primary and secondary buttons", () => {
    expect(text(hosted)).toContain("Pay ₹1,180 with Sample Bank A");
    expect(text(hosted)).toContain("Cancel payment");
    expect(count(hosted, "btn-primary")).toBe(1);
    expect(count(hosted, "btn-secondary")).toBe(1);
  });

  it("has no navy skin: no hex, no amber, no bg-[...] (the gateway skin is Task 30's)", () => {
    expect(hosted).not.toMatch(/#[0-9a-fA-F]{3,8}\b|amber|bg-\[/);
  });

  it("has one status region and one tabindex -1 heading", () => {
    expect(count(hosted, 'role="status"')).toBe(1);
    expect(count(hosted, /<h3\b[^>]*tabindex="-1"/g)).toBe(1);
  });
});

describe("FeeCalc: the calculator", () => {
  it("shows Ultimate as NEGATIVE against Basic at the default sales, with the sign in words too", () => {
    const delta = ultimateDeltaPaise(feeRows(DEFAULT_SALES_RUPEES));
    expect(delta).toBeLessThan(0);
    expect(text(fees)).toContain("Ultimate vs Basic, after the ₹30,000 monthly plan fee");
    expect(text(fees)).toContain("−₹3,750 / month");
    expect(text(fees)).toContain("Ultimate leaves you ₹3,750 less than Basic each month");
    expect(fees).toMatch(/class="[^"]*text-bad[^"]*">−₹3,750</);
  });

  it("prints one real table row per plan with the netted take-home from money.ts", () => {
    expect(count(fees, "<table")).toBe(1);
    const body = /<tbody[^>]*>([\s\S]*?)<\/tbody>/.exec(fees)![1];
    const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => text(m[1]));
    expect(rows).toHaveLength(4);
    const takeHome = (key: string) => feeBreakdown(DEFAULT_SALES_RUPEES * 100, key).netPaise - PLAN_MONTHLY_PAISE[key];
    expect(rows[0]).toContain("Basic");
    expect(rows[0]).toContain("10% + 2% gateway");
    expect(rows[0]).toContain("Free");
    expect(rows[0]).toContain(formatINR(takeHome("basic")));
    expect(rows[3]).toContain("Ultimate");
    expect(rows[3]).toContain("0% + 1.5% gateway");
    expect(rows[3]).toContain("₹30,000");
    expect(rows[3]).toContain(formatINR(takeHome("ultimate")));
    expect(rows.map((r) => r.match(/₹[\d,.]+$/)![0])).toEqual(["₹2,20,000", "₹2,26,250", "₹2,21,250", "₹2,16,250"]);
  });

  it("names the slider, gives its value in words and its range", () => {
    expect(fees).toMatch(/<label\b[^>]*for="([^"]+)"[^>]*>Monthly sales<\/label>/);
    const id = /<label\b[^>]*for="([^"]+)"/.exec(fees)![1];
    expect(fees).toMatch(new RegExp(`<input\\b[^>]*id="${id.replace(/[:]/g, "\\:")}"[^>]*type="range"`));
    expect(fees).toContain('aria-valuetext="₹2,50,000 per month"');
    expect(fees).toContain('min="50000"');
    expect(fees).toContain('max="1000000"');
    expect(fees).toContain('step="25000"');
    expect(fees).toMatch(/class="[^"]*\bh-11\b[^"]*"/);
  });

  it("announces only the delta sentence, as one polite output tied to the slider", () => {
    expect(count(fees, "aria-live")).toBe(1);
    expect(fees).toMatch(/<output\b[^>]*aria-live="polite"[^>]*>Ultimate leaves you ₹3,750 less than Basic each month<\/output>/);
  });

  it("keeps the draft caveat", () => {
    expect(text(fees)).toContain("Plan prices are drafts and billing is not live.");
  });
});
