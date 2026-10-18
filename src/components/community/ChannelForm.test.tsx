// ChannelForm: the structure is checked on server-rendered markup. The reset listener is state plus an effect, and the
// repo has no DOM runner, so (as CouponForm.interactions.test.tsx does) hooks are a tiny synchronous store for the
// second group. WHAT THAT CANNOT PROVE: that React 19 really fires `reset` on the form after an action, or that the
// browser repaints the select; those need a real DOM.
import { readFileSync } from "node:fs";
import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const H = vi.hoisted(() => ({ on: false, slots: [] as unknown[], i: 0, ctx: undefined as unknown, form: null as unknown }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = (init: unknown) => {
    if (!H.on) return actual.useState(init as never);
    const idx = H.i++;
    if (!(idx in H.slots)) H.slots[idx] = init;
    return [H.slots[idx], (v: unknown) => { H.slots[idx] = v; }];
  };
  const useContext = (c: never) => (H.on ? H.ctx : actual.useContext(c));
  const useRef = (init: unknown) => (H.on ? { current: { closest: () => H.form } } : actual.useRef(init as never));
  const useEffect = (fn: () => void | (() => void), deps?: unknown[]) => (H.on ? void fn() : actual.useEffect(fn, deps));
  const useId = () => (H.on ? ":r0:" : actual.useId());
  return { ...actual, default: { ...actual, useState, useContext, useRef, useEffect, useId }, useState, useContext, useRef, useEffect, useId };
});

import { legacyStyleFindings } from "@/test/style-scan";
import { classTokens, text } from "@/test/community-fixtures";
import { ChannelForm } from "./ChannelForm";

const SOURCE = readFileSync(new URL("./ChannelForm.tsx", import.meta.url), "utf8");
const action = async () => undefined;
const products = [
  { id: "pr_1", title: "Masterclass" },
  { id: "pr_2", title: "Cohort 2" },
];
const gated = { name: "VIP", description: "Buyers only.", kind: "discussion", access: "product_gated", productIds: ["pr_2"] };
const open = { name: "General", description: "Say hello.", kind: "discussion", access: "open", productIds: [] };
const input = (html: string, name: string) => new RegExp(`<(?:input|select|textarea)\\b[^>]*name="${name}"[^>]*>`).exec(html)![0];

beforeEach(() => {
  H.on = false;
  H.slots = [];
  H.i = 0;
  H.ctx = undefined;
  H.form = null;
});

describe("ChannelForm: fields", () => {
  const html = renderToStaticMarkup(<ChannelForm action={action} channel={gated} products={products} submitLabel="Save channel" />);

  it("posts name, description, kind and access, prefilled from the channel, each with a label", () => {
    expect(input(html, "name")).toContain('value="VIP"');
    expect(input(html, "name")).toContain("required");
    expect(input(html, "description")).toContain('value="Buyers only."');
    expect(html).toMatch(/<select\b[^>]*name="kind"/);
    expect(html).toMatch(/<select\b[^>]*name="access"/);
    expect(html).toMatch(/<option value="product_gated" selected="">/);
    for (const label of ["Channel name", "Description", "Type", "Who can join"]) expect(html).toContain(`>${label}</label>`);
    expect(text(html)).toContain("One line, shown above the feed.");
  });

  it("an empty form defaults to a discussion open to all paying customers, with no product list", () => {
    const fresh = renderToStaticMarkup(<ChannelForm action={action} products={products} submitLabel="Create channel" />);
    expect(fresh).toMatch(/<option value="discussion" selected="">/);
    expect(fresh).toMatch(/<option value="open" selected="">/);
    expect(fresh).not.toContain("<fieldset");
    expect(fresh).not.toContain('name="productIds"');
  });

  it("lists one real Checkbox per product, named productIds, ticking the linked ones", () => {
    const boxes = [...html.matchAll(/<input\b[^>]*type="checkbox"[^>]*>/g)].map((m) => m[0]);
    expect(boxes).toHaveLength(2);
    expect(boxes.every((b) => b.includes('name="productIds"'))).toBe(true);
    expect(boxes.map((b) => /value="([^"]*)"/.exec(b)![1])).toEqual(["pr_1", "pr_2"]);
    expect(boxes.map((b) => b.includes('checked=""'))).toEqual([false, true]);
    expect(text(html)).toContain("Masterclass");
    expect(text(html)).toContain("Cohort 2");
  });

  it("each checkbox row is the form Checkbox primitive: a labelled 44px hit area, not a bare 16px input", () => {
    const tokens = classTokens(html);
    expect(tokens).toContain("pointer-coarse:py-3");
    expect(tokens).toContain("size-5");
    expect(tokens).not.toContain("size-4");
    expect(html).not.toContain("accent-[color:var(--brand-text,#16130f)]");
    expect(html).toMatch(/<label for="[^"]+" class="flex cursor-pointer[^"]*"><input\b[^>]*type="checkbox"/);
  });

  it("wraps a long product title instead of pushing the row wider", () => {
    expect(html).toMatch(/wrap-anywhere/);
    expect(html).toMatch(/<fieldset class="[^"]*\bmin-w-0\b/);
  });

  it("keeps the 'only you can see this channel' hint, and says so when there are no products", () => {
    expect(text(html)).toContain("With none ticked, only you can see this channel.");
    const none = renderToStaticMarkup(<ChannelForm action={action} channel={gated} products={[]} submitLabel="Save" />);
    expect(text(none)).toContain("Create a product first.");
  });

  it("the fieldset has the card radius token, not rounded-xl", () => {
    expect(html).toMatch(/<fieldset class="[^"]*\brounded-card\b/);
    expect(html).not.toContain("rounded-xl");
  });
});

describe("ChannelForm: submit", () => {
  const html = renderToStaticMarkup(<ChannelForm action={action} channel={open} products={products} submitLabel="Save channel" />);
  const submit = /<button\b[^>]*type="submit"[^>]*>/.exec(html)![0];

  it("is the small primary Button primitive with a 44px touch floor, labelled by submitLabel", () => {
    expect(submit).toMatch(/class="btn btn-primary btn-sm[^"]*pointer-coarse:min-h-11[^"]*"/);
    expect(html).toContain(">Save channel</button>");
    expect(classTokens(html)).not.toContain("min-h-10");
  });

  it("sets variant and size through props, not a legacy btn string", () => {
    expect(SOURCE).toMatch(/<SubmitButton\b[^>]*variant="primary"/);
    expect(SOURCE).toMatch(/<SubmitButton\b[^>]*size="sm"/);
    expect(SOURCE).not.toMatch(/className="btn /);
  });
});

describe("ChannelForm: source", () => {
  it("passes the style scan (no !, rounded-xl, glyph, .btn/.card/.badge string, title=)", () => {
    expect(legacyStyleFindings(SOURCE)).toEqual([]);
  });
  it("has no raw checkbox input", () => {
    expect(SOURCE).not.toContain('type="checkbox"');
  });
});

describe("ChannelForm: the product list follows the select, and the form reset drops a stale pick", () => {
  /** Runs the private Fields component under the hook store. Returns its output. */
  function fields(channel: typeof open | undefined = open): ReactNode {
    H.on = true;
    H.i = 0;
    const form = ChannelForm({ action, channel, products, submitLabel: "Save" }) as { props: { children: ReactNode[] } };
    const el = form.props.children[0] as { type: (p: unknown) => ReactNode; props: unknown };
    return el.type(el.props);
  }
  const hasFieldset = (node: ReactNode): boolean => JSON.stringify(node, (_k, v) => (typeof v === "function" ? undefined : v)).includes('"fieldset"');
  const accessSelect = (node: ReactNode) => {
    let found: { props: { onChange: (v: string) => void } } | null = null;
    const go = (n: unknown): void => {
      if (Array.isArray(n)) return n.forEach(go);
      if (!isValidElement(n)) return;
      const p = n.props as { name?: string; children?: unknown; onChange?: unknown };
      if (p.name === "access") found = n as never;
      go(p.children);
    };
    go(node);
    return found!;
  };

  it("an open channel shows no products; picking product_gated reveals the fieldset", () => {
    H.form = { addEventListener: () => undefined, removeEventListener: () => undefined } as never;
    const first = fields();
    expect(hasFieldset(first)).toBe(false);
    accessSelect(first).props.onChange("product_gated");
    expect(hasFieldset(fields())).toBe(true);
  });

  it("registers a reset listener on the enclosing form, and a reset puts the access back to the channel's own value", () => {
    const listeners: Array<() => void> = [];
    H.form = { addEventListener: (_t: string, fn: () => void) => listeners.push(fn), removeEventListener: () => undefined } as never;
    const first = fields();
    expect(listeners).toHaveLength(1);
    accessSelect(first).props.onChange("product_gated");
    expect(hasFieldset(fields())).toBe(true);
    listeners[0]();
    expect(hasFieldset(fields())).toBe(false);
  });
});
