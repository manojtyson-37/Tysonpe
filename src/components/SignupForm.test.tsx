// Server-render checks for SignupForm. The post-submit state ActionForm would hold is injected by replacing
// useActionState, so the REAL context provider, hooks and primitives are exercised (no DOM runner in this repo).
// Click-level behaviour (handle typing, role switch, show/hide) is in SignupForm.interactions.test.tsx.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const H = vi.hoisted(() => ({ state: undefined as unknown }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useActionState = () => [H.state, () => {}];
  return { ...actual, default: { ...actual, useActionState }, useActionState };
});
vi.mock("@/app/actions/auth", () => ({ signup: async () => ({}) }));

import { legacyStyleFindings } from "@/test/style-scan";
import { SignupForm, suggestHandle } from "./SignupForm";

type Role = "learner" | "creator";
const render = (initialRole: Role = "learner", next?: string, state?: unknown) => {
  H.state = state;
  return renderToStaticMarkup(<SignupForm initialRole={initialRole} next={next} />);
};
const lc = (s?: string) => (s ?? "").toLowerCase();
const tags = (html: string, tag: string) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))].map((m) => m[0]);
const input = (html: string, name: string, value?: string) =>
  tags(html, "input").find((t) => t.includes(`name="${name}"`) && (value === undefined || t.includes(`value="${value}"`)));
const isChecked = (tag?: string) => /\schecked(?:=""|\s|\/|>)/.test(tag ?? "");
const attr = (tag: string | undefined, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag ?? "")?.[1];

const FAILED = {
  fields: { name: "Enter your name", handle: "That handle is taken", password: "Use at least 8 characters" },
  values: { name: "", email: "asha@example.com", role: "creator", preferredGateway: "easebuzz", handle: "my-shop" },
};

describe("SignupForm: errors and values live inside the ActionForm context (audit B1)", () => {
  it("renders the server's field errors as role=alert and marks the controls invalid", () => {
    const html = render("learner", undefined, FAILED);
    expect(html).toMatch(/<p id="[^"]*" role="alert" class="err">Enter your name<\/p>/);
    expect(html).toMatch(/role="alert"[^>]*>Use at least 8 characters</);
    expect(input(html, "name")).toContain('aria-invalid="true"');
    expect(input(html, "password")).toContain('aria-invalid="true"');
    expect(attr(input(html, "name"), "aria-describedby")).toMatch(/-err$/);
  });

  it("shows the handle error on the handle field of a creator", () => {
    const html = render("learner", undefined, FAILED);
    expect(html).toMatch(/role="alert"[^>]*>That handle is taken</);
    expect(input(html, "handle")).toContain('aria-invalid="true"');
  });

  it("keeps the submitted email (and name) as the field value after a failed submit, but never a password", () => {
    const html = render("learner", undefined, { ...FAILED, values: { ...FAILED.values, name: "Asha Rao", password: "hunter22" } });
    expect(attr(input(html, "email"), "value")).toBe("asha@example.com");
    expect(attr(input(html, "name"), "value")).toBe("Asha Rao");
    expect(input(html, "password")).not.toContain("value=");
    expect(html).not.toContain("hunter22");
  });

  it("shows a top-level error as role=alert", () => {
    const html = render("learner", undefined, { error: "Too many sign-ups from this network. Try again later." });
    expect(html).toMatch(/role="alert"[^>]*>Too many sign-ups/);
  });

  it("shows no alert on a fresh form", () => {
    expect(render()).not.toContain('role="alert"');
  });
});

describe("SignupForm: role and gateway radios are uncontrolled and survive a failed submit (audit B2)", () => {
  it("a fresh form checks the initial role and Razorpay", () => {
    const learner = render("learner");
    expect(isChecked(input(learner, "role", "learner"))).toBe(true);
    expect(isChecked(input(learner, "role", "creator"))).toBe(false);
    expect(isChecked(input(learner, "preferredGateway", "razorpay"))).toBe(true);
    expect(isChecked(input(learner, "preferredGateway", "easebuzz"))).toBe(false);
    const creator = render("creator");
    expect(isChecked(input(creator, "role", "creator"))).toBe(true);
    expect(isChecked(input(creator, "role", "learner"))).toBe(false);
  });

  it("a failed submit re-renders creator + Easebuzz checked, whatever the page's initialRole", () => {
    const html = render("learner", undefined, FAILED);
    expect(isChecked(input(html, "role", "creator"))).toBe(true);
    expect(isChecked(input(html, "role", "learner"))).toBe(false);
    expect(isChecked(input(html, "preferredGateway", "easebuzz"))).toBe(true);
    expect(isChecked(input(html, "preferredGateway", "razorpay"))).toBe(false);
  });

  it("a failed submit of learner + Razorpay wins over initialRole creator", () => {
    const html = render("creator", undefined, { fields: { email: "x" }, values: { role: "learner", preferredGateway: "razorpay" } });
    expect(isChecked(input(html, "role", "learner"))).toBe(true);
    expect(isChecked(input(html, "role", "creator"))).toBe(false);
    expect(input(html, "handle")).toBeUndefined();
  });

  it("the test-mode note is tied to the gateway fieldset by id", () => {
    const html = render();
    const id = /<fieldset aria-describedby="([^"]+)"/.exec(html)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`<p id="${id}" class="t-meta mb-2">Payments run in test mode.</p>`);
  });

  it("the radios sit in fieldsets whose first child is the legend", () => {
    const html = render();
    const sets = [...html.matchAll(/<fieldset\b[^>]*>([\s\S]*?)<\/fieldset>/g)].map((m) => m[1]);
    expect(sets).toHaveLength(2);
    for (const s of sets) expect(s).toMatch(/^<legend\b/);
  });
});

describe("suggestHandle", () => {
  it("makes a lowercase slug from a name", () => {
    expect(suggestHandle("Asha Rao")).toBe("asha-rao");
    expect(suggestHandle("  (Asha)  Rao!! ")).toBe("asha-rao");
  });

  it("never starts or ends with a hyphen and is capped at 30 characters", () => {
    expect(suggestHandle("!!" + "a".repeat(40))).toBe("a".repeat(30));
    expect(suggestHandle("a".repeat(29) + " bcd")).toBe("a".repeat(29)); // the cut leaves a hyphen, which is dropped
    expect(suggestHandle("!!!")).toBe("");
    expect(suggestHandle("")).toBe("");
  });
});

describe("SignupForm: handle field (audit B6)", () => {
  it("is absent for a learner and starts EMPTY for a creator", () => {
    expect(input(render("learner"), "handle")).toBeUndefined();
    const html = render("creator");
    expect(attr(input(html, "handle"), "value")).toBe("");
    expect(html).not.toContain("asha-rao");
  });

  it("has no availability badge, and no check that could back one", () => {
    const html = render("creator");
    expect(html.toLowerCase()).not.toContain("available");
    expect(html.toLowerCase()).not.toContain("link available");
  });

  it("carries the input attributes for a slug: length cap, no autocapitalise, no spellcheck, no autofill", () => {
    const tag = input(render("creator"), "handle")!;
    expect(lc(tag)).toContain('maxLength="30"'.toLowerCase());
    expect(lc(tag)).toContain('autoCapitalize="none"'.toLowerCase());
    expect(lc(tag)).toContain('spellcheck="false"');
    expect(lc(tag)).toContain('autoComplete="off"'.toLowerCase());
    expect(lc(tag)).toContain('inputMode="text"'.toLowerCase());
    expect(tag).toContain("required");
  });

  it("shows the store address as a path, with no invented domain", () => {
    const html = render("creator", undefined, { fields: {}, values: { role: "creator", handle: "my-shop" } });
    expect(html).toContain("/c/");
    expect(html).toMatch(/Your store address:[^<]*<span[^>]*>\/c\/my-shop<\/span>/);
    expect(html.replace(/xmlns="[^"]*"/g, "")).not.toMatch(/https?:\/\//);
  });
});

describe("SignupForm: the contract with the server action (acceptance)", () => {
  const names = (html: string) => [...new Set([...html.matchAll(/<(?:input|select|textarea)\b[^>]*\sname="([^"]+)"/g)].map((m) => m[1]))].sort();

  it("posts next, role, name, email, password, preferredGateway and, for creators, handle", () => {
    expect(names(render("creator", "/library/p1"))).toEqual(["email", "handle", "name", "next", "password", "preferredGateway", "role"]);
  });

  it("learners post no handle, and next only when the page has one", () => {
    expect(names(render("learner"))).toEqual(["email", "name", "password", "preferredGateway", "role"]);
    expect(names(render("learner", "/library/p1"))).toContain("next");
  });

  it("next is a hidden input carrying the page's value", () => {
    expect(input(render("learner", "/library/p1"), "next")).toMatch(/type="hidden"[^>]*value="\/library\/p1"|value="\/library\/p1"[^>]*type="hidden"/);
  });

  it("the radio values are the ones the action's schema accepts", () => {
    const html = render();
    const values = (n: string) => tags(html, "input").filter((t) => t.includes(`name="${n}"`)).map((t) => attr(t, "value")).sort();
    expect(values("role")).toEqual(["creator", "learner"]);
    expect(values("preferredGateway")).toEqual(["easebuzz", "razorpay"]);
  });

  it("autofill and keyboard hints: name, email, new-password; email keyboard; every text field required", () => {
    const html = render("creator");
    expect(lc(input(html, "name"))).toContain('autoComplete="name"'.toLowerCase());
    expect(lc(input(html, "email"))).toContain('autoComplete="email"'.toLowerCase());
    expect(lc(input(html, "email"))).toContain('inputMode="email"'.toLowerCase());
    expect(input(html, "email")).toContain('type="email"');
    expect(lc(input(html, "password"))).toContain('autoComplete="new-password"'.toLowerCase());
    for (const n of ["name", "email", "password", "handle"]) expect(input(html, n)).toContain("required");
  });

  it("the password hint mirrors the server rule (8 characters, 72 bytes) and there is no strength meter", () => {
    const html = render();
    expect(html).toMatch(/8 or more characters/);
    expect(html).toMatch(/72 bytes/);
    expect(html.replace(/ class="[^"]*"/g, "").toLowerCase()).not.toMatch(/strength|weak|strong/);
  });

  it("the submit button says what the role will do, with no arrow", () => {
    const label = (html: string) => /<button\b[^>]*type="submit"[^>]*>([\s\S]*?)<\/button>/.exec(html)?.[1] ?? "";
    expect(label(render("learner"))).toContain("Create account");
    expect(label(render("creator"))).toContain("Open your store");
    expect(label(render("creator"))).not.toMatch(/[→>]|&gt;/);
  });
});

describe("SignupForm: show/hide password (44px target, pressed state)", () => {
  const toggle = (html: string) => tags(html, "button").find((t) => t.includes("password") && t.includes("aria-pressed"));

  it("is a type=button icon button with aria-pressed, a name and a 44px touch target", () => {
    const tag = toggle(render())!;
    expect(tag).toBeDefined();
    expect(tag).toContain('type="button"');
    expect(tag).toContain('aria-pressed="false"');
    expect(tag).toContain('aria-label="Show password"');
    expect(tag).toContain("focus-visible:-outline-offset-2");
    expect(tag).toContain("pointer-coarse:min-h-11");
    expect(tag).toContain("min-w-11");
  });
});

describe("SignupForm owns fields only (audit B4)", () => {
  it("renders no heading, no card, no footer link and no preview pane", () => {
    const html = render("creator");
    expect(html).not.toMatch(/<h[1-6]\b/);
    expect(html).not.toMatch(/<a\b/);
    expect(html).not.toContain("Already have an account");
    expect(html).not.toMatch(/class="[^"]*(?<![-\w])card(?![-\w])/);
    expect(html).not.toMatch(/<aside|<section|<main/);
  });

  it("renders the fields in a form that is not wider than its card (no grid of columns around the form)", () => {
    expect(render()).not.toMatch(/lg:grid-cols|lg:col-span/);
  });
});

describe("SignupForm copy is short and true (audit B5)", () => {
  const source = readFileSync(path.resolve(import.meta.dirname, "SignupForm.tsx"), "utf8");
  const BANNED = [
    "256-bit", "PCI", "Verified Creator", "T+1", "cryptographic", "LinkedIn", "tysonpe.com", "Secure", "Instant UPI",
    "Strong", "Tamper", "Zero payment", "Asha Rao", "asha-rao", "38%", "GST", "Link available", "certificate", "clipboard",
  ];
  const html = render("creator") + render("learner");
  it.each(BANNED)("neither the source nor the rendered form contains %s", (phrase) => {
    expect(source).not.toContain(phrase);
    expect(html).not.toContain(phrase);
  });

  it("adds no money figure to the form", () => {
    expect(source).not.toMatch(/[₹$]\s?\d/);
    expect(html).not.toMatch(/₹/);
  });

  it("says payments are test mode, in plain words", () => {
    expect(html).toMatch(/test mode/i);
  });
});

describe("SignupForm follows the design rules", () => {
  const source = readFileSync(path.resolve(import.meta.dirname, "SignupForm.tsx"), "utf8");
  it("passes the legacy style scan", () => {
    expect(legacyStyleFindings(source)).toEqual([]);
  });

  it("has no glyphs typed as text, no emoji", () => {
    expect(source).not.toMatch(/[→←·—✓●○⚡🛡]/u);
    expect(source).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it.each([
    ["a pixel font size", /text-\[\d+px\]/],
    ["!important or a ! utility", /!important|\s!\w[\w-]*(?=[\s"`])/],
    ["transition-all", /transition-all/],
    ["font-extrabold", /font-extrabold/],
    ["an off-scale radius", /rounded-(?:xl|2xl|3xl|lg|md|sm)\b|rounded-\[/],
    ["a resting shadow", /\bshadow(?:-\w+|-\[[^\]]*\])?\b/],
    ["a gradient", /gradient/],
    ["a palette class", /\b(?:text|bg|border)-(?:slate|gray|zinc|neutral|white|black|red|green|blue|amber)\b/],
    ["a raw hex colour", /#[0-9a-fA-F]{3,8}\b/],
    ["italic", /\bitalic\b/],
    ["a 3-column grid", /grid-cols-3/],
    ["a hand-rolled svg", /<svg/],
  ])("has no %s", (_label, re) => {
    expect(source).not.toMatch(re);
  });

  it("imports only the allowed marks from gateway-icons", () => {
    const m = /import\s*\{([^}]*)\}\s*from "\.\/gateway-icons"/.exec(source);
    const names = (m?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const allowed = ["GPayIcon", "GooglePayIcon", "PhonePeIcon", "PaytmIcon", "UpiIcon", "VisaIcon", "MastercardIcon", "RupayIcon", "HdfcBankIcon", "SbiBankIcon", "IciciBankIcon", "AxisBankIcon"];
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(allowed).toContain(n);
  });

  it("builds on the form primitives", () => {
    expect(source).toMatch(/from "\.\/form"/);
    for (const n of ["ActionForm", "RadioCard", "SubmitButton", "FormError", "InputGroup"]) expect(source).toContain(n);
  });
});

describe("SignupForm: the whole visible copy is pinned (a blacklist such as BANNED only catches claims someone already thought of)", () => {
  const visible = (html: string) =>
    html
      .replace(/<(script|svg)\b[\s\S]*?<\/\1>/g, "")
      .replace(/<[^>]+>/g, "\n")
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

  it("a learner form shows exactly this text, and nothing else", () => {
    expect(visible(render("learner"))).toEqual([
      "I want to",
      "Sell my content",
      "Open a storefront for courses and downloads.",
      "Learn from creators",
      "Buy from creators and learn in your library.",
      "Full name",
      "Email",
      "Password",
      "8 or more characters, 72 bytes at most.",
      "Checkout gateway",
      "Payments run in test mode.",
      "Razorpay",
      "Checkout opens in a pop-up on the page.",
      "Easebuzz",
      "Checkout moves to a hosted page with a 15-minute timer.",
      "Create account",
    ]);
  });

  it("a creator form shows exactly this text, and nothing else", () => {
    expect(visible(render("creator"))).toEqual([
      "I want to",
      "Sell my content",
      "Open a storefront for courses and downloads.",
      "Learn from creators",
      "Buy from creators and learn in your library.",
      "Full name",
      "Email",
      "Password",
      "8 or more characters, 72 bytes at most.",
      "Store handle",
      "/c/",
      "Starts with a letter or number. Letters, numbers and hyphens, 3 to 30 characters.",
      "Checkout gateway",
      "Payments run in test mode.",
      "Razorpay",
      "Checkout opens in a pop-up on the page.",
      "Easebuzz",
      "Checkout moves to a hosted page with a 15-minute timer.",
      "Open your store",
    ]);
  });
});
