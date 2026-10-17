import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/app/actions/community", () => ({ createPostAction: { bind: () => () => undefined } }));

import { classTokens, text } from "@/test/community-fixtures";
import { legacyStyleFindings } from "@/test/style-scan";
import { PostComposer } from "./PostComposer";

const html = renderToStaticMarkup(<PostComposer channelId="ch_1" />);
const tag = (name: string) => new RegExp(`<(?:input|textarea)\\b[^>]*name="${name}"[^>]*>`).exec(html)![0];

describe("PostComposer", () => {
  it("is a hairline-ruled form, not a card box", () => {
    expect(html).toMatch(/^<form [^>]*class="space-y-3 border-b border-line pb-5"/);
    expect(classTokens(html)).not.toContain("card");
    expect(html).not.toContain("rounded-xl");
  });

  it("keeps the field names and limits: an optional 120-character title and a required 2000-character body", () => {
    expect(tag("title")).toContain('maxLength="120"');
    expect(tag("title")).not.toContain("required");
    expect(tag("body")).toContain('maxLength="2000"');
    expect(tag("body")).toContain("required");
    expect(text(html)).toContain("Title (optional)");
    expect(text(html)).toContain("Start a conversation");
    expect(text(html)).toContain("Plain text, up to 2,000 characters.");
  });

  it("submits with the real primary Button primitive labelled Post", () => {
    const button = /<button\b[^>]*type="submit"[^>]*>/.exec(html)![0];
    expect(button).toMatch(/class="btn btn-primary[^"]*"/);
    expect(button).not.toContain("btn-sm");
    expect(html).toMatch(/>Post<\/button>/);
  });

  it("passes the style scan and hand-types no button class", () => {
    const src = readFileSync(new URL("./PostComposer.tsx", import.meta.url), "utf8");
    expect(legacyStyleFindings(src)).toEqual([]);
  });
});
