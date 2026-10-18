import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DateCell, EmptyRow, MoneyCell, RowActions, Table, Td, Th, Tr } from "./table";
import {
  Table as TableFromUi,
  Th as ThFromIndex,
  Td as TdFromUi,
  MoneyCell as MoneyCellFromUi,
  EmptyRow as EmptyRowFromIndex,
} from "@/components/ui";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

type SampleProps = { caption?: string; "aria-label"?: string; className?: string; stickyHeader?: boolean; stack?: boolean };

// Table requires a name, so the sample supplies a caption unless the test gives its own caption or aria-label.
function sample({ caption, "aria-label": ariaLabel, ...rest }: SampleProps = {}) {
  const name = ariaLabel
    ? { "aria-label": ariaLabel, caption }
    : { caption: caption ?? "Recent orders" };
  return (
    <Table {...name} {...rest}>
      <thead>
        <Tr>
          <Th>Order</Th>
          <Th align="right">Amount</Th>
        </Tr>
      </thead>
      <tbody>
        <Tr>
          <Td label="Order">#1042</Td>
          <MoneyCell label="Amount" paise={49900} />
        </Tr>
      </tbody>
    </Table>
  );
}

describe("Table", () => {
  it("renders a real table with hairline row separators and no card box", () => {
    const html = render(sample());
    expect(html).toMatch(/<table role="table" class="[^"]*w-full[^"]*"/);
    expect(html).toContain("[&amp;_tbody]:divide-y");
    expect(html).toContain("[&amp;_tbody]:divide-line");
    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody>");
    expect(html).not.toMatch(/\bcard\b/);
    expect(html).not.toMatch(/(^|[ "])(bg-surface|rounded|shadow)/);
  });

  it("scrolls horizontally inside a focusable wrapper with a mask fade on the right edge, never a gradient background", () => {
    const html = render(sample());
    expect(html).toMatch(/^<div [^>]*class="[^"]*overflow-x-auto[^"]*"/);
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("[mask-image:linear-gradient(to_right,#000_calc(100%_-_1.25rem),transparent)]");
    expect(html).toContain("pr-5");
    expect(html).not.toMatch(/bg-gradient|background(-image)?:|radial/);
  });

  it("draws the focus ring inset on the wrapper, since the mask would clip an outside outline", () => {
    expect(render(sample())).toMatch(/^<div [^>]*class="[^"]*focus-visible:outline-offset-\[-2px\]/);
    expect(render(sample({ stack: true }))).toContain("focus-visible:outline-offset-[-2px]");
  });

  it("pins explicit ARIA roles so stack mode keeps table semantics in WebKit", () => {
    const html = render(sample({ stack: true }));
    expect(html).toMatch(/<table role="table"/);
    expect(html).toMatch(/<tr role="row"/);
    expect(html).toMatch(/<th scope="col" role="columnheader"/);
    expect(html).toMatch(/<td role="cell"/);
  });

  it("uses a visually hidden caption and names the scroll region after it", () => {
    const html = render(sample({ caption: "Recent orders" }));
    expect(html).toContain('<caption class="sr-only">Recent orders</caption>');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Recent orders"');
  });

  it("supports aria-label, which wins over the caption for the region name", () => {
    const html = render(sample({ "aria-label": "Payouts", caption: "Last 30 days" }));
    expect(html).toMatch(/<table [^>]*aria-label="Payouts"/);
    expect(html).toContain('role="region"');
    expect(html).toMatch(/<div [^>]*aria-label="Payouts"/);
  });

  it("requires a name for the focusable region, by caption or aria-label", () => {
    // compile-time contract: @ts-expect-error fails typecheck if the unnamed form ever becomes valid
    // @ts-expect-error a Table needs a caption or an aria-label
    const unnamed = <Table>{null}</Table>;
    expect(unnamed).toBeTruthy();
    expect(render(<Table caption="A">{null}</Table>)).toContain('aria-label="A"');
    expect(render(<Table aria-label="B">{null}</Table>)).toContain('aria-label="B"');
  });

  it("appends className to the scroll wrapper so callers can cap the height", () => {
    expect(render(sample({ className: "max-h-96" }))).toMatch(/^<div [^>]*class="[^"]*overflow-x-auto[^"]* max-h-96"/);
  });

  it("adds no stack classes by default", () => {
    const html = render(sample());
    expect(html).not.toContain("data-stack");
    expect(html).not.toContain("max-sm:[");
    expect(html).not.toContain("sm:pr-5");
  });

  it("stickyHeader pins the head cells with a tone fill and a hairline, not a gradient", () => {
    const html = render(sample({ stickyHeader: true }));
    expect(html).toContain("[&amp;_thead_th]:sticky");
    expect(html).toContain("[&amp;_thead_th]:top-0");
    expect(html).toContain("[&amp;_thead_th]:bg-surface-2");
    expect(html).toContain("[&amp;_thead_th]:shadow-[inset_0_-1px_0_var(--line)]");
    expect(html).not.toContain("border-b border-line");
    expect(render(sample())).not.toContain("sticky");
  });

  it("draws the head hairline as a border when the header is not sticky", () => {
    expect(render(sample())).toContain("[&amp;_thead]:border-b");
  });

  it("stack mode turns rows into label/value blocks below sm using CSS only", () => {
    const html = render(sample({ stack: true }));
    expect(html).toContain('data-stack="true"');
    // head becomes screen-reader only, rows and body become blocks, all below sm
    expect(html).toContain("max-sm:[&amp;_thead]:sr-only");
    expect(html).toContain("max-sm:[&amp;_tbody]:block");
    expect(html).toContain("max-sm:[&amp;_tr]:block");
    // cells print their data-label before the value
    expect(html).toContain('data-label="Order"');
    expect(html).toContain('data-label="Amount"');
    expect(html).toContain("max-sm:[&amp;_td:not([colspan])]:flex");
    expect(html).toContain("max-sm:[&amp;_td:not([colspan])]:before:content-[attr(data-label)]");
    // the scroll fade only applies from sm up, since nothing scrolls below it
    expect(html).toContain("sm:[mask-image:");
    expect(html).not.toMatch(/(^|[ "])\[mask-image:/);
  });

  it("re-exports the kit through the ui barrel", () => {
    expect(TableFromUi).toBe(Table);
    expect(ThFromIndex).toBe(Th);
    expect(TdFromUi).toBe(Td);
    expect(MoneyCellFromUi).toBe(MoneyCell);
    expect(EmptyRowFromIndex).toBe(EmptyRow);
  });
});

describe("class strings", () => {
  it("never interpolates inside the exported class-string constants (Tailwind cannot see them)", () => {
    const src = readFileSync(new URL("./table.tsx", import.meta.url), "utf8");
    const consts = [...src.matchAll(/^const (FADE|FADE_FROM_SM|HEAD_STATIC|HEAD_STICKY|STACK_TABLE)\b[\s\S]*?;\n/gm)];
    expect(consts.map((m) => m[1])).toEqual(["FADE", "FADE_FROM_SM", "HEAD_STATIC", "HEAD_STICKY", "STACK_TABLE"]);
    for (const m of consts) expect(m[0], m[1]).not.toContain("${");
  });
});

describe("Th", () => {
  it('is a column heading with scope="col" and the t-label style', () => {
    const html = render(<table><thead><tr><Th>Order</Th></tr></thead></table>);
    expect(html).toContain('<th scope="col" role="columnheader" class="t-label ');
    expect(html).toContain(">Order</th>");
    expect(html).toContain("text-left");
  });

  it("right-aligns numeric headings", () => {
    const html = render(<table><thead><tr><Th align="right">Amount</Th></tr></thead></table>);
    expect(html).toContain("text-right");
    expect(html).not.toContain("text-left");
  });

  it("supports row headings and className passthrough", () => {
    const html = render(<table><tbody><tr><Th scope="row" className="w-40">Fee</Th></tr></tbody></table>);
    expect(html).toContain('scope="row"');
    expect(html).toContain('role="rowheader"');
    expect(html).not.toContain("columnheader");
    expect(html).toMatch(/class="[^"]* w-40"/);
  });
});

describe("Tr", () => {
  it("fills on hover with an explicit colour transition, no scale or lift", () => {
    const html = render(<table><tbody><Tr>{null}</Tr></tbody></table>);
    expect(html).toContain("hover:bg-surface-2");
    expect(html).toContain("transition-colors");
    expect(html).not.toMatch(/scale|translate|transition-all/);
  });

  it("passes through attributes and className", () => {
    const html = render(<table><tbody><Tr className="x" data-id="42">{null}</Tr></tbody></table>);
    expect(html).toContain('data-id="42"');
    expect(html).toMatch(/class="[^"]* x"/);
  });
});

describe("Td", () => {
  it("uses 14px dense cells and prints data-label only when given", () => {
    const labelled = render(<table><tbody><tr><Td label="Buyer">Asha</Td></tr></tbody></table>);
    expect(labelled).toContain('data-label="Buyer"');
    expect(labelled).toContain("text-sm");
    expect(labelled).toContain("px-3");
    const plain = render(<table><tbody><tr><Td>Asha</Td></tr></tbody></table>);
    expect(plain).not.toContain('data-label="');
  });

  it("aligns right when asked", () => {
    expect(render(<table><tbody><tr><Td align="right">1</Td></tr></tbody></table>)).toContain("text-right");
    expect(render(<table><tbody><tr><Td>1</Td></tr></tbody></table>)).not.toContain("text-right");
  });

  it("passes colSpan through", () => {
    expect(render(<table><tbody><tr><Td colSpan={3}>x</Td></tr></tbody></table>)).toContain('colSpan="3"');
  });
});

describe("MoneyCell", () => {
  it("renders a right-aligned, tabular Money amount", () => {
    const html = render(<table><tbody><tr><MoneyCell paise={129900} label="Gross" /></tr></tbody></table>);
    expect(html).toContain("text-right");
    expect(html).toContain("tabular-nums");
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain(">₹1,299<");
    expect(html).toContain('data-label="Gross"');
  });

  it("forwards tone, sign and mono to Money and prints negatives with a true minus", () => {
    const html = render(
      <table><tbody><tr><MoneyCell paise={-5000} tone="bad" mono /></tr></tbody></table>,
    );
    expect(html).toContain("text-bad");
    expect(html).toContain("font-mono");
    expect(html).toContain(">−₹50<");
    expect(html).not.toContain(">-₹50<");
    const credit = render(<table><tbody><tr><MoneyCell paise={5000} sign="+" tone="good" /></tr></tbody></table>);
    expect(credit).toContain(">+₹50<");
    expect(credit).toContain("text-good");
  });
});

describe("DateCell", () => {
  const when = new Date("2026-10-15T20:30:00Z"); // 16 Oct, 2:00 am IST

  it("formats in IST and exposes the instant in a time element", () => {
    const html = render(<table><tbody><tr><DateCell date={when} label="Date" /></tr></tbody></table>);
    expect(html).toContain('<time dateTime="2026-10-15T20:30:00.000Z">16 Oct 2026</time>');
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain('data-label="Date"');
  });

  it("supports the long style and a time of day", () => {
    expect(render(<table><tbody><tr><DateCell date={when} style="long" /></tr></tbody></table>)).toContain(">16 October 2026<");
    expect(render(<table><tbody><tr><DateCell date={when} time /></tr></tbody></table>)).toMatch(/>16 Oct 2026, 2:00\s?am</);
  });

  it("prints an em dash, with no time element, when the date is missing or invalid", () => {
    const none = render(<table><tbody><tr><DateCell date={null} /></tr></tbody></table>);
    expect(none).toContain(">—<");
    expect(none).not.toContain("<time");
    const bad = render(<table><tbody><tr><DateCell date={new Date("nope")} /></tr></tbody></table>);
    expect(bad).toContain(">—<");
    expect(bad).not.toContain("<time");
  });
});

describe("RowActions", () => {
  it("right-aligns its buttons in a no-wrap cell", () => {
    const html = render(
      <table><tbody><tr><RowActions><a href="/x">Edit</a><button type="button">Delete</button></RowActions></tr></tbody></table>,
    );
    expect(html).toContain("text-right");
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("justify-end");
    expect(html).toContain(">Edit</a>");
    expect(html).toContain(">Delete</button>");
  });
});

describe("EmptyRow", () => {
  it("spans every column with a title, body and action, and does not hover-fill", () => {
    const html = render(
      <table><tbody>
        <EmptyRow colSpan={4} title="No orders yet" body="Orders appear here after the first sale." action={<button type="button">Create a product</button>} />
      </tbody></table>,
    );
    expect(html).toContain('colSpan="4"');
    expect(html).toContain("No orders yet");
    expect(html).toContain("Orders appear here after the first sale.");
    expect(html).toContain(">Create a product</button>");
    expect(html).not.toContain("hover:bg");
  });

  it("omits body and action when absent", () => {
    const html = render(<table><tbody><EmptyRow colSpan={2} title="Nothing here" /></tbody></table>);
    expect(html).toContain(">Nothing here<");
    expect(html).not.toContain("text-muted");
  });

  it("is not turned into a label/value block by stack mode", () => {
    const html = render(
      <Table stack caption="Orders"><tbody><EmptyRow colSpan={2} title="Nothing here" /></tbody></Table>,
    );
    expect(html).not.toContain('data-label="');
    expect(html).toContain('<td role="cell" colSpan="2" class="px-3 py-10 text-center">');
    expect(html).toContain('<tr role="row">');
  });
});

describe("stack label case", () => {
  // The stacked phone layout prints each cell's label first. Uppercase tracked micro-labels are the default; a page that
  // already has its quota of micro-labels asks for sentence case instead.
  const stacked = (labelCase?: "upper" | "sentence") =>
    render(
      <Table stack labelCase={labelCase} caption="Orders">
        <tbody>
          <Tr>
            <Td label="Order">#1042</Td>
          </Tr>
        </tbody>
      </Table>,
    );
  const BEFORE_UPPER = "max-sm:[&amp;_td:not([colspan])]:before:uppercase";
  const BEFORE_TRACK = "max-sm:[&amp;_td:not([colspan])]:before:tracking-[0.06em]";

  it("defaults to uppercase tracked labels below sm", () => {
    for (const html of [stacked(), stacked("upper")]) {
      expect(html).toContain(BEFORE_UPPER);
      expect(html).toContain(BEFORE_TRACK);
    }
  });

  it("labelCase=\"sentence\" prints the same label without uppercase or tracking, keeping the rest of the stack", () => {
    const html = stacked("sentence");
    expect(html).not.toContain("before:uppercase");
    expect(html).not.toContain("before:tracking-");
    expect(html).toContain("max-sm:[&amp;_td:not([colspan])]:before:content-[attr(data-label)]");
    expect(html).toContain("max-sm:[&amp;_td:not([colspan])]:before:text-muted");
    expect(html).toContain("max-sm:[&amp;_td:not([colspan])]:before:text-sm");
    expect(html).toContain('data-stack="true"');
  });

  it("is a no-op without stack", () => {
    const html = render(
      <Table labelCase="sentence" caption="Orders">
        <tbody />
      </Table>,
    );
    expect(html).not.toContain("data-stack");
    expect(html).not.toContain("max-sm:");
  });
});
