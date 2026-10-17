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
        <ConfirmButton message="Delete this coupon?" aria-label="Delete coupon WELCOME10" className="btn">
          Delete
        </ConfirmButton>
      </form>,
    );
    expect(html).toBe('<form><button type="submit" class="btn" aria-label="Delete coupon WELCOME10">Delete</button></form>');
    expect(html).not.toContain("<dialog");
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
