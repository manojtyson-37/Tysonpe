import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MobileMenu, MobileMenuView, menuPanelId } from "./MobileMenu";
import { SiteNavView } from "./SiteNavView";
import { siteNavLinks, type SiteNavUser } from "./site-nav-links";
import * as dialogModule from "./ui/dialog";
import * as overlay from "./ui/overlay";

/** Attributes of every `<tag ...>` in the markup, so assertions do not depend on attribute order. */
function tagAttrs(html: string, tag: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${tag}\\s([^>]*)>`, "g"))].map((match) =>
    Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attr) => [attr[1], attr[2]])),
  );
}

const noop = () => {};
const STATES: [string, SiteNavUser][] = [
  ["logged out", null],
  ["logged in, no creator profile", { creator: null }],
  ["logged in creator", { creator: {} }],
];

function panel(user: SiteNavUser, open = true) {
  const items = siteNavLinks({ user, storefrontHandle: "demo" });
  return renderToStaticMarkup(
    <MobileMenuView panelId="p1" titleId="t1" open={open} items={items} logoutAction={noop} onClose={noop} />,
  );
}

describe("menuPanelId", () => {
  it("derives a stable panel id from the useId value", () => {
    expect(menuPanelId("abc")).toBe("abc-panel");
  });
});

describe("MobileMenu trigger (closed state, as rendered on the server)", () => {
  const items = siteNavLinks({ user: null, storefrontHandle: "demo" });
  const html = renderToStaticMarkup(<MobileMenu items={items} logoutAction={noop} />);
  const [button] = tagAttrs(html, "button");

  it("is a named button that is collapsed and points at the panel", () => {
    expect(tagAttrs(html, "button")).toHaveLength(1);
    expect(button.type).toBe("button");
    expect(button["aria-label"]).toBe("Menu");
    expect(button["aria-expanded"]).toBe("false");
    expect(button["aria-haspopup"]).toBe("dialog");
    expect(button["aria-controls"]).toMatch(/-panel$/);
  });

  it("is hidden from md up, where the desktop links take over", () => {
    expect(button.class).toContain("md:hidden");
  });

  it("uses the shared menu glyph, not a text character", () => {
    expect(html).toMatch(/<svg /);
    expect(html).not.toMatch(/[☰✕≡]/);
  });

  it("mounts no panel on the server: it lives in a portal, opened on the client only", () => {
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("<a ");
  });
});

describe("MobileMenuView panel", () => {
  it("is a modal dialog labelled by its title, with the id the trigger controls", () => {
    const html = panel(null);
    const [dialog] = tagAttrs(html, "div").filter((a) => a.role === "dialog");
    expect(dialog.id).toBe("p1");
    expect(dialog["aria-modal"]).toBe("true");
    expect(dialog["aria-labelledby"]).toBe("t1");
    expect(html).toMatch(/<h2 id="t1"[^>]*>Menu<\/h2>/);
  });

  it("ties to the trigger: the trigger's aria-controls is the panel id", () => {
    const trigger = renderToStaticMarkup(<MobileMenu items={[]} logoutAction={noop} />);
    const controls = tagAttrs(trigger, "button")[0]["aria-controls"];
    const html = renderToStaticMarkup(
      <MobileMenuView panelId={controls} titleId="t" open items={[]} logoutAction={noop} onClose={noop} />,
    );
    expect(html).toContain(`id="${controls}"`);
  });

  it("has a close button with an accessible name and the shared close glyph", () => {
    const html = panel(null);
    const close = tagAttrs(html, "button").find((a) => a["aria-label"] === "Close menu");
    expect(close).toBeDefined();
    expect(close?.type).toBe("button");
    expect(html).not.toMatch(/[☰✕≡]/);
  });

  it("when open is interactive; when closed it is inert and takes no pointer events", () => {
    const open = panel(null, true);
    const closed = panel(null, false);
    expect(open).not.toContain("inert");
    expect(open).not.toContain("pointer-events-none");
    expect(closed).toContain('inert=""');
    expect(closed).toContain("pointer-events-none");
    expect(closed).toContain("invisible");
    expect(open).not.toContain("invisible");
  });

  it("slides on transform only: open uses the sheet duration and ease, closed the shorter exit", () => {
    const open = panel(null, true);
    const closed = panel(null, false);
    const [openPanel] = tagAttrs(open, "div").filter((a) => a.role === "dialog");
    const [closedPanel] = tagAttrs(closed, "div").filter((a) => a.role === "dialog");
    expect(openPanel.class).toContain("translate-x-0");
    expect(openPanel.class).toContain("duration-(--dur-sheet)");
    expect(openPanel.class).toContain("ease-(--ease-sheet)");
    expect(closedPanel.class).toContain("translate-x-full");
    expect(closedPanel.class).toContain("duration-(--dur-exit)");
    for (const html of [open, closed]) {
      expect(html).not.toMatch(/transition-all|backdrop-blur|gradient/);
      expect(html).not.toMatch(/rounded-\[/);
    }
  });

  it("has a flat ink backdrop that is hidden from assistive tech", () => {
    const [backdrop] = tagAttrs(panel(null), "div").filter((a) => "data-menu-backdrop" in a);
    expect(backdrop.class).toContain("bg-ink/40");
    expect(backdrop["aria-hidden"]).toBe("true");
  });

  it("is a navigation landmark and is hidden from md up", () => {
    const html = panel(null);
    expect(html).toMatch(/<nav [^>]*aria-label="Mobile"/);
    const [root] = tagAttrs(html, "div").filter((a) => "data-menu-root" in a);
    expect(root.class).toContain("md:hidden");
  });

  it("logged out: lists the public links and Log in, with the ink Start selling action", () => {
    const html = panel(null);
    const hrefs = tagAttrs(html, "a").map((a) => a.href);
    expect(hrefs).toEqual(["/#sandbox-demo", "/#pricing", "/c/demo", "/login", "/signup?role=creator"]);
    expect(html).toContain("Log in");
    expect(html).toMatch(/<a [^>]*class="[^"]*btn-primary[^"]*"[^>]*>Start selling<\/a>/);
    expect(html).not.toContain("Log out");
  });

  it("logged in creator: library, Dashboard action and a real logout form", () => {
    const html = panel({ creator: {} });
    const hrefs = tagAttrs(html, "a").map((a) => a.href);
    expect(hrefs).toEqual(["/#sandbox-demo", "/#pricing", "/c/demo", "/library", "/dashboard"]);
    expect(html).toMatch(/<a [^>]*class="[^"]*btn-primary[^"]*"[^>]*>Dashboard<\/a>/);
    expect(tagAttrs(html, "form")).toHaveLength(1);
    expect(html).toMatch(/<button [^>]*type="submit"[^>]*>Log out<\/button>/);
  });

  it("logged in without a creator profile: the action goes to onboarding", () => {
    const hrefs = tagAttrs(panel({ creator: null }), "a").map((a) => a.href);
    expect(hrefs).toContain("/dashboard/onboarding");
    expect(hrefs).not.toContain("/dashboard");
  });

  it("clicking any link closes the sheet (links carry no target and keep client navigation)", () => {
    for (const a of tagAttrs(panel(null), "a")) expect(a.target).toBeUndefined();
  });
});

describe("no nav item is hidden without a mobile equivalent", () => {
  it.each(STATES)("%s: every desktop link and the logout form reappear in the sheet", (_name, user) => {
    const items = siteNavLinks({ user, storefrontHandle: "demo" });
    const desktop = renderToStaticMarkup(<SiteNavView items={items} logoutAction={noop} />);
    const mobile = panel(user);

    const desktopHrefs = tagAttrs(desktop, "a").map((a) => a.href).filter((h) => h !== "/");
    expect(desktopHrefs.length).toBeGreaterThan(0);
    for (const href of desktopHrefs) expect(tagAttrs(mobile, "a").map((a) => a.href), href).toContain(href);

    for (const item of items) expect(mobile, item.label).toContain(`>${item.label}<`);
    expect(tagAttrs(mobile, "form")).toHaveLength(tagAttrs(desktop, "form").length);
  });
});

describe("overlay helpers shared with Dialog", () => {
  it("Dialog re-exports the same functions, so one scroll-lock registry serves both overlays", () => {
    expect(dialogModule.lockBodyScroll).toBe(overlay.lockBodyScroll);
    expect(dialogModule.nextFocusIndex).toBe(overlay.nextFocusIndex);
    expect(dialogModule.dialogFocusStep).toBe(overlay.dialogFocusStep);
  });

  it("a sheet and a dialog stacking scroll locks release only when the last lets go", () => {
    const body = { style: { overflow: "", paddingRight: "" } };
    const a = overlay.lockBodyScroll(body, 15);
    const b = overlay.lockBodyScroll(body, 15);
    expect(body.style.overflow).toBe("hidden");
    a();
    expect(body.style.overflow).toBe("hidden");
    b();
    expect(body.style.overflow).toBe("");
    expect(body.style.paddingRight).toBe("");
  });
});
