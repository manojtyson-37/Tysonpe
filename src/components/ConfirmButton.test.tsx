import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConfirmButton } from "./ConfirmButton";

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
});
