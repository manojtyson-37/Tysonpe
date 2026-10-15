import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, BrandScope } from "@/components/Brand";
import { Empty, Money, TYPE_LABEL } from "@/components/ui";
import { db } from "@/lib/db";

async function getCreator(handle: string) {
  return db.creator.findUnique({
    where: { handle: handle.toLowerCase() },
    include: { products: { where: { status: "published" }, orderBy: { createdAt: "desc" } }, _count: { select: { channels: true } } },
  });
}

export async function generateMetadata({ params }: PageProps<"/c/[handle]">): Promise<Metadata> {
  const c = await getCreator((await params).handle);
  return c ? { title: c.displayName, description: c.bio || `Shop ${c.displayName} on Tysonpe` } : {};
}

export default async function Storefront({ params }: PageProps<"/c/[handle]">) {
  const creator = await getCreator((await params).handle);
  if (!creator) notFound();

  return (
    <BrandScope color={creator.brandColor}>
      <div className="border-b border-line bg-brand-soft/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
          <Avatar name={creator.displayName} size={80} />
          <div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">{creator.displayName}</h1>
            {creator.bio && <p className="mt-2 max-w-2xl text-muted">{creator.bio}</p>}
            <p className="mt-2 text-sm text-muted">{creator.products.length} {creator.products.length === 1 ? "product" : "products"}</p>
            {creator._count.channels > 0 && (
              <Link href={`/c/${creator.handle}/community`} className="btn btn-secondary btn-sm mt-3">Community</Link>
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {creator.products.length === 0 ? (
          <Empty title="Nothing for sale yet" body={`${creator.displayName} hasn't published a product. Check back soon.`} />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {creator.products.map((p) => (
              <li key={p.id}>
                <Link href={`/c/${creator.handle}/${p.slug}`} className="card group flex h-full flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <span className="badge badge-brand self-start">{TYPE_LABEL[p.type] ?? p.type}</span>
                  <h2 className="mt-4 text-xl font-bold group-hover:text-brand">{p.title}</h2>
                  {p.tagline && <p className="mt-1.5 text-sm text-muted">{p.tagline}</p>}
                  <p className="mt-auto pt-6 text-lg font-bold">
                    {p.pricePaise === 0 ? "Free" : <Money paise={p.pricePaise} />}
                    {p.billing === "monthly" && p.pricePaise > 0 && <span className="text-sm font-medium text-muted"> / month</span>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BrandScope>
  );
}
