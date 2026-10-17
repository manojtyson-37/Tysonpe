import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, BrandScope } from "@/components/Brand";
import { Empty, Price, TYPE_LABEL } from "@/components/ui";
import { db } from "@/lib/db";

async function getCreator(handle: string) {
  return db.creator.findUnique({
    where: { handle: handle.toLowerCase() },
    include: { products: { where: { status: "published" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }, _count: { select: { channels: true } } },
  });
}

export async function generateMetadata({ params }: PageProps<"/c/[handle]">): Promise<Metadata> {
  const c = await getCreator((await params).handle);
  return c ? { title: c.displayName, description: c.bio || `Shop ${c.displayName} on Tysonpe` } : {};
}

const rowTransition = "transition-colors duration-(--dur-fast) ease-(--ease-standard)";

export default async function Storefront({ params }: PageProps<"/c/[handle]">) {
  const creator = await getCreator((await params).handle);
  if (!creator) notFound();

  // No featured/priority field exists, so the wide row is the most recently created published product (the query's first row;
  // id breaks createdAt ties so it cannot flip between requests). createdAt is not a release date, so the page does not call it "newest".
  const [lead, ...rest] = creator.products;
  const href = (slug: string) => `/c/${creator.handle}/${slug}`;
  const typeLabel = (type: string) => TYPE_LABEL[type] ?? type;

  return (
    <BrandScope color={creator.brandColor}>
      <div className="border-b border-line bg-brand-soft/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-10 pt-12 sm:flex-row sm:items-center sm:gap-7 sm:px-6 sm:pb-12 sm:pt-16">
          <Avatar name={creator.displayName} size={80} />
          <div className="min-w-0">
            <h1 className="t-display break-words">{creator.displayName}</h1>
            {creator.bio && <p className="t-body mt-3 max-w-2xl text-muted">{creator.bio}</p>}
            <p className="t-meta mt-3">{creator.products.length} {creator.products.length === 1 ? "product" : "products"}</p>
            {creator._count.channels > 0 && (
              <Link href={`/c/${creator.handle}/community`} className="btn btn-secondary btn-sm mt-4 pointer-coarse:min-h-11">Customer community</Link>
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        {!lead ? (
          <Empty title="Nothing for sale yet" body={`${creator.displayName} hasn't published a product. Check back soon.`} />
        ) : (
          <>
            <Link
              href={href(lead.slug)}
              className={`group grid gap-6 rounded-card border border-line bg-surface p-5 hover:border-line-strong sm:grid-cols-[1fr_auto] sm:items-end sm:gap-10 sm:p-8 ${rowTransition}`}
            >
              <div className="min-w-0">
                <h2 className="t-heading break-words">{lead.title}</h2>
                {lead.tagline && <p className="t-body mt-3 max-w-xl text-muted">{lead.tagline}</p>}
                <p className="t-meta mt-3">{typeLabel(lead.type)}</p>
              </div>
              <div className="sm:text-right">
                <Price paise={lead.pricePaise} period={lead.billing === "monthly" ? "month" : undefined} size="xl" className="sm:justify-end" />
                <span className="mt-3 block font-semibold text-[color:var(--brand-text)] underline-offset-4 group-hover:underline">View product</span>
              </div>
            </Link>
            {rest.length > 0 && (
              <ul className="mt-10 divide-y divide-line border-y border-line">
                {rest.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={href(p.slug)}
                      className={`flex items-start justify-between gap-6 px-5 py-4 hover:bg-surface-2 sm:px-8 sm:py-5 pointer-coarse:min-h-11 ${rowTransition}`}
                    >
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold break-words">{p.title}</h2>
                        {p.tagline && <p className="t-body mt-1 text-muted">{p.tagline}</p>}
                        <p className="t-meta mt-1">{typeLabel(p.type)}</p>
                      </div>
                      <Price paise={p.pricePaise} period={p.billing === "monthly" ? "month" : undefined} className="shrink-0 justify-end pt-0.5 text-right font-semibold" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </BrandScope>
  );
}
