import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Skeleton, SkeletonText, SkeletonAvatar } from "./skeleton";
import {
  Skeleton as SkeletonFromUi,
  SkeletonText as SkeletonTextFromUi,
  SkeletonAvatar as SkeletonAvatarFromUi,
} from "@/components/ui";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("Skeleton", () => {
  it("renders a decorative element with aria-hidden", () => {
    const html = render(<Skeleton />);
    expect(html).toContain('aria-hidden="true"');
  });

  it("applies a background style (bg-line or similar)", () => {
    const html = render(<Skeleton />);
    expect(html).toMatch(/bg-line/);
  });

  it("accepts custom className", () => {
    const html = render(<Skeleton className="w-32 h-4" />);
    expect(html).toContain("w-32");
    expect(html).toContain("h-4");
  });

  it("no animate-pulse (anti-slop constraint)", () => {
    const html = render(<Skeleton />);
    expect(html).not.toContain("animate-pulse");
  });

  it("is re-exported from @/components/ui", () => {
    expect(SkeletonFromUi).toBe(Skeleton);
  });
});

describe("SkeletonText", () => {
  it("renders 3 lines by default", () => {
    const html = render(<SkeletonText />);
    // Each line is its own element
    const matches = (html.match(/bg-line/g) ?? []).length;
    expect(matches).toBe(3);
  });

  it("renders the requested number of lines", () => {
    const html = render(<SkeletonText lines={5} />);
    const matches = (html.match(/bg-line/g) ?? []).length;
    expect(matches).toBe(5);
  });

  it("is aria-hidden", () => {
    const html = render(<SkeletonText />);
    expect(html).toContain('aria-hidden="true"');
  });

  it("is re-exported from @/components/ui", () => {
    expect(SkeletonTextFromUi).toBe(SkeletonText);
  });
});

describe("SkeletonAvatar", () => {
  it("renders a circle with aria-hidden", () => {
    const html = render(<SkeletonAvatar />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("rounded-full");
  });

  it("applies the given size", () => {
    const html = render(<SkeletonAvatar size={56} />);
    expect(html).toContain("56px");
  });

  it("is re-exported from @/components/ui", () => {
    expect(SkeletonAvatarFromUi).toBe(SkeletonAvatar);
  });
});
