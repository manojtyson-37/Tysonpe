import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MetricList, MetricRow, Stat, StatStrip, stripColumns, stripLayout } from "./stat";
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
    expect(html).toContain("@5xl:border-l @5xl:border-line");
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

// WHAT THIS CANNOT PROVE (needs a browser): real overflow. jsdom has no layout, so the fit below is an ESTIMATE from a
// per-character width model, and the class strings are pinned so a change is noticed. The controller's browser pass
// (375/768/1024/1280/1440 on /dashboard and /dashboard/payouts, with long figures injected) is the real check.
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
  const cellsOf = (n: number) => [...outer(n).html.matchAll(/<div class="(@(?!container")[^"]*)"/g)].map((m) => m[1]);
  const BASE = "grid grid-cols-1 gap-x-6 gap-y-5 border-y border-line py-4 @2xl:grid-cols-2";

  it("is a container: the root carries @container and the caller's className, the grid sits inside it", () => {
    expect(outer(4, "mb-6").wrapper).toBe("@container mb-6");
  });

  it("uses no viewport breakpoint, no flex and no nowrap in the layout classes", () => {
    // The figure's own font size may follow the viewport (Stat); the layout classes may not.
    const { html, wrapper, grid } = outer(4);
    const layout = [wrapper, grid, ...cellsOf(4)].join(" ");
    expect(layout).not.toMatch(/(?:^|\s)(?:sm|md|lg|xl|2xl):/);
    expect(layout).not.toMatch(/(?:^|\s)(?:\S+:)?flex(?:\s|$)/);
    expect(layout).not.toMatch(/min-w-0|overflow-wrap/); // nothing here pretends a nowrap figure can shrink or break
    expect(html).not.toContain("whitespace-nowrap");
  });

  it("is one column on a narrow container, two from @2xl, and only goes wider where the cells fit", () => {
    expect(outer(4).grid).toBe(`${BASE} @min-[84rem]:grid-cols-4 @min-[84rem]:gap-x-0`);
    expect(outer(3).grid).toBe(`${BASE} @5xl:grid-cols-3 @5xl:gap-x-0`);
    expect(outer(2).grid).toBe(`${BASE} @2xl:gap-x-0`);
    expect(outer(1).grid).toBe(BASE);
  });

  it("the space either side of a hairline is the same: no column gap where the rules are drawn", () => {
    for (const [n, bp] of [[2, "@2xl"], [3, "@5xl"], [4, "@min-[84rem]"]] as const) {
      expect(outer(n).grid).toContain(`${bp}:gap-x-0`);
      expect(cellsOf(n)[1]).toContain(`${bp}:border-l ${bp}:border-line ${bp}:px-6`);
    }
  });

  it("hairlines sit between cells, not before the first cell of a row", () => {
    const cells = cellsOf(4);
    expect(cells).toHaveLength(4);
    expect(cells[0]).toBe("@min-[84rem]:pr-6");
    for (const c of cells.slice(1)) expect(c).toBe("@min-[84rem]:border-l @min-[84rem]:border-line @min-[84rem]:px-6");
  });

  it("a long list wraps into rows of four, each row starting without a rule", () => {
    const six = [...four, { label: "A", value: "1" }, { label: "B", value: "2" }];
    const cells = [...render(<StatStrip items={six} />).matchAll(/<div class="(@(?!container")[^"]*)"/g)].map((m) => m[1]);
    expect(cells).toHaveLength(6);
    expect(cells.map((c) => !c.includes("border-l"))).toEqual([true, false, false, false, true, false]);
  });

  it("every cell class list is exactly its own divider tokens, for every strip size (nothing extra, nothing missing)", () => {
    const spec: Record<number, [string, string]> = {
      2: ["@2xl:pr-6", "@2xl:border-l @2xl:border-line @2xl:px-6"],
      3: ["@5xl:pr-6", "@5xl:border-l @5xl:border-line @5xl:px-6"],
      4: ["@min-[84rem]:pr-6", "@min-[84rem]:border-l @min-[84rem]:border-line @min-[84rem]:px-6"],
    };
    // One item: no divider tokens at all, so the cell carries no class attribute.
    expect(render(<StatStrip items={four.slice(0, 1)} />)).not.toMatch(/<div class="@(?!container")/);
    expect(cellsOf(1)).toEqual([]);
    for (const n of [2, 3, 4]) {
      const [first, rest] = spec[n];
      expect(cellsOf(n), `${n} items`).toEqual(Array.from({ length: n }, (_, i) => (i === 0 ? first : rest)));
    }
    // and the shape of a cell is the same class list the helper hands the skeleton
    for (const n of [1, 2, 3, 4]) {
      const classes = Array.from({ length: n }, (_, i) => stripLayout(n).cell(i)).filter(Boolean);
      expect(classes, `${n} items`).toEqual(cellsOf(n));
    }
  });

  it("has no card box", () => {
    expect(outer(4).html).not.toMatch(/\bcard\b|rounded|shadow|bg-surface/);
  });

  it("stripColumns is one per item, between one and four", () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(stripColumns)).toEqual([1, 1, 2, 3, 4, 4, 4]);
  });

  describe("the widest plausible figure fits every layout the classes can produce (estimate, see the header note)", () => {
    // Tailwind v4 default container steps in px (rem x 16).
    const STEP: Record<string, number> = { xl: 576, "2xl": 672, "3xl": 768, "4xl": 896, "5xl": 1024, "6xl": 1152, "7xl": 1280 };
    const widthOf = (bp: string) => (bp.startsWith("min-[") ? parseFloat(bp.slice(5)) * 16 : STEP[bp]);
    // Tabular figures in the body face run about 0.6em per digit; the model is deliberately a little wider than that.
    // Digit 0.65em, rupee sign and minus 0.7em, comma and full stop 0.35em.
    const EM = { digit: 0.65, symbol: 0.7, sep: 0.35 };
    const figureEm = (text: string) =>
      [...text].reduce((w, ch) => w + (/\d/.test(ch) ? EM.digit : /[,.]/.test(ch) ? EM.sep : EM.symbol), 0);
    const FIGURE_PX = 30; // sm:text-3xl, the largest figure size
    const WORST = "−₹1,29,99,999.99"; // a negative crore amount
    const need = Math.ceil(figureEm(WORST) * FIGURE_PX - 1e-6);
    const PAD = 24; // padding on one side of a rule (px-6)
    const GAP = 24; // gap-x-6, only where no rule is drawn

    it("the model: the worst figure is about 9.3em, about 279px at 30px", () => {
      expect(figureEm(WORST)).toBeCloseTo(9.3, 5);
      expect(need).toBe(279);
    });

    it("below @2xl a single column holds it, down to the narrowest container the layout supports (280px)", () => {
      expect(outer(4).grid).toContain("grid-cols-1");
      expect(280).toBeGreaterThanOrEqual(need);
    });

    it("every container step the classes switch on gives each cell at least that width", () => {
      for (const n of [2, 3, 4, 5, 8]) {
        const { grid } = outer(n);
        const cells = [...render(<StatStrip items={Array.from({ length: n }, (_, i) => ({ label: `L${i}`, value: "x" }))} />).matchAll(/<div class="(@(?!container")[^"]*)"/g)].map((m) => m[1]);
        const colsAt: Array<[number, number]> = [[widthOf("2xl"), 2]]; // [container px, columns]
        const wide = /@(\S+?):grid-cols-(\d)/.exec(grid);
        if (wide) colsAt.push([widthOf(wide[1]), Number(wide[2])]);
        for (const [px, cols] of colsAt) {
          // A rule is drawn only where the wide layout is on and gap-x-0 is applied; otherwise the gap separates cells.
          const ruled = new RegExp(`@(\\S+?):gap-x-0`).exec(grid);
          const ruledHere = ruled !== null && widthOf(ruled[1]) <= px;
          const sideSpace = ruledHere ? 2 * PAD : GAP;
          const cell = ruledHere ? px / cols - sideSpace : (px - GAP * (cols - 1)) / cols;
          expect(cell, `${n} items, ${cols} columns from ${px}px`).toBeGreaterThanOrEqual(need);
        }
        expect(cells.length).toBe(n);
      }
    });
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
