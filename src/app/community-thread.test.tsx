import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const M = vi.hoisted(() => {
  const action = (name: string) => {
    const fn = (() => undefined) as unknown as { bind: (...a: unknown[]) => unknown };
    fn.bind = (_this: unknown, ...args: unknown[]) => Object.assign(() => undefined, { action: name, args });
    return Object.assign(fn, { action: name });
  };
  return {
    requireUser: vi.fn<(next?: string) => Promise<unknown>>(),
    resolveCommunity: vi.fn<(handle: string, userId: string) => Promise<unknown>>(),
    getThread: vi.fn<(userId: string, postId: string, opts: { after?: string }) => Promise<unknown>>(),
    notFound: vi.fn(() => {
      throw new Error("NEXT_NOT_FOUND");
    }),
    toggleLikeAction: action("toggleLikeAction"),
    setPinnedAction: action("setPinnedAction"),
    deletePostAction: action("deletePostAction"),
    deleteCommentAction: action("deleteCommentAction"),
    addCommentAction: action("addCommentAction"),
    editPostAction: action("editPostAction"),
    editCommentAction: action("editCommentAction"),
    banMemberAction: action("banMemberAction"),
  };
});

vi.mock("next/navigation", () => ({ usePathname: () => "/c/meera/community/general/p/p_1", notFound: M.notFound }));
vi.mock("@/lib/auth/session", () => ({ requireUser: M.requireUser }));
vi.mock("@/lib/community/viewer", () => ({ resolveCommunity: M.resolveCommunity }));
vi.mock("@/lib/community/posts", () => ({ getThread: M.getThread }));
vi.mock("@/app/actions/community", () => ({
  toggleLikeAction: M.toggleLikeAction,
  setPinnedAction: M.setPinnedAction,
  deletePostAction: M.deletePostAction,
  deleteCommentAction: M.deleteCommentAction,
  addCommentAction: M.addCommentAction,
  editPostAction: M.editPostAction,
  editCommentAction: M.editCommentAction,
}));
vi.mock("@/app/actions/community-admin", () => ({ banMemberAction: M.banMemberAction }));

import { ConfirmButton } from "@/components/ConfirmButton";
import { CommentForm } from "@/components/community/CommentForm";
import { EditCommentForm } from "@/components/community/EditCommentForm";
import { EditPostForm } from "@/components/community/EditPostForm";
import { LikeSubmit } from "@/components/community/LikeSubmit";
import { ButtonLink } from "@/components/ui";
import { IconArrowLeft } from "@/components/icons";
import { AppError } from "@/lib/errors";
import { boundAction, classTokens, comment, creator, elements as walk, learner, post, text } from "@/test/community-fixtures";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import ThreadPage from "./(site)/c/[handle]/community/[channel]/p/[postId]/page";

const BOUNDARIES: unknown[] = [ConfirmButton, CommentForm, EditCommentForm, EditPostForm, LikeSubmit];
const PAGE_PATH = new URL("./(site)/c/[handle]/community/[channel]/p/[postId]/page.tsx", import.meta.url);
const USER = { id: "u_1", name: "Ravi Kumar" };
const elements = (node: ReactNode) => walk(node, BOUNDARIES);

type Thread = { post: ReturnType<typeof post>; channel: { id: string; slug: string; name: string; creatorId: string }; comments: ReturnType<typeof comment>[]; nextCommentCursor: string | null };
const thread = (over: Partial<Thread> = {}): Thread => ({
  post: post({ commentCount: 2 }),
  channel: { id: "ch_1", slug: "general", name: "General", creatorId: "cr_1" },
  comments: [comment(), comment({ id: "c_2", body: "Same here.", author: { id: "u_4", name: "Arjun Rao", isCreator: false } })],
  nextCommentCursor: null,
  ...over,
});

function setup({ viewer = learner(), t = thread() }: { viewer?: Record<string, unknown>; t?: Thread } = {}) {
  M.requireUser.mockResolvedValue(USER);
  M.resolveCommunity.mockResolvedValue({ creator: creator(), viewer });
  M.getThread.mockResolvedValue(t);
}
beforeEach(() => {
  for (const m of Object.values(M)) if (typeof m === "function" && "mockReset" in m) (m as { mockReset: () => void }).mockReset();
  M.notFound.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
  setup();
});

const page = async (sp: Record<string, string | string[] | undefined> = {}, slug = "general") =>
  (await (ThreadPage as (p: { params: Promise<{ handle: string; channel: string; postId: string }>; searchParams: Promise<typeof sp> }) => Promise<ReactNode>)({
    params: Promise.resolve({ handle: "meera", channel: slug, postId: "p_1" }),
    searchParams: Promise.resolve(sp),
  })) as ReactNode;
const render = async (sp: Record<string, string | string[] | undefined> = {}) => renderToStaticMarkup(<>{await page(sp)}</>);
const commentItems = (html: string) => [...html.matchAll(/<li class="py-4">([\s\S]*?)<\/li>/g)].map((m) => m[1]);

describe("thread: back link and post", () => {
  it("goes back to the channel with the drawn arrow icon, not a glyph, at 44px on touch", async () => {
    const html = await render();
    expect(html).not.toContain("←");
    const link = /<a [^>]*href="\/c\/meera\/community\/general"[^>]*>(.*?)<\/a>/.exec(html)!;
    expect(link[0]).toContain("pointer-coarse:min-h-11");
    expect(link[1]).toMatch(/^<svg [^>]*aria-hidden="true"/);
    expect(text(link[1])).toBe(" General");
    expect(elements(await page()).some((e) => e.type === IconArrowLeft)).toBe(true);
  });

  it("shows the post as a thread: h2 title, no comments link, no card", async () => {
    const html = await render();
    expect(html).toMatch(/<h2 class="[^"]*">Welcome to the batch<\/h2>/);
    expect(html).toMatch(/<article class="min-w-0">/);
    expect(classTokens(html)).not.toContain("card");
    expect(html).not.toContain("rounded-xl");
    expect(html).not.toContain("badge");
  });

  it("offers 'Edit your post' only to someone who can edit, in a ruled details with the form inside", async () => {
    expect(await render()).not.toContain("Edit your post");
    setup({ t: thread({ post: post({ canEdit: true, commentCount: 2 }) }) });
    const html = await render();
    expect(html).toMatch(/<details class="group border-y border-line"><summary [^>]*min-h-11[^>]*>Edit your post<svg/);
    const form = elements(await page()).find((e) => e.type === EditPostForm)!;
    expect(form.props).toEqual({ postId: "p_1", title: "Welcome to the batch", body: "Say hello and tell us what you want to build." });
    expect(classTokens(html)).not.toContain("card");
  });
});

describe("thread: comments", () => {
  it("is a ruled ordered list under a count heading, one item per comment, with an Avatar author row and no pills", async () => {
    const html = await render();
    expect(html).toMatch(/<section aria-label="Comments" class="space-y-4"><h2 class="[^"]*">2 comments<\/h2>/);
    expect(html).toMatch(/<ol class="divide-y divide-line border-y border-line">/);
    const items = commentItems(html);
    expect(items).toHaveLength(2);
    expect(text(items[0])).toContain("Neha Iyer");
    expect(text(items[0])).toContain("Glad to be here.");
    expect(items[0]).toContain('aria-hidden="true"'); // the Avatar tile
    expect(items[0]).toMatch(/<time dateTime="2026-10-15T07:00:00.000Z">/);
    for (const t of ["badge", "card", "rounded-full"]) expect(classTokens(html), t).not.toContain(t);
  });

  it("counts '1 comment' in the singular", async () => {
    setup({ t: thread({ post: post({ commentCount: 1 }), comments: [comment()] }) });
    expect(text(await render())).toContain("1 comment");
    expect(text(await render())).not.toContain("1 comments");
  });

  it("marks the creator's comment with the plain word 'Creator' and a member's with nothing", async () => {
    setup({ t: thread({ comments: [comment({ author: { id: "u_cr", name: "Meera Shah", isCreator: true } }), comment({ id: "c_2" })] }) });
    const [first, second] = commentItems(await render());
    expect(first).toContain('<span class="text-xs font-semibold text-ink">Creator</span>');
    expect(second).not.toContain("Creator");
  });

  it("shows 'edited' only on an edited comment", async () => {
    setup({ t: thread({ comments: [comment({ editedAt: new Date("2026-10-16T00:00:00Z") }), comment({ id: "c_2" })] }) });
    const [first, second] = commentItems(await render());
    expect(first).toContain('<span aria-hidden="true"> · </span>edited');
    expect(second).not.toContain("edited");
  });

  it("each comment has a like button bound to that comment", async () => {
    const likes = elements(await page()).filter((e) => e.type === LikeSubmit);
    // Post first, then the two comments.
    expect(likes.map((l) => boundAction(l).args)).toEqual([["post", "p_1"], ["comment", "c_1"], ["comment", "c_2"]]);
    expect(likes[1].props).toEqual({ count: 1, liked: false });
  });

  it("an empty thread says so on a ruled line, not a card; an empty LATER page does not claim there are none", async () => {
    setup({ t: thread({ post: post({ commentCount: 0 }), comments: [] }) });
    const html = await render();
    expect(html).toContain('<p class="border-y border-line py-4 text-sm text-muted">No comments yet.</p>');
    expect(text(html)).toContain("0 comments");
    expect(text(await render({ after: "c_9" }))).not.toContain("No comments yet.");
  });

  it("wraps a long comment and a long name; nothing is cut off", async () => {
    const body = "a".repeat(300);
    setup({ t: thread({ comments: [comment({ body, author: { id: "u_9", name: "Venkata Subramaniam Ramachandran Iyer-Krishnamurthy", isCreator: false } })] }) });
    const html = await render();
    expect(html).toContain(`>${body}</p>`);
    expect(html).toMatch(/<p class="mt-2 whitespace-pre-wrap break-words[^"]*">a+<\/p>/);
    expect(html).toMatch(/<span class="min-w-0 break-words[^"]*">Venkata Subramaniam/);
    for (const c of ["truncate", "text-ellipsis"]) expect(html).not.toContain(c);
  });
});

describe("thread: comment actions", () => {
  it("Delete comment is a danger ConfirmButton with its own confirm label, only where allowed", async () => {
    expect(elements(await page()).filter((e) => e.type === ConfirmButton)).toHaveLength(0);
    setup({ t: thread({ comments: [comment({ canDelete: true }), comment({ id: "c_2" })] }) });
    const [del, ...rest] = elements(await page()).filter((e) => e.type === ConfirmButton);
    expect(rest).toHaveLength(0);
    expect(del.props).toMatchObject({
      variant: "danger",
      size: "sm",
      confirmLabel: "Delete comment",
      "aria-label": "Delete comment by Neha Iyer",
      message: "Delete this comment?",
      children: "Delete",
    });
    expect(del.props.className).toContain("pointer-coarse:min-h-11");
    expect(del.props.className).not.toMatch(/\bbtn\b/);
    expect(boundAction(del)).toEqual(expect.objectContaining({ action: "deleteCommentAction", args: ["c_1"] }));
  });

  it("the creator can remove a member from a comment, but not themselves", async () => {
    setup({ viewer: learner({ isCreator: true }), t: thread({ comments: [comment(), comment({ id: "c_2", author: { id: "u_cr", name: "Meera Shah", isCreator: true } })] }) });
    const bans = elements(await page()).filter((e) => e.type === ConfirmButton && e.props.confirmLabel === "Remove from community" && e.ancestors.some((a) => a.type === "li"));
    expect(bans).toHaveLength(1);
    expect(bans[0].props).toMatchObject({
      variant: "danger",
      size: "sm",
      "aria-label": "Remove from community: Neha Iyer",
      message: "Remove Neha Iyer from this community? They lose access to every channel until you unban them.",
    });
    expect(boundAction(bans[0])).toEqual(expect.objectContaining({ action: "banMemberAction", args: ["u_3"] }));
  });

  it("Edit is offered on the viewer's own comments only, with the form inside a ruled details", async () => {
    setup({ t: thread({ comments: [comment({ author: { id: "u_1", name: "Ravi Kumar", isCreator: false } }), comment({ id: "c_2" })] }) });
    const html = await render();
    const [mine, theirs] = commentItems(html);
    expect(mine).toMatch(/<details class="group mt-3 border-t border-line"><summary [^>]*min-h-11[^>]*><span>Edit<span class="sr-only"> comment by Ravi Kumar<\/span><\/span><svg/);
    expect(theirs).not.toContain("<details");
    const form = elements(await page()).find((e) => e.type === EditCommentForm)!;
    expect(form.props).toEqual({ commentId: "c_1", body: "Glad to be here." });
  });
});

describe("thread: paging and the comment form", () => {
  it("shows More comments (secondary) with the cursor when more follow, and Back (ghost) when on a later page", async () => {
    setup({ t: thread({ nextCommentCursor: "c_2" }) });
    const links = elements(await page({ after: "c_1" })).filter((e) => e.type === ButtonLink);
    expect(links.map((l) => [l.props.children, l.props.variant, l.props.href])).toEqual([
      ["More comments", "secondary", "/c/meera/community/general/p/p_1?after=c_2"],
      ["Back to the first comments", "ghost", "/c/meera/community/general/p/p_1"],
    ]);
    for (const l of links) expect(l.props.className).toContain("pointer-coarse:min-h-11");
  });

  it("shows neither on a short first page", async () => {
    const html = await render();
    expect(html).not.toContain("More comments");
    expect(html).not.toContain("Back to the first comments");
  });

  it("ends with the comment form for this post, under a rule", async () => {
    const form = elements(await page()).find((e) => e.type === CommentForm)!;
    expect(form.props).toEqual({ postId: "p_1" });
    expect(form.ancestors.at(-1)!.props.className).toBe("border-t border-line pt-5");
  });
});

describe("thread: queries and access", () => {
  it("loads the thread for this user and post, cutting the cursor to 64 characters", async () => {
    await page();
    expect(M.requireUser).toHaveBeenCalledWith("/c/meera/community/general/p/p_1");
    expect(M.resolveCommunity).toHaveBeenCalledWith("meera", "u_1");
    expect(M.getThread).toHaveBeenCalledWith("u_1", "p_1", { after: undefined });
    await page({ after: "x".repeat(100) });
    expect(M.getThread).toHaveBeenLastCalledWith("u_1", "p_1", { after: "x".repeat(64) });
    await page({ after: "" });
    expect(M.getThread).toHaveBeenLastCalledWith("u_1", "p_1", { after: undefined });
    await page({ after: ["a", "b"] });
    expect(M.getThread).toHaveBeenLastCalledWith("u_1", "p_1", { after: undefined });
  });

  it("is a 404 for an unknown community, an AppError from the thread, and a URL that does not describe the post's creator or channel", async () => {
    M.resolveCommunity.mockResolvedValue(null);
    await expect(page()).rejects.toThrow("NEXT_NOT_FOUND");
    setup();
    M.getThread.mockRejectedValue(new AppError("not_found", "Not found."));
    await expect(page()).rejects.toThrow("NEXT_NOT_FOUND");
    setup({ t: thread({ channel: { id: "ch_9", slug: "general", name: "General", creatorId: "cr_OTHER" } }) });
    await expect(page()).rejects.toThrow("NEXT_NOT_FOUND");
    setup();
    await expect(page({}, "some-other-channel")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("rethrows anything that is not an AppError", async () => {
    M.getThread.mockRejectedValue(new Error("db down"));
    await expect(page()).rejects.toThrow("db down");
  });
});

describe("thread: RSC boundary and source", () => {
  it("passes no function props except bound server actions on forms", async () => {
    setup({
      viewer: learner({ isCreator: true }),
      t: thread({
        post: post({ canEdit: true, canDelete: true, commentCount: 2 }),
        comments: [comment({ canDelete: true, author: { id: "u_1", name: "Ravi Kumar", isCreator: false } }), comment({ id: "c_2" })],
        nextCommentCursor: "c_2",
      }),
    });
    const visited = new Set<unknown>();
    const found = functionProps(await page({ after: "c_0" }), BOUNDARIES, { onVisit: (t) => visited.add(t) });
    expect(found.every((f) => f === "<form>.action")).toBe(true);
    expect(found.length).toBeGreaterThanOrEqual(6);
    for (const t of [ConfirmButton, CommentForm, EditCommentForm, EditPostForm, LikeSubmit, ButtonLink]) expect(visited.has(t)).toBe(true);
  });

  it("positive control: a planted handler is reported", async () => {
    expect(functionProps(<>{await page()}<button onClick={() => {}}>x</button></>, BOUNDARIES)).toContain("<button>.onClick");
  });

  it("passes the style scan and uses no hand-typed button, badge or creator pill", () => {
    const src = readFileSync(PAGE_PATH, "utf8");
    expect(legacyStyleFindings(src)).toEqual([]);
    expect(src).not.toMatch(/creatorBadge|\bbtn\b|\bbadge\b/);
  });
});
