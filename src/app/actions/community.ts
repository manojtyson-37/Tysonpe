"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { checkRate } from "@/lib/community/limits";
import { addComment, createPost, deleteComment, deletePost, editComment, editPost, setPinned, toggleLike } from "@/lib/community/posts";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { FormState } from "./auth";

const idSchema = z.string().min(1).max(64);
const TOO_FAST = "You're going too fast. Wait a minute and try again.";

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

/** Dynamic-route patterns: revalidates every cached community page without looking up handle/slug. */
function refreshCommunity() {
  revalidatePath("/c/[handle]/community/[channel]", "page");
  revalidatePath("/c/[handle]/community/[channel]/p/[postId]", "page");
  revalidatePath("/c/[handle]/community/leaderboard", "page");
}

function failState(e: unknown): FormState {
  if (e instanceof AppError) return { error: e.code === "not_found" ? "That's no longer available." : e.message };
  throw e;
}

export async function createPostAction(channelId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = idSchema.safeParse(channelId);
  if (!id.success) return { error: "Channel not found." };
  if (!checkRate("post", user.id)) return { error: TOO_FAST };
  try {
    await createPost(user.id, id.data, { title: str(fd, "title"), body: str(fd, "body") });
  } catch (e) {
    return failState(e);
  }
  refreshCommunity();
  return undefined;
}

export async function editPostAction(postId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = idSchema.safeParse(postId);
  if (!id.success) return { error: "Post not found." };
  try {
    await editPost(user.id, id.data, { title: str(fd, "title"), body: str(fd, "body") });
  } catch (e) {
    return failState(e);
  }
  refreshCommunity();
  return { fields: { saved: "1" } };
}

export async function editCommentAction(commentId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = idSchema.safeParse(commentId);
  if (!id.success) return { error: "Comment not found." };
  if (!checkRate("comment", user.id)) return { error: TOO_FAST };
  try {
    await editComment(user.id, id.data, { body: str(fd, "body") });
  } catch (e) {
    return failState(e);
  }
  refreshCommunity();
  return { fields: { saved: "1" } };
}

export async function addCommentAction(postId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = idSchema.safeParse(postId);
  if (!id.success) return { error: "Post not found." };
  if (!checkRate("comment", user.id)) return { error: TOO_FAST };
  try {
    await addComment(user.id, id.data, { body: str(fd, "body") });
  } catch (e) {
    return failState(e);
  }
  refreshCommunity();
  return undefined;
}

export async function deletePostAction(postId: string, goToChannel: boolean) {
  const user = await requireUser();
  const id = idSchema.parse(postId);
  // Resolve the channel URL from the database BEFORE deleting; never from user input.
  const where = await db.post.findUnique({
    where: { id },
    select: { channel: { select: { slug: true, creator: { select: { handle: true } } } } },
  });
  try {
    await deletePost(user.id, id);
  } catch (e) {
    if (!(e instanceof AppError)) throw e; // not allowed / already gone: the refreshed page shows the truth
    refreshCommunity();
    return; // never redirect on failure: the URL would reveal a hidden channel's handle and slug
  }
  refreshCommunity();
  if (goToChannel && where) redirect(`/c/${where.channel.creator.handle}/community/${where.channel.slug}`);
}

export async function deleteCommentAction(commentId: string) {
  const user = await requireUser();
  const id = idSchema.parse(commentId);
  try {
    await deleteComment(user.id, id);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  refreshCommunity();
}

export async function toggleLikeAction(kind: "post" | "comment", targetId: string) {
  const user = await requireUser();
  const k = z.enum(["post", "comment"]).parse(kind);
  const id = idSchema.parse(targetId);
  if (!checkRate("like", user.id)) return; // silently ignore a flood of clicks
  try {
    await toggleLike(user.id, k === "post" ? { postId: id } : { commentId: id });
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  refreshCommunity();
}

export async function setPinnedAction(postId: string, pinned: boolean) {
  const user = await requireUser();
  const id = idSchema.parse(postId);
  try {
    await setPinned(user.id, id, z.boolean().parse(pinned));
  } catch (e) {
    if (!(e instanceof AppError)) throw e; // e.g. the 3-pin limit: the post simply stays unpinned
  }
  refreshCommunity();
}
