// DEMO_HANDLE is read once, when lib/demo.ts loads, so each case sets the variable and loads the page afresh.
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));

async function renderHome(handle: string | undefined) {
  vi.resetModules();
  if (handle === undefined) vi.unstubAllEnvs();
  else vi.stubEnv("NEXT_PUBLIC_DEMO_HANDLE", handle);
  const { default: Home } = await import("./(site)/page");
  return renderToStaticMarkup(<Home />);
}
const statusBand = (html: string) => /<section\b[^>]*data-layout="sticky-left-rules"[^>]*>[\s\S]*?<\/section>/.exec(html)![0];
const count = (h: string, needle: string | RegExp) => (typeof needle === "string" ? h.split(needle).length - 1 : (h.match(needle) ?? []).length);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("landing: the sample storefront link in the status band", () => {
  it("is absent when the deployment sets no demo handle", async () => {
    const html = await renderHome("");
    expect(html).not.toContain("Open the sample storefront");
    expect(html).not.toContain('href="/c/');
  });

  it("is one quiet text link to /c/<handle> when a handle is set, and adds no second call to action", async () => {
    const without = await renderHome("");
    const html = await renderHome("asha-rao");
    const band = statusBand(html);
    expect(band).toMatch(/<a [^>]*href="\/c\/asha-rao"[^>]*>Open the sample storefront<\/a>/);
    expect(count(html, "Open the sample storefront")).toBe(1);
    expect(count(band, "btn-primary")).toBe(0);
    expect(count(band, /class="[^"]*\bbtn\b/g)).toBe(0);
    expect(count(html, "btn-primary")).toBe(count(without, "btn-primary"));
    // it sits under the band's heading, in the left column, with the band's only other links being none
    expect(band.indexOf("What works today")).toBeLessThan(band.indexOf("Open the sample storefront"));
    expect(count(band, "<a ")).toBe(1);
  });

  it("changes nothing else on the page", async () => {
    const strip = (h: string) => h.replace(/<a [^>]*href="\/c\/[^"]*"[^>]*>Open the sample storefront<\/a>/, "");
    expect(strip(await renderHome("asha-rao"))).toBe(await renderHome(""));
  });
});
