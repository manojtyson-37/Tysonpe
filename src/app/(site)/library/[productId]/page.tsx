import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { toEmbedUrl } from "@/lib/validation";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryItemPage({ params }: PageProps<"/library/[productId]">) {
  const { productId } = await params;
  const user = await requireUser(`/library/${productId}`);

  const enrollment = await db.enrollment.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
    include: {
      order: { select: { id: true } },
      product: { include: { creator: true, items: { orderBy: { position: "asc" } } } },
    },
  });
  if (!enrollment) {
    // Not enrolled: send to the public page if it exists, else 404.
    const p = await db.product.findFirst({ where: { id: productId, status: "published" }, include: { creator: true } });
    if (!p) notFound();
    redirect(`/c/${p.creator.handle}/${p.slug}`);
  }
  const { product } = enrollment;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/library" className="text-sm font-medium text-muted hover:text-ink">← My library</Link>
      <h1 className="mt-3 text-3xl font-extrabold">{product.title}</h1>
      <p className="text-sm text-muted">by {product.creator.displayName}</p>
      <div className="mt-2 flex gap-3 text-sm">
        <Link className="font-semibold text-brand hover:underline" href={`/orders/${enrollment.order.id}/invoice`}>Invoice</Link>
      </div>

      {product.items.length === 0 ? (
        <p className="card mt-8 p-6 text-sm text-muted">The creator hasn&apos;t added any content yet. You&apos;ll see it here as soon as they do.</p>
      ) : (
        <ol className="mt-8 space-y-5">
          {product.items.map((it, i) => {
            const embed = it.kind === "video" ? toEmbedUrl(it.url) : null;
            return (
              <li key={it.id} className="card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-line px-5 py-3">
                  <span className="text-sm tabular-nums text-muted">{i + 1}</span>
                  <h2 className="font-semibold">{it.title}</h2>
                </div>
                <div className="p-5">
                  {embed ? (
                    <div className="aspect-video overflow-hidden rounded-xl bg-black">
                      <iframe src={embed} title={it.title} className="h-full w-full" allow="fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
                    </div>
                  ) : it.kind === "text" ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{it.body}</p>
                  ) : (
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                      {it.kind === "pdf" ? "Open PDF" : it.kind === "video" ? "Watch video" : "Open link"} ↗
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
