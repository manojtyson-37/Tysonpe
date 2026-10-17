// Shared builders and walkers for the community tests (layout, feed, thread, leaderboard and their components).
// Plain module: nothing here is imported by app code.
import { isValidElement, type ReactNode } from "react";
import type { ChannelView } from "@/lib/community/channels";
import type { CommentView, PostView } from "@/lib/community/posts";

/** A stand-in server action whose `.bind` returns a tagged function, so a test can read WHICH action a form got and with what. */
export function actionStub(name: string) {
  const fn = (() => undefined) as unknown as { bind: (...a: unknown[]) => unknown };
  fn.bind = (_this: unknown, ...args: unknown[]) => Object.assign(() => undefined, { action: name, args });
  return Object.assign(fn, { action: name });
}

export const post = (over: Partial<PostView> = {}): PostView => ({
  id: "p_1",
  title: "Welcome to the batch",
  body: "Say hello and tell us what you want to build.",
  pinned: false,
  createdAt: new Date("2026-10-15T06:30:00Z"),
  editedAt: null,
  author: { id: "u_2", name: "Ravi Kumar", isCreator: false },
  commentCount: 2,
  likeCount: 3,
  likedByMe: false,
  canEdit: false,
  canDelete: false,
  ...over,
});

export const comment = (over: Partial<CommentView> = {}): CommentView => ({
  id: "c_1",
  body: "Glad to be here.",
  createdAt: new Date("2026-10-15T07:00:00Z"),
  editedAt: null,
  author: { id: "u_3", name: "Neha Iyer", isCreator: false },
  likeCount: 1,
  likedByMe: false,
  canDelete: false,
  ...over,
});

export const channel = (over: Partial<ChannelView> = {}): ChannelView => ({
  id: "ch_1",
  name: "General",
  slug: "general",
  description: "Say hello.",
  kind: "discussion",
  access: "open",
  productIds: [],
  ...over,
});

export const creator = (over: Record<string, unknown> = {}) => ({
  id: "cr_1",
  userId: "u_cr",
  handle: "meera",
  displayName: "Meera Shah",
  brandColor: "#0f7b4d",
  gamificationEnabled: true,
  ...over,
});

export const learner = (over: Record<string, unknown> = {}) => ({ isCreator: false, banned: false, enrolledProductIds: ["pr_1"], ...over });

export const profile = (over: Record<string, unknown> = {}) => ({
  points: 120,
  level: { level: 2, floor: 100, next: 250, into: 20, span: 150 },
  streak: 3,
  badges: [{ key: "first_lesson", label: "First lesson", description: "Finish a lesson.", earnedAt: new Date("2026-10-10T00:00:00Z") }],
  ...over,
});

export type El = { type: unknown; props: Record<string, any>; ancestors: Array<{ type: unknown; props: Record<string, any> }> }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Every element of a server tree, calling plain function components down to host elements; `boundaries` are not entered. */
export function elements(node: ReactNode, boundaries: unknown[] = []): El[] {
  const out: El[] = [];
  const go = (n: unknown, ancestors: El["ancestors"]): void => {
    if (Array.isArray(n)) return n.forEach((c) => go(c, ancestors));
    if (!isValidElement(n)) return;
    const props = n.props as El["props"];
    out.push({ type: n.type, props, ancestors });
    const next = [...ancestors, { type: n.type, props }];
    if (typeof n.type === "function" && !boundaries.includes(n.type)) go((n.type as (p: unknown) => unknown)(props), next);
    else go(props.children, next);
  };
  go(node, []);
  return out;
}

/** The bound server action of the form around an element. */
export const boundAction = (e: El) => {
  const form = [...e.ancestors].reverse().find((a) => a.type === "form")!;
  return form.props.action as { action: string; args: unknown[] };
};

export const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
export const classTokens = (html: string) => [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
