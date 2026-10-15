"use server";

import { revalidatePath } from "next/cache";
import { requireCreator } from "@/lib/auth/session";
import { banMember } from "@/lib/community/posts";
import { AppError } from "@/lib/errors";

export async function banMemberAction(userId: string) {
  const { user, creator } = await requireCreator();
  try {
    await banMember(user.id, creator.id, userId);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  revalidatePath("/dashboard/community");
  revalidatePath("/c/[handle]/community/[channel]", "page");
  revalidatePath("/c/[handle]/community/[channel]/p/[postId]", "page");
}
