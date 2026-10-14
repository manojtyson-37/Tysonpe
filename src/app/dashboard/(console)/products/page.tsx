import type { Metadata } from "next";
import Link from "next/link";
import { Empty, Money, PageHeader, StatusBadge, TYPE_LABEL } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const { creator } = await requireCreator();
  const products = await db.product.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { enrollments: true, items: true } } },
  });
  return (
    <>
      <PageHeader title="Products" sub="Everything you sell." action={<Link href="/dashboard/products/new" className="btn btn-primary">New product</Link>} />
      {products.length === 0 ? (
        <Empty title="No products yet" body="Create a course, membership, webinar, download or consultation and publish it to your storefront." cta={{ href: "/dashboard/products/new", label: "Create your first product" }} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Product</th><th>Type</th><th>Price</th><th>Learners</th><th>Status</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/dashboard/products/${p.id}`} className="font-semibold hover:text-brand">{p.title}</Link>
                    <p className="text-xs text-muted">{p._count.items} {p._count.items === 1 ? "lesson" : "lessons"}</p></td>
                  <td>{TYPE_LABEL[p.type] ?? p.type}</td>
                  <td className="tabular-nums">{p.pricePaise === 0 ? "Free" : <Money paise={p.pricePaise} />}</td>
                  <td className="tabular-nums">{p._count.enrollments}</td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
