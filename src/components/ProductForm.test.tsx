import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GST_RATES, PRODUCT_TYPES } from "@/lib/validation";
import { PriceField, ProductForm } from "./ProductForm";

const noop = async () => undefined;
const render = (props: Partial<Parameters<typeof ProductForm>[0]> = {}) =>
  renderToStaticMarkup(<ProductForm action={noop} submitLabel="Create product" {...props} />);

/** The first form control with this name attribute, as a tag string. */
const control = (html: string, name: string) => html.match(new RegExp(`<(?:input|select|textarea)\\b[^>]*\\bname="${name}"[^>]*>`))?.[0] ?? "";
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"))?.[1];

describe("ProductForm: fields", () => {
  it("renders exactly the seven fields the server action parses, by name", () => {
    const html = render();
    for (const name of ["title", "tagline", "type", "billing", "price", "gstRatePct", "description"]) {
      expect(control(html, name), name).not.toBe("");
    }
    expect([...html.matchAll(/\sname="([^"]+)"/g)].map((m) => m[1]).sort()).toEqual(
      ["billing", "description", "gstRatePct", "price", "tagline", "title", "type"],
    );
  });

  it("gives every control a label that points at its id", () => {
    const html = render();
    const labels: Record<string, string> = {
      title: "Title",
      tagline: "One-line pitch",
      type: "Type",
      billing: "Billing",
      price: "Price (₹, GST-inclusive)",
      gstRatePct: "GST rate",
      description: "Description",
    };
    for (const [name, text] of Object.entries(labels)) {
      const id = attr(control(html, name), "id");
      expect(id, name).toBeTruthy();
      expect(html, name).toContain(`<label for="${id}" class="label">${text}</label>`);
    }
  });

  it("renders no two elements with the same id", () => {
    const ids = [...render().matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("title and price are required; the rest are not", () => {
    const html = render();
    expect(control(html, "title")).toContain("required");
    expect(control(html, "price")).toContain("required");
    for (const name of ["tagline", "type", "billing", "gstRatePct", "description"]) expect(control(html, name), name).not.toContain("required");
  });
});

describe("ProductForm: price", () => {
  it("is a decimal keypad field that the browser does not autofill, with a rupee prefix", () => {
    const html = render();
    const price = control(html, "price");
    expect(attr(price, "inputmode")).toBe("decimal");
    expect(attr(price, "autocomplete")).toBe("off");
    expect(attr(price, "placeholder")).toBe("499");
    expect(html).toContain(">₹</span>");
  });

  it("describes the price with its hint", () => {
    const html = render();
    const hintId = attr(control(html, "price"), "aria-describedby");
    expect(hintId).toMatch(/-hint$/);
    expect(html).toContain(`<p id="${hintId}" class="hint">Enter 0 for a free product.</p>`);
  });

  it("with an error: aria-invalid, role=alert, and the hint is replaced", () => {
    const html = renderToStaticMarkup(<PriceField defaultValue="12" error="Enter a valid price." />);
    const price = control(html, "price");
    expect(attr(price, "aria-invalid")).toBe("true");
    const errId = attr(price, "aria-describedby");
    expect(errId).toMatch(/-err$/);
    expect(html).toContain(`<p id="${errId}" role="alert" class="err">Enter a valid price.</p>`);
    expect(html).not.toContain("Enter 0 for a free product.");
  });
});

describe("ProductForm: defaults", () => {
  it("a new form starts as an 18% one-time course with empty text fields", () => {
    const html = render();
    expect(attr(control(html, "title"), "value")).toBe("");
    expect(attr(control(html, "price"), "value")).toBe("");
    expect(html).toMatch(/<option value="course" selected="">Course<\/option>/);
    expect(html).toMatch(/<option value="one_time" selected="">One-time<\/option>/);
    expect(html).toMatch(/<option value="18" selected="">18%<\/option>/);
  });

  it("offers every product type and GST rate", () => {
    const html = render();
    for (const t of PRODUCT_TYPES) expect(html).toContain(`<option value="${t}"`);
    for (const g of GST_RATES) expect(html).toContain(`<option value="${g}"`);
  });

  it("renders the defaults it is given, escaped", () => {
    const html = render({
      defaults: {
        title: 'Tax "101" & GST',
        tagline: "File on time",
        description: "Line one\nLine two",
        type: "webinar",
        price: "1499.50",
        gstRatePct: 12,
        billing: "monthly",
      },
    });
    expect(attr(control(html, "title"), "value")).toBe("Tax &quot;101&quot; &amp; GST");
    expect(attr(control(html, "tagline"), "value")).toBe("File on time");
    expect(attr(control(html, "price"), "value")).toBe("1499.50");
    expect(html).toMatch(/<option value="webinar" selected="">Live webinar<\/option>/);
    expect(html).toMatch(/<option value="monthly" selected="">Monthly<\/option>/);
    expect(html).toMatch(/<option value="12" selected="">12%<\/option>/);
    expect(html).toContain("Line one\nLine two</textarea>");
  });
});

describe("ProductForm: copy and submit", () => {
  it("keeps the honest billing hint, tied to the billing select", () => {
    const html = render();
    const hintId = attr(control(html, "billing"), "aria-describedby");
    expect(html).toContain(`<p id="${hintId}" class="hint">Monthly is a label for now; recurring billing ships later.</p>`);
  });

  it("submits with the label it is given, as a primary submit Button", () => {
    const html = render({ submitLabel: "Save changes" });
    const button = html.match(/<button\b[^>]*>Save changes<\/button>/)?.[0] ?? "";
    expect(button).toContain('type="submit"');
    expect(attr(button, "class")).toBe("btn btn-primary");
  });

  it("has no ad-hoc radius or card classes and no emoji", () => {
    const html = render();
    expect(html).not.toContain("rounded-xl");
    expect(html).not.toMatch(/class="[^"]*\bcard\b/);
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
