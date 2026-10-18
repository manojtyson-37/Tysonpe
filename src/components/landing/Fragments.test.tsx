// The sample invoice carries a fixed date. The clock is moved years away before the module loads, so a date taken from
// "now" (and an invoice number built from it) cannot pass by coincidence on the day the suite runs.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();

async function load() {
  vi.resetModules();
  return import("./Fragments");
}

describe("landing fragments: the sample invoice does not read the clock", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-02-03T04:05:06+05:30"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("prints 15 Oct 2026 and the 2026-27 invoice number in 2031", async () => {
    expect(new Date().getFullYear()).toBe(2031); // the fake clock is in force
    const { InvoiceFragment, SAMPLE_INVOICE_NO } = await load();
    expect(SAMPLE_INVOICE_NO).toBe("TP/2026-27/00001");
    const t = text(renderToStaticMarkup(<InvoiceFragment />));
    expect(t).toContain("Date 15 Oct 2026");
    expect(t).toContain("TP/2026-27/00001");
    expect(t).not.toContain("2031");
  });

  it("the checkout fragment prints no date and the same sale as the invoice", async () => {
    const { CheckoutFragment, InvoiceFragment } = await load();
    const checkout = text(renderToStaticMarkup(<CheckoutFragment />));
    expect(checkout).not.toMatch(/\b20\d\d\b/);
    expect(checkout).toContain("Total payable ₹2,999");
    expect(text(renderToStaticMarkup(<InvoiceFragment />))).toContain("Total paid ₹2,999");
  });
});

// The checkout and invoice fragments sit on the inset tone (bg-surface-2), where the default hairline (--line) is about
// 1.17:1 and the internal rules all but vanish. Their own rules therefore use --line-strong.
describe("landing fragments: internal rules are visible on the inset tone", () => {
  const classes = (h: string) => [...h.matchAll(/\sclass="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&").replace(/&gt;/g, ">").split(/\s+/));

  it.each([["CheckoutFragment", 1], ["InvoiceFragment", 3]] as const)("%s uses no plain border-line rule and recolours its list dividers", async (name, rules) => {
    const mod = await load();
    const Fragment = mod[name];
    const h = renderToStaticMarkup(<Fragment />);
    expect(h).toContain("rounded-card bg-surface-2"); // it really is on the inset tone
    const tokens = classes(h).flat();
    expect(tokens.filter((t) => t === "border-line")).toEqual([]);
    // every drawn rule (a border side or a divide) is paired with the strong colour on the same element
    const ruled = classes(h).filter((c) => c.some((t) => /^(border-[tb]|divide-y)$/.test(t)));
    expect(ruled).toHaveLength(rules); // checkout: the list; invoice: header, parties, list
    for (const c of ruled) expect(c).toContain(c.includes("divide-y") ? "[&>*]:border-line-strong" : "border-line-strong");
    // the MetricList primitive puts divide-line on the list itself, so its row dividers are recoloured through a child selector
    expect(classes(h).filter((c) => c.includes("divide-y")).length).toBeGreaterThanOrEqual(1);
  });
});
