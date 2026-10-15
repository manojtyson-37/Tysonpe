import { db } from "../db";
import type { Viewer } from "./access";

/** Everything access decisions need about one viewer of one creator's community. Re-read on every request. */
export async function loadViewer(creatorId: string, userId: string | null): Promise<Viewer> {
  if (!userId) return { isCreator: false, banned: false, enrolledProductIds: [] };
  const [creator, ban, enrollments] = await Promise.all([
    db.creator.findUnique({ where: { id: creatorId }, select: { userId: true } }),
    db.communityBan.findUnique({ where: { creatorId_userId: { creatorId, userId } }, select: { id: true } }),
    db.enrollment.findMany({ where: { userId, product: { creatorId } }, select: { productId: true } }),
  ]);
  return { isCreator: creator?.userId === userId, banned: ban !== null, enrolledProductIds: enrollments.map((e) => e.productId) };
}

export async function resolveCommunity(handle: string, userId: string | null) {
  const creator = await db.creator.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { id: true, userId: true, handle: true, displayName: true, brandColor: true, gamificationEnabled: true },
  });
  if (!creator) return null;
  return { creator, viewer: await loadViewer(creator.id, userId) };
}
