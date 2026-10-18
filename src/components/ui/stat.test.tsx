import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MetricList, MetricRow, Stat, StatStrip, stripColumns } from "./stat";
import { Stat as StatFromUi, StatStrip as StripFromIndex, MetricRow as RowFromUi } from "@/components/ui";
import { Money } from "./money";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("Stat", () => {
  it("keeps the label/value/sub signature and renders inline without a card box", () => {
    const html = render(<Stat label="Revenue" value="₹1,200" sub="Last 30 days" />);
    expect(html).toContain('<p class="t-label">Revenue</p>');
    expect(html).toContain("tabular-nums");
    expect(html).toContain(">₹1,200<");
    expect(html).toContain(">Last 30 days<");
    expect(html).not.toMatch(/\bcard\b/);
    expect(html).not.toMatch(/\b(border|bg-surface|rounded)/);
  });

  it("omits the sub line when absent", () => {
    expect(render(<Stat label="Orders" value={3} />)).not.toContain("text-xs text-muted");
  });

  it("renders delta text with its tone and a true minus", () => {
    const up = render(<Stat label="A" value="1" delta="+12%" deltaTone="good" />);
    expect(up).toContain('<p class="mt-1 text-sm font-medium tabular-nums text-good">+12%</p>');
    const down = render(<Stat label="A" value="1" delta="-4%" deltaTone="bad" />);
    expect(down).toContain(">−4%<");
    expect(down).not.toContain(">-4%<");
    expect(down).toContain("text-bad");
  });

  it("defaults delta to muted", () => {
    expect(render(<Stat label="A" value="1" delta="0%" />)).toContain("text-muted\">0%");
  });

  it("is re-exported through the ui barrel", () => {
    expect(StatFromUi).toBe(Stat);
    expect(StripFromIndex).toBe(StatStrip);
    expect(RowFromUi).toBe(MetricRow);
  });
});

describe("StatStrip", () => {
  const items = [
    { label: "Gross", value: <Money paise={120000} />, delta: "+8%", deltaTone: "good" as const },
    { label: "Fees", value: <Money paise={-3000} /> },
    { label: "Net", value: "₹1,170", sub: "After GST" },
  ];

  it("renders one hairline-separated Stat per item inside a bordered row", () => {
    const html = render(<StatStrip items={items} />);
    expect(html).toContain("border-y border-line");
    expect(html).toContain("@3xl:border-l @3xl:border-line");
    expect((html.match(/class="t-label"/g) ?? []).length).toBe(3);
    expect(html).toContain(">+8%<");
    expect(html).toContain(">After GST<");
    expect(html).toContain(">−₹30<");
    expect(html).not.toMatch(/\bcard\b/);
  });

  it("appends a className passthrough", () => {
    expect(render(<StatStrip items={items} className="mb-6" />)).toContain(" mb-6");
  });

  it("labels are uppercase micro-labels unless a strip opts into sentence case", () => {
    expect((render(<StatStrip items={items} labelCase="upper" />).match(/class="t-label"/g) ?? []).length).toBe(3);
    const html = render(<StatStrip items={items} labelCase="sentence" />);
    expect(html).not.toContain("t-label");
    expect(html.match(/<p class="text-sm text-muted">(Gross|Fees|Net)<\/p>/g)).toHaveLength(3);
    expect(render(<Stat label="Net" value="1" labelCase="sentence" />)).toContain('<p class="text-sm text-muted">Net</p>');
    expect(render(<Stat label="Net" value="1" />)).toContain('<p class="t-label">Net</p>');
  });
});

describe("StatStrip layout answers to its own width (it overflowed the console column at 768 and 1024)", () => {
  const four = [
    { label: "Gross", value: "₹1,29,999.99" },
    { label: "Fees", value: "−₹1,29,999.99" },
    { label: "GST", value: "₹1,29,999.99" },
    { label: "Net", value: "₹1,29,999.99" },
  ];
  const outer = (n: number, cls = "") => {
    const html = render(<StatStrip items={four.slice(0, n)} className={cls || undefined} />);
    return { html, wrapper: /^<div class="([^"]*)"/.exec(html)![1], grid: /^<div class="[^"]*"><div class="([^"]*)"/.exec(html)![1] };
  };

  it("is a container: the root carries @container and the caller's className, the grid sits inside it", () => {
    const { wrapper } = outer(4, "mb-6");
    expect(wrapper).toBe("@container mb-6");
  });

  it("uses no viewport breakpoint and no non-wrapping flex row at any size", () => {
    // The figure's own font size may follow the viewport (Stat); the layout classes may not.
    const { html, wrapper, grid } = outer(4);
    const cells = [...html.matchAll(/<div class="(min-w-0[^"]*)"/g)].map((m) => m[1]);
    const layout = [wrapper, grid, ...cells].join(" ");
    expect(layout).not.toMatch(/(?:^|\s)(?:sm|md|lg|xl|2xl):/);
    expect(layout).not.toMatch(/(?:^|\s)(?:\S+:)?flex(?:\s|$)/);
    expect(html).not.toContain("whitespace-nowrap");
  });

  it("starts as two columns and only goes wide at a container width that fits its cells", () => {
    expect(outer(4).grid).toBe("grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-4 @5xl:grid-cols-4");
    expect(outer(3).grid).toBe("grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-4 @3xl:grid-cols-3");
    expect(outer(2).grid).toBe("grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-4");
    expect(outer(1).grid).toBe("grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-4");
  });

  it("cells can shrink and break a figure that would still overflow", () => {
    expect(render(<StatStrip items={four} />)).toContain("min-w-0 [overflow-wrap:anywhere]");
  });

  it("hairlines sit between cells, not before the first cell of a row", () => {
    const cells = [...render(<StatStrip items={four} />).matchAll(/<div class="(min-w-0[^"]*)"/g)].map((m) => m[1]);
    expect(cells).toHaveLength(4);
    expect(cells[0]).toContain("@5xl:pr-6");
    expect(cells[0]).not.toContain("border-l");
    for (const c of cells.slice(1)) expect(c).toContain("@5xl:border-l @5xl:border-line @5xl:px-6");
  });

  it("a long list wraps into rows of four, each row starting without a rule", () => {
    const six = [...four, { label: "A", value: "1" }, { label: "B", value: "2" }];
    const cells = [...render(<StatStrip items={six} />).matchAll(/<div class="(min-w-0[^"]*)"/g)].map((m) => m[1]);
    expect(cells).toHaveLength(6);
    const starts = cells.map((c) => !c.includes("border-l"));
    expect(starts).toEqual([true, false, false, false, true, false]);
  });

  it("has no card box", () => {
    expect(outer(4).html).not.toMatch(/\bcard\b|rounded|shadow|bg-surface/);
  });

  it("stripColumns is one per item, between one and four", () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(stripColumns)).toEqual([1, 1, 2, 3, 4, 4, 4]);
  });
});

describe("StatStrip keys", () => {
  const items = [
    { label: "Net", value: "₹100" },
    { label: "Net", value: "₹200" },
  ];

  it("renders every item even when two share a label", () => {
    const html = render(<StatStrip items={items} />);
    expect(html.match(/t-label">Net</g)).toHaveLength(2);
    expect(html).toContain(">₹100<");
    expect(html).toContain(">₹200<");
  });

  it("gives each item a distinct React key", () => {
    // React's server renderer does not warn on a repeated key, so inspect the element tree directly: keyed by
    // label, two "Net" columns would collide and a client re-render could drop or reorder one.
    const wrapper = StatStrip({ items }) as React.ReactElement<{ children: React.ReactElement<{ children: React.ReactElement[] }> }>;
    const keys = wrapper.props.children.props.children.map((child) => child.key);
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
  });
});

describe("MetricRow", () => {
  it("renders dt label and dd value in a dl list", () => {
    const html = render(
      <MetricList>
        <MetricRow label="Platform fee" value={<Money paise={-5000} />} />
      </MetricList>,
    );
    expect(html).toMatch(/^<dl class="divide-y divide-line">/);
    expect(html).toContain('<dt class="text-muted">Platform fee</dt>');
    expect(html).toContain("<dd ");
    expect(html).toContain(">−₹50<");
  });

  it("renders sub as a second dd under the label", () => {
    const html = render(
      <MetricList>
        <MetricRow label="GST" value="₹76" sub="Included in price" />
      </MetricList>,
    );
    expect(html).toContain('<dd class="col-start-1 row-start-2 text-xs text-muted">Included in price</dd>');
  });

  it("strong emphasises label and value", () => {
    const html = render(
      <MetricList>
        <MetricRow label="You receive" value="₹900" strong />
      </MetricList>,
    );
    expect(html).toContain('<dt class="font-semibold text-ink">You receive</dt>');
    expect(html).toContain("font-semibold text-ink");
    expect(
      render(
        <MetricList>
          <MetricRow label="x" value="y" />
        </MetricList>,
      ),
    ).not.toContain("font-semibold");
  });
});
