import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Money, Price } from "./money";
import { Money as MoneyFromUi, Price as PriceFromIndex } from "@/components/ui";
import { formatINR } from "@/lib/money";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("Money", () => {
  it("renders formatINR output with tabular-nums and no wrapping", () => {
    expect(render(<Money paise={49900} />)).toBe('<span class="tabular-nums whitespace-nowrap">₹499</span>');
  });

  it("keeps the test-pinned formatINR output", () => {
    expect(render(<Money paise={49950} />)).toContain(">₹499.50<");
    expect(render(<Money paise={12345600} />)).toContain(">₹1,23,456<");
    expect(formatINR(49900)).toBe("₹499");
  });

  it("is re-exported through the ui barrel and Price through the index", () => {
    expect(MoneyFromUi).toBe(Money);
    expect(PriceFromIndex).toBe(Price);
  });

  it("renders a negative amount with the true minus, never a hyphen", () => {
    const html = render(<Money paise={-5000} />);
    expect(html).toContain(">−₹50<");
    expect(html).not.toContain("-₹");
    expect(html).not.toContain(">-");
  });

  it("sign + prefixes a plus on positives and a true minus on negatives", () => {
    expect(render(<Money paise={5000} sign="+" />)).toContain(">+₹50<");
    expect(render(<Money paise={-5000} sign="+" />)).toContain(">−₹50<");
  });

  it("sign minus shows a deduction with a true minus from a positive amount", () => {
    const html = render(<Money paise={5000} sign={"−"} />);
    expect(html).toContain(">−₹50<");
    expect(render(<Money paise={-5000} sign={"−"} />)).toContain(">−₹50<");
  });

  it("never signs zero", () => {
    expect(render(<Money paise={0} sign="+" />)).toContain(">₹0<");
    expect(render(<Money paise={0} sign={"−"} />)).toContain(">₹0<");
  });

  it("free renders Free at zero and the amount otherwise", () => {
    expect(render(<Money paise={0} free />)).toContain(">Free<");
    expect(render(<Money paise={100} free />)).toContain(">₹1<");
    expect(render(<Money paise={0} />)).toContain(">₹0<");
  });

  it.each([
    ["good", "text-good"],
    ["bad", "text-bad"],
    ["muted", "text-muted"],
  ] as const)("tone %s uses %s", (tone, cls) => {
    expect(render(<Money paise={100} tone={tone} />)).toBe(
      `<span class="tabular-nums whitespace-nowrap ${cls}">₹1</span>`,
    );
  });

  it("default tone adds no colour class", () => {
    expect(render(<Money paise={100} tone="default" />)).not.toMatch(/text-(good|bad|muted)/);
  });

  it.each([
    ["sm", "text-sm"],
    ["lg", "text-xl font-semibold"],
    ["xl", "text-2xl font-semibold sm:text-3xl"],
  ] as const)("size %s adds %s", (size, cls) => {
    expect(render(<Money paise={100} size={size} />)).toContain(cls);
  });

  it("md size inherits the surrounding type", () => {
    expect(render(<Money paise={100} size="md" />)).toBe(render(<Money paise={100} />));
  });

  it("mono switches to the ledger face and still keeps tabular-nums", () => {
    const html = render(<Money paise={100} mono />);
    expect(html).toContain("font-mono");
    expect(html).toContain("tabular-nums");
  });

  it("appends a className passthrough last", () => {
    expect(render(<Money paise={100} className="ml-2" />)).toBe(
      '<span class="tabular-nums whitespace-nowrap ml-2">₹1</span>',
    );
  });
});

describe("Price", () => {
  it("renders the amount alone by default", () => {
    const html = render(<Price paise={49900} />);
    expect(html).toContain(">₹499<");
    expect(html).not.toContain("/ ");
    expect(html).not.toContain("GST");
  });

  it("renders Free for zero and drops the period and GST note", () => {
    const html = render(<Price paise={0} period="month" gstNote="incl. GST" />);
    expect(html).toContain(">Free<");
    expect(html).not.toContain("/ month");
    expect(html).not.toContain("GST");
  });

  it("appends the period and GST note as muted text", () => {
    const html = render(<Price paise={50000} period="month" gstNote="incl. GST" />);
    expect(html).toContain('<span class="text-muted">/ month</span>');
    expect(html).toContain('<span class="t-meta">incl. GST</span>');
    expect(html).toContain(">₹500<");
  });

  it("passes size through to the amount", () => {
    expect(render(<Price paise={50000} size="xl" />)).toContain("text-2xl font-semibold sm:text-3xl");
  });
});
