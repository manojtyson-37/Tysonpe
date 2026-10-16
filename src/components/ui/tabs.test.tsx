import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let mockPath: string | null = "/dashboard/orders/123";
vi.mock("next/navigation", () => ({ usePathname: () => mockPath }));

import { SegmentedControl, TabPanel, Tabs, indicatorTransition, isLinkActive, nextIndex, tabId, tabPanelId } from "./tabs";

/** Attributes of every `<tag ...>` in the markup, so assertions do not depend on attribute order. */
function tagAttrs(html: string, tag: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${tag}\\s([^>]*)>`, "g"))].map((match) =>
    Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attr) => [attr[1], attr[2]])),
  );
}

describe("nextIndex", () => {
  it("moves forward with ArrowRight and ArrowDown, wrapping at the end", () => {
    expect(nextIndex(0, "ArrowRight", 3)).toBe(1);
    expect(nextIndex(1, "ArrowDown", 3)).toBe(2);
    expect(nextIndex(2, "ArrowRight", 3)).toBe(0);
  });

  it("moves back with ArrowLeft and ArrowUp, wrapping at the start", () => {
    expect(nextIndex(2, "ArrowLeft", 3)).toBe(1);
    expect(nextIndex(1, "ArrowUp", 3)).toBe(0);
    expect(nextIndex(0, "ArrowLeft", 3)).toBe(2);
  });

  it("jumps to the first and last item with Home and End", () => {
    expect(nextIndex(2, "Home", 4)).toBe(0);
    expect(nextIndex(0, "End", 4)).toBe(3);
  });

  it("ignores other keys and empty lists", () => {
    for (const key of ["Enter", " ", "a", "Tab", "PageDown", "Escape"]) {
      expect(nextIndex(1, key, 3)).toBe(1);
    }
    expect(nextIndex(0, "ArrowRight", 0)).toBe(0);
  });

  it("stays put on a single item", () => {
    expect(nextIndex(0, "ArrowRight", 1)).toBe(0);
    expect(nextIndex(0, "ArrowLeft", 1)).toBe(0);
  });

  it("horizontal-only mode ignores ArrowUp and ArrowDown so the page can scroll", () => {
    expect(nextIndex(1, "ArrowDown", 3, "horizontal")).toBe(1);
    expect(nextIndex(1, "ArrowUp", 3, "horizontal")).toBe(1);
    expect(nextIndex(1, "ArrowRight", 3, "horizontal")).toBe(2);
    expect(nextIndex(1, "ArrowLeft", 3, "horizontal")).toBe(0);
    expect(nextIndex(2, "Home", 3, "horizontal")).toBe(0);
    expect(nextIndex(0, "End", 3, "horizontal")).toBe(2);
  });

  it("all-arrows mode (the default) still honours ArrowUp and ArrowDown", () => {
    expect(nextIndex(1, "ArrowDown", 3, "all")).toBe(2);
    expect(nextIndex(1, "ArrowUp", 3, "all")).toBe(0);
  });
});

describe("indicatorTransition", () => {
  it("snaps with no duration when the change came from the keyboard", () => {
    expect(indicatorTransition(true)).toEqual({ duration: 0 });
  });

  it("slides for 200ms on --ease-out for pointer changes", () => {
    expect(indicatorTransition(false)).toEqual({ duration: 0.2, ease: [0.25, 1, 0.5, 1] });
  });
});

describe("isLinkActive", () => {
  it("prefix match covers nested routes but respects segment boundaries", () => {
    expect(isLinkActive("/dashboard/orders", "/dashboard/orders")).toBe(true);
    expect(isLinkActive("/dashboard/orders/123", "/dashboard/orders")).toBe(true);
    expect(isLinkActive("/dashboard/orders-archive", "/dashboard/orders")).toBe(false);
    expect(isLinkActive("/dashboard", "/dashboard/orders")).toBe(false);
  });

  it("exact match only matches the same path", () => {
    expect(isLinkActive("/dashboard", "/dashboard", "exact")).toBe(true);
    expect(isLinkActive("/dashboard/orders", "/dashboard", "exact")).toBe(false);
  });

  it("ignores a query string or hash on the href and treats / as exact", () => {
    expect(isLinkActive("/dashboard/orders", "/dashboard/orders?status=paid")).toBe(true);
    expect(isLinkActive("/anything", "/")).toBe(false);
    expect(isLinkActive("/", "/")).toBe(true);
  });
});

describe("Tabs (link mode)", () => {
  const items = [
    { href: "/dashboard", label: "Overview", match: "exact" as const },
    { href: "/dashboard/orders", label: "Orders" },
    { href: "/dashboard/payouts", label: "Payouts" },
  ];

  it("renders a labelled nav of links and marks only the active one with aria-current=page", () => {
    mockPath = "/dashboard/orders/123";
    const html = renderToStaticMarkup(<Tabs ariaLabel="Dashboard" items={items} />);
    expect(html).toMatch(/^<nav aria-label="Dashboard"/);
    expect(html.match(/<a /g)).toHaveLength(3);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*>(?:(?!<\/a>).)*Orders/);
    expect(html).not.toContain('role="tablist"');
  });

  it("exact-match items are not active on nested routes", () => {
    mockPath = "/dashboard/orders";
    const html = renderToStaticMarkup(<Tabs ariaLabel="Dashboard" items={items} />);
    expect(html).not.toMatch(/aria-current="page"[^>]*>(?:(?!<\/a>).)*Overview/);
    expect(html).toMatch(/aria-current="page"[^>]*>(?:(?!<\/a>).)*Orders/);
  });

  it("lets `current` override the pathname check", () => {
    mockPath = "/dashboard/orders";
    const html = renderToStaticMarkup(
      <Tabs
        ariaLabel="Order status"
        items={[
          { href: "/dashboard/orders", label: "All", current: false },
          { href: "/dashboard/orders?status=paid", label: "Paid", current: true },
        ]}
      />,
    );
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*>(?:(?!<\/a>).)*Paid/);
  });

  it("uses token classes: 44px height, 14px text, ink active text on a surface-2 pill", () => {
    mockPath = "/dashboard/orders";
    const html = renderToStaticMarkup(<Tabs ariaLabel="Dashboard" items={items} />);
    expect(html).toContain("min-h-11");
    expect(html).toContain("text-sm");
    expect(html).toContain("text-ink");
    expect(html).toContain("text-muted");
    expect(html).toContain("bg-surface-2");
    expect(html).not.toMatch(/transition-all|hover:scale|rounded-\[|text-\[(9|10|11)px\]/);
  });

  it("renders when pathname is unavailable", () => {
    mockPath = null;
    expect(renderToStaticMarkup(<Tabs ariaLabel="Dashboard" items={items} />)).not.toContain("aria-current");
  });
});

describe("Tabs (state mode)", () => {
  const items = [
    { value: "razorpay", label: "Razorpay" },
    { value: "easebuzz", label: "Easebuzz" },
    { value: "upi", label: "UPI" },
  ];

  it("renders a tablist of tabs with selection, aria-controls and a roving tabindex", () => {
    const html = renderToStaticMarkup(<Tabs ariaLabel="Gateway" id="gw" items={items} value="easebuzz" onChange={() => {}} />);
    expect(html).toMatch(/^<div role="tablist" aria-label="Gateway"/);
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/aria-selected="false"/g)).toHaveLength(2);
    const tabs = Object.fromEntries(tagAttrs(html, "button").map((attrs) => [attrs.id, attrs]));
    expect(tabs["gw-tab-easebuzz"]).toMatchObject({ "aria-selected": "true", "aria-controls": "gw-panel-easebuzz", tabindex: "0", type: "button" });
    expect(tabs["gw-tab-razorpay"]).toMatchObject({ "aria-selected": "false", "aria-controls": "gw-panel-razorpay", tabindex: "-1" });
    expect(tabs["gw-tab-upi"]).toMatchObject({ "aria-selected": "false", tabindex: "-1" });
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).not.toContain("aria-current");
  });

  it("keeps the first tab reachable when value matches nothing", () => {
    const html = renderToStaticMarkup(<Tabs ariaLabel="Gateway" id="gw" items={items} value="none" onChange={() => {}} />);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    const tabs = Object.fromEntries(tagAttrs(html, "button").map((attrs) => [attrs.id, attrs]));
    expect(tabs["gw-tab-razorpay"].tabindex).toBe("0");
    expect(html).not.toContain('aria-selected="true"');
  });

  it("passes className through to the tablist", () => {
    const html = renderToStaticMarkup(<Tabs ariaLabel="Gateway" id="gw" items={items} value="upi" onChange={() => {}} className="mb-4" />);
    expect(tagAttrs(html, "div")[0].class).toContain("mb-4");
  });

  it("TabPanel links back to its tab and hides when not selected", () => {
    expect(tabId("gw", "upi")).toBe("gw-tab-upi");
    expect(tabPanelId("gw", "upi")).toBe("gw-panel-upi");
    const shown = renderToStaticMarkup(<TabPanel id="gw" value="upi" selected>content</TabPanel>);
    expect(shown).toContain('role="tabpanel"');
    expect(shown).toContain('id="gw-panel-upi"');
    expect(shown).toContain('aria-labelledby="gw-tab-upi"');
    expect(shown).not.toContain("hidden");
    const hidden = renderToStaticMarkup(<TabPanel id="gw" value="upi" selected={false}>content</TabPanel>);
    expect(hidden).toContain("hidden");
  });
});

describe("SegmentedControl", () => {
  const options = [
    { value: "collect", label: "Collect request" },
    { value: "intent", label: "UPI app" },
  ];

  it("renders a labelled radiogroup with one checked, one tab stop, in a recessed track", () => {
    const html = renderToStaticMarkup(<SegmentedControl ariaLabel="UPI mode" options={options} value="intent" onChange={() => {}} />);
    expect(html).toMatch(/^<div role="radiogroup" aria-label="UPI mode"/);
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    const radios = tagAttrs(html, "button");
    expect(radios.filter((attrs) => attrs["aria-checked"] === "true" && attrs.tabindex === "0")).toHaveLength(1);
    expect(radios.filter((attrs) => attrs["aria-checked"] === "false" && attrs.tabindex === "-1")).toHaveLength(1);
    expect(html).toMatch(/aria-checked="true"[^>]*>(?:(?!<\/button>).)*UPI app/);
    expect(html).toContain("bg-surface-2");
    expect(html).toContain("min-h-11");
    expect(html).toContain("text-sm");
  });

  it("passes className through to the radiogroup", () => {
    const html = renderToStaticMarkup(<SegmentedControl ariaLabel="UPI mode" options={options} value="intent" onChange={() => {}} className="w-full" />);
    expect(tagAttrs(html, "div")[0].class).toContain("w-full");
  });
});
