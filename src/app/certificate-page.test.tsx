import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({ cert: null as null | Record<string, unknown> }));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  usePathname: () => "/",
}));
const findUnique = vi.hoisted(() => vi.fn<(args: unknown) => Promise<unknown>>(async () => state.cert));
vi.mock("@/lib/db", () => ({ db: { certificate: { findUnique } } }));

import { BrandScope } from "@/components/Brand";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import { formatDate } from "@/lib/format";
import { functionProps } from "@/test/rsc-safe";
import CertificatePage, { metadata } from "./(site)/certificates/[publicId]/page";

const LIGHT = "#f59e0b"; // a creator colour that fails as text on white (about 2:1)
// 2026-03-04 20:00 UTC is 5 Mar 2026 01:30 in IST: the page must format in IST, not UTC.
const ISSUED = new Date("2026-03-04T20:00:00Z");

const certificate = (over: Record<string, unknown> = {}) => ({
  publicId: "CERT-AB12CD",
  learnerName: "Asha Verma",
  courseTitle: "Bookkeeping for Small Shops",
  creatorName: "Meera Nair",
  issuedAt: ISSUED,
  revokedAt: null,
  product: { creator: { brandColor: LIGHT } },
  ...over,
});

beforeEach(() => {
  state.cert = certificate();
  findUnique.mockClear();
});

const call = (publicId = "CERT-AB12CD") => CertificatePage({ params: Promise.resolve({ publicId }) } as never);
async function render(publicId?: string): Promise<string> {
  const tree: ReactNode = await call(publicId);
  return renderToStaticMarkup(<>{tree}</>);
}
const count = (html: string, needle: string) => html.split(needle).length - 1;
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

type Args = {
  where: { publicId: string };
  select: Record<string, unknown> & { product: { select: { creator: { select: Record<string, unknown> } } } };
};
const lastArgs = async (publicId?: string): Promise<Args> => {
  await render(publicId);
  expect(findUnique).toHaveBeenCalledTimes(1);
  return findUnique.mock.calls[0][0] as Args;
};
const keysDeep = (v: unknown): string[] =>
  v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => [k, ...keysDeep(x)]) : [];

describe("certificate: the public query is pinned (privacy)", () => {
  it("selects exactly the public fields", async () => {
    const { select } = await lastArgs();
    expect(select).toEqual({
      publicId: true,
      learnerName: true,
      courseTitle: true,
      creatorName: true,
      issuedAt: true,
      revokedAt: true,
      product: { select: { creator: { select: { brandColor: true } } } },
    });
  });

  it("never selects the learner's email or user, at any depth", async () => {
    const { select } = await lastArgs();
    const keys = keysDeep(select).map((k) => k.toLowerCase());
    for (const banned of ["email", "user", "userid", "include"]) expect(keys).not.toContain(banned);
    expect(JSON.stringify(select).toLowerCase()).not.toMatch(/email|user/);
  });

  it("does not leak an email present on the record into the markup", async () => {
    state.cert = certificate({ email: "asha@example.com", userId: "u_secret", user: { email: "asha@example.com" } });
    const html = await render();
    expect(html).not.toContain("asha@example.com");
    expect(html).not.toContain("u_secret");
  });

  it("looks the id up upper-cased, whatever case the link has", async () => {
    expect((await lastArgs("cert-ab12cd")).where).toEqual({ publicId: "CERT-AB12CD" });
    findUnique.mockClear();
    expect((await lastArgs("CeRt-Ab12Cd")).where).toEqual({ publicId: "CERT-AB12CD" });
  });
});

describe("certificate: states", () => {
  it("a valid certificate shows learner, course, creator, IST long date and id", async () => {
    const html = await render();
    const t = text(html);
    expect(t).toContain("Asha Verma");
    expect(t).toContain("Bookkeeping for Small Shops");
    expect(t).toContain("taught by Meera Nair");
    expect(formatDate(ISSUED, "long")).toBe("5 March 2026");
    expect(t).toContain("Issued 5 March 2026");
    expect(html).toContain('font-mono font-semibold tabular-nums text-ink">CERT-AB12CD<');
    expect(t).toContain("Verified certificate");
  });

  it("a missing certificate is a 404", async () => {
    state.cert = null;
    await expect(call("nope")).rejects.toThrow("NOT_FOUND");
  });

  it("a revoked certificate shows the notice and NOT the certificate", async () => {
    state.cert = certificate({ revokedAt: new Date("2026-04-01T00:00:00Z") });
    const html = await render();
    const t = text(html);
    expect(t).toContain("This certificate is no longer valid");
    expect(t).toContain("CERT-AB12CD");
    for (const hidden of ["Asha Verma", "Bookkeeping for Small Shops", "Meera Nair", "Certificate of completion", "Verified certificate", "5 March 2026"]) {
      expect(t).not.toContain(hidden);
    }
    expect(html).not.toContain("<article");
    expect(html).not.toContain("--brand");
  });

  it("makes no claim beyond what the lookup proves", async () => {
    const t = text(await render()).toLowerCase();
    for (const claim of ["accredit", "official", "recogni", "blockchain", "authentic"]) expect(t).not.toContain(claim);
  });
});

describe("certificate: public behaviour", () => {
  it("stays out of search indexes", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("certificate: tokens", () => {
  it("has no oversized radius, no important utility, no glyph tick, no raw brand text", async () => {
    const html = await render();
    expect(html).not.toMatch(/rounded-(2xl|3xl)/);
    expect(html).not.toMatch(/rounded-\[/);
    expect(html).not.toContain("✓");
    expect(html).not.toContain("tracking-[");
    const classes = [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    expect(classes.filter((c) => /(^|:)!|!$/.test(c))).toEqual([]);
    expect(classes).not.toContain("text-brand");
    expect(classes).not.toContain("border-brand");
    expect(html).not.toMatch(/(^|[\s"])(print:)?(text|border)-brand(?=[\s"])/);
  });

  it("colours the learner's name with the contrast-safe variable, in a BrandScope that defines it", async () => {
    const html = await render();
    expect(html).toMatch(/<h2 class="[^"]*text-\[color:var\(--brand-text\)\]/);
    expect(html).toMatch(/border-\[color:var\(--brand-ring\)\]/);
    expect(html).toContain("--brand-text:");
    expect(html).toContain("--brand-ring:");
    // the scope is fed the creator's colour (a pale colour is replaced by a readable text variant, not used raw)
    expect(html).toContain(`--brand:${LIGHT}`);
    expect(html).not.toMatch(new RegExp(`--brand-text:${LIGHT}`, "i"));
  });

  it("falls back inside BrandScope when the creator colour is not a hex value", async () => {
    state.cert = certificate({ product: { creator: { brandColor: "red;background:url(x)" } } });
    const html = await render();
    expect(html).not.toContain("url(x)");
  });

  it("shows the check as an aria-hidden svg icon", async () => {
    const html = await render();
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*>\s*<path d="m5 12.5 4.5 4.5L19 7.5"/);
  });

  it("sizes the logo by a non-important variant on its wrapper", async () => {
    const html = await render();
    expect(html).toContain('class="[&amp;&gt;span]:text-base"');
  });
});

describe("certificate: semantics", () => {
  it("has exactly one h1, and it is the document title, not the learner's name", async () => {
    const html = await render();
    expect(count(html, "<h1")).toBe(1);
    expect(html).toMatch(/<h1[^>]*>Certificate of completion<\/h1>/);
    expect(html).toMatch(/<h2[^>]*>Asha Verma<\/h2>/);
    expect(html).toMatch(/<h3[^>]*>Bookkeeping for Small Shops<\/h3>/);
  });

  it("orders headings without skipping a level", async () => {
    const levels = [...(await render()).matchAll(/<h([1-6])/g)].map((m) => Number(m[1]));
    expect(levels).toEqual([1, 2, 3]);
  });

  it("the revoked notice keeps a single h1", async () => {
    state.cert = certificate({ revokedAt: new Date() });
    expect(count(await render(), "<h1")).toBe(1);
  });
});

describe("certificate: print", () => {
  it("hides the toolbar and the footer note, and keeps the verification line", async () => {
    const html = await render();
    expect(html).toMatch(/<div class="[^"]*print:hidden[^"]*"><p[^>]*>.*Verified certificate/);
    expect(html).toMatch(/<p class="[^"]*print:hidden[^"]*">Anyone with this link/);
    expect(html).toContain("Print / save PDF");
    expect(html).toMatch(/print:hidden">Print/);
    // the footer line (id + date) is NOT hidden in print
    expect(html).not.toMatch(/print:hidden[^>]*>\s*<span>Issued/);
    const footer = html.slice(html.indexOf("border-t border-line"));
    expect(footer.slice(0, footer.indexOf("</div>"))).not.toContain("print:hidden");
  });

  it("the sheet prints without depending on background colour and never splits", async () => {
    const html = await render();
    const article = /<article class="([^"]*)"/.exec(html)![1];
    for (const cls of ["print:bg-white", "print:shadow-none", "print:break-inside-avoid", "border-2"]) expect(article.split(" ")).toContain(cls);
    expect(article).not.toMatch(/shadow-(?!none)/);
  });
});

describe("certificate: RSC boundary", () => {
  it("passes no function props, with PrintButton declared as the client boundary", async () => {
    const visited = new Set<unknown>();
    expect(functionProps(await call(), [PrintButton], { onVisit: (t) => visited.add(t) })).toEqual([]);
    // the walk really reached the page's components, so "[]" is not an empty walk
    for (const type of [BrandScope, Logo, PrintButton]) expect(visited.has(type)).toBe(true);
  });

  it("positive control: the same walk reports a function prop planted in the page tree", async () => {
    const planted = (
      <>
        {await call()}
        <button onClick={() => {}}>x</button>
      </>
    );
    expect(functionProps(planted, [PrintButton])).toEqual(["<button>.onClick"]);
  });
});
