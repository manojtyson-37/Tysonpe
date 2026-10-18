// ActionForm keeps the values a failed submit sent (React 19 resets the form after every action) and moves focus to the
// first invalid field. useActionState, useRef and useEffect are replaced so the reducer it builds can be driven
// directly and the effect run by hand (no DOM runner in this repo).
// WHAT THIS CANNOT PROVE (needs a browser): that focus lands after the keyed remount and survives React's form reset.
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

type Reducer = (prev: unknown, fd: FormData) => Promise<{ values?: Record<string, string> } | undefined>;
const H = vi.hoisted(() => ({
  reducer: undefined as undefined | Reducer,
  state: undefined as unknown,
  effects: [] as Array<{ fn: () => void; deps: unknown[] | undefined }>,
  form: {} as { querySelector: (selector: string) => { focus: () => void } | null },
  /** The one ref object useRef hands out; `current` is whatever `form` is now (the test plays the DOM). */
  formRef: {} as { current: unknown },
}));
Object.defineProperty(H.formRef, "current", { get: () => H.form });
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useActionState = (fn: Reducer) => {
    H.reducer = fn;
    return [H.state, () => {}];
  };
  const useRef = () => H.formRef;
  const useEffect = (fn: () => void, deps?: unknown[]) => {
    H.effects.push({ fn, deps });
  };
  return { ...actual, default: { ...actual, useActionState, useRef, useEffect }, useActionState, useRef, useEffect };
});

import { ActionForm } from "./form";

async function submit(entries: Record<string, string | File>, action: (prev: unknown, fd: FormData) => Promise<object | undefined>) {
  renderToStaticMarkup(<ActionForm action={action as never}>x</ActionForm>);
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return H.reducer!(undefined, fd);
}

describe("ActionForm: the values it keeps for a failed submit", () => {
  it("keeps what the user typed, never any password-named field, never React's $ACTION_* plumbing", async () => {
    const res = await submit(
      { email: "a@example.com", name: "Asha", password: "hunter22", Password: "x", newPassword: "y", confirm_password: "z", $ACTION_ID_abc: "1", $ACTION_REF_1: "2" },
      async () => ({ fields: { email: "bad" } }),
    );
    expect(res?.values).toEqual({ email: "a@example.com", name: "Asha" });
  });

  it("keeps no file uploads (only string entries)", async () => {
    const res = await submit({ title: "t", cover: new File(["x"], "c.png") }, async () => ({ error: "no" }));
    expect(res?.values).toEqual({ title: "t" });
  });

  it("a successful action (undefined result) keeps nothing", async () => {
    expect(await submit({ email: "a@example.com", password: "p" }, async () => undefined)).toBeUndefined();
  });

  it("returns the action's own error and fields next to the values", async () => {
    const res = await submit({ email: "a@example.com" }, async () => ({ error: "Nope", fields: { email: "Bad" } }));
    expect(res).toEqual({ error: "Nope", fields: { email: "Bad" }, values: { email: "a@example.com" } });
  });
});

describe("ActionForm: focus after a failed submit", () => {
  const run = (state: unknown) => {
    H.state = state;
    H.effects = [];
    const selectors: string[] = [];
    const focus = vi.fn();
    H.form = {
      querySelector: (selector: string) => {
        selectors.push(selector);
        return { focus };
      },
    };
    renderToStaticMarkup(<ActionForm action={(async () => undefined) as never}>x</ActionForm>);
    expect(H.effects).toHaveLength(1);
    H.effects[0].fn();
    return { selectors, focus, deps: H.effects[0].deps };
  };

  it("focuses the first aria-invalid control when the server returned field errors", () => {
    const { selectors, focus } = run({ fields: { email: "Bad" }, values: {} });
    expect(selectors).toEqual(['[aria-invalid="true"]']);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("does nothing on a fresh form, a top-level error alone, or a successful result", () => {
    for (const state of [undefined, { error: "Too many attempts." }]) {
      const { selectors, focus } = run(state);
      expect(selectors).toEqual([]);
      expect(focus).not.toHaveBeenCalled();
    }
  });

  it("runs again for each new result, not only the first", () => {
    const state = { fields: { email: "Bad" } };
    expect(run(state).deps).toEqual([state]);
  });

  it("does not throw when no control is invalid (a 'Saved' result carries fields.saved)", () => {
    H.state = { fields: { saved: "1" } };
    H.effects = [];
    const selectors: string[] = [];
    H.form = {
      querySelector: (selector: string) => {
        selectors.push(selector);
        return null;
      },
    };
    renderToStaticMarkup(<ActionForm action={(async () => undefined) as never}>x</ActionForm>);
    expect(() => H.effects[0].fn()).not.toThrow();
    // exactly the invalid-control lookup: no fallback to the first input or the form that could steal focus
    expect(selectors).toEqual(['[aria-invalid="true"]']);
  });

  it("hands the ref to the <form> element (without it the effect has nothing to search and focus never moves)", () => {
    H.state = undefined;
    H.effects = [];
    const provider = ActionForm({ action: (async () => undefined) as never, children: "x" });
    const form = (provider.props as { children: { type: unknown; props: { ref?: unknown } } }).children;
    expect(form.type).toBe("form");
    expect(form.props.ref).toBe(H.formRef);
  });
});
