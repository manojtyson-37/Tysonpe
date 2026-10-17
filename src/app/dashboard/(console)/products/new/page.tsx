import type { Metadata } from "next";
import { createProduct } from "@/app/actions/creator";
import { ProductForm } from "@/components/ProductForm";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "New product" };

export default function NewProduct() {
  return (
    <>
      <PageHeader
        title="New product"
        sub="You can add lessons and publish after saving."
        back={{ label: "Products", href: "/dashboard/products" }}
      />
      <section aria-label="Product details" className="max-w-2xl border-t border-line pt-6">
        <ProductForm action={createProduct} submitLabel="Create product" />
      </section>
    </>
  );
}
