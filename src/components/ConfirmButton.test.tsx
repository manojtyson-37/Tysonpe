import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Spies between ConfirmButton and its two collaborators. Button is the real one (wrapped to record its props); the
// ConfirmDialog is a stub that records its props and, when `seen.showDialog` is on, prints its confirm label, so the
// closed dialog (which renders nothing in SSR) can still be asked what it was given. confirmReducer stays real.
// `passthrough` hands the props to the REAL ConfirmDialog instead of the stub's null.
const seen = vi.hoisted(() => ({ button: [] as Array<Record<string, unknown>>, dialog: [] as Array<Record<string, unknown>>, showDialog: false, passthrough: false }));
vi.mock("@/components/ui/button", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/button")>();
  return { ...actual, Button: (props: Parameters<typeof actual.Button>[0]) => (seen.button.push(props), actual.Button(props)) };
});
vi.mock("@/components/ui/dialog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/dialog")>();
  return {
    ...actual,
    ConfirmDialog: (props: Parameters<typeof actual.ConfirmDialog>[0]) => {
      seen.dialog.push(props);
      if (seen.passthrough) return <actual.ConfirmDialog {...props} />;
      return seen.showDialog ? <output data-confirm-label="">{props.confirmLabel as ReactNode}</output> : null;
    },
  };
});

import { ConfirmButton, confirmButtonLook, submitWithSubmitter } from "./ConfirmButton";

afterEach(() => {
  seen.button.length = 0;
  seen.dialog.length = 0;
  seen.showDialog = false;
  seen.passthrough = false;
});

describe("ConfirmButton", () => {
  it("renders a submit button with the caller's class and label, and no dialog until clicked", () => {
    const html = renderToStaticMarkup(
      <form>
        <ConfirmButton message="Delete this coupon?" className="btn btn-danger btn-sm">
          Delete
        </ConfirmButton>
      </form>,
    );
    expect(html).toBe('<form><button type="submit" class="btn btn-danger btn-sm">Delete</button></form>');
    // The stub renders nothing whatever it is given, so the markup alone proves nothing: ask what it was told.
    expect(seen.dialog.at(-1)).toMatchObject({ open: false });
  });

  it("puts aria-label on the trigger button (it names the action for screen readers) and renders no dialog", () => {
    const html = renderToStaticMarkup(
      <form>
        <ConfirmButton message="Delete this coupon?" aria-label="Delete coupon WELCOME10" className="btn">
          Delete
        </ConfirmButton>
      </form>,
    );
    expect(html).toBe('<form><button type="submit" class="btn btn-danger btn-sm" aria-label="Delete coupon WELCOME10">Delete</button></form>');
    expect(html).not.toContain("<dialog");
    expect(seen.dialog.at(-1)).toMatchObject({ open: false });
  });

  // The server never renders a Dialog (it mounts after hydration), so this cannot tell open from closed by markup
  // alone; it checks that the real component accepts what ConfirmButton hands it and adds nothing to the page.
  it("accepts the props and adds no SSR markup", () => {
    seen.passthrough = true;
    const html = renderToStaticMarkup(<form><ConfirmButton message="Delete this coupon?">Delete</ConfirmButton></form>);
    expect(html).toBe('<form><button type="submit" class="btn btn-danger btn-sm">Delete</button></form>');
    expect(seen.dialog.at(-1)).toMatchObject({ open: false, title: "Delete this coupon?", confirmLabel: "Delete" });
  });
});

describe("ConfirmButton look", () => {
  const html = (node: React.ReactNode) => renderToStaticMarkup(<form>{node}</form>);

  it("defaults to the small danger Button primitive when given no look at all", () => {
    expect(html(<ConfirmButton message="Delete this lesson?">Delete</ConfirmButton>)).toBe(
      '<form><button type="submit" class="btn btn-danger btn-sm">Delete</button></form>',
    );
  });

  it("takes variant and size, and they win over a legacy class string", () => {
    expect(html(<ConfirmButton message="m" variant="secondary" size="md">Archive</ConfirmButton>)).toContain('class="btn btn-secondary"');
    expect(html(<ConfirmButton message="m" variant="primary" size="lg" className="btn btn-danger btn-sm">Go</ConfirmButton>)).toContain(
      'class="btn btn-primary btn-lg"',
    );
  });

  it("keeps a legacy class string working: its variant and size are read back out and extras survive once", () => {
    const out = html(<ConfirmButton message="m" className="btn btn-danger btn-sm min-h-10">Delete</ConfirmButton>);
    expect(out).toContain('class="btn btn-danger btn-sm min-h-10"');
    const classes = /class="([^"]*)"/.exec(out)![1].split(" ");
    expect(classes.filter((c) => c === "btn")).toHaveLength(1);
  });

  it("treats a class string with no btn token as extra classes on the default look", () => {
    expect(html(<ConfirmButton message="m" className="ml-auto">Delete</ConfirmButton>)).toContain('class="btn btn-danger btn-sm ml-auto"');
  });

  it("what a bare `btn` renders: the single btn token with ConfirmButton's own danger / small look", () => {
    const out = html(<ConfirmButton message="m" className="btn">Delete</ConfirmButton>);
    expect(out).toBe('<form><button type="submit" class="btn btn-danger btn-sm">Delete</button></form>');
  });

  it("reads btn-danger / btn-sm even without a btn token, and still emits btn exactly once", () => {
    const out = html(<ConfirmButton message="m" className="btn-danger btn-sm min-h-10">Delete</ConfirmButton>);
    expect(out).toContain('class="btn btn-danger btn-sm min-h-10"');
    expect(/class="([^"]*)"/.exec(out)![1].split(" ").filter((c) => c === "btn")).toHaveLength(1);
  });

  it("keeps a lone legacy variant on the default size, and a lone size on the default variant", () => {
    expect(html(<ConfirmButton message="m" className="btn btn-secondary">Archive</ConfirmButton>)).toContain('class="btn btn-secondary btn-sm"');
    expect(html(<ConfirmButton message="m" className="btn btn-lg">Delete</ConfirmButton>)).toContain('class="btn btn-danger btn-lg"');
  });

  it("confirmButtonLook starts from danger / sm and returns only the non-button classes as extras", () => {
    expect(confirmButtonLook(undefined)).toEqual({ variant: "danger", size: "sm", className: undefined });
    expect(confirmButtonLook("btn")).toEqual({ variant: "danger", size: "sm", className: undefined });
    expect(confirmButtonLook("btn btn-ghost btn-lg ml-auto  w-full")).toEqual({ variant: "ghost", size: "lg", className: "ml-auto w-full" });
    expect(confirmButtonLook("pointer-coarse:min-h-11")).toEqual({ variant: "danger", size: "sm", className: "pointer-coarse:min-h-11" });
  });
});

describe("ConfirmButton confirmLabel", () => {
  const html = (node: React.ReactNode) => renderToStaticMarkup(<form>{node}</form>);

  it("gives the dialog's confirm button the explicit confirmLabel, not the trigger's children", () => {
    seen.showDialog = true;
    const out = html(<ConfirmButton message="Delete this lesson?" confirmLabel="Delete lesson">Delete</ConfirmButton>);
    expect(out).toContain('<output data-confirm-label="">Delete lesson</output>');
    expect(out).toContain(">Delete</button>"); // the trigger's own label is unchanged
    expect(seen.dialog.at(-1)).toMatchObject({ title: "Delete this lesson?", confirmLabel: "Delete lesson" });
  });

  it("falls back to the trigger's children when confirmLabel is omitted", () => {
    seen.showDialog = true;
    const out = html(<ConfirmButton message="Refund this order?">Mark refunded</ConfirmButton>);
    expect(out).toContain('<output data-confirm-label="">Mark refunded</output>');
  });
});

describe("ConfirmButton ref", () => {
  it("hands one ref object to both the trigger Button and the dialog's focus return, so requestSubmit and focus-back find the node", () => {
    renderToStaticMarkup(<form><ConfirmButton message="m">Delete</ConfirmButton></form>);
    const ref = seen.button.at(-1)?.ref as { current: unknown } | undefined;
    expect(ref).toEqual({ current: null }); // a ref object (SSR never attaches it)
    expect(seen.dialog.at(-1)?.returnFocusRef).toBe(ref);
  });
});

describe("submitWithSubmitter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("submits the original form exactly once, with the button as the submitter", () => {
    const requestSubmit = vi.fn();
    const button = { form: { requestSubmit } };
    expect(submitWithSubmitter(button)).toBe(true);
    expect(requestSubmit).toHaveBeenCalledTimes(1);
    expect(requestSubmit).toHaveBeenCalledWith(button);
  });

  it("reports false and warns instead of silently doing nothing when the button has no form", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(submitWithSubmitter({ form: null })).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("ConfirmButton");
  });

  it("treats a missing button (ref not attached) like a missing form", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(submitWithSubmitter(null)).toBe(false);
  });
});
