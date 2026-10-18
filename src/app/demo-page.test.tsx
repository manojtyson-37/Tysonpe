import { readFileSync } from "node:fs";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

type Row = Record<string, unknown>;
const state = vi.hoisted(() => ({
  user: { id: "u1", name: "Asha Rao", preferredGateway: "razorpay", creator: { id: "c1" } } as Row,
  /** simulatedPaymentsAllowed() */
  allowed: true,
  /** getProvider().name, or "THROW" for a deployment with no provider configured. */
  provider: "mock" as string,
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
vi.mock("@/lib/payments/demo-mode", () => ({ simulatedPaymentsAllowed: () => state.allowed }));
vi.mock("@/lib/payments", () => ({
  getProvider: () => {
    if (state.provider === "THROW") throw new Error("No payment provider configured");
    return { name: state.provider };
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
import { Button, EmptyState } from "@/components/ui";
import { IconCheck } from "@/components/icons";
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
  state.user = { id: "u1", name: "Asha Rao", preferredGateway: "razorpay", creator: { id: "c1" } };
  state.allowed = true;
  state.provider = "mock";
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

/** Every page state worth scanning, each set up from a clean slate. */
const STATES: [string, () => void][] = [
  ["not enrolled", () => {}],
  ["enrolled", () => void (state.enrollment = { id: "e1" })],
  ["no product", () => void (state.products = [null, null])],
  ["not a demo deployment", () => void (state.allowed = false)],
];
async function eachState(check: (name: string, html: string) => void) {
  for (const [name, setup] of STATES) {
    state.user = { id: "u1", name: "Asha Rao", preferredGateway: "razorpay", creator: { id: "c1" } };
    state.allowed = true;
    state.provider = "mock";
    state.products = [product()];
    state.enrollment = null;
    state.productArgs = [];
    setup();
    check(name, await render());
  }
}

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
    await eachState((name, html) => {
      const t = text(html).toLowerCase();
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
        expect(t, `${name}: ${banned}`).not.toContain(banned);
      }
    });
    // positive control: the scan would catch the old copy
    expect("backend computes SHA-256 signatures identical to genuine webhooks".toLowerCase()).toContain("sha-256");
  });

  it("states only what the replicas do: two short facts, one per gateway, taken from the pay page", async () => {
    const t = text(await render());
    expect(t).toContain("You choose success or failure; no card, UPI or bank details are sent.");
    expect(t).toContain("Shows a 15-minute countdown; you choose success, failure or cancel.");
  });

  it("has no glyph icons, exclamation marks or emoji", async () => {
    await eachState((name, html) => {
      const t = text(html);
      expect(t, name).not.toMatch(/[✓●→←✔•]/);
      expect(t, name).not.toContain("!");
      expect(t, name).not.toMatch(/\p{Extended_Pictographic}/u);
    });
    // positive control: the scans see a glyph, a bang and an emoji
    expect("Done ✓!").toMatch(/[✓●→←✔•]/);
    expect("ok 😀").toMatch(/\p{Extended_Pictographic}/u);
  });

  it("shows each gateway's own blurb", async () => {
    const t = text(await render());
    for (const gw of GATEWAYS) expect(t, gw.id).toContain(gw.blurb);
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

  it("gives a no-script visitor a real button INSIDE each gateway's own form (the radios need script to submit)", async () => {
    const tree = await renderTree();
    for (const gw of GATEWAYS) {
      const form = hostForms(tree).find((f) => f.props.id === gatewayFormId(gw.id))!;
      const inside = elements(form.props.children);
      const noscript = inside.find((e) => e.type === "noscript");
      expect(noscript, gw.id).toBeDefined();
      const buttons = elements(noscript!.props.children).filter((e) => e.type === Button);
      expect(buttons, gw.id).toHaveLength(1);
      expect(buttons[0].props.type).toBe("submit");
      expect(buttons[0].props.children).toEqual(["Use ", gw.name]);
    }
    // and in the markup: slice each gateway form, then look inside the slice only
    const html = await render();
    for (const gw of GATEWAYS) {
      const slice = new RegExp(`<form id="${gatewayFormId(gw.id)}"[^>]*>([\\s\\S]*?)</form>`).exec(html)![1];
      expect(slice, gw.id).toMatch(new RegExp(`^<noscript><button[^>]*type="submit"[^>]*>Use ${gw.name}</button></noscript>$`));
    }
  });

  it("tells a no-script visitor what the buttons are for", async () => {
    const html = await render();
    expect(html).toMatch(/<noscript><p[^>]*>[^<]*(buttons?)[^<]*<\/p><\/noscript>/);
    expect(text(html)).toContain("Scripts are off: use the buttons below to save a gateway.");
  });

  it("tells the user that choosing saves it, and where it is used", async () => {
    expect(text(await render())).toContain("Choosing a gateway saves it to your account and pre-selects it on the pay page.");
  });

  it("does NOT remount the group on a new saved choice (a key would drop keyboard focus)", async () => {
    const chooser = (tree: ReactNode) => elements(tree).find((e) => e.type === GatewayChooser)!;
    const a = chooser(await renderTree());
    state.user = { ...state.user, preferredGateway: "easebuzz" };
    state.productArgs = [];
    const b = chooser(await renderTree());
    expect(a.key).toBeNull();
    expect(b.key).toBeNull();
    expect(a.props.selected).toBe("razorpay");
    expect(b.props.selected).toBe("easebuzz");
    expect(PAGE).not.toMatch(/<GatewayChooser[^>]*\bkey=/);
  });

  it("renders a persistent, empty polite status region for the save message", async () => {
    const html = await render();
    expect(html).toMatch(/<p role="status" aria-live="polite" class="[^"]*sr-only[^"]*"><\/p>/);
    expect(html.match(/role="status"/g)!.length).toBe(1 + 1 /* SubmitButton pending region */);
  });

  it("passes the chooser plain data only (no functions, no elements)", async () => {
    const chooser = elements(await renderTree()).find((e) => e.type === GatewayChooser)!;
    expect(JSON.parse(JSON.stringify(chooser.props))).toEqual(chooser.props);
    expect(Object.keys(chooser.props).sort()).toEqual(["labelledBy", "options", "selected"]);
  });
});

describe("demo page: GST comes from the product rate", () => {
  // Oracle by hand: GST is the part of a GST-inclusive price, price * rate / (100 + rate).
  it.each([
    [118000, 18, 18000, "₹180"],
    [105000, 5, 5000, "₹50"],
    [112000, 12, 12000, "₹120"],
    [128000, 28, 28000, "₹280"],
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
    // the form shows its error, and says what it is doing while pending
    const all = elements(tree);
    expect(all.filter((e) => e.type === FormError)).toHaveLength(1);
    const submits = all.filter((e) => e.type === SubmitButton);
    expect(submits.map((e) => e.props.pendingText)).toEqual(["Creating a test order…"]);
    expect(all.filter((e) => e.type === IconCheck)).toHaveLength(0);
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
    expect(html).toMatch(/<button type="submit" class="btn btn-secondary[^"]*[^>]*>Reset and buy again<\/button>/);
    // the success line carries the check icon; there is no checkout form, so no FormError either
    const all = elements(tree);
    expect(all.filter((e) => e.type === IconCheck)).toHaveLength(1);
    expect(all.filter((e) => e.type === FormError)).toHaveLength(0);
    expect(all.filter((e) => e.type === SubmitButton).map((e) => e.props.pendingText)).toEqual(["Resetting…"]);
    // 44px touch floor on the enrolled-state link and reset button
    expect(html).toMatch(/<a class="btn btn-primary[^"]*pointer-coarse:min-h-11[^"]*" href="\/library\/p1">/);
    expect(html).toMatch(/<button type="submit" class="btn btn-secondary[^"]*pointer-coarse:min-h-11[^"]*">Reset and buy again/);
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
    // the empty state's body is 16px and its action keeps the touch floor
    const empty = elements(tree).find((e) => e.type === EmptyState)!;
    expect(String(empty.props.className)).toContain("text-base");
    expect(String(empty.props.actionClassName)).toContain("pointer-coarse:min-h-11");
    expect(html).toMatch(/href="\/dashboard\/products\/new"/);
  });

  it("shows the product's type, title, creator and h3 under the second h2", async () => {
    const html = await render();
    expect(html).toMatch(/<h3[^>]*>Intro to bookkeeping<\/h3>/);
    expect(text(html)).toContain("Course by Meera Nair");
    expect(html.indexOf("<h2")).toBeLessThan(html.indexOf("<h3"));
  });

  it("labels the product type from the shared map, and falls back to the raw type", async () => {
    state.products = [product({ type: "download" })];
    expect(text(await render())).toContain("Digital download by Meera Nair");
    state.products = [product({ type: "webinar" })];
    state.productArgs = [];
    expect(text(await render())).toContain("Live webinar by Meera Nair");
    state.products = [product({ type: "mystery" })];
    state.productArgs = [];
    expect(text(await render())).toContain("mystery by Meera Nair");
  });
});

describe("demo page: outside a mock-gateway demo deployment", () => {
  const cases: [string, () => void][] = [
    ["simulated payments not allowed", () => void (state.allowed = false)],
    ["not allowed and the provider is the mock", () => void ((state.allowed = false), (state.provider = "mock"))],
    ["allowed but live Razorpay keys", () => void (state.provider = "razorpay")],
    ["allowed but Easebuzz", () => void (state.provider = "easebuzz")],
    ["allowed but getProvider throws", () => void (state.provider = "THROW")],
    ["not allowed and getProvider throws", () => void ((state.allowed = false), (state.provider = "THROW"))],
  ];
  it.each(cases)("%s: honest short state, no test-mode claim, no chooser, no checkout, no reset", async (_n, setup) => {
    setup();
    state.enrollment = { id: "e1" }; // even an owned product must not offer a reset
    const tree = await renderTree();
    const html = renderToStaticMarkup(<>{tree}</>);
    const t = text(html);
    expect([...html.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/g)].map((m) => m[1])).toEqual(["Gateway playground"]);
    expect(t).toContain("The gateway playground runs on the demo deployment only.");
    expect(html).toMatch(/<a class="btn btn-primary[^"]*pointer-coarse:min-h-11[^"]*" href="\/library">[^<]+<\/a>/);
    expect(t.toLowerCase()).not.toContain("test mode");
    expect(t.toLowerCase()).not.toContain("real money");
    expect(html).not.toContain('role="radiogroup"');
    expect(html).not.toContain('type="radio"');
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<noscript");
    expect(t).not.toContain("Start checkout");
    expect(t).not.toContain("Reset");
    expect(elements(tree).filter((e) => e.type === GatewayChooser || e.type === ActionForm || e.type === SubmitButton)).toHaveLength(0);
    // no data is fetched for a page that shows none
    expect(state.log).toEqual(["requireUser:/demo"]);
  });

  it("the demo deployment (allowed and mock provider) still shows the playground", async () => {
    const t = text(await render());
    expect(t).toContain("Test mode: no real money moves.");
    expect(t).not.toContain("runs on the demo deployment only");
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
    await eachState((name, html) => {
      expect(html, name).not.toMatch(/shadow|animate-|infinite|uppercase|tracking-|t-label|rounded-\[|gradient|blur/);
    });
  });

  it("keeps copy at 15px or more outside the radio cards (no text-xs or text-sm in the page)", () => {
    expect(PAGE).not.toMatch(/text-(xs|sm|\[)/);
  });

  it("every link and button is a Button or ButtonLink (44px touch floor from .btn); no raw anchors", async () => {
    await eachState((name, html) => {
      const tags = [...html.matchAll(/<(a|button)\b([^>]*)>/g)];
      expect(tags.length, name).toBeGreaterThanOrEqual(1);
      for (const [tag] of tags) expect(tag, `${name}: ${tag}`).toMatch(/class="btn btn-/);
    });
  });

  it("ends with plain ghost links to the library and the dashboard, no arrows, each with the touch floor", async () => {
    const html = await render();
    expect(html).toMatch(/<a class="btn btn-ghost[^"]*pointer-coarse:min-h-11[^"]*" href="\/library">Your library<\/a>/);
    expect(html).toMatch(/<a class="btn btn-ghost[^"]*pointer-coarse:min-h-11[^"]*" href="\/dashboard">Creator dashboard<\/a>/);
  });

  it("hides the Creator dashboard link from a user who has no creator profile", async () => {
    state.user = { ...state.user, creator: null };
    const html = await render();
    expect(html).not.toContain("Creator dashboard");
    expect(html).not.toContain('href="/dashboard"');
    expect(html).toContain('href="/library">Your library<');
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
    // not a demo deployment: no forms, so no functions at all
    state.products = [product()];
    state.allowed = false;
    state.productArgs = [];
    expect(functionProps(await renderTree(), boundaries)).toEqual([]);
  });
});
