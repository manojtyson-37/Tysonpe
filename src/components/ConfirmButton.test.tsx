import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConfirmButton, submitWithSubmitter } from "./ConfirmButton";

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
  });

  it("puts aria-label on the trigger button (it names the action for screen readers) and renders no dialog", () => {
    const html = renderToStaticMarkup(
      <form>
        <ConfirmButton message="Delete this coupon?" aria-label="Delete coupon WELCOME10" className="btn btn-danger btn-sm">
          Delete
        </ConfirmButton>
      </form>,
    );
    expect(html).toBe('<form><button type="submit" class="btn btn-danger btn-sm" aria-label="Delete coupon WELCOME10">Delete</button></form>');
    expect(html).not.toContain("<dialog");
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

  it("accepts an explicit confirmLabel without changing the trigger's visible label", () => {
    const out = html(<ConfirmButton message="Delete this lesson?" confirmLabel="Delete lesson">Delete</ConfirmButton>);
    expect(out).toContain(">Delete</button>");
    expect(out).not.toContain("Delete lesson"); // the dialog is closed, so its label is not in the markup yet
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
