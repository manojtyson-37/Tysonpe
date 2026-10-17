"use client";

import { useState } from "react";
import Link from "next/link";
import { Money, TYPE_LABEL } from "@/components/ui";

interface ProductItem {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  type: string;
  pricePaise: number;
  billing: string;
}

interface ProductsSectionProps {
  products: ProductItem[];
  creatorHandle: string;
}

export function ProductsSection({ products, creatorHandle }: ProductsSectionProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  const types = Array.from(new Set(products.map((p) => p.type)));

  const filtered = products.filter((p) => {
    const matchesTab = activeTab === "all" || p.type === activeTab;
    const matchesQuery =
      query.trim() === "" ||
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      (p.tagline && p.tagline.toLowerCase().includes(query.toLowerCase()));
    return matchesTab && matchesQuery;
  });

  return (
    <section id="products" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Digital Products & Memberships
          </h2>
          <p className="mt-1 text-xs text-muted">
            Instant digital access with GST invoice and community support.
          </p>
        </div>

        {/* Search input if more than 2 products */}
        {products.length > 2 && (
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input text-xs"
            />
          </div>
        )}
      </div>

      {/* Skiper UI Filter Tabs */}
      {types.length > 1 && (
        <div className="mb-6 flex overflow-x-auto pb-1 gap-1 border-b border-line">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
              activeTab === "all"
                ? "bg-brand text-brand-ink shadow-xs"
                : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            All Products ({products.length})
          </button>
          {types.map((type) => {
            const count = products.filter((p) => p.type === type).length;
            const label = TYPE_LABEL[type] ?? type;
            const isActive = activeTab === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveTab(type)}
                className={`cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-brand text-brand-ink shadow-xs"
                    : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Grid of Product Cards */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <p className="text-sm font-semibold text-ink">No products found</p>
          <p className="mt-1 text-xs text-muted">
            Try adjusting your search query or selecting a different category.
          </p>
          {(activeTab !== "all" || query) && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setQuery("");
              }}
              className="btn btn-secondary btn-sm mt-4"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const isFree = p.pricePaise === 0;
            return (
              <li key={p.id}>
                <Link
                  href={`/c/${creatorHandle}/${p.slug}`}
                  className="card group flex h-full flex-col p-6 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-brand/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="badge badge-brand">
                      {TYPE_LABEL[p.type] ?? p.type}
                    </span>
                    {isFree ? (
                      <span className="badge badge-good">Free Access</span>
                    ) : (
                      <span className="text-[11px] font-medium text-muted">
                        Instant Delivery
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-ink transition-colors group-hover:text-brand sm:text-xl">
                    {p.title}
                  </h3>

                  {p.tagline && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted sm:text-sm">
                      {p.tagline}
                    </p>
                  )}

                  <div className="mt-auto pt-6">
                    <div className="flex items-baseline justify-between border-t border-line/60 pt-4">
                      <div>
                        <p className="text-xl font-extrabold tabular-nums text-ink">
                          {isFree ? "Free" : <Money paise={p.pricePaise} />}
                          {p.billing === "monthly" && !isFree && (
                            <span className="text-xs font-normal text-muted">
                              {" "}
                              / month
                            </span>
                          )}
                        </p>
                        {!isFree && (
                          <p className="text-[10px] text-muted">
                            Inclusive of 18% GST
                          </p>
                        )}
                      </div>

                      <span className="btn btn-primary btn-sm pointer-events-none group-hover:brightness-110">
                        {isFree ? "Get Free →" : "View & Buy →"}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
