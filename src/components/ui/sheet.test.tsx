import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DESKTOP_QUERY, Sheet, SheetView, sheetPanelId } from "./sheet";
import * as overlay from "./overlay";

function tagAttrs(html: string, tag: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${tag}\\s((?:"[^"]*"|'[^']*'|[^>"'])*)>`, "g"))].map((match) =>
    Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attr) => [attr[1], attr[2]])),
  );
}

const view = (props: Partial<Parameters<typeof SheetView>[0]> = {}) =>
  renderToStaticMarkup(
    <SheetView panelId="p1" titleId="t1" title="Menu" closeLabel="Close menu" open onClose={() => {}} {...props}>
      <a href="/x">Inside</a>
    </SheetView>,
  );
const dialogOf = (html: string) => tagAttrs(html, "div").find((a) => a.role === "dialog")!;

describe("sheetPanelId", () => {
  it("derives a stable panel id from the useId value", () => {
    expect(sheetPanelId("abc")).toBe("abc-panel");
  });
});

describe("SheetView", () => {
  it("is a modal dialog labelled by its title, and renders its children under the title bar", () => {
    const html = view();
    const dialog = dialogOf(html);
    expect(dialog.id).toBe("p1");
    expect(dialog["aria-modal"]).toBe("true");
    expect(dialog["aria-labelledby"]).toBe("t1");
    expect(html).toMatch(/<h2 id="t1"[^>]*>Menu<\/h2>/);
    expect(html.indexOf("<h2")).toBeLessThan(html.indexOf('href="/x"'));
  });

  it("names the close button from closeLabel", () => {
    const close = tagAttrs(view({ closeLabel: "Close dashboard menu" }), "button");
    expect(close.map((b) => b["aria-label"])).toEqual(["Close dashboard menu"]);
  });

  it("right side slides from the right edge, left side from the left, each with its hairline on the inner edge", () => {
    const right = dialogOf(view({ side: "right", open: false }));
    expect(right.class).toContain("right-0");
    expect(right.class).toContain("border-l");
    expect(right.class).toContain("translate-x-full");
    expect(right.class).not.toMatch(/(^|\s)-translate-x-full/);

    const left = dialogOf(view({ side: "left", open: false }));
    expect(left.class).toContain("left-0");
    expect(left.class).toContain("border-r");
    expect(left.class).toContain("-translate-x-full");
    expect(left.class).not.toContain("right-0");
  });

  it("defaults to the right edge", () => {
    expect(dialogOf(view()).class).toContain("right-0");
  });

  it("open: interactive and on the sheet curve; closed: inert, invisible, no pointer events, on the shorter exit", () => {
    const open = view({ open: true });
    const closed = view({ open: false });
    expect(open).not.toContain("inert");
    expect(open).not.toContain("invisible");
    expect(dialogOf(open).class).toContain("translate-x-0");
    expect(dialogOf(open).class).toContain("duration-(--dur-sheet)");
    expect(dialogOf(open).class).toContain("ease-(--ease-sheet)");
    expect(closed).toContain('inert=""');
    expect(closed).toContain("pointer-events-none");
    expect(closed).toContain("invisible");
    expect(dialogOf(closed).class).toContain("duration-(--dur-exit)");
  });

  it.each(["left", "right"] as const)("%s: transform and opacity only, tokens only, no blur or gradient or arbitrary radius", (side) => {
    for (const open of [true, false]) {
      const html = view({ side, open });
      expect(html).not.toMatch(/transition-all|backdrop-blur|gradient|rounded-\[|rounded-xl/);
      expect(html).toMatch(/transition-transform/);
      expect(html).toMatch(/transition-opacity/);
    }
  });

  it("is hidden from lg up and has an aria-hidden ink backdrop", () => {
    const html = view();
    const root = tagAttrs(html, "div").find((a) => "data-sheet-root" in a)!;
    const backdrop = tagAttrs(html, "div").find((a) => "data-sheet-backdrop" in a)!;
    expect(root.class).toContain("lg:hidden");
    expect(backdrop.class).toContain("bg-ink/40");
    expect(backdrop["aria-hidden"]).toBe("true");
  });

  it("keeps the close button at a 44px floor on coarse pointers in its border box", () => {
    const [close] = tagAttrs(view(), "button");
    expect(close.class).toContain("pointer-coarse:min-h-11");
    expect(close.class).toContain("pointer-coarse:min-w-11");
  });
});

describe("Sheet trigger (closed, as rendered on the server)", () => {
  const html = renderToStaticMarkup(
    <Sheet title="Menu" closeLabel="Close menu" triggerLabel="Open it" triggerIcon={<svg data-glyph="" />} triggerClassName="-ml-2" side="left">
      {() => <a href="/never">Never on the server</a>}
    </Sheet>,
  );
  const [button] = tagAttrs(html, "button");

  it("is one named, collapsed button that points at the panel", () => {
    expect(tagAttrs(html, "button")).toHaveLength(1);
    expect(button.type).toBe("button");
    expect(button["aria-label"]).toBe("Open it");
    expect(button["aria-expanded"]).toBe("false");
    expect(button["aria-haspopup"]).toBe("dialog");
    expect(button["aria-controls"]).toMatch(/-panel$/);
    expect(html).toContain("data-glyph");
  });

  it("is hidden from lg up, keeps the caller's margin and a 44px coarse-pointer floor", () => {
    expect(button.class).toContain("lg:hidden");
    expect(button.class).toContain("-ml-2");
    expect(button.class).toContain("pointer-coarse:min-h-11");
    expect(button.class).toContain("pointer-coarse:min-w-11");
  });

  it("mounts no panel and renders no body on the server: the sheet is portalled on the client", () => {
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("/never");
  });
});

describe("desktop/mobile switch", () => {
  // Tailwind's `lg` is 64rem by default; the test fails if the theme ever overrides it, because then the media query
  // would no longer be the same width as the `lg:` utilities every nav and sheet uses.
  const LG_PX = 64 * 16;

  it("DESKTOP_QUERY is the lg breakpoint, so a sheet closes exactly when the desktop navigation appears", () => {
    expect(readFileSync("src/app/globals.css", "utf8")).not.toMatch(/--breakpoint-/);
    expect(DESKTOP_QUERY).toBe(`(min-width: ${LG_PX}px)`);
  });

  it("the sheet root and its trigger switch at lg and never at md", () => {
    const markup =
      view() +
      renderToStaticMarkup(
        <Sheet title="T" closeLabel="C" triggerLabel="L" triggerIcon={null}>
          {() => null}
        </Sheet>,
      );
    expect(markup.match(/\blg:hidden\b/g)).toHaveLength(2);
    expect(markup).not.toMatch(/\bmd:/);
  });
});

describe("one overlay implementation", () => {
  it("the sheet takes its trap and escape decisions and its scroll lock from overlay.ts, not a private copy", () => {
    const source = readFileSync("src/components/ui/sheet.tsx", "utf8");
    for (const name of ["lockBodyScroll", "tabAtEdge", "overlayKey", "nextFocusIndex", "dialogFocusStep", "focusableWithin"]) {
      expect(source, name).toMatch(new RegExp(`\\b${name}\\(`));
      expect(Object.keys(overlay)).toContain(name);
    }
    expect(source).not.toMatch(/body\.style\.overflow|\.defaultPrevented|isComposing/);
    expect(source).toMatch(/matchMedia\(DESKTOP_QUERY\)/);
  });

  it("the sheet and the dialog register in the one shared overlay stack and let overlayKey decide who handles a key", () => {
    for (const file of ["sheet", "dialog"]) {
      const source = readFileSync(`src/components/ui/${file}.tsx`, "utf8");
      expect(source, file).toMatch(/registerOverlay\(/);
      // the handler's decision comes from the shared stack, not from a local flag or a private list
      expect(source, file).toMatch(/overlayKey\(isActiveOverlay\(\w+\), event\)/);
      expect(source, file).not.toMatch(/let openDialogs|const openDialogs|\.defaultPrevented|isComposing/);
    }
  });

  it("the sheet's keydown handler decides first, and returns before doing anything when it is not on top", () => {
    const source = readFileSync("src/components/ui/sheet.tsx", "utf8");
    const start = source.indexOf("const onKeyDown");
    const end = source.indexOf('document.addEventListener("keydown"');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const handler = source.slice(start, end);
    const decision = handler.indexOf("overlayKey(isActiveOverlay(uid), event)");
    const bail = handler.indexOf('if (intent === "ignore") return;');
    expect(decision).toBeGreaterThan(-1);
    expect(bail).toBeGreaterThan(decision);
    // nothing with a side effect runs before the bail
    expect(handler.slice(0, bail)).not.toMatch(/preventDefault|setOpen|\.focus\(/);
    expect(handler.slice(bail)).toMatch(/preventDefault/);
  });

  it("focus returns from the layout-effect body, never from a cleanup", () => {
    const source = readFileSync("src/components/ui/sheet.tsx", "utf8");
    const layoutEffect = source.slice(source.indexOf("useLayoutEffect(() =>"));
    expect(layoutEffect).toMatch(/dialogFocusStep\(wasOpenRef\.current, open\)/);
    expect(layoutEffect).toMatch(/triggerRef\.current\?\.focus/);
    // the effect that locks scroll and listens for keys has a cleanup, and it must not focus anything
    const mainEffect = source.slice(source.indexOf("useEffect(() =>"), source.indexOf("useLayoutEffect(() =>"));
    const cleanup = mainEffect.slice(mainEffect.indexOf("return () =>"));
    expect(cleanup).not.toMatch(/\.focus\(/);
  });
});
