import { ConfirmButton } from "@/components/ConfirmButton";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addContentItem, deleteContentItem, deleteProduct, moveContentItem, setProductStatus,
  updateContentItem, updateProduct,
} from "@/app/actions/creator";
import { ContentItemForm } from "@/components/ContentItemForms";
import { ProductForm } from "@/components/ProductForm";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProduct({ params }: PageProps<"/dashboard/products/[id]">) {
  const { id } = await params;
  const { creator } = await requireCreator();
  const product = await db.product.findFirst({
    where: { id, creatorId: creator.id },
    include: { items: { orderBy: { position: "asc" } }, _count: { select: { orders: true } } },
  });
  if (!product) notFound();

  const publish = setProductStatus.bind(null, id, product.status === "published" ? "draft" : "published");
  const publicPath = `/c/${creator.handle}/${product.slug}`;

  return (
    <>
      <PageHeader
        title={product.title}
        sub={product.status === "published" ? "Live on your storefront." : "Draft. Not visible to buyers."}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={product.status} />
            <Link href={publicPath} className="btn btn-secondary btn-sm" target="_blank">{product.status === "published" ? "View page ↗" : "Preview ↗"}</Link>
            <form action={publish}>
              <button className={`btn btn-sm ${product.status === "published" ? "btn-secondary" : "btn-primary"}`} type="submit">
                {product.status === "published" ? "Unpublish" : "Publish"}
              </button>
            </form>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 font-semibold">Details</h2>
          <ProductForm
            action={updateProduct.bind(null, id)}
            submitLabel="Save changes"
            defaults={{
              title: product.title, tagline: product.tagline, description: product.description, type: product.type,
              price: (product.pricePaise / 100).toFixed(product.pricePaise % 100 ? 2 : 0), gstRatePct: product.gstRatePct, billing: product.billing,
            }}
          />
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Content <span className="text-sm font-normal text-muted">({product.items.length})</span></h2>
          <p className="mb-4 text-sm text-muted">What buyers get in their library after purchase.</p>
          <ul className="space-y-3">
            {product.items.map((it, i) => (
              <li key={it.id} className="card">
                <details>
                  <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm">
                    <span className="w-5 tabular-nums text-muted">{i + 1}</span>
                    <span className="flex-1 truncate font-medium">{it.title}</span>
                    <span className="badge badge-muted">{it.kind}</span>
                  </summary>
                  <div className="space-y-4 border-t border-line p-4">
                    <ContentItemForm action={updateContentItem.bind(null, it.id)} item={it} submitLabel="Save lesson" />
                    <div className="flex gap-2 border-t border-line pt-3">
                      <form action={moveContentItem.bind(null, it.id, "up")}><button className="btn btn-secondary btn-sm" disabled={i === 0} aria-label="Move up">↑ Up</button></form>
                      <form action={moveContentItem.bind(null, it.id, "down")}><button className="btn btn-secondary btn-sm" disabled={i === product.items.length - 1} aria-label="Move down">↓ Down</button></form>
                      <form action={deleteContentItem.bind(null, it.id)} className="ml-auto"><ConfirmButton className="btn btn-danger btn-sm" message="Delete this lesson?">Delete</ConfirmButton></form>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>

          <div className="card mt-4 p-5">
            <h3 className="mb-3 text-sm font-semibold">Add a lesson</h3>
            <ContentItemForm action={addContentItem.bind(null, id)} submitLabel="Add lesson" />
          </div>
        </section>
      </div>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="font-semibold">Danger zone</h2>
        <p className="mt-1 text-sm text-muted">
          {product._count.orders > 0
            ? "This product has orders, so it can't be deleted. Removing it will unpublish it and keep order history."
            : "Deleting removes the product and its lessons permanently."}
        </p>
        <form action={deleteProduct.bind(null, id)} className="mt-3">
          <ConfirmButton className="btn btn-danger btn-sm" message={product._count.orders > 0 ? "Unpublish this product? Existing buyers keep access." : "Delete this product and its lessons permanently?"}>{product._count.orders > 0 ? "Unpublish & archive" : "Delete product"}</ConfirmButton>
        </form>
      </section>
    </>
  );
}
