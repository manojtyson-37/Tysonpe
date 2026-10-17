import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const M = vi.hoisted(() => {
  const action = (name: string) => {
    const fn = (() => undefined) as unknown as { bind: (...a: unknown[]) => unknown };
    fn.bind = (_this: unknown, ...args: unknown[]) => Object.assign(() => undefined, { action: name, args });
    return Object.assign(fn, { action: name });
  };
  return {
    toggleLikeAction: action("toggleLikeAction"),
    setPinnedAction: action("setPinnedAction"),
    deletePostAction: action("deletePostAction"),
    banMemberAction: action("banMemberAction"),
  };
});
vi.mock("@/app/actions/community", () => ({ toggleLikeAction: M.toggleLikeAction, setPinnedAction: M.setPinnedAction, deletePostAction: M.deletePostAction }));
vi.mock("@/app/actions/community-admin", () => ({ banMemberAction: M.banMemberAction }));

import { ConfirmButton } from "@/components/ConfirmButton";
import { Avatar, Button, ButtonLink } from "@/components/ui";
import { IconPin } from "@/components/icons";
import { boundAction, classTokens, elements as walk, post, text } from "@/test/community-fixtures";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import { LikeSubmit } from "./LikeSubmit";
import { PostCard } from "./PostCard";

const BOUNDARIES: unknown[] = [ConfirmButton, LikeSubmit];
const HREF = "/c/meera/community/general/p/p_1";
type Over = Partial<Parameters<typeof PostCard>[0]>;
const card = (over: Over = {}) => <PostCard post={post()} href={HREF} viewerIsCreator={false} {...over} />;
const render = (over: Over = {}) => renderToStaticMarkup(card(over));
const els = (over: Over = {}) => walk(card(over) as ReactNode, BOUNDARIES);
const confirms = (over: Over = {}) => els(over).filter((e) => e.type === ConfirmButton);

describe("PostCard: the author row has no pills", () => {
  it("shows an Avatar tile, the name, and a stamped time", () => {
    const e = els();
    expect(e.find((x) => x.type === Avatar)!.props).toEqual({ name: "Ravi Kumar", size: "sm" });
    const html = render();
    expect(html).toMatch(/<span class="[^"]*font-semibold[^"]*">Ravi Kumar<\/span>/);
    expect(html).toContain('<time dateTime="2026-10-15T06:30:00.000Z">15 Oct, 12:00 pm</time>');
  });

  it("uses no badge, pill or card classes at all", () => {
    const html = render({ post: post({ pinned: true, author: { id: "u_cr", name: "Meera Shah", isCreator: true } }), viewerIsCreator: true });
    const tokens = classTokens(html);
    for (const t of ["badge", "badge-warn", "badge-muted", "card", "rounded-full", "bg-brand-soft"]) expect(tokens, t).not.toContain(t);
    expect(html).not.toContain("border-brand/40");
    expect(html).not.toContain("rounded-xl");
  });

  it("'Creator' is a plain word beside the creator's name, and absent for a member", () => {
    const html = render({ post: post({ author: { id: "u_cr", name: "Meera Shah", isCreator: true } }) });
    expect(html).toMatch(/<span class="text-xs font-semibold text-ink">Creator<\/span>/);
    expect(render()).not.toContain("Creator");
  });

  it("'Pinned' is a plain word with the pin icon (drawn, not an emoji or glyph), and absent when not pinned", () => {
    const pinned = els({ post: post({ pinned: true }) });
    expect(pinned.some((e) => e.type === IconPin)).toBe(true);
    const html = render({ post: post({ pinned: true }) });
    expect(html).toMatch(/<span class="inline-flex items-center gap-1 text-xs font-semibold text-ink"><svg [^>]*aria-hidden="true"[^>]*>.*?<\/svg>Pinned<\/span>/);
    expect(text(html)).toContain("Pinned");
    expect(render()).not.toContain("Pinned");
    expect(els().some((e) => e.type === IconPin)).toBe(false);
  });

  it("says 'edited' in muted text only when the post was edited", () => {
    expect(render()).not.toContain("edited");
    const html = render({ post: post({ editedAt: new Date("2026-10-16T00:00:00Z") }) });
    expect(html).toMatch(/<p class="t-meta"><time [^>]*>[^<]*<\/time><span><span aria-hidden="true"> · <\/span>edited<\/span><\/p>/);
  });

  it("wraps a long author name instead of cutting it", () => {
    const name = "Venkata Subramaniam Ramachandran Iyer-Krishnamurthy";
    const html = render({ post: post({ author: { id: "u_9", name, isCreator: false } }) });
    expect(html).toContain(`>${name}</span>`);
    expect(html).toMatch(/<span class="min-w-0 break-words[^"]*">Venkata/);
    expect(html).not.toContain("truncate");
  });
});

describe("PostCard: title, body and headings", () => {
  it("is an h3 linking to the thread inside the feed, and a plain h2 in the thread", () => {
    expect(render()).toMatch(/<h3 [^>]*><a [^>]*href="\/c\/meera\/community\/general\/p\/p_1"[^>]*>Welcome to the batch<\/a><\/h3>/);
    const thread = render({ thread: true, href: "" });
    expect(thread).toMatch(/<h2 [^>]*>Welcome to the batch<\/h2>/);
    expect(thread).not.toContain("<a ");
  });

  it("has no heading for an untitled post, and keeps the body's line breaks", () => {
    const html = render({ post: post({ title: "", body: "line one\nline two" }) });
    expect(html).not.toContain("<h3");
    expect(html).toMatch(/<p class="mt-3 whitespace-pre-wrap break-words[^"]*">line one\nline two<\/p>/);
  });

  it("is an <article> with no card box of its own (the feed draws the rules)", () => {
    expect(render()).toMatch(/^<article class="min-w-0">/);
  });
});

describe("PostCard: actions", () => {
  it("a member sees like and the comments link, and nothing else when the post is not theirs", () => {
    const e = els();
    expect(e.filter((x) => x.type === Button)).toHaveLength(0);
    expect(confirms()).toHaveLength(0);
    const link = e.find((x) => x.type === ButtonLink)!;
    expect(link.props.href).toBe(HREF);
    expect(link.props.variant).toBe("ghost");
    expect(link.props.className).toContain("pointer-coarse:min-h-11");
    expect(text(render())).toContain("2 comments");
    expect(text(render({ post: post({ commentCount: 1 }) }))).toContain("1 comment");
    expect(text(render({ post: post({ commentCount: 1 }) }))).not.toContain("1 comments");
  });

  it("the comments link is left out in the thread", () => {
    expect(els({ thread: true }).some((x) => x.type === ButtonLink)).toBe(false);
  });

  it("the like button is the LikeSubmit control inside a form bound to the post", () => {
    const like = els().find((x) => x.type === LikeSubmit)!;
    expect(like.props).toEqual({ count: 3, liked: false });
    expect(boundAction(like)).toEqual(expect.objectContaining({ action: "toggleLikeAction", args: ["post", "p_1"] }));
  });

  it("the creator gets a secondary small Pin / Unpin Button that submits its form, with the aria-label kept", () => {
    const pin = els({ viewerIsCreator: true }).find((x) => x.type === Button)!;
    expect(pin.props).toMatchObject({ type: "submit", variant: "secondary", size: "sm", "aria-label": "Pin post by Ravi Kumar", children: "Pin" });
    expect(pin.props.className).toContain("pointer-coarse:min-h-11");
    expect(boundAction(pin)).toEqual(expect.objectContaining({ action: "setPinnedAction", args: ["p_1", true] }));
    const unpin = els({ viewerIsCreator: true, post: post({ pinned: true }) }).find((x) => x.type === Button)!;
    expect(unpin.props["aria-label"]).toBe("Unpin post by Ravi Kumar");
    expect(unpin.props.children).toBe("Unpin");
    expect(boundAction(unpin).args).toEqual(["p_1", false]);
  });

  it("only the creator sees Pin / Unpin, on any post including their own", () => {
    expect(els({ viewerIsCreator: false }).some((x) => x.type === Button)).toBe(false);
    expect(els({ viewerIsCreator: true, post: post({ author: { id: "u_cr", name: "Meera Shah", isCreator: true } }) }).some((x) => x.type === Button)).toBe(true);
  });

  it("Remove from community is a danger ConfirmButton that names the action and the person, for the creator on a member's post only", () => {
    const [remove] = confirms({ viewerIsCreator: true });
    expect(remove.props).toMatchObject({
      variant: "danger",
      size: "sm",
      confirmLabel: "Remove from community",
      "aria-label": "Remove from community: Ravi Kumar",
      message: "Remove Ravi Kumar from this community? They lose access to every channel until you unban them.",
      children: "Remove from community",
    });
    expect(remove.props.className).toContain("pointer-coarse:min-h-11");
    expect(remove.props.className).not.toMatch(/\bbtn\b/);
    expect(boundAction(remove)).toEqual(expect.objectContaining({ action: "banMemberAction", args: ["u_2"] }));
    // Not offered on the creator's own post, nor to a member.
    expect(confirms({ viewerIsCreator: true, post: post({ author: { id: "u_cr", name: "Meera Shah", isCreator: true } }) })).toHaveLength(0);
    expect(confirms({ viewerIsCreator: false })).toHaveLength(0);
  });

  it("Delete is a danger ConfirmButton that says 'Delete post' in the dialog, keeps its message, and shows only when allowed", () => {
    expect(confirms()).toHaveLength(0);
    const [del] = confirms({ post: post({ canDelete: true }) });
    expect(del.props).toMatchObject({
      variant: "danger",
      size: "sm",
      confirmLabel: "Delete post",
      "aria-label": "Delete post by Ravi Kumar",
      message: "Delete this post and its comments? Points earned from it are removed too.",
      children: "Delete",
    });
    expect(del.props.className).toContain("pointer-coarse:min-h-11");
  });

  it("Delete leaves the thread (goToChannel) only when rendered as the thread", () => {
    const feed = confirms({ post: post({ canDelete: true }) })[0];
    expect(boundAction(feed)).toEqual(expect.objectContaining({ action: "deletePostAction", args: ["p_1", false] }));
    const thread = confirms({ post: post({ canDelete: true }), thread: true })[0];
    expect(boundAction(thread).args).toEqual(["p_1", true]);
  });

  it("passes no function props except bound server actions on forms", () => {
    const tree = card({ viewerIsCreator: true, post: post({ canDelete: true }) });
    expect(functionProps(tree, BOUNDARIES)).toEqual(["<form>.action", "<form>.action", "<form>.action", "<form>.action"]);
    expect(functionProps(<>{tree}<button onClick={() => {}}>x</button></>, BOUNDARIES)).toContain("<button>.onClick");
  });
});

describe("PostCard: source", () => {
  it("passes the style scan and hand-types no button class string or creator/chip style", () => {
    const src = readFileSync(new URL("./PostCard.tsx", import.meta.url), "utf8");
    expect(legacyStyleFindings(src)).toEqual([]);
    expect(src).not.toMatch(/creatorBadge|chipActive|border-brand/);
  });
});
