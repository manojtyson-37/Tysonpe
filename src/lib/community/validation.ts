import { z } from "zod";

export const LIMITS = {
  postTitle: 120,
  postBody: 2000,
  commentBody: 1000,
  channelName: 60,
  channelDescription: 200,
  maxPinned: 3,
  pageSize: 20,
} as const;

/** Channel slugs that would collide with fixed routes under /c/[handle]/community/. */
export const RESERVED_CHANNEL_SLUGS: ReadonlySet<string> = new Set(["leaderboard", "new"]);

/** Plain text only: normalise newlines, drop control characters (keep \n), collapse blank-line runs, trim. */
export function cleanText(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const text = (min: number, max: number, what: string) =>
  z.string().transform(cleanText).pipe(z.string().min(min, `${what} can't be empty`).max(max, `${what} is too long (max ${max})`));

export const postSchema = z.object({
  title: z.string().optional().default("").transform(cleanText).pipe(z.string().max(LIMITS.postTitle, `Title is too long (max ${LIMITS.postTitle})`)),
  body: text(1, LIMITS.postBody, "Post"),
});

export const commentSchema = z.object({ body: text(1, LIMITS.commentBody, "Comment") });

export const channelSchema = z.object({
  name: text(1, LIMITS.channelName, "Name"),
  description: z.string().optional().default("").transform(cleanText).pipe(z.string().max(LIMITS.channelDescription, `Description is too long (max ${LIMITS.channelDescription})`)),
  kind: z.enum(["discussion", "announcement"]),
  access: z.enum(["open", "product_gated"]),
});

export const channelSlug = (name: string): string =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "") || "channel";
