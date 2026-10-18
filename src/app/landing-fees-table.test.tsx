// The landing page allows at most two micro-labels on a phone. The stacked fees table must not print its cell labels as
// uppercase tracked micro-labels below sm, so it asks the Table primitive for sentence-case labels.
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));

import Home from "./(site)/page";
import { FeeCalc } from "@/components/demo/FeeCalc";
import { headRowTags } from "@/test/table-rows";

const html = renderToStaticMarkup(<Home />);
const fees = [...html.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].map((m) => m[0]).find((s) => s.includes('id="fees-h"'))!;

describe("landing fees table: phone labels", () => {
  it("is stacked, so the cell labels print below sm", () => {
    expect(fees).toContain('data-stack="true"');
    expect(fees).toContain("max-sm:[&amp;_td:not([colspan])]:before:content-[attr(data-label)]");
  });

  it("prints the cell labels in sentence case: no uppercase or tracking at the stack prefix", () => {
    expect(fees).not.toContain("before:uppercase");
    expect(fees).not.toContain("before:tracking-");
  });

  it("the calculator's table (also on the landing page) does the same", () => {
    const calc = renderToStaticMarkup(<FeeCalc />);
    expect(calc).toContain('data-stack="true"');
    expect(calc).not.toContain("before:uppercase");
  });

  it("marks the header rows of both tables role=row, so their columnheaders have a row to belong to", () => {
    expect(headRowTags(fees)).toEqual(['<tr role="row">']);
    expect(headRowTags(renderToStaticMarkup(<FeeCalc />))).toEqual(['<tr role="row">']);
  });
});
