"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCreator } from "@/lib/auth/session";
import { banMember } from "@/lib/community/posts";
import { AppError } from "@/lib/errors";

const userIdSchema = z.string().min(1).max(64);

export async function banMemberAction(userId: string) {
  const parsed = userIdSchema.safeParse(userId);
  if (!parsed.success) return;
  const { user, creator } = await requireCreator();
  try {
    await banMember(user.id, creator.id, parsed.data);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  revalidatePath("/dashboard/community");
  revalidatePath("/c/[handle]/community/[channel]", "page");
  revalidatePath("/c/[handle]/community/[channel]/p/[postId]", "page");
}
