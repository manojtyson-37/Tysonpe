export type ChannelAccessInfo = {
  access: "open" | "product_gated";
  kind: "discussion" | "announcement";
  productIds: readonly string[];
};

export type Viewer = {
  /** The viewer owns the community. */
  isCreator: boolean;
  banned: boolean;
  /** Products of THIS creator the viewer holds an Enrollment for (refunds delete the row). */
  enrolledProductIds: readonly string[];
};

export function canAccessChannel(ch: ChannelAccessInfo, v: Viewer): boolean {
  if (v.isCreator) return true;
  if (v.banned) return false;
  if (ch.access === "open") return v.enrolledProductIds.length > 0;
  return ch.productIds.some((p) => v.enrolledProductIds.includes(p));
}

export function canPost(ch: ChannelAccessInfo, v: Viewer): boolean {
  if (!canAccessChannel(ch, v)) return false;
  return ch.kind === "discussion" || v.isCreator;
}

export const canComment = canAccessChannel;

export const canModerate = (v: Viewer): boolean => v.isCreator;
