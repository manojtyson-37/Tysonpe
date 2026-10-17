import { RESERVED_PRODUCT_SLUGS } from "./handles";

/**
 * First free slug for `base` (`base`, `base-2`, `base-3`, ...), never a reserved one.
 * `isTaken` says whether a candidate is already used (e.g. by another product of the same creator).
 */
export async function pickProductSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    if (!RESERVED_PRODUCT_SLUGS.has(slug) && !(await isTaken(slug))) return slug;
  }
  return `${base}-${Date.now()}`;
}
