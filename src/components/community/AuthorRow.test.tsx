import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { legacyStyleFindings } from "@/test/style-scan";
import { AuthorRow } from "./AuthorRow";

const render = (editedAt: Date | null) =>
  renderToStaticMarkup(<AuthorRow name="Meera Rao" isCreator={false} createdAt={new Date("2026-03-01T10:00:00Z")} editedAt={editedAt} />);

describe("AuthorRow", () => {
  it("hides the middle-dot separator from assistive tech (it is decoration, not content)", () => {
    const html = render(new Date("2026-03-02T10:00:00Z"));
    expect(html).toContain('<span aria-hidden="true"> · </span>');
    expect(html).toContain("edited");
    expect(html.replace(/<span aria-hidden="true">[^<]*<\/span>/g, "")).not.toContain("·");
  });

  it("has no separator or edited note when never edited", () => {
    const html = render(null);
    expect(html).not.toContain("·");
    expect(html).not.toContain("edited");
  });

  it("passes the style scan", () => {
    expect(legacyStyleFindings(readFileSync(new URL("./AuthorRow.tsx", import.meta.url), "utf8"))).toEqual([]);
  });
});
