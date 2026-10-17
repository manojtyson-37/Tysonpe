import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const bound = vi.hoisted(() => ({ calls: [] as Array<[string, unknown[]]> }));
vi.mock("@/app/actions/community", () => {
  const stub = (name: string) => ({ bind: (_t: unknown, ...args: unknown[]) => { bound.calls.push([name, args]); return () => undefined; } });
  return { addCommentAction: stub("addCommentAction"), editCommentAction: stub("editCommentAction"), editPostAction: stub("editPostAction") };
});

import { classTokens, text } from "@/test/community-fixtures";
import { legacyStyleFindings } from "@/test/style-scan";
import { CommentForm } from "./CommentForm";
import { EditCommentForm } from "./EditCommentForm";
import { EditPostForm } from "./EditPostForm";

const field = (html: string, name: string) => new RegExp(`<(?:input|textarea)\\b[^>]*name="${name}"[^>]*>`).exec(html)![0];
const submit = (html: string) => /<button\b[^>]*type="submit"[^>]*>/.exec(html)![0];
const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");

describe("CommentForm", () => {
  const html = renderToStaticMarkup(<CommentForm postId="p_1" />);
  it("posts `body` (required, 1000 characters) to addCommentAction bound to the post", () => {
    expect(bound.calls).toContainEqual(["addCommentAction", ["p_1"]]);
    expect(field(html, "body")).toContain('maxLength="1000"');
    expect(field(html, "body")).toContain("required");
    expect(text(html)).toContain("Add a comment");
    expect(text(html)).toContain("Plain text, up to 1,000 characters.");
  });
  it("submits with the small primary Button primitive and a 44px touch floor", () => {
    expect(submit(html)).toMatch(/class="btn btn-primary btn-sm[^"]*pointer-coarse:min-h-11[^"]*"/);
    expect(html).toContain(">Comment</button>");
    expect(classTokens(html)).not.toContain("min-h-10");
  });
});

describe("EditCommentForm", () => {
  const html = renderToStaticMarkup(<EditCommentForm commentId="c_1" body="Glad to be here." />);
  it("edits `body` through editCommentAction bound to the comment, prefilled and limited", () => {
    expect(bound.calls).toContainEqual(["editCommentAction", ["c_1"]]);
    expect(html).toContain(">Glad to be here.</textarea>");
    expect(field(html, "body")).toContain('maxLength="1000"');
    expect(field(html, "body")).toContain("required");
  });
  it("saves with the small primary Button primitive", () => {
    expect(submit(html)).toMatch(/class="btn btn-primary btn-sm[^"]*pointer-coarse:min-h-11[^"]*"/);
    expect(html).toContain(">Save changes</button>");
  });
});

describe("EditPostForm", () => {
  const html = renderToStaticMarkup(<EditPostForm postId="p_1" title="Welcome" body="Say hello." />);
  it("edits `title` (optional, 120) and `body` (required, 2000) through editPostAction bound to the post, prefilled", () => {
    expect(bound.calls).toContainEqual(["editPostAction", ["p_1"]]);
    expect(field(html, "title")).toContain('maxLength="120"');
    expect(field(html, "title")).toContain('value="Welcome"');
    expect(field(html, "title")).not.toContain("required");
    expect(field(html, "body")).toContain('maxLength="2000"');
    expect(field(html, "body")).toContain("required");
    expect(html).toContain(">Say hello.</textarea>");
  });
  it("saves with the small primary Button primitive", () => {
    expect(submit(html)).toMatch(/class="btn btn-primary btn-sm[^"]*pointer-coarse:min-h-11[^"]*"/);
  });
});

describe("community forms: source", () => {
  it.each(["./CommentForm.tsx", "./EditCommentForm.tsx", "./EditPostForm.tsx", "./PostComposer.tsx"])("%s passes the style scan and hand-types no button class", (f) => {
    const src = read(f);
    expect(legacyStyleFindings(src)).toEqual([]);
    expect(src).not.toMatch(/className="btn|min-h-10/);
  });
});
