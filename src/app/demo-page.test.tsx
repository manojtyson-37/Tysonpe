import { readFileSync } from "node:fs";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

type Row = Record<string, unknown>;
const state = vi.hoisted(() => ({
  user: { id: "u1", name: "Asha Rao", preferredGateway: "razorpay" } as Row,
  /** What each successive product.findFirst call returns. */
  products: [] as (Row | null)[],
  enrollment: null as Row | null,
  productArgs: [] as unknown[],
  enrollmentArgs: [] as unknown[],
  log: [] as string[],
  actions: [] as unknown[][],
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  usePathname: () => "/demo",
}));
vi.mock("@/lib/auth/session", () => ({
  requireUser: async (next?: string) => {
    state.log.push(`requireUser:${next}`);
    return state.user;
  },
}));
vi.mock("@/lib/db", () => ({
  db: {
    product: {
      findFirst: async (args: unknown) => {
        state.log.push("product.findFirst");
        state.productArgs.push(args);
        return state.products[state.productArgs.length - 1] ?? null;
      },
    },
    enrollment: {
      findUnique: async (args: unknown) => {
        state.log.push("enrollment.findUnique");
        state.enrollmentArgs.push(args);
        return state.enrollment;
      },
    },
  },
}));
// The actions' own contracts are pinned in actions/*.test.ts; here they only record how the page binds them.
vi.mock("@/app/actions/auth", () => ({
  setPreferredGateway: async (...args: unknown[]) => void state.actions.push(["setPreferredGateway", ...args]),
}));
vi.mock("@/app/actions/checkout", () => ({
  startCheckout: async (...args: unknown[]) => void state.actions.push(["startCheckout", ...args]),
  resetDemoEnrollmentAction: async (...args: unknown[]) => void state.actions.push(["resetDemoEnrollmentAction", ...args]),
}));

import { ActionForm, FormError, RadioCard, SubmitButton } from "@/components/form";
import { GatewayChooser } from "@/components/GatewayChooser";
import { gatewayFormId } from "@/lib/gateway-form";
import { gstComponent } from "@/lib/money";
import { GATEWAYS } from "@/lib/payments/gateways";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import DemoPage, { metadata } from "./(site)/demo/page";

const ROOT = new URL("../", import.meta.url);
const read = (rel: string) => readFileSync(new URL(rel, ROOT), "utf8");
const PAGE = read("app/(site)/demo/page.tsx");
const CHOOSER = read("components/GatewayChooser.tsx");

const product = (over: Row = {}): Row => ({
  id: "p1",
  title: "Intro to bookkeeping",
  type: "course",
  pricePaise: 118000,
  gstRatePct: 18,
  creator: { displayName: "Meera Nair" },
  ...over,
});

beforeEach(() => {
  state.user = { id: "u1", name: "Asha Rao", preferredGateway: "razorpay" };
  state.products = [product()];
  state.enrollment = null;
  state.productArgs = [];
  state.enrollmentArgs = [];
  state.log = [];
  state.actions = [];
});

async function renderTree(): Promise<ReactNode> {
  return DemoPage();
}
async function render(): Promise<string> {
  return renderToStaticMarkup(<>{await renderTree()}</>);
}
const text = (h: string) =>
  h
    .replace(/<script\b[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/** Every element in the (unrendered) tree, in order. */
function elements(node: unknown, out: ReactElement<Row>[] = []): ReactElement<Row>[] {
  if (Array.isArray(node)) node.forEach((n) => elements(n, out));
  else if (isValidElement<Row>(node)) {
    out.push(node);
    elements(node.props.children, out);
  }
  return out;
}
const hostForms = (tree: ReactNode) => elements(tree).filter((e) => e.type === "form");

/** Runs a form's bound action and reports what the mocked server action received. */
async function submit(form: ReactElement<Row>): Promise<unknown[]> {
  state.actions = [];
  // A plain <form action={fn}> calls fn(formData); the bound id comes first.
  await (form.props.action as (...a: unknown[]) => Promise<void>)(new FormData());
  expect(state.actions).toHaveLength(1);
  return state.actions[0].slice(0, -1);
}

describe("demo page: heading and honest copy", () => {
  it("has one h1 \"Gateway playground\" and the h2s in order, with a plain test-mode line", async () => {
    const html = await render();
    expect([...html.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/g)].map((m) => m[1])).toEqual(["Gateway playground"]);
    expect([...html.matchAll(/<h2\b[^>]*>(.*?)<\/h2>/g)].map((m) => m[1])).toEqual(["Choose a gateway", "Buy a product in test mode"]);
    expect(text(html)).toContain("Test mode: no real money moves.");
    expect(metadata.title).toBe("Gateway playground");
  });

  it("makes none of the old claims: signatures, enterprise, friction, authentic flows, buzzwords", async () => {
    for (const enrolled of [false, true]) {
      state.enrollment = enrolled ? { id: "e1" } : null;
      state.productArgs = [];
      const t = text(await render()).toLowerCase();
      for (const banned of [
        "hmac",
        "sha-256",
        "signature",
        "authentic",
        "enterprise",
        "seamless",
        "friction",
        "genuine",
        "immutabl",
        "under the hood",
        "interactive fintech",
        "sandbox",
        "currently active",
        "click to activate",
        "saved cards",
        "qr scanning",
        "303",
      ]) {
        expect(t, banned).not.toContain(banned);
      }
    }
    // positive control: the scan would catch the old copy
    expect("backend computes SHA-256 signatures identical to genuine webhooks".toLowerCase()).toContain("sha-256");
  });

  it("states only what the replicas do: two short facts, one per gateway, taken from the pay page", async () => {
    const t = text(await render());
    expect(t).toContain("You choose success or failure; no card, UPI or bank details are sent.");
    expect(t).toContain("Shows a 15-minute countdown; you choose success, failure or cancel.");
  });

  it("has no glyph icons, exclamation marks or emoji", async () => {
    for (const enrolled of [false, true]) {
      state.enrollment = enrolled ? { id: "e1" } : null;
      state.productArgs = [];
      const t = text(await render());
      expect(t).not.toMatch(/[✓●→←✔•]/);
      expect(t).not.toContain("!");
      expect(t).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe("demo page: the gateway chooser", () => {
  it("is one named radio group of two native radios sharing a name, in gateway order", async () => {
    const html = await render();
    const group = html.match(/<div role="radiogroup" aria-labelledby="([^"]+)"/);
    expect(group).not.toBeNull();
    expect(html).toMatch(new RegExp(`<h2 id="${group![1]}"[^>]*>Choose a gateway</h2>`));
    const radios = [...html.matchAll(/<input\b[^>]*type="radio"[^>]*>/g)].map((m) => m[0]);
    expect(radios).toHaveLength(2);
    expect(radios.map((r) => /value="([^"]+)"/.exec(r)![1])).toEqual(GATEWAYS.map((g) => g.id));
    for (const r of radios) expect(r).toContain('name="gateway"');
    // each radio is named by its card title (not by the generated id alone)
    expect(html).toMatch(/aria-labelledby="[^"]+-title"/);
    expect(html).toContain(">Razorpay</span>");
    expect(html).toContain(">Easebuzz</span>");
  });

  it.each([
    ["razorpay", "easebuzz"],
    ["easebuzz", "razorpay"],
  ])("pre-selects the saved choice %s and says \"Current\" next to it only", async (saved, other) => {
    state.user = { ...state.user, preferredGateway: saved };
    const html = await render();
    const radio = (id: string) => html.match(new RegExp(`<input\\b[^>]*value="${id}"[^>]*>`))![0];
    expect(radio(saved)).toContain("checked");
    expect(radio(other)).not.toContain("checked");
    expect(html.split(">Current<").length - 1).toBe(1);
    // the word sits in the saved gateway's own card, so the state is not colour alone
    const cards = html.split("<label").slice(1);
    const savedCard = cards.find((c) => c.includes(`value="${saved}"`))!;
    expect(savedCard).toContain(">Current<");
    expect(cards.find((c) => c.includes(`value="${other}"`))!).not.toContain(">Current<");
  });

  it("falls back to Razorpay for a missing or unknown saved gateway", async () => {
    for (const v of [undefined, null, "", "paytm"]) {
      state.user = { ...state.user, preferredGateway: v };
      state.productArgs = [];
      const html = await render();
      expect(html.match(/<input\b[^>]*value="razorpay"[^>]*>/)![0]).toContain("checked");
      expect(html.match(/<input\b[^>]*value="easebuzz"[^>]*>/)![0]).not.toContain("checked");
      expect(text(html)).toContain("Start checkout with Razorpay");
    }
  });

  it("keeps one server-action form per gateway, each bound to its own gateway id", async () => {
    const forms = hostForms(await renderTree()).filter((f) => String(f.props.id).startsWith("gateway-form-"));
    expect(forms.map((f) => f.props.id)).toEqual(GATEWAYS.map((g) => gatewayFormId(g.id)));
    for (const [i, gw] of GATEWAYS.entries()) expect(await submit(forms[i])).toEqual(["setPreferredGateway", gw.id]);
    // and the ids are in the markup the radios look them up by
    const html = await render();
    for (const gw of GATEWAYS) expect(html).toContain(`<form id="${gatewayFormId(gw.id)}"`);
  });

  it("gives a no-script visitor a real button per form (the radios need script to submit)", async () => {
    const html = await render();
    expect(html).toMatch(/<noscript><button[^>]*type="submit"[^>]*>Use Razorpay<\/button><\/noscript>/);
    expect(html).toMatch(/<noscript><button[^>]*type="submit"[^>]*>Use Easebuzz<\/button><\/noscript>/);
  });

  it("tells the user that choosing saves it, and where it is used", async () => {
    expect(text(await render())).toContain("Choosing a gateway saves it to your account and pre-selects it on the pay page.");
  });

  it("remounts the group when the saved choice changes (key), so the radios follow the server", async () => {
    const chooser = (tree: ReactNode) => elements(tree).find((e) => e.type === GatewayChooser)!;
    const a = chooser(await renderTree()).key;
    state.user = { ...state.user, preferredGateway: "easebuzz" };
    state.productArgs = [];
    const b = chooser(await renderTree()).key;
    expect(a).not.toEqual(b);
  });

  it("passes the chooser plain data only (no functions, no elements)", async () => {
    const chooser = elements(await renderTree()).find((e) => e.type === GatewayChooser)!;
    expect(JSON.parse(JSON.stringify(chooser.props))).toEqual(chooser.props);
    expect(Object.keys(chooser.props).sort()).toEqual(["labelledBy", "options", "selected"]);
  });
});

describe("GatewayChooser: choosing a radio submits the matching form", () => {
  const radios = () => elements(GatewayChooser({ options: [{ id: "razorpay", name: "Razorpay", blurb: "b", fact: "f" }, { id: "easebuzz", name: "Easebuzz", blurb: "b", fact: "f" }], selected: "razorpay", labelledBy: "h" })).filter((e) => e.type === RadioCard);
  const submitted: string[] = [];
  const lookups: string[] = [];
  beforeEach(() => {
    submitted.length = 0;
    lookups.length = 0;
    vi.stubGlobal("document", {
      getElementById: (id: string) => {
        lookups.push(id);
        return { requestSubmit: () => void submitted.push(id) };
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("looks up and submits gateway-form-<value> when a radio becomes checked", () => {
    const [razorpay, easebuzz] = radios();
    (easebuzz.props.onChange as (e: unknown) => void)({ currentTarget: { checked: true, value: "easebuzz" } });
    expect(submitted).toEqual(["gateway-form-easebuzz"]);
    (razorpay.props.onChange as (e: unknown) => void)({ currentTarget: { checked: true, value: "razorpay" } });
    expect(submitted).toEqual(["gateway-form-easebuzz", "gateway-form-razorpay"]);
  });

  it("does nothing when the event is not a check, and tolerates a missing form", () => {
    const [razorpay] = radios();
    (razorpay.props.onChange as (e: unknown) => void)({ currentTarget: { checked: false, value: "razorpay" } });
    expect(lookups).toEqual([]);
    vi.stubGlobal("document", { getElementById: () => null });
    expect(() => (razorpay.props.onChange as (e: unknown) => void)({ currentTarget: { checked: true, value: "razorpay" } })).not.toThrow();
  });

  it("uses defaultChecked (uncontrolled) so arrow keys move the native selection", () => {
    const [razorpay, easebuzz] = radios();
    expect(razorpay.props.defaultChecked).toBe(true);
    expect(easebuzz.props.defaultChecked).toBe(false);
    expect("checked" in razorpay.props).toBe(false);
  });
});

describe("demo page: GST comes from the product rate", () => {
  // Oracle by hand: GST is the part of a GST-inclusive price, price * rate / (100 + rate).
  it.each([
    [118000, 18, 18000, "₹180"],
    [105000, 5, 5000, "₹50"],
    [112000, 12, 12000, "₹120"],
  ])("a %i paise product at %i%% prints its own GST component", async (pricePaise, rate, gstPaise, rupees) => {
    expect(gstComponent(pricePaise, rate)).toBe(gstPaise);
    state.products = [product({ pricePaise, gstRatePct: rate })];
    const html = await render();
    expect(text(html)).toContain(`Includes ${rupees} GST at ${rate}%`);
    // through Money, not typed digits
    expect(html).toMatch(new RegExp(`<span class="tabular-nums[^"]*">${rupees}</span> GST at ${rate}%`));
  });

  it("a 0% product says there is no GST and never mentions 18%", async () => {
    state.products = [product({ pricePaise: 50000, gstRatePct: 0 })];
    const t = text(await render());
    expect(t).toContain("No GST on this product (rate 0%)");
    expect(t).not.toContain("Includes");
    expect(t).not.toContain("18%");
  });

  it("holds no typed rate in the source", () => {
    expect(PAGE).not.toMatch(/\b18\s*%/);
    expect(PAGE).toContain("gstRatePct");
    expect(PAGE).toContain("gstComponent");
  });

  it("prints the price through Money", async () => {
    const html = await render();
    expect(html).toMatch(/<span class="tabular-nums whitespace-nowrap[^"]*">₹1,180<\/span>/);
  });
});

describe("demo page: the three product states", () => {
  it("not enrolled: a start-checkout form bound to the product id, named for the gateway, with the lock icon", async () => {
    const tree = await renderTree();
    const forms = elements(tree).filter((e) => e.type === ActionForm);
    expect(forms).toHaveLength(1);
    state.actions = [];
    await (forms[0].props.action as (...a: unknown[]) => Promise<void>)(undefined, new FormData());
    expect(state.actions).toEqual([["startCheckout", "p1", undefined, expect.any(FormData)]]);

    const html = renderToStaticMarkup(<>{tree}</>);
    expect(html).toMatch(/<button type="submit" class="btn btn-primary btn-lg[^"]*"><svg[^>]*viewBox="0 0 24 24"[\s\S]*?<\/svg>Start checkout with Razorpay<\/button>/);
    expect(text(html)).toContain("Creates a test order and opens the pay page with Razorpay selected.");
    expect(html).not.toContain("/library/p1");
    expect(text(html)).not.toContain("Reset");
  });

  it("names the saved gateway in the button and the line under it", async () => {
    state.user = { ...state.user, preferredGateway: "easebuzz" };
    const t = text(await render());
    expect(t).toContain("Start checkout with Easebuzz");
    expect(t).toContain("pay page with Easebuzz selected.");
  });

  it("enrolled: a success line, an Open link to the library, and a reset form bound to the product id", async () => {
    state.enrollment = { id: "e1" };
    const tree = await renderTree();
    const html = renderToStaticMarkup(<>{tree}</>);
    expect(html).toMatch(/<a class="btn btn-primary[^"]*" href="\/library\/p1">Open in your library<\/a>/);
    expect(text(html)).toContain("You already own this.");
    expect(text(html)).not.toContain("Start checkout");
    expect(elements(tree).filter((e) => e.type === ActionForm)).toHaveLength(0);
    const reset = hostForms(tree).filter((f) => !String(f.props.id).startsWith("gateway-form-"));
    expect(reset).toHaveLength(1);
    expect(await submit(reset[0])).toEqual(["resetDemoEnrollmentAction", "p1"]);
    expect(html).toMatch(/<button type="submit" class="btn btn-secondary[^"]*">Reset and buy again<\/button>/);
  });

  it("no product: an honest empty state with a link for creators, and no checkout controls", async () => {
    state.products = [null, null];
    const tree = await renderTree();
    const html = renderToStaticMarkup(<>{tree}</>);
    expect(text(html)).toContain("No published paid product to buy yet");
    expect(html).toMatch(/<a class="btn btn-primary[^"]*" href="\/dashboard\/products\/new">[^<]+<\/a>/);
    expect(html).not.toContain("Start checkout");
    expect(html).not.toContain("Reset");
    expect(text(html)).not.toContain("database");
    expect(state.enrollmentArgs).toEqual([]);
    // the chooser is still usable without a product
    expect(html).toContain('role="radiogroup"');
  });

  it("shows the product's type, title, creator and h3 under the second h2", async () => {
    const html = await render();
    expect(html).toMatch(/<h3[^>]*>Intro to bookkeeping<\/h3>/);
    expect(text(html)).toContain("Course by Meera Nair");
    expect(html.indexOf("<h2")).toBeLessThan(html.indexOf("<h3"));
  });
});

describe("demo page: the queries are unchanged", () => {
  it("looks for a published paid product from another creator, dearest first, with the creator", async () => {
    await render();
    expect(state.productArgs).toEqual([
      {
        where: { creator: { userId: { not: "u1" } }, status: "published", pricePaise: { gt: 0 } },
        include: { creator: true },
        orderBy: { pricePaise: "desc" },
      },
    ]);
  });

  it("falls back to any published paid product only when there is none from another creator", async () => {
    state.products = [null, product({ id: "p9" })];
    const html = await render();
    expect(state.productArgs).toHaveLength(2);
    expect(state.productArgs[1]).toEqual({
      where: { status: "published", pricePaise: { gt: 0 } },
      include: { creator: true },
    });
    expect(html).toContain("Start checkout with Razorpay");
    expect(state.enrollmentArgs).toEqual([{ where: { userId_productId: { userId: "u1", productId: "p9" } } }]);
  });

  it("makes one query when the first finds a product, and checks this user's enrollment in it", async () => {
    await render();
    expect(state.productArgs).toHaveLength(1);
    expect(state.enrollmentArgs).toEqual([{ where: { userId_productId: { userId: "u1", productId: "p1" } } }]);
  });

  it("requires the user for /demo before touching the database", async () => {
    await render();
    expect(state.log[0]).toBe("requireUser:/demo");
    expect(state.log.indexOf("product.findFirst")).toBeGreaterThan(0);
  });
});

describe("demo page: layout and style budget", () => {
  const classTokens = (h: string) => [...h.matchAll(/\sclass="([^"]*)"/g)].map((m) => m[1].split(/\s+/));
  const outlined = (h: string) => classTokens(h).filter((t) => t.includes("card") || (t.includes("rounded-card") && t.includes("border")));

  it("draws at most two outlined boxes in every state (the two gateway cards)", async () => {
    const empty = async () => {
      state.products = [null, null];
      return render();
    };
    const states: [string, () => Promise<string>][] = [
      ["not enrolled", render],
      ["enrolled", async () => ((state.enrollment = { id: "e1" }), render())],
      ["no product", empty],
    ];
    for (const [name, go] of states) {
      state.enrollment = null;
      state.products = [product()];
      state.productArgs = [];
      const n = outlined(await go()).length;
      expect(n, name).toBeLessThanOrEqual(2);
      expect(n, name).toBe(2);
    }
    // positive control: the detector counts .card and the rounded-card border recipe
    expect(outlined('<div class="card px-4"></div><div class="rounded-card border border-line"></div><div class="rounded-card bg-surface-2"></div>')).toHaveLength(2);
  });

  it("has no resting shadow, motion loop, uppercase label, tracked label or arbitrary radius in the markup", async () => {
    for (const enrolled of [false, true]) {
      state.enrollment = enrolled ? { id: "e1" } : null;
      state.productArgs = [];
      const html = await render();
      expect(html).not.toMatch(/shadow|animate-|infinite|uppercase|tracking-|t-label|rounded-\[|gradient|blur/);
    }
  });

  it("keeps copy at 15px or more outside the radio cards (no text-xs or text-sm in the page)", () => {
    expect(PAGE).not.toMatch(/text-(xs|sm|\[)/);
  });

  it("every link and button is a Button or ButtonLink (44px touch floor from .btn); no raw anchors", async () => {
    for (const enrolled of [false, true]) {
      state.enrollment = enrolled ? { id: "e1" } : null;
      state.productArgs = [];
      const html = await render();
      const tags = [...html.matchAll(/<(a|button)\b([^>]*)>/g)];
      expect(tags.length).toBeGreaterThan(2);
      for (const [tag] of tags) expect(tag, tag).toMatch(/class="btn btn-/);
    }
  });

  it("ends with plain ghost links to the library and the dashboard, no arrows", async () => {
    const html = await render();
    expect(html).toMatch(/<a class="btn btn-ghost[^"]*" href="\/library">Your library<\/a>/);
    expect(html).toMatch(/<a class="btn btn-ghost[^"]*" href="\/dashboard">Creator dashboard<\/a>/);
  });

  it("passes the legacy style scan on both touched sources", () => {
    expect(legacyStyleFindings(PAGE)).toEqual([]);
    expect(legacyStyleFindings(CHOOSER)).toEqual([]);
    // positive control: the old page was full of findings
    expect(legacyStyleFindings('const a = <div className="rounded-xl card">✓</div>;').length).toBeGreaterThan(0);
  });

  it("imports no gateway brand icons and holds no hex colour, arbitrary radius, motion loop or shadow", () => {
    for (const src of [PAGE, CHOOSER]) {
      expect(src).not.toMatch(/gateway-icons/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rounded-\[|animate-|shadow|BhimUpiIcon|CredIcon|BhimIcon/);
    }
  });

  it("is a server component page: no 'use client', and the chooser is the only client module it adds", () => {
    expect(PAGE).not.toMatch(/^["']use client["']/m);
    expect(CHOOSER.startsWith('"use client"')).toBe(true);
  });
});

describe("demo page: server/client boundary", () => {
  it("passes functions only as server actions (the three form kinds), never to a client component but ActionForm", async () => {
    const boundaries = [ActionForm, SubmitButton, FormError, GatewayChooser, RadioCard];
    // gateway forms (2) + start-checkout ActionForm
    expect(functionProps(await renderTree(), boundaries).sort()).toEqual(["<ActionForm>.action", "<form>.action", "<form>.action"]);
    // enrolled: gateway forms (2) + the reset form
    state.enrollment = { id: "e1" };
    state.productArgs = [];
    expect(functionProps(await renderTree(), boundaries).sort()).toEqual(["<form>.action", "<form>.action", "<form>.action"]);
    // no product: gateway forms only
    state.enrollment = null;
    state.products = [null, null];
    state.productArgs = [];
    expect(functionProps(await renderTree(), boundaries).sort()).toEqual(["<form>.action", "<form>.action"]);
  });
});
