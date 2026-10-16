import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MetricList, MetricRow, Stat, StatStrip } from "./stat";
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
    expect(html).toContain("sm:divide-x sm:divide-line");
    expect((html.match(/class="t-label"/g) ?? []).length).toBe(3);
    expect(html).toContain(">+8%<");
    expect(html).toContain(">After GST<");
    expect(html).toContain(">−₹30<");
    expect(html).not.toMatch(/\bcard\b/);
  });

  it("appends a className passthrough", () => {
    expect(render(<StatStrip items={items} className="mb-6" />)).toContain(" mb-6");
  });
});

describe("StatStrip keys", () => {
  it("renders every item even when two share a label, without a duplicate-key warning", () => {
    // React reports a repeated key via console.error but still renders, so the warning is what pins the index key.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const html = render(
      <StatStrip
        items={[
          { label: "Net", value: "₹100" },
          { label: "Net", value: "₹200" },
        ]}
      />,
    );
    expect(html.match(/t-label">Net</g)).toHaveLength(2);
    expect(html).toContain(">₹100<");
    expect(html).toContain(">₹200<");
    const warned = error.mock.calls.some((call) => String(call[0]).includes("same key"));
    error.mockRestore();
    expect(warned).toBe(false);
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
