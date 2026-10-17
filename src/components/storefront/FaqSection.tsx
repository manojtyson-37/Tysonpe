"use client";

import { useState } from "react";
import type { StorefrontFaq } from "@/lib/storefront";
import { ChevronDownIcon } from "./icons";

export function FaqSection({ faqs }: { faqs?: StorefrontFaq[] }) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    "faq-1": true, // open first by default
  });

  if (!faqs || faqs.length === 0) return null;

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="mb-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Common Questions
        </span>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Frequently Asked Questions
        </h2>
        <p className="mt-1.5 text-xs text-muted sm:text-sm">
          Everything you need to know about deliveries, invoices, and community access.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq) => {
          const isOpen = !!openIds[faq.id];
          return (
            <div
              key={faq.id}
              className="card overflow-hidden transition-all duration-150"
            >
              <button
                type="button"
                onClick={() => toggle(faq.id)}
                className="flex w-full cursor-pointer items-center justify-between p-5 text-left text-sm font-bold text-ink transition hover:text-brand"
              >
                <span>{faq.question}</span>
                <ChevronDownIcon
                  className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-brand" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="border-t border-line/60 px-5 pb-5 pt-3 text-xs leading-relaxed text-muted sm:text-sm">
                  <p className="whitespace-pre-line">{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
