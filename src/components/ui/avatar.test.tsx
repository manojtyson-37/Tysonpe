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

  it("numeric size floors the font at 12px so a small tile stays readable", () => {
    // 20 * 0.4 is 8px, below the floor; 80 * 0.4 is 32px and is used as-is.
    expect(render(<Avatar name="A" size={20} />)).toContain("font-size:12px");
    expect(render(<Avatar name="A" size={24} />)).toContain("font-size:12px");
    // Exactly at the floor: 30 * 0.4 is 12px.
    expect(render(<Avatar name="A" size={30} />)).toContain("font-size:12px");
    expect(render(<Avatar name="A" size={20} />)).not.toContain("font-size:8px");
    expect(render(<Avatar name="A" size={40} />)).toContain("font-size:16px");
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

  it("layers the image over the letter so a failed photo falls back to it", () => {
    const html = render(<Avatar name="Meera" src="/a.png" />);
    // The letter is always rendered, directly followed by the photo that covers it.
    expect(html).toContain(">M<img ");
    const img = html.match(/<img\b[^>]*>/)?.[0] ?? "";
    expect(img).toContain('src="/a.png"');
    expect(img).toContain('alt=""');
    expect(img).toMatch(/class="[^"]*\babsolute\b[^"]*\binset-0\b[^"]*"/);
    expect(img).toContain("size-full");
    expect(img).toContain("object-cover");
    // The tile is the positioning context for the absolute photo.
    expect(html.match(/<span\b[^>]*>/)?.[0]).toMatch(/class="relative /);
  });

  it("renders no img at all without a src", () => {
    expect(render(<Avatar name="Meera" />)).not.toContain("<img");
  });

  it("uses the alt text for the image when provided", () => {
    const html = render(<Avatar name="Meera" src="/a.png" alt="Meera Rao" />);
    expect(html).toContain('alt="Meera Rao"');
    // With alt text the tile is meaningful, so it is no longer hidden from assistive tech.
    expect(html).not.toContain("aria-hidden");
    expect(render(<Avatar name="Meera" src="/a.png" />)).toContain("aria-hidden");
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
