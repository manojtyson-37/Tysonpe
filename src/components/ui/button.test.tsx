import type { ReactElement } from "react";
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

  it("renders the icon slot before the label", () => {
    const html = renderToStaticMarkup(<Button icon={<IconPlus />}>New product</Button>);
    expect(html.indexOf("<svg")).toBeGreaterThan(-1);
    expect(html.indexOf("<svg")).toBeLessThan(html.indexOf("New product"));
  });

  it("when loading: busy and aria-disabled but still focusable, spinner shown, label stays in the accessibility tree", () => {
    const html = renderToStaticMarkup(<Button loading icon={<IconPlus />}>Pay now</Button>);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-disabled="true"');
    // No disabled attribute: a disabled button would drop keyboard focus to <body>.
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
    expect(html).toContain("animate-spin");
    expect(html).toContain("Pay now");
    // opacity-0 keeps the label in layout (width unchanged) and in the accessibility tree; `invisible` would remove both.
    expect(html).toContain("opacity-0");
    expect(html).not.toContain("invisible");
    expect(html.match(/animate-spin/g)).toHaveLength(1);
    expect(html.match(/<svg/g)).toHaveLength(2);
  });

  it("blocks activation while loading (preventDefault, user handler not called) and passes clicks through otherwise", () => {
    const calls: string[] = [];
    const onClick = () => calls.push("click");
    const click = (props: Parameters<typeof Button>[0]) => {
      const el = Button(props) as ReactElement<{ onClick: (e: { preventDefault: () => void }) => void }>;
      el.props.onClick({ preventDefault: () => calls.push("prevented") });
    };
    click({ loading: true, onClick, children: "Pay" });
    expect(calls).toEqual(["prevented"]);
    calls.length = 0;
    click({ onClick, children: "Pay" });
    expect(calls).toEqual(["click"]);
  });

  // The SubmitButton path: `loading` with no caller onClick. This is the branch that builds the handler on its own,
  // and the one that stops a loading type=submit button from submitting its form a second time.
  it("blocks activation while loading even when the caller passed no onClick", () => {
    const calls: string[] = [];
    const el = Button({ loading: true, children: "Pay" }) as ReactElement<{ onClick?: (e: { preventDefault: () => void }) => void }>;
    expect(typeof el.props.onClick).toBe("function");
    el.props.onClick?.({ preventDefault: () => calls.push("prevented") });
    expect(calls).toEqual(["prevented"]);
  });

  it("attaches no handler at all when neither loading nor onClick is set", () => {
    const el = Button({ children: "Apply" }) as ReactElement<{ onClick?: unknown }>;
    expect(el.props.onClick).toBeUndefined();
  });

  it("keeps the real disabled attribute for the disabled prop, even while loading", () => {
    expect(renderToStaticMarkup(<Button loading disabled>Pay</Button>)).toMatch(/\sdisabled(=|\s|>)/);
  });

  it("is disabled but not busy when only disabled", () => {
    const html = renderToStaticMarkup(<Button disabled>Save</Button>);
    expect(html).toMatch(/\sdisabled(=|\s|>)/);
    expect(html).not.toContain("aria-busy");
    expect(html).not.toContain("aria-disabled");
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
