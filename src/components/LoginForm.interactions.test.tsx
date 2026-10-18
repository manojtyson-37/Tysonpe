// Drives LoginForm's demo fill. useState is replaced with a tiny synchronous store (no DOM runner in this repo):
// LoginForm() is called as a plain function, the returned tree is walked, and a control's onClick/onChange is invoked
// the way React would. WHAT THIS CANNOT PROVE (needs a browser): that the browser autofill and the controlled values
// agree after a failed submit and React's form reset.
import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => ({ slots: [] as unknown[], i: 0, ref: { current: null as null | { value: string } } }));
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
  const useRef = () => H.ref;
  return { ...actual, default: { ...actual, useState, useRef }, useState, useRef };
});
vi.mock("@/app/actions/auth", () => ({ login: async () => ({}) }));

import { Input } from "./form";
import { LoginForm } from "./LoginForm";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type El = { type: unknown; props: P };

function walk(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach((c) => walk(c, out));
  else if (isValidElement(node)) {
    const props = node.props as P;
    out.push({ type: node.type, props });
    walk(props.children, out);
  }
  return out;
}
const textOf = (node: ReactNode): string =>
  node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(textOf).join("") : typeof node === "string" || typeof node === "number" ? String(node) : isValidElement(node) ? textOf((node.props as P).children) : "";

function mount(props: { next?: string; demoPassword?: string }) {
  H.slots = [];
  H.ref = { current: { value: "" } }; // the test plays the DOM: the password input
  let els: El[] = [];
  const render = () => {
    H.i = 0;
    els = walk(LoginForm(props) as ReactNode);
  };
  render();
  const field = (name: string) => els.find((e) => e.type === Input && e.props.name === name)!.props;
  const demo = (who: string) => els.find((e) => e.props.onClick && textOf(e.props.children).includes(who))!;
  return { render, field, demo, els: () => els };
}

describe("LoginForm demo fill", () => {
  it("Asha fills the creator account and the demo password", () => {
    const m = mount({ demoPassword: "pw-demo" });
    expect(m.field("email").value).toBe("");
    m.demo("Asha").props.onClick();
    m.render();
    expect(m.field("email").value).toBe("asha@demo.tysonpe.test");
    expect(H.ref.current!.value).toBe("pw-demo");
  });

  it("the password is uncontrolled: no value prop, the demo fill goes through the input's ref", () => {
    const m = mount({ demoPassword: "pw-demo" });
    expect("value" in m.field("password")).toBe(false);
    expect(m.field("password").ref).toBe(H.ref);
    m.demo("Ravi").props.onClick();
    m.render();
    expect("value" in m.field("password")).toBe(false);
    expect(H.ref.current!.value).toBe("pw-demo");
  });

  it("Ravi fills the learner account", () => {
    const m = mount({ demoPassword: "pw-demo" });
    m.demo("Ravi").props.onClick();
    m.render();
    expect(m.field("email").value).toBe("learner@demo.tysonpe.test");
    expect(H.ref.current!.value).toBe("pw-demo");
  });

  it("typing still works after a fill", () => {
    const m = mount({ demoPassword: "pw-demo" });
    m.demo("Asha").props.onClick();
    m.render();
    m.field("email").onChange({ target: { value: "me@example.com" } });
    m.render();
    expect(m.field("email").value).toBe("me@example.com");
  });

  it("both buttons are type=button, so a click never submits", () => {
    const m = mount({ demoPassword: "pw-demo" });
    for (const who of ["Asha", "Ravi"]) {
      expect(m.demo(who).props.type).toBe("button");
      expect(m.demo(who).props.variant).toBe("secondary");
    }
  });

  it("there is no demo block, and nothing to fill from, without a demo password", () => {
    const m = mount({});
    expect(m.els().filter((e) => e.props.onClick)).toHaveLength(0);
  });

  it("keeps the field names the action reads", () => {
    const m = mount({ next: "/library/p1" });
    expect(m.field("email").name).toBe("email");
    expect(m.field("password").name).toBe("password");
    expect(m.els().find((e) => e.props.name === "next")!.props.value).toBe("/library/p1");
  });
});
