// Drives SignupFields' state. The repo has no DOM runner, so useState is replaced with a tiny synchronous store:
// SignupFields() is called as a plain function, the returned tree is walked, and a control's onChange/onClick is
// invoked the way React would. useFormValues/useFormError are stubbed so a post-submit state can be injected without a
// provider (the real provider path is covered by the server-render tests in SignupForm.test.tsx).
//
// WHAT THIS CANNOT PROVE (needs a browser): that React 19's post-action form reset leaves the radios on the submitted
// choice, that a controlled handle keeps its value across the reset, and focus. The tests pin the precondition: the
// radios are uncontrolled (defaultChecked, no `checked`) and derive from picked ?? submitted ?? initial.
import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => ({
  slots: [] as unknown[],
  i: 0,
  values: undefined as Record<string, string> | undefined,
  errors: {} as Record<string, string>,
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = (init: unknown) => {
    const idx = H.i++;
    if (!(idx in H.slots)) H.slots[idx] = typeof init === "function" ? (init as () => unknown)() : init;
    const set = (v: unknown) => {
      H.slots[idx] = typeof v === "function" ? (v as (p: unknown) => unknown)(H.slots[idx]) : v;
    };
    return [H.slots[idx], set];
  };
  const useId = () => ":r0:";
  return { ...actual, default: { ...actual, useState, useId }, useState, useId };
});
vi.mock("./form", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./form")>();
  return {
    ...actual,
    useFormValues: () => H.values,
    useFormError: (name?: string) => (name ? H.errors[name] : undefined),
  };
});
vi.mock("@/app/actions/auth", () => ({ signup: async () => ({}) }));

import { InputGroup } from "./form";
import { SignupFields } from "./SignupForm";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type El = { type: unknown; props: P; key: string | null };

// Local wrapper components of SignupForm.tsx are called here (their hooks run on the same store) and replaced by what
// they render, so the primitives they put on screen are what the tests see. Primitives from ./form are never called.
const LOCAL = new Set(["FormInput", "PasswordInput"]);

function walk(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach((c) => walk(c, out));
  else if (isValidElement(node)) {
    const props = node.props as P;
    if (typeof node.type === "function" && LOCAL.has(node.type.name)) {
      walk((node.type as (p: P) => ReactNode)(props), out);
      return out;
    }
    out.push({ type: node.type, props, key: node.key });
    walk(props.children, out);
    for (const slot of ["trailing", "suffix", "prefix", "hint", "label"]) if (props[slot] && typeof props[slot] === "object") walk(props[slot], out);
  }
  return out;
}

function mount(initialRole: "learner" | "creator" = "learner") {
  H.slots = [];
  let els: El[] = [];
  const render = () => {
    H.i = 0;
    els = walk(SignupFields({ initialRole }) as ReactNode);
  };
  render();
  return {
    render,
    by: (name: string, value?: string) => els.filter((e) => e.props.name === name && (value === undefined || e.props.value === value)),
    one: (name: string, value?: string) => {
      const found = els.filter((e) => e.props.name === name && (value === undefined || e.props.value === value));
      expect(found, `${name}=${value}`).toHaveLength(1);
      return found[0];
    },
    toggle: () => els.find((e) => e.type === "button" && String(e.props["aria-label"]).endsWith("password"))!,
    type: (name: string, text: string) => {
      const target = els.find((e) => e.props.name === name)!;
      target.props.onChange({ target: { value: text } });
      render();
    },
    pickRole: (role: string) => {
      const radio = els.find((e) => e.props.name === "role" && e.props.value === role)!;
      radio.props.onChange({ target: { value: role, checked: true } });
      render();
    },
    click: (el: El) => {
      el.props.onClick();
      render();
    },
    handle: () => els.find((e) => e.type === InputGroup && e.props.name === "handle")?.props,
    checked: (name: string) => els.filter((e) => e.props.name === name && e.props.defaultChecked).map((e) => e.props.value),
    all: () => els,
  };
}

beforeEach(() => {
  H.values = undefined;
  H.errors = {};
});

describe("SignupFields: role and gateway radios are uncontrolled (audit B2)", () => {
  it("every radio uses defaultChecked and none uses `checked`", () => {
    const m = mount("creator");
    const radios = m.all().filter((e) => e.props.name === "role" || e.props.name === "preferredGateway");
    expect(radios).toHaveLength(4);
    for (const r of radios) {
      expect("checked" in r.props, `${r.props.name}=${r.props.value}`).toBe(false);
      expect(typeof r.props.defaultChecked).toBe("boolean");
    }
  });

  it("defaults come from the submitted values after a failed submit, not from the page's initialRole", () => {
    H.values = { role: "creator", preferredGateway: "easebuzz", name: "Asha" };
    const m = mount("learner");
    expect(m.checked("role")).toEqual(["creator"]);
    expect(m.checked("preferredGateway")).toEqual(["easebuzz"]);
  });

  it("falls back to initialRole and Razorpay on a fresh form", () => {
    expect(mount("learner").checked("role")).toEqual(["learner"]);
    expect(mount("creator").checked("role")).toEqual(["creator"]);
    expect(mount().checked("preferredGateway")).toEqual(["razorpay"]);
  });

  it("a pick drives the conditional handle field, and a later pick replaces it", () => {
    const m = mount("learner");
    expect(m.handle()).toBeUndefined();
    m.pickRole("creator");
    expect(m.handle()).toBeDefined();
    expect(m.checked("role")).toEqual(["creator"]);
    m.pickRole("learner");
    expect(m.handle()).toBeUndefined();
  });

  it("a pick wins over a stale submitted role", () => {
    H.values = { role: "creator" };
    const m = mount("learner");
    m.pickRole("learner");
    expect(m.checked("role")).toEqual(["learner"]);
    expect(m.handle()).toBeUndefined();
  });

  it("the submit label follows the role", () => {
    const label = (m: ReturnType<typeof mount>) => m.all().find((e) => e.props.pendingText)?.props.children;
    const m = mount("learner");
    expect(label(m)).toBe("Create account");
    m.pickRole("creator");
    expect(label(m)).toBe("Open your store");
  });
});

describe("SignupFields: the handle (audit B3, B6)", () => {
  it("starts empty for a creator, with the placeholder showing the shape", () => {
    const h = mount("creator").handle()!;
    expect(h.value).toBe("");
    expect(h.placeholder).toBe("your-name");
  });

  it("typing my-shop keeps the hyphen, character by character", () => {
    const m = mount("creator");
    let typed = "";
    for (const ch of "my-shop") {
      typed += ch;
      m.type("handle", typed);
      expect(m.handle()!.value).toBe(typed);
    }
    expect(m.handle()!.value).toBe("my-shop");
  });

  it("while typing: lowercases and drops characters outside a-z 0-9 hyphen, never starts with a hyphen, never trims a trailing one", () => {
    const m = mount("creator");
    m.type("handle", "My Shop_9!-");
    expect(m.handle()!.value).toBe("myshop9-");
    m.type("handle", "-lead");
    expect(m.handle()!.value).toBe("lead");
    m.type("handle", "---a-b");
    expect(m.handle()!.value).toBe("a-b");
  });

  it("caps what is typed at 30 characters", () => {
    const m = mount("creator");
    m.type("handle", "a".repeat(45));
    expect(m.handle()!.value).toBe("a".repeat(30));
    expect(m.handle()!.maxLength).toBe(30);
  });

  it("suggests a slug from the name, capped at 30 and not ending in a hyphen", () => {
    const m = mount("creator");
    m.type("name", "Asha Rao");
    expect(m.handle()!.value).toBe("asha-rao");
    m.type("name", "A Really Quite Remarkably Long Creator Name Of Doom");
    const v = m.handle()!.value as string;
    expect(v.length).toBeLessThanOrEqual(30);
    expect(v).toMatch(/^[a-z0-9-]+$/);
    expect(v.endsWith("-")).toBe(false);
    expect(v.startsWith("a-really-quite-remarkably-long")).toBe(true);
  });

  it("drops a hyphen that the 30-character cut leaves at the end", () => {
    const m = mount("creator");
    m.type("name", "abcdefghij abcdefghij abcdefg hij");
    expect(m.handle()!.value).toBe("abcdefghij-abcdefghij-abcdefg");
  });

  it("a name that is all symbols suggests nothing", () => {
    const m = mount("creator");
    m.type("name", "!!! ???");
    expect(m.handle()!.value).toBe("");
  });

  it("stops suggesting once the user has edited the handle", () => {
    const m = mount("creator");
    m.type("name", "Asha");
    expect(m.handle()!.value).toBe("asha");
    m.type("handle", "my-shop");
    m.type("name", "Asha Rao");
    expect(m.handle()!.value).toBe("my-shop");
  });

  it("still tracks the name when the role is switched to creator after the name was typed", () => {
    const m = mount("learner");
    m.type("name", "Ravi Kumar");
    m.pickRole("creator");
    expect(m.handle()!.value).toBe("ravi-kumar");
  });

  it("shows the store address as a path under the field, and the rule while empty", () => {
    const m = mount("creator");
    const text = (node: ReactNode): string =>
      typeof node === "string" ? node : walk(node).map((e) => e.props.children).flat().filter((c) => typeof c === "string").join("");
    expect(text(m.handle()!.hint)).toMatch(/3 to 30/);
    expect(text(m.handle()!.hint)).toMatch(/Starts with a letter or number/);
    m.type("handle", "my-shop");
    const hint = m.handle()!.hint;
    expect(text(hint)).toContain("Your store address:");
    expect(text(hint)).toContain("/c/my-shop");
    expect(text(hint)).not.toMatch(/\.(com|in)\b/);
  });

  it("restores a submitted handle as typed, so the suggestion does not overwrite it", () => {
    H.values = { handle: "my-shop", name: "Asha", role: "creator" };
    const m = mount("creator");
    expect(m.handle()!.value).toBe("my-shop");
    m.type("name", "Someone Else");
    expect(m.handle()!.value).toBe("my-shop");
  });

  it("passes the server's handle error to the field", () => {
    H.errors = { handle: "That handle is taken" };
    expect(mount("creator").handle()!.error).toBe("That handle is taken");
  });
});

describe("SignupFields: show/hide password", () => {
  it("toggles the field type and aria-pressed; the accessible name stays fixed so the state is announced once", () => {
    const m = mount();
    const pw = () => m.all().find((e) => e.type === InputGroup && e.props.name === "password")!.props;
    expect(pw().type).toBe("password");
    expect(m.toggle().props["aria-pressed"]).toBe(false);
    expect(m.toggle().props["aria-label"]).toBe("Show password");
    m.click(m.toggle());
    expect(pw().type).toBe("text");
    expect(m.toggle().props["aria-pressed"]).toBe(true);
    expect(m.toggle().props["aria-label"]).toBe("Show password");
    m.click(m.toggle());
    expect(pw().type).toBe("password");
  });

  it("the toggle is a type=button with a 44px touch target", () => {
    const t = mount().toggle().props;
    expect(t.type).toBe("button");
    expect(t.className).toContain("pointer-coarse:min-h-11");
    expect(t.className).toContain("min-w-11");
  });

  it("the toggle draws its own inset focus ring (the group ring does not show when the button itself is focused)", () => {
    const cls = mount().toggle().props.className as string;
    expect(cls).toContain("focus-visible:outline-2");
    expect(cls).toContain("focus-visible:-outline-offset-2");
    expect(cls).toContain("focus-visible:outline-ink");
    expect(cls).not.toContain("focus-visible:outline-none");
  });

  it("the password is uncontrolled: no value or defaultValue is ever set on it", () => {
    const pw = mount().all().find((e) => e.type === InputGroup && e.props.name === "password")!.props;
    expect("value" in pw).toBe(false);
    expect("defaultValue" in pw).toBe(false);
  });
});

describe("SignupFields: the test-mode note belongs to the gateway fieldset", () => {
  it("the fieldset is described by the note's id", () => {
    const els = mount().all();
    const set = els.filter((e) => e.type === "fieldset").at(-1)!;
    const note = els.find((e) => e.type === "p" && e.props.id)!;
    expect(set.props["aria-describedby"]).toBe(note.props.id);
    expect(note.props.children).toBe("Payments run in test mode.");
  });
});

describe("SignupFields: errors reach the fields", () => {
  it("passes each field's server error to its control", () => {
    H.errors = { name: "Enter your name", email: "Enter a valid email", password: "Use at least 8 characters" };
    const m = mount();
    expect(m.one("name").props.error).toBe("Enter your name");
    expect(m.one("email").props.error).toBe("Enter a valid email");
    expect(m.one("password").props.error).toBe("Use at least 8 characters");
  });
});

describe("SignupFields: restore and remount contract (mutation survivors M38, M40, M41, M42, M49)", () => {
  it("a handle suggested from a name with leading symbols never starts with a hyphen", () => {
    const m = mount("creator");
    m.type("name", "(Asha) Rao");
    expect(m.handle()!.value).toBe("asha-rao");
  });

  it("restores the submitted name, so a creator's suggested handle survives a failed submit", () => {
    H.values = { role: "creator", name: "Asha Rao" };
    const m = mount("creator");
    expect(m.handle()!.value).toBe("asha-rao");
  });

  it("text fields are keyed by name + the server-returned value: they remount when it changes, never while typing", () => {
    const keyOf = (values?: Record<string, string>) => {
      H.values = values;
      return mount("creator").one("email").key;
    };
    expect(keyOf(undefined)).toBe("email:");
    expect(keyOf({ email: "a@example.com" })).toBe("email:a@example.com");
    expect(keyOf({ email: "b@example.com" })).not.toBe(keyOf({ email: "a@example.com" }));
    const m = mount("creator");
    const before = m.one("name").key;
    m.type("name", "Asha");
    expect(m.one("name").key).toBe(before);
  });

  it("the pending text names what the submit is doing, per role", () => {
    const pending = (m: ReturnType<typeof mount>) => m.all().find((e) => e.props.pendingText)?.props.pendingText;
    const m = mount("learner");
    expect(pending(m)).toBe("Creating account\u2026");
    m.pickRole("creator");
    expect(pending(m)).toBe("Opening your store\u2026");
  });
});
