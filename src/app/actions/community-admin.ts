"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCreator } from "@/lib/auth/session";
import { createChannel, deleteChannel, moveChannel, updateChannel } from "@/lib/community/channels";
import { checkRate } from "@/lib/community/limits";
import { banMember, unbanMember } from "@/lib/community/posts";
import { db } from "@/lib/db";
import { AppError, isUniqueViolation } from "@/lib/errors";
import { backfillPoints } from "@/lib/gamification/service";
import type { FormState } from "./auth";

const idSchema = z.string().min(1).max(64);
const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
const productIds = (fd: FormData) => fd.getAll("productIds").filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= 64);
const channelInput = (fd: FormData) => ({ name: str(fd, "name"), description: str(fd, "description"), kind: str(fd, "kind"), access: str(fd, "access") });

function refresh() {
  revalidatePath("/dashboard/community");
  revalidatePath("/c/[handle]/community", "layout");
}
function failState(e: unknown): FormState {
  if (e instanceof AppError) return { error: e.code === "not_found" ? "That channel or product no longer exists." : e.message };
  throw e;
}

export async function createChannelAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  try {
    await createChannel(creator.id, channelInput(fd), productIds(fd)); // validated and written together
  } catch (e) {
    // Two identical-name creates can race past the slug check; the unique index catches the loser.
    if (isUniqueViolation(e)) return { error: "A channel with that name was just created. Try again." };
    return failState(e);
  }
  refresh();
  return undefined;
}

export async function updateChannelAction(channelId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  const id = idSchema.safeParse(channelId);
  if (!id.success) return { error: "Channel not found." };
  try {
    await updateChannel(creator.id, id.data, channelInput(fd), productIds(fd)); // links replaced (or cleared when open) atomically
  } catch (e) {
    return failState(e);
  }
  refresh();
  return { fields: { saved: "1" } };
}

export async function deleteChannelAction(channelId: string) {
  const { creator } = await requireCreator();
  const id = idSchema.safeParse(channelId);
  if (!id.success) return;
  try {
    await deleteChannel(creator.id, id.data);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  refresh();
}

export async function moveChannelAction(channelId: string, dir: "up" | "down") {
  const { creator } = await requireCreator();
  const id = idSchema.safeParse(channelId);
  const direction = z.enum(["up", "down"]).safeParse(dir);
  if (!id.success || !direction.success) return;
  try {
    await moveChannel(creator.id, id.data, direction.data);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  refresh();
}

export async function banMemberAction(userId: string) {
  const { user, creator } = await requireCreator();
  const parsed = idSchema.safeParse(userId);
  if (!parsed.success) return;
  try {
    await banMember(user.id, creator.id, parsed.data);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  refresh();
  revalidatePath("/c/[handle]/community/[channel]", "page");
  revalidatePath("/c/[handle]/community/[channel]/p/[postId]", "page");
}

export async function unbanMemberAction(userId: string) {
  const { creator } = await requireCreator();
  const id = idSchema.safeParse(userId);
  if (!id.success) return;
  await unbanMember(creator.id, id.data);
  refresh();
}

/** Turning it on also replays existing progress so learners who already finished things aren't left at zero. */
export async function setGamificationAction(enabled: boolean) {
  const { creator } = await requireCreator();
  const on = z.boolean().parse(enabled);
  await db.creator.update({ where: { id: creator.id }, data: { gamificationEnabled: on } });
  // Rate-limited per creator: over the limit the flag still flips, the (heavy) backfill is just skipped.
  if (on && checkRate("backfill", creator.id)) await backfillPoints(creator.id);
  refresh();
}

export async function recalculatePointsAction() {
  const { creator } = await requireCreator();
  if (creator.gamificationEnabled && checkRate("backfill", creator.id)) await backfillPoints(creator.id);
  refresh();
}
