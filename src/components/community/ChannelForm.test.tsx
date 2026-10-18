// ChannelForm: the structure is checked on server-rendered markup. The reset listener is state plus an effect, and the
// repo has no DOM runner, so (as CouponForm.interactions.test.tsx does) hooks are a tiny synchronous store for the
// second group. WHAT THAT CANNOT PROVE: that React 19 really fires `reset` on the form after an action, or that the
// browser repaints the select; those need a real DOM.
import { readFileSync } from "node:fs";
import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const H = vi.hoisted(() => ({
  on: false,
  slots: [] as unknown[],
  i: 0,
  ctx: undefined as unknown,
  form: null as unknown,
  closest: [] as string[],
  /** The ref object the last render got from useRef, so a test can check it is the one attached to the DOM. */
  ref: null as unknown,
  /** What the effect last returned (its cleanup) and the dependency list it was given. */
  cleanup: undefined as unknown,
  deps: undefined as unknown,
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = (init: unknown) => {
    if (!H.on) return actual.useState(init as never);
    const idx = H.i++;
    if (!(idx in H.slots)) H.slots[idx] = init;
    return [H.slots[idx], (v: unknown) => { H.slots[idx] = v; }];
  };
  const useContext = (c: never) => (H.on ? H.ctx : actual.useContext(c));
  const useRef = (init: unknown) => {
    if (!H.on) return actual.useRef(init as never);
    H.ref = { current: { closest: (selector: string) => { (H.closest as string[]).push(selector); return H.form; } } };
    return H.ref;
  };
  const useEffect = (fn: () => void | (() => void), deps?: unknown[]) => {
    if (!H.on) return actual.useEffect(fn, deps);
    H.deps = deps;
    H.cleanup = fn();
  };
  const useId = () => (H.on ? ":r0:" : actual.useId());
  return { ...actual, default: { ...actual, useState, useContext, useRef, useEffect, useId }, useState, useContext, useRef, useEffect, useId };
});

import { legacyStyleFindings } from "@/test/style-scan";
import { classTokens, text } from "@/test/community-fixtures";
import { ActionForm, FormError, SavedNote, SubmitButton } from "@/components/form";
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
  H.closest = [];
  H.ref = null;
  H.cleanup = undefined;
  H.deps = undefined;
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

  it("names the product list with a legend, as the fieldset's first child", () => {
    expect(html).toMatch(/<fieldset\b[^>]*><legend\b[^>]*>Products that unlock this channel<\/legend>/);
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

describe("ChannelForm: plumbing (hook store: ChannelForm() is called as a plain function)", () => {
  type Node = { type: unknown; props: { children?: unknown; [k: string]: unknown } };
  const tree = () => ChannelForm({ action, channel: open, products, submitLabel: "Save channel" }) as unknown as Node;
  const flat = (n: unknown, out: Node[] = []): Node[] => {
    if (Array.isArray(n)) n.forEach((c) => flat(c, out));
    else if (isValidElement(n)) {
      out.push(n as unknown as Node);
      flat((n.props as { children?: unknown }).children, out);
    }
    return out;
  };

  it("forwards the action to ActionForm, which wraps the fields, the error line, the submit and the saved note", () => {
    const root = tree();
    expect(root.type).toBe(ActionForm);
    expect(root.props.action).toBe(action);
    const types = flat(root.props.children).map((n) => n.type);
    expect(types).toContain(FormError);
    expect(types).toContain(SavedNote);
    expect(types).toContain(SubmitButton);
  });

  it("shows 'Saving…' while pending, and the submit label otherwise", () => {
    const submit = flat(tree().props.children).find((n) => n.type === SubmitButton)!;
    expect(submit.props.pendingText).toBe("Saving…");
    expect(submit.props.children).toBe("Save channel");
  });

  it("puts the error line before the submit row and the saved note beside the submit button", () => {
    const kids = tree().props.children as Node[];
    expect(kids.map((k) => k.type)).toEqual([kids[0].type, FormError, "div"]);
    expect((kids[2].props.children as Node[]).map((k) => k.type)).toEqual([SubmitButton, SavedNote]);
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

  /** A form stand-in that records each listener by the event NAME it was added or removed under. */
  function recordingForm() {
    const added: Array<[string, () => void]> = [];
    const removed: Array<[string, () => void]> = [];
    H.form = {
      addEventListener: (type: string, fn: () => void) => added.push([type, fn]),
      removeEventListener: (type: string, fn: () => void) => removed.push([type, fn]),
    } as never;
    return { added, removed };
  }

  it("registers a reset listener on the enclosing form, and a reset puts the access back to the channel's own value", () => {
    const { added } = recordingForm();
    const first = fields();
    expect(added.map(([type]) => type)).toEqual(["reset"]);
    accessSelect(first).props.onChange("product_gated");
    expect(hasFieldset(fields())).toBe(true);
    added[0][1]();
    expect(hasFieldset(fields())).toBe(false);
  });

  it("only a 'reset' event drops the pick; the listener is not registered under any other name", () => {
    const { added } = recordingForm();
    fields();
    expect(added.filter(([type]) => type !== "reset")).toEqual([]);
  });

  it("removes the very same listener, under the same event name, on cleanup", () => {
    const { added, removed } = recordingForm();
    fields();
    expect(typeof H.cleanup).toBe("function");
    expect(removed).toEqual([]);
    (H.cleanup as () => void)();
    expect(removed).toEqual([["reset", added[0][1]]]);
  });

  it("looks the form up with closest('form') from the ref'd element, and attaches that ref to the fields' wrapper", () => {
    recordingForm();
    const out = fields() as { props: { ref?: unknown } };
    expect(H.closest).toEqual(["form"]);
    expect(out.props.ref).toBe(H.ref);
  });

  it("runs the effect once (empty deps) rather than on every render", () => {
    recordingForm();
    fields();
    expect(H.deps).toEqual([]);
  });

  it("with no enclosing form it registers nothing and has nothing to clean up", () => {
    H.form = null;
    expect(() => fields()).not.toThrow();
    expect(H.cleanup).toBeUndefined();
  });
});
