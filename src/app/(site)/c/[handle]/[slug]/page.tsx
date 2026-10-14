import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, BrandScope } from "@/components/Brand";
import { Money, TYPE_LABEL } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

async function getProduct(handle: string, slug: string) {
  return db.product.findFirst({
    where: { slug, creator: { handle: handle.toLowerCase() } },
    include: { creator: true, items: { orderBy: { position: "asc" }, select: { id: true, title: true, kind: true } } },
  });
}

export async function generateMetadata({ params }: PageProps<"/c/[handle]/[slug]">): Promise<Metadata> {
  const { handle, slug } = await params;
  const p = await getProduct(handle, slug);
  return p && p.status === "published" ? { title: p.title, description: p.tagline || undefined } : {};
}

const kindLabel: Record<string, string> = { video: "Video", pdf: "PDF", text: "Reading", link: "Link", quiz: "Quiz" };

export default async function ProductPage({ params }: PageProps<"/c/[handle]/[slug]">) {
  const { handle, slug } = await params;
  const [product, user] = await Promise.all([getProduct(handle, slug), getCurrentUser()]);
  if (!product) notFound();

  const isOwner = !!user?.creator && user.creator.id === product.creatorId;
  if (product.status !== "published" && !isOwner) notFound();

  const owned = user
    ? !!(await db.enrollment.findUnique({ where: { userId_productId: { userId: user.id, productId: product.id } } }))
    : false;
  const c = product.creator;

  return (
    <BrandScope color={c.brandColor}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {product.status !== "published" && (
          <p className="mb-6 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium">
            Draft preview. Only you can see this page until you publish.
          </p>
        )}
        <Link href={`/c/${c.handle}`} className="inline-flex items-center gap-3 text-sm font-medium text-muted hover:text-ink">
          <Avatar name={c.displayName} size={32} /> {c.displayName}
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <span className="badge badge-brand">{TYPE_LABEL[product.type] ?? product.type}</span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">{product.title}</h1>
            {product.tagline && <p className="mt-3 text-lg text-muted">{product.tagline}</p>}

            {product.description && (
              <section className="mt-10">
                <h2 className="text-xl font-bold">About this {(TYPE_LABEL[product.type] ?? "product").toLowerCase()}</h2>
                <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink/90">{product.description}</p>
              </section>
            )}

            {product.items.length > 0 && (
              <section className="mt-10">
                <h2 className="text-xl font-bold">What&apos;s included</h2>
                <ol className="card mt-3 divide-y divide-line">
                  {product.items.map((it, i) => (
                    <li key={it.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className="w-6 text-muted tabular-nums">{i + 1}</span>
                      <span className="flex-1 font-medium">{it.title}</span>
                      <span className="badge badge-muted">{kindLabel[it.kind] ?? it.kind}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6 shadow-sm">
              <p className="text-3xl font-extrabold">
                {product.pricePaise === 0 ? "Free" : <Money paise={product.pricePaise} />}
                {product.billing === "monthly" && product.pricePaise > 0 && <span className="text-base font-medium text-muted"> / month</span>}
              </p>
              {product.pricePaise > 0 && <p className="mt-1 text-xs text-muted">Inclusive of {product.gstRatePct}% GST</p>}

              {owned ? (
                <Link href={`/library/${product.id}`} className="btn btn-primary btn-lg mt-5 w-full">Open in your library</Link>
              ) : isOwner ? (
                <Link href={`/dashboard/products/${product.id}`} className="btn btn-secondary btn-lg mt-5 w-full">Edit product</Link>
              ) : product.status === "published" ? (
                <Link href={`/checkout/${product.id}`} className="btn btn-primary btn-lg mt-5 w-full">
                  {product.pricePaise === 0 ? "Get it free" : "Buy now"}
                </Link>
              ) : null}

              <ul className="mt-5 space-y-2 text-sm text-muted">
                {product.pricePaise === 0 ? (
                  <li>Instant access in your library</li>
                ) : (
                  <>
                    <li>Pay with UPI, cards or netbanking</li>
                    <li>Instant access after payment</li>
                    <li>GST invoice for every order</li>
                  </>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </BrandScope>
  );
}
