import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, ButtonLink, buttonClass } from "./button";
import { IconPlus } from "../icons";

describe("buttonClass", () => {
  it("maps variant and size to token classes", () => {
    expect(buttonClass({})).toBe("btn btn-primary");
    expect(buttonClass({ variant: "secondary", size: "sm" })).toBe("btn btn-secondary btn-sm");
    expect(buttonClass({ variant: "ghost", size: "lg" })).toBe("btn btn-ghost btn-lg");
    expect(buttonClass({ variant: "danger" })).toBe("btn btn-danger");
  });
});

describe("Button", () => {
  it("renders a real button that defaults to type=button", () => {
    const html = renderToStaticMarkup(<Button>Create payment link</Button>);
    expect(html).toMatch(/^<button /);
    expect(html).toContain('type="button"');
    expect(html).toContain('class="btn btn-primary"');
    expect(html).toContain("Create payment link");
    expect(html).not.toContain("aria-busy");
  });

  it("lets a form submit button opt in to type=submit", () => {
    expect(renderToStaticMarkup(<Button type="submit">Save</Button>)).toContain('type="submit"');
  });

  it("applies variant, size and extra className", () => {
    const html = renderToStaticMarkup(
      <Button variant="danger" size="sm" className="w-full">Delete</Button>,
    );
    expect(html).toContain('class="btn btn-danger btn-sm w-full"');
  });

  it("renders the icon slot before the label, hidden from assistive tech", () => {
    const html = renderToStaticMarkup(<Button icon={<IconPlus />}>New product</Button>);
    expect(html.indexOf("<svg")).toBeGreaterThan(-1);
    expect(html.indexOf("<svg")).toBeLessThan(html.indexOf("New product"));
    expect(html).toContain('aria-hidden="true"');
  });

  it("when loading: aria-busy, disabled, spinner shown, label kept so width does not change", () => {
    const html = renderToStaticMarkup(<Button loading icon={<IconPlus />}>Pay now</Button>);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
    expect(html).toContain("animate-spin");
    expect(html).toContain("Pay now");
    expect(html).toContain("invisible");
    // Icon and label stay in layout (invisible) so the width is unchanged; one spinner overlays them.
    expect(html.match(/animate-spin/g)).toHaveLength(1);
    expect(html.match(/<svg/g)).toHaveLength(2);
  });

  it("is disabled but not busy when only disabled", () => {
    const html = renderToStaticMarkup(<Button disabled>Save</Button>);
    expect(html).toContain("disabled");
    expect(html).not.toContain("aria-busy");
    expect(html).not.toContain("animate-spin");
  });
});

describe("ButtonLink", () => {
  it("renders an anchor with the same button classes", () => {
    const html = renderToStaticMarkup(
      <ButtonLink href="/dashboard/products/new" variant="secondary" size="lg">New product</ButtonLink>,
    );
    expect(html).toMatch(/^<a /);
    expect(html).toContain('href="/dashboard/products/new"');
    expect(html).toContain('class="btn btn-secondary btn-lg"');
    expect(html).toContain("New product");
  });

  it("renders the icon slot", () => {
    const html = renderToStaticMarkup(<ButtonLink href="/x" icon={<IconPlus />}>Add</ButtonLink>);
    expect(html).toContain("<svg");
  });
});
