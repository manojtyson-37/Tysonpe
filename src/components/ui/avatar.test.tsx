import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar } from "./avatar";
import { Avatar as AvatarFromUi } from "@/components/ui";
import { Avatar as BrandAvatar } from "@/components/Brand";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("Avatar", () => {
  it("renders the first letter, uppercased, as a decorative tile", () => {
    const html = render(<Avatar name="  meera rao" />);
    expect(html).toContain("aria-hidden");
    expect(html).toContain(">M<");
    expect(html).toContain("bg-brand text-brand-ink");
    expect(html).toContain("rounded-control");
  });

  it("renders an empty tile for a blank name", () => {
    expect(render(<Avatar name="   " />)).toContain("></span>");
  });

  it.each([
    ["sm", "size-8 text-sm"],
    ["md", "size-10 text-base"],
    ["lg", "size-14 text-xl"],
    ["xl", "size-20 text-3xl"],
  ] as const)("named size %s uses %s", (size, cls) => {
    expect(render(<Avatar name="A" size={size} />)).toContain(cls);
  });

  it("defaults to the md size", () => {
    expect(render(<Avatar name="A" />)).toContain("size-10 text-base");
  });

  it("numeric size sets width, height and a proportional font size", () => {
    const html = render(<Avatar name="A" size={80} />);
    expect(html).toContain("width:80px");
    expect(html).toContain("height:80px");
    expect(html).toContain("font-size:32px");
    expect(html).not.toContain("size-10");
  });

  it("renders an image instead of the letter when src is given", () => {
    const html = render(<Avatar name="Meera" src="/a.png" />);
    expect(html).toContain('<img src="/a.png" alt=""');
    expect(html).toContain("object-cover");
    expect(html).not.toContain(">M<");
  });

  it("uses the alt text for the image when provided", () => {
    expect(render(<Avatar name="Meera" src="/a.png" alt="Meera Rao" />)).toContain('alt="Meera Rao"');
  });

  it("has no gradient and appends a className passthrough", () => {
    const html = render(<Avatar name="A" className="ml-2" />);
    expect(html).not.toMatch(/gradient/);
    expect(html).toContain(" ml-2");
  });

  it("is re-exported and the Brand Avatar keeps its numeric size contract", () => {
    expect(AvatarFromUi).toBe(Avatar);
    const html = render(<BrandAvatar name="meera" size={80} />);
    expect(html).toContain(">M<");
    expect(html).toContain("width:80px");
    expect(render(<BrandAvatar name="meera" />)).toContain("width:56px");
  });
});
