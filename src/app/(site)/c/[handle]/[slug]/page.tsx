import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, BrandScope } from "@/components/Brand";
import { ButtonLink, Callout, Price, Surface, TYPE_LABEL } from "@/components/ui";
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

const fastColor = "transition-colors duration-(--dur-fast) ease-(--ease-standard)";

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

  const typeName = TYPE_LABEL[product.type] ?? product.type;
  const isPaid = product.pricePaise > 0;
  // A course is taught in lessons; the other types hold files, sessions or posts, so they count "items".
  const unit = product.type === "course" ? "lesson" : "item";
  const n = product.items.length;
  const typeLine = n > 0 ? `${typeName} \u00b7 ${n} ${unit}${n === 1 ? "" : "s"}` : typeName;

  return (
    <BrandScope color={c.brandColor}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {product.status !== "published" && (
          <Callout tone="warn" className="mb-6">
            Draft preview. Only you can see this page until you publish.
          </Callout>
        )}
        <Link
          href={`/c/${c.handle}`}
          className={`inline-flex items-center gap-3 text-sm font-medium text-muted hover:text-ink pointer-coarse:min-h-11 ${fastColor}`}
        >
          <Avatar name={c.displayName} size={32} /> {c.displayName}
        </Link>

        {/* Flex column below lg, grid from lg: the aside's containing block is then the whole column of content, so its
            mobile `sticky bottom-0` has room to stick and to come to rest above the footer. In a grid the aside's own
            grid area would be exactly its height and sticky would do nothing. */}
        <div className="mt-6 flex flex-col gap-10 lg:grid lg:grid-cols-[1fr_380px] lg:gap-14">
          <div className="min-w-0">
            <h1 className="t-display break-words">{product.title}</h1>
            {product.tagline && <p className="t-body mt-3 max-w-prose text-muted">{product.tagline}</p>}
            <p className="t-meta mt-3">{typeLine}</p>

            {product.description && (
              <section className="mt-10">
                <h2 className="t-heading">About this {typeName.toLowerCase()}</h2>
                <p className="t-body mt-3 max-w-prose whitespace-pre-wrap text-ink/90">{product.description}</p>
              </section>
            )}

            {n > 0 && (
              <section className="mt-10">
                <h2 className="t-heading">What&apos;s included</h2>
                <ol className="mt-4 divide-y divide-line border-y border-line">
                  {product.items.map((it, i) => (
                    <li key={it.id} className="flex items-baseline gap-4 py-3.5">
                      <span className="w-6 shrink-0 text-muted tabular-nums">{i + 1}</span>
                      <span className="t-body min-w-0 flex-1 break-words font-medium">{it.title}</span>
                      <span className="t-meta shrink-0">{kindLabel[it.kind] ?? it.kind}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          {/* Below lg this is the buy bar: sticky to the bottom edge of the viewport while the content above is in view,
              resting at the end of the column (above the footer) once it is reached. From lg it is the sticky side panel. */}
          <aside
            className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-bg px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6 lg:top-24 lg:bottom-auto lg:mx-0 lg:self-start lg:border-t-0 lg:bg-transparent lg:p-0"
            aria-label="Purchase"
          >
            {/* max-lg:flex-wrap: when price, note and CTA do not fit on one line the CTA drops to its own full-width line
                (it grows to fill whichever line it lands on) instead of squeezing the GST note into a sliver. */}
            <Surface
              padding="lg"
              className="flex items-center justify-between gap-x-4 gap-y-3 max-lg:flex-wrap max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:p-0! lg:block"
            >
              {/* An owner of the product has nothing to pay, so no price for them; the creator keeps it (informational). */}
              {!owned && (
                <div className="min-w-0">
                  <Price
                    paise={product.pricePaise}
                    period={product.billing === "monthly" ? "month" : undefined}
                    gstNote={isPaid && product.gstRatePct > 0 ? `incl. ${product.gstRatePct}% GST` : undefined}
                    size="xl"
                  />
                  {/* billing "monthly" is a label only in v1: checkout takes one payment and never renews. Say so at every viewport. */}
                  {isPaid && product.billing === "monthly" && (
                    <p className="t-meta mt-1">One payment today. Recurring billing is not live yet.</p>
                  )}
                </div>
              )}

              {owned ? (
                <ButtonLink href={`/library/${product.id}`} size="lg" className="shrink-0 max-lg:grow lg:mt-5 lg:w-full">Open in your library</ButtonLink>
              ) : isOwner ? (
                <ButtonLink href={`/dashboard/products/${product.id}`} variant="secondary" size="lg" className="shrink-0 max-lg:grow lg:mt-5 lg:w-full">Edit product</ButtonLink>
              ) : product.status === "published" ? (
                <ButtonLink href={`/checkout/${product.id}`} size="lg" className="shrink-0 max-lg:grow lg:mt-5 lg:w-full">
                  {isPaid ? "Buy now" : "Get it free"}
                </ButtonLink>
              ) : null}

              <ul className="t-body mt-5 hidden space-y-2 text-muted lg:block">
                <li>{isPaid ? "In your library as soon as payment completes" : "In your library straight away"}</li>
                {isPaid && <li>An invoice for every order</li>}
                {isPaid && <li className="t-meta">Payments run in test mode.</li>}
              </ul>
            </Surface>
          </aside>
        </div>
      </div>
    </BrandScope>
  );
}
