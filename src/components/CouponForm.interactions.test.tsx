// CouponForm's discount-type switch is state: the select's onChange stores the pick, and the pick (else the value the
// server action sent back, else the coupon's own kind) decides whether the third field is `percent` or `flat`. The repo
// has no DOM runner, so (as BrandColorField.test.tsx and QuizEditor.interactions.test.tsx do) useState is a tiny
// synchronous store, useContext returns whatever the test says the last submit returned, and CouponFields is called as a
// plain function. WHAT THIS CANNOT PROVE: that React re-renders after setState, that the browser fires `change` on the
// select, or that React 19's post-action form reset keeps the picked kind on screen; those need a real DOM.
import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => ({ slots: [] as unknown[], i: 0, ctx: undefined as unknown }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = (init: unknown) => {
    const idx = H.i++;
    if (!(idx in H.slots)) H.slots[idx] = init;
    const set = (v: unknown) => {
      H.slots[idx] = v;
    };
    return [H.slots[idx], set];
  };
  const useContext = () => H.ctx;
  const useId = () => ":r0:";
  return { ...actual, default: { ...actual, useState, useContext, useId }, useState, useContext, useId };
});

import { Field } from "./form";
import { CouponForm } from "./CouponForm";
import { rupeesFieldValue } from "@/lib/coupon";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Coupon = NonNullable<Parameters<typeof CouponForm>[0]["coupon"]>;
const action = async () => undefined;
const percentCoupon: Coupon = { code: "DIWALI20", percentOff: 20, flatOffPaise: null, maxRedemptions: 50, expiresAt: null };
const flatCoupon: Coupon = { ...percentCoupon, percentOff: null, flatOffPaise: 199999 };

function fieldsOf(node: ReactNode, out: P[] = []): P[] {
  if (Array.isArray(node)) {
    node.forEach((c) => fieldsOf(c, out));
    return out;
  }
  if (!isValidElement(node)) return out;
  const props = node.props as P;
  if (node.type === Field) out.push(props);
  fieldsOf(props.children, out);
  return out;
}

/** CouponFields is private; it is the first child of the ActionForm that CouponForm returns. */
function mountFields(coupon?: Coupon) {
  const form = CouponForm({ action, coupon, submitLabel: "Save" }) as { props: P };
  const first = (Array.isArray(form.props.children) ? form.props.children : [form.props.children])[0] as { type: (p: P) => ReactNode; props: P };
  const render = () => {
    H.i = 0;
    return fieldsOf(first.type(first.props));
  };
  return render;
}
const byName = (fields: P[], name: string) => fields.find((f) => f.name === name);
const names = (fields: P[]) => fields.map((f) => f.name);
/** The element Field renders: its `key` is what makes React discard the uncontrolled input when it changes. */
const fieldKey = (props: P) => (Field(props as never) as unknown as { key: string }).key;

beforeEach(() => {
  H.slots = [];
  H.i = 0;
  H.ctx = undefined;
});

describe("CouponForm: the discount-type select drives the third field", () => {
  it("starts on the coupon's own kind: percent for a new coupon and a percent coupon, flat for a flat one", () => {
    expect(names(mountFields()())).toEqual(["code", "kind", "percent", "maxRedemptions", "expiresAt"]);
    expect(names(mountFields(percentCoupon)())).toEqual(["code", "kind", "percent", "maxRedemptions", "expiresAt"]);
    expect(names(mountFields(flatCoupon)())).toEqual(["code", "kind", "flat", "maxRedemptions", "expiresAt"]);
  });

  it("the select is wired to a change handler, and picking `flat` swaps percent for flat on the next render", () => {
    const render = mountFields(percentCoupon);
    const kind = byName(render(), "kind")!;
    expect(kind.as).toBe("select");
    expect(typeof kind.onChange).toBe("function");
    kind.onChange("flat");
    const after = render();
    expect(names(after)).toEqual(["code", "kind", "flat", "maxRedemptions", "expiresAt"]);
    expect(byName(after, "kind")!.defaultValue).toBe("flat");
  });

  it("picking `percent` on a flat coupon swaps back, so the pick wins over the coupon's stored kind", () => {
    const render = mountFields(flatCoupon);
    byName(render(), "kind")!.onChange("percent");
    const after = render();
    expect(names(after)).toContain("percent");
    expect(names(after)).not.toContain("flat");
    expect(byName(after, "kind")!.defaultValue).toBe("percent");
  });

  it("the pick wins over the kind the last submit returned (the user changed their mind after an error)", () => {
    H.ctx = { values: { kind: "flat", flat: "abc" } };
    const render = mountFields(percentCoupon);
    expect(names(render())).toContain("flat");
    byName(render(), "kind")!.onChange("percent");
    expect(names(render())).toContain("percent");
    expect(names(render())).not.toContain("flat");
  });

  it("after a failed submit with no new pick, the submitted kind is kept (React resets the form, the state must not)", () => {
    H.ctx = { values: { kind: "flat", flat: "abc" } };
    const fields = mountFields(percentCoupon)();
    expect(names(fields)).toEqual(["code", "kind", "flat", "maxRedemptions", "expiresAt"]);
    expect(byName(fields, "kind")!.defaultValue).toBe("flat");
    H.ctx = { values: { kind: "percent" } };
    expect(names(mountFields(flatCoupon)())).toContain("percent");
  });
});

describe("CouponForm: percent and flat are different inputs that remount on a switch", () => {
  it("flat: the ₹ prefix is on the flat input itself, prefilled from paise with integer arithmetic", () => {
    const flat = byName(mountFields(flatCoupon)(), "flat")!;
    expect(flat.prefix).toBe("₹");
    expect(flat.label).toBe("Amount (₹)");
    expect(flat.type).toBeUndefined();
    expect(flat.defaultValue).toBe("1999.99");
    expect(flat.defaultValue).toBe(rupeesFieldValue(199999));
    expect(rupeesFieldValue(199999)).toBe("1999.99");
    expect(rupeesFieldValue(7)).toBe("0.07");
  });

  it("percent: a number input with no ₹ prefix, prefilled with the percentage", () => {
    const percent = byName(mountFields(percentCoupon)(), "percent")!;
    expect(percent.type).toBe("number");
    expect(percent.prefix).toBeUndefined();
    expect(percent.defaultValue).toBe(20);
    expect(byName(mountFields()(), "percent")!.defaultValue).toBe("");
  });

  it("the two fields never share a remount key, so a switch discards the old input and its typed text", () => {
    const render = mountFields(percentCoupon);
    const percent = byName(render(), "percent")!;
    byName(render(), "kind")!.onChange("flat");
    const flat = byName(render(), "flat")!;
    expect(fieldKey(percent)).toBe("percent:");
    expect(fieldKey(flat)).toBe("flat:");
    expect(fieldKey(percent)).not.toBe(fieldKey(flat));
  });

  it("a value the server returned is part of the key, so a failed submit remounts the input with what was typed", () => {
    H.ctx = { values: { kind: "flat", flat: "12.5" } };
    const flat = byName(mountFields(percentCoupon)(), "flat")!;
    expect(fieldKey(flat)).toBe("flat:12.5");
    // And the rendered input carries the typed text, not the stored amount.
    const el = Field(flat as never) as unknown as { props: P };
    expect(el.props.defaultValue).toBe("12.5");
    expect(el.props.prefix).toBe("₹");
  });
});
