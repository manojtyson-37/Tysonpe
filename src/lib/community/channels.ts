import { db } from "../db";
import { AppError, isUniqueViolation } from "../errors";
import { canAccessChannel, type Viewer } from "./access";
import { RESERVED_CHANNEL_SLUGS, channelSchema, channelSlug } from "./validation";

export type ChannelView = {
  id: string;
  name: string;
  slug: string;
  description: string;
  kind: "discussion" | "announcement";
  access: "open" | "product_gated";
  productIds: string[];
};

type Row = { id: string; name: string; slug: string; description: string; kind: string; access: string; products: Array<{ productId: string }> };
const view = (r: Row): ChannelView => ({
  id: r.id, name: r.name, slug: r.slug, description: r.description,
  kind: r.kind as ChannelView["kind"], access: r.access as ChannelView["access"],
  productIds: r.products.map((p) => p.productId).sort(),
});
const include = { products: { select: { productId: true } } } as const;
const ordered = [{ position: "asc" as const }, { createdAt: "asc" as const }, { id: "asc" as const }];

function parse(input: unknown) {
  const r = channelSchema.safeParse(input);
  if (!r.success) throw new AppError("invalid", r.error.issues[0]?.message ?? "Check the channel details.");
  return r.data;
}

async function owned(creatorId: string, channelId: string) {
  const ch = await db.channel.findFirst({ where: { id: channelId, creatorId }, include });
  if (!ch) throw new AppError("not_found", "Channel not found.");
  return ch;
}

async function assertOwnProducts(creatorId: string, ids: string[]) {
  if (ids.length === 0) return;
  if ((await db.product.count({ where: { id: { in: ids }, creatorId } })) !== ids.length) throw new AppError("not_found", "Product not found.");
}

async function uniqueSlug(creatorId: string, name: string): Promise<string> {
  const base = channelSlug(name);
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    if (RESERVED_CHANNEL_SLUGS.has(slug)) continue;
    if (!(await db.channel.findUnique({ where: { creatorId_slug: { creatorId, slug } }, select: { id: true } }))) return slug;
  }
  throw new AppError("invalid", "Couldn't find a free link for this channel name. Try another name.");
}

/**
 * A creator with no channels gets an open #general. Deleting some channels never brings it back; deleting
 * every channel does, on the next visit. Safe to call concurrently (the loser of the race is a no-op).
 */
export async function ensureDefaultChannel(creatorId: string): Promise<void> {
  if ((await db.channel.count({ where: { creatorId } })) > 0) return;
  try {
    await db.channel.create({
      data: { creatorId, name: "General", slug: "general", description: "Say hello and ask anything.", kind: "discussion", access: "open", position: 0 },
    });
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
  }
}

export async function listChannelsFor(creatorId: string, viewer: Viewer): Promise<ChannelView[]> {
  const rows = await db.channel.findMany({ where: { creatorId }, include, orderBy: ordered });
  return rows.map(view).filter((c) => canAccessChannel(c, viewer));
}

export async function getChannelFor(creatorId: string, slug: string, viewer: Viewer): Promise<ChannelView | null> {
  const row = await db.channel.findUnique({ where: { creatorId_slug: { creatorId, slug } }, include });
  if (!row) return null;
  const c = view(row);
  return canAccessChannel(c, viewer) ? c : null;
}

export async function listChannelsAdmin(creatorId: string) {
  const rows = await db.channel.findMany({ where: { creatorId }, include: { ...include, _count: { select: { posts: true } } }, orderBy: ordered });
  return rows.map((r) => ({ ...view(r), postCount: r._count.posts }));
}

export async function createChannel(creatorId: string, input: unknown, productIds: string[] = []): Promise<ChannelView> {
  const data = parse(input);
  const ids = data.access === "product_gated" ? [...new Set(productIds)] : [];
  await assertOwnProducts(creatorId, ids); // before anything is written: a bad product must not leave an orphan channel
  const last = await db.channel.findFirst({ where: { creatorId }, orderBy: { position: "desc" }, select: { position: true } });
  const row = await db.channel.create({
    data: {
      ...data, creatorId, slug: await uniqueSlug(creatorId, data.name), position: (last?.position ?? -1) + 1,
      products: { create: ids.map((productId) => ({ productId })) },
    },
    include,
  });
  return view(row);
}

/** Slug stays stable on rename so existing links keep working. */
export async function updateChannel(creatorId: string, channelId: string, input: unknown, productIds?: string[]): Promise<ChannelView> {
  await owned(creatorId, channelId);
  const data = parse(input);
  // `undefined` leaves the links alone; an open channel never keeps links.
  const ids = productIds === undefined ? undefined : data.access === "product_gated" ? [...new Set(productIds)] : [];
  if (ids) await assertOwnProducts(creatorId, ids);
  return view(
    await db.$transaction(async (tx) => {
      if (ids) {
        await tx.channelProduct.deleteMany({ where: { channelId } });
        for (const productId of ids) await tx.channelProduct.create({ data: { channelId, productId } });
      }
      return tx.channel.update({ where: { id: channelId }, data, include });
    }),
  );
}

export async function deleteChannel(creatorId: string, channelId: string): Promise<void> {
  await owned(creatorId, channelId);
  // The cascade removes posts, comments and likes but not the points they earned: drop those too (in chunks, to
  // stay under the database's parameter limit on big channels).
  const posts = await db.post.findMany({ where: { channelId }, select: { id: true, comments: { select: { id: true } } } });
  const sourceIds = posts.flatMap((p) => [p.id, ...p.comments.map((c) => c.id)]);
  const chunks: string[][] = [];
  for (let i = 0; i < sourceIds.length; i += 500) chunks.push(sourceIds.slice(i, i + 500));
  await db.$transaction([
    ...chunks.map((c) => db.pointEvent.deleteMany({ where: { sourceId: { in: c } } })),
    db.channel.delete({ where: { id: channelId } }),
  ]);
}

export async function setChannelProducts(creatorId: string, channelId: string, productIds: string[]): Promise<void> {
  await owned(creatorId, channelId);
  const ids = [...new Set(productIds)];
  await assertOwnProducts(creatorId, ids);
  await db.$transaction([
    db.channelProduct.deleteMany({ where: { channelId } }),
    ...ids.map((productId) => db.channelProduct.create({ data: { channelId, productId } })),
  ]);
}

export async function moveChannel(creatorId: string, channelId: string, dir: "up" | "down"): Promise<void> {
  await owned(creatorId, channelId);
  const all = await db.channel.findMany({ where: { creatorId }, orderBy: ordered, select: { id: true } });
  const i = all.findIndex((c) => c.id === channelId);
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((c, pos) => db.channel.update({ where: { id: c.id }, data: { position: pos } })));
}
