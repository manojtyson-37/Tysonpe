import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { ensureDefaultChannel, listChannelsFor } from "@/lib/community/channels";
import { resolveCommunity } from "@/lib/community/viewer";

export const metadata = { title: "Community" };

export default async function CommunityIndex({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await requireUser(`/c/${handle}/community`);
  const ctx = await resolveCommunity(handle, user.id);
  if (!ctx) return null; // layout already rendered notFound
  // The layout creates General too, but page and layout render concurrently.
  if (ctx.viewer.isCreator) await ensureDefaultChannel(ctx.creator.id);
  const channels = await listChannelsFor(ctx.creator.id, ctx.viewer);
  if (channels.length > 0) redirect(`/c/${ctx.creator.handle}/community/${channels[0].slug}`);
  return null; // layout shows the "no access" panel
}
