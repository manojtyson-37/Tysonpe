import type { Metadata } from "next";
import Link from "next/link";
import {
  ButtonLink,
  EmptyRow,
  Money,
  PageHeader,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
  TYPE_LABEL,
} from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Products" };

// A creator sells tens of products, not thousands. The cap keeps a runaway account from loading an unbounded page;
// the note below the table appears only when it is reached.
const PRODUCT_LIMIT = 200;

export default async function ProductsPage() {
  const { creator } = await requireCreator();
  const products = await db.product.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    take: PRODUCT_LIMIT,
    include: { _count: { select: { enrollments: true, items: true } } },
  });
  return (
    <>
      <PageHeader
        title="Products"
        sub="Everything you sell."
        actions={<ButtonLink href="/dashboard/products/new">New product</ButtonLink>}
      />
      <Table aria-label="Products" stack>
        <thead>
          <tr>
            <Th>Product</Th>
            <Th>Type</Th>
            <Th align="right">Price</Th>
            <Th align="right">Learners</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <EmptyRow
              colSpan={5}
              title="No products yet"
              body="Create a course, membership, webinar, download or consultation and publish it to your storefront."
              action={<ButtonLink variant="secondary" href="/dashboard/products/new">Create your first product</ButtonLink>}
            />
          ) : (
            products.map((p) => (
              <Tr key={p.id}>
                <Td label="Product">
                  <div className="min-w-0 max-w-sm">
                    <Link
                      href={`/dashboard/products/${p.id}`}
                      className="break-words font-medium underline-offset-4 hover:underline"
                    >
                      {p.title}
                    </Link>
                    <p className="t-meta">{p._count.items} {p._count.items === 1 ? "lesson" : "lessons"}</p>
                  </div>
                </Td>
                <Td label="Type">{TYPE_LABEL[p.type] ?? p.type}</Td>
                <Td align="right" label="Price" className="whitespace-nowrap tabular-nums"><Money paise={p.pricePaise} free /></Td>
                <Td align="right" label="Learners" className="tabular-nums">{p._count.enrollments}</Td>
                <Td label="Status"><StatusBadge status={p.status} /></Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {products.length === PRODUCT_LIMIT && (
        <p className="t-meta mt-3">Showing your latest {PRODUCT_LIMIT} products.</p>
      )}
    </>
  );
}
