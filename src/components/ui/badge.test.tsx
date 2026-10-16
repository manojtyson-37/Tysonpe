import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Badge, StatusBadge } from "./badge";
import { StatusBadge as StatusBadgeFromUi, dateFmt } from "@/components/ui";

describe("Badge", () => {
  it.each([
    ["neutral", "badge-muted"],
    ["good", "badge-good"],
    ["bad", "badge-bad"],
    ["warn", "badge-warn"],
    ["brand", "badge-brand"],
  ] as const)("tone %s uses %s", (tone, cls) => {
    expect(renderToStaticMarkup(<Badge tone={tone}>x</Badge>)).toBe(
      `<span class="badge ${cls}">x</span>`,
    );
  });

  it("appends a className passthrough after the tone class", () => {
    expect(renderToStaticMarkup(<Badge tone="good" className="ml-2">x</Badge>)).toBe(
      '<span class="badge badge-good ml-2">x</span>',
    );
  });

  it("defaults to neutral with no dot", () => {
    const html = renderToStaticMarkup(<Badge>Draft</Badge>);
    expect(html).toContain("badge-muted");
    expect(html).not.toContain("rounded-full bg-current");
  });

  it("renders an optional decorative dot in the text colour", () => {
    const html = renderToStaticMarkup(<Badge tone="good" dot>Live</Badge>);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("bg-current");
    expect(html.indexOf("bg-current")).toBeLessThan(html.indexOf("Live"));
  });
});

describe("StatusBadge", () => {
  it.each([
    ["created", "Pending", "badge-warn"],
    ["paid", "Paid", "badge-good"],
    ["failed", "Failed", "badge-bad"],
    ["refunded", "Refunded", "badge-bad"],
    ["published", "Published", "badge-good"],
    ["active", "Active", "badge-good"],
    ["draft", "Draft", "badge-muted"],
    ["inactive", "Inactive", "badge-muted"],
  ])("%s shows %s with %s", (status, label, cls) => {
    const html = renderToStaticMarkup(<StatusBadge status={status} />);
    expect(html).toContain(`>${label}<`);
    expect(html).toContain(cls);
  });

  it("falls back to a neutral, sentence-case label for unknown statuses", () => {
    const html = renderToStaticMarkup(<StatusBadge status="on_hold" />);
    expect(html).toContain("badge-muted");
    expect(html).toContain(">On hold<");
  });

  it("is re-exported from ui.tsx with the same implementation", () => {
    expect(StatusBadgeFromUi).toBe(StatusBadge);
  });
});

describe("ui.tsx compatibility", () => {
  it("dateFmt delegates to the IST-pinned formatter", () => {
    // 2026-10-15 20:00 UTC is already 16 Oct in IST.
    expect(dateFmt(new Date("2026-10-15T20:00:00Z"))).toBe("16 Oct 2026");
    expect(dateFmt(null)).toBe("—");
    expect(dateFmt(undefined)).toBe("—");
  });
});
