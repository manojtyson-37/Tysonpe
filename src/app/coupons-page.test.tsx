import { readFileSync } from "node:fs";
import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The creator is cr_1. vi.mock factories are hoisted, so values are written inline there.
const mocks = vi.hoisted(() => {
  /** A stand-in server action whose `.bind` returns a tagged function, so a test can read WHICH action a form got. */
  const action = (name: string) => {
    const fn = (() => undefined) as unknown as { bind: (...a: unknown[]) => unknown };
    fn.bind = (_this: unknown, ...args: unknown[]) => Object.assign(() => undefined, { action: name, args });
    return Object.assign(fn, { action: name });
  };
  return {
    findMany: vi.fn<(a: Record<string, unknown>) => Promise<unknown>>(),
    createCoupon: action("createCoupon"),
    updateCoupon: action("updateCoupon"),
    setCouponActive: action("setCouponActive"),
    deleteCoupon: action("deleteCoupon"),
  };
});

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/coupons" }));
vi.mock("@/lib/auth/session", () => ({ requireCreator: async () => ({ user: {}, creator: { id: "cr_1" } }) }));
vi.mock("@/lib/db", () => ({ db: { coupon: { findMany: mocks.findMany } } }));
vi.mock("@/lib/time", () => ({ nowMs: () => Date.parse("2026-10-18T06:00:00Z") }));
vi.mock("@/app/actions/creator", () => ({
  createCoupon: mocks.createCoupon,
  updateCoupon: mocks.updateCoupon,
  setCouponActive: mocks.setCouponActive,
  deleteCoupon: mocks.deleteCoupon,
}));

import { ConfirmButton } from "@/components/ConfirmButton";
import { CouponForm } from "@/components/CouponForm";
import { Badge, Button, ButtonLink, Money } from "@/components/ui";
import { COUPON_STATUS_BADGE } from "@/lib/coupon";
import { formatINR } from "@/lib/format";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import CouponsPage from "./dashboard/(console)/coupons/page";

const PAGE_PATH = new URL("./dashboard/(console)/coupons/page.tsx", import.meta.url);
const BOUNDARIES: unknown[] = [ConfirmButton, CouponForm];

const coupon = (over: Record<string, unknown> = {}) => ({
  id: "c_1",
  code: "DIWALI20",
  percentOff: 20 as number | null,
  flatOffPaise: null as number | null,
  maxRedemptions: 50 as number | null,
  redeemed: 3,
  expiresAt: new Date("2026-12-31T18:29:59Z") as Date | null,
  active: true,
  ...over,
});

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.findMany.mockResolvedValue([coupon()]);
});

const call = async () => (await (CouponsPage as () => Promise<ReactNode>)()) as ReactNode;
const render = async () => renderToStaticMarkup(<>{await call()}</>);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const summaries = (html: string) => [...html.matchAll(/<summary\b[^>]*>(.*?)<\/summary>/g)].map((m) => m[0]);

type El = { type: unknown; props: Record<string, any>; ancestors: Array<{ type: unknown; props: Record<string, any> }> }; // eslint-disable-line @typescript-eslint/no-explicit-any
function elements(node: ReactNode): El[] {
  const out: El[] = [];
  const go = (n: unknown, ancestors: El["ancestors"]): void => {
    if (Array.isArray(n)) return n.forEach((c) => go(c, ancestors));
    if (!isValidElement(n)) return;
    const props = n.props as El["props"];
    out.push({ type: n.type, props, ancestors });
    const next = [...ancestors, { type: n.type, props }];
    if (typeof n.type === "function" && !BOUNDARIES.includes(n.type)) go((n.type as (p: unknown) => unknown)(props), next);
    else go(props.children, next);
  };
  go(node, []);
  return out;
}
const boundAction = (e: El) => {
  const form = [...e.ancestors].reverse().find((a) => a.type === "form")!;
  return form.props.action as { action: string; args: unknown[] };
};

describe("coupons: list structure", () => {
  it("is a ruled list of <details>, with no .card per coupon and no .card empty box", async () => {
    const html = await render();
    expect(html).toMatch(/<ul class="divide-y divide-line[^"]*" aria-label="Coupons"><li><details class="group">/);
    const tokens = [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    expect(tokens).not.toContain("card");
    expect(html).not.toContain("rounded-xl");
    mocks.findMany.mockResolvedValue([]);
    const empty = await render();
    expect([...empty.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/))).not.toContain("card");
  });

  it("makes each summary a 44px touch target holding the code chip, discount, usage and status", async () => {
    const [s] = summaries(await render());
    expect(s).toMatch(/<summary class="[^"]*\bmin-h-11\b[^"]*\bcursor-pointer\b/);
    expect(s).toMatch(/<code class="[^"]*rounded-control[^"]*font-mono[^"]*">DIWALI20<\/code>/);
    expect(text(s)).toContain("20% off");
    expect(text(s)).toContain("3 / 50 used · until 31 Dec 2026");
    expect(text(s)).toContain("Active");
  });

  it("hides the native disclosure marker and shows a chevron that turns when open", async () => {
    const [s] = summaries(await render());
    expect(s).toContain("list-none");
    expect(s).toContain("[&amp;::-webkit-details-marker]:hidden");
    expect(s).toContain("group-open:rotate-180");
  });

  it("prints a flat discount as money and reads 'no expiry' and an uncapped use count honestly", async () => {
    mocks.findMany.mockResolvedValue([coupon({ percentOff: null, flatOffPaise: 15050, maxRedemptions: null, expiresAt: null, redeemed: 7 })]);
    const t = text(summaries(await render())[0]);
    expect(t).toContain(`${formatINR(15050)} off`);
    expect(t).toContain("7 used · no expiry");
    expect(t).not.toContain("/");
  });

  it("an empty list says so without a card box, pointing at the form by name (layout-neutral: it is a right column from xl up)", async () => {
    mocks.findMany.mockResolvedValue([]);
    const html = await render();
    expect(text(html)).toContain("No coupons yet");
    expect(text(html)).toContain("Create one with the New coupon form. Buyers enter it at checkout.");
    expect(text(html)).not.toMatch(/on the right|form below/);
    expect(html).not.toContain("<details");
  });
});

describe("coupons: status labels", () => {
  const NOW = Date.parse("2026-10-18T06:00:00Z");
  const cases: Array<[string, Record<string, unknown>, string]> = [
    ["active", {}, "Active"],
    ["switched off", { active: false }, "Inactive"],
    ["past its expiry", { expiresAt: new Date(NOW - 1000) }, "Expired"],
    ["at its redemption cap", { maxRedemptions: 3, redeemed: 3 }, "Used up"],
  ];
  it.each(cases)("%s reads %s", async (_name, over, label) => {
    mocks.findMany.mockResolvedValue([coupon(over)]);
    const [s] = summaries(await render());
    expect(s).toMatch(new RegExp(`<span class="badge badge-[a-z]+">${label}</span>`));
    // The old page mapped expired / used up to a "failed" status and lower-cased the words.
    expect(s).not.toMatch(/failed|>expired<|>used up<|>active<|>inactive</);
  });

  it("expired and used up are the warn tone, not good and not muted", async () => {
    mocks.findMany.mockResolvedValue([
      coupon({ id: "c_exp", code: "OLD", expiresAt: new Date(NOW - 1000) }),
      coupon({ id: "c_cap", code: "CAP", maxRedemptions: 3, redeemed: 3 }),
    ]);
    const html = await render();
    expect(html).toContain('badge badge-warn">Expired');
    expect(html).toContain('badge badge-warn">Used up');
    expect(html).not.toMatch(/badge-(good|muted|bad)">(Expired|Used up)/);
    expect(COUPON_STATUS_BADGE.expired.tone).toBe("warn");
    expect(COUPON_STATUS_BADGE["used-up"].tone).toBe("warn");
  });

  it("uses the Badge primitive, with distinct tones for good and for neutral", async () => {
    mocks.findMany.mockResolvedValue([coupon(), coupon({ id: "c_2", active: false })]);
    const html = await render();
    expect(html).toContain('badge badge-good">Active');
    expect(html).toContain('badge badge-muted">Inactive');
    expect(elements(await call()).filter((e) => e.type === Badge)).toHaveLength(2);
  });
});

describe("coupons: panel actions (create, edit, deactivate, delete)", () => {
  it("edit form is the CouponForm bound to updateCoupon with this coupon's id", async () => {
    mocks.findMany.mockResolvedValue([coupon({ id: "c_1" }), coupon({ id: "c_2", code: "B" })]);
    const forms = elements(await call()).filter((e) => e.type === CouponForm && e.props.submitLabel === "Save coupon");
    expect(forms).toHaveLength(2);
    expect(forms.map((f) => { const a = f.props.action as { action: string; args: unknown[] }; return [a.action, a.args]; })).toEqual([
      ["updateCoupon", ["c_1"]],
      ["updateCoupon", ["c_2"]],
    ]);
    expect(forms[0].props.coupon.code).toBe("DIWALI20");
  });

  it("an active coupon offers Deactivate (setCouponActive false), an inactive one Activate (true)", async () => {
    mocks.findMany.mockResolvedValue([coupon({ id: "c_1" }), coupon({ id: "c_2", code: "B", active: false })]);
    const toggles = elements(await call()).filter((e) => e.type === Button);
    expect(toggles.map((t) => [t.props.children, boundAction(t).action, boundAction(t).args])).toEqual([
      ["Deactivate", "setCouponActive", ["c_1", false]],
      ["Activate", "setCouponActive", ["c_2", true]],
    ]);
    for (const t of toggles) {
      expect(t.props.variant).toBe("secondary");
      expect(t.props.size).toBe("sm");
      expect(t.props.className).toContain("pointer-coarse:min-h-11");
    }
    expect(toggles[0].props["aria-label"]).toBe("Deactivate coupon DIWALI20");
  });

  it("Delete is a ConfirmButton in a form bound to deleteCoupon, names the action, and keeps the used-coupons rule", async () => {
    const [c] = elements(await call()).filter((e) => e.type === ConfirmButton);
    expect(boundAction(c)).toEqual(expect.objectContaining({ action: "deleteCoupon", args: ["c_1"] }));
    expect(c.props.confirmLabel).toBe("Delete coupon");
    expect(c.props["aria-label"]).toBe("Delete coupon DIWALI20");
    expect(c.props.message).toBe("Delete this coupon? Coupons already used are deactivated instead.");
    expect(c.props.className).toContain("pointer-coarse:min-h-11");
    expect(c.props.children).toBe("Delete");
  });

  it("New coupon is always reachable: a CouponForm bound to createCoupon, plus a jump link on small screens", async () => {
    mocks.findMany.mockResolvedValue([]);
    const els = elements(await call());
    const create = els.find((e) => e.type === CouponForm && e.props.submitLabel === "Create coupon")!;
    expect(create.props.action).toBe(mocks.createCoupon);
    const html = await render();
    expect(html).toMatch(/<section id="new-coupon" aria-labelledby="new-coupon-h"/);
    expect(html).toMatch(/<h2 id="new-coupon-h"[^>]*>New coupon<\/h2>/);
    const jump = els.find((e) => e.type === ButtonLink)!;
    expect(jump.props.href).toBe("#new-coupon");
    expect(jump.props.className).toContain("xl:hidden");
  });

  it("does not make the form sticky inside a grid item (it does not work there); it stacks on small screens", async () => {
    const html = await render();
    expect(html).toContain("flex flex-col");
    expect(html).toContain("xl:grid-cols-[1fr_380px]");
    expect(html).not.toContain("sticky");
  });
});

describe("coupons: query", () => {
  it("pins the signed-in creator, newest first", async () => {
    await render();
    expect(mocks.findMany.mock.calls[0][0]).toEqual({ where: { creatorId: "cr_1" }, orderBy: { createdAt: "desc" } });
  });
});

describe("coupons: RSC boundary", () => {
  it("passes no function props except bound server actions on forms; ConfirmButton and CouponForm are client boundaries", async () => {
    mocks.findMany.mockResolvedValue([coupon(), coupon({ id: "c_2", active: false, percentOff: null, flatOffPaise: 5000 })]);
    const visited = new Set<unknown>();
    const found = functionProps(await call(), BOUNDARIES, { onVisit: (t) => visited.add(t) });
    // Per coupon: the edit form's `action` (a client boundary prop), then the toggle and delete forms' bound server actions; last, the New coupon form.
    expect(found).toEqual([
      "<CouponForm>.action", "<form>.action", "<form>.action",
      "<CouponForm>.action", "<form>.action", "<form>.action",
      "<CouponForm>.action",
    ]);
    for (const type of [ConfirmButton, CouponForm, Badge, Button, Money]) expect(visited.has(type)).toBe(true);
  });

  it("the empty state is walked too", async () => {
    mocks.findMany.mockResolvedValue([]);
    const visited = new Set<unknown>();
    functionProps(await call(), BOUNDARIES, { onVisit: (t) => visited.add(t) });
    expect(visited.has(CouponForm)).toBe(true);
  });

  it("positive control: the same walk reports a function prop planted in the page tree", async () => {
    const planted = (<>{await call()}<button onClick={() => {}}>x</button></>);
    expect(functionProps(planted, BOUNDARIES)).toContain("<button>.onClick");
  });
});

describe("coupons: source hygiene", () => {
  it("the page source has no legacy classes, ! utilities, glyphs or title tooltips", () => {
    expect(legacyStyleFindings(readFileSync(PAGE_PATH, "utf8"))).toEqual([]);
  });
});
