import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProduct, unpublishProduct, updateProduct } from "@/app/actions/creator";
import {
  addLesson, addSection, deleteLesson, deleteSection, moveLesson, moveLessonToSection, moveSection,
  publishProduct, renameSection, setCertificates, updateLesson,
} from "@/app/actions/curriculum";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/form";
import { LessonForm } from "@/components/LessonForm";
import { ProductForm } from "@/components/ProductForm";
import { PageHeader, Stat, StatusBadge } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getCourseInsights } from "@/lib/learning/insights";

export const metadata: Metadata = { title: "Edit product" };

const istDate = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d) : "");

export default async function EditProduct({ params, searchParams }: PageProps<"/dashboard/products/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { creator } = await requireCreator();
  const product = await db.product.findFirst({
    where: { id, creatorId: creator.id },
    include: {
      sections: { orderBy: { position: "asc" } },
      items: { orderBy: { position: "asc" } },
      _count: { select: { orders: true } },
    },
  });
  if (!product) notFound();

  const insights = await getCourseInsights(id);
  const pctByItem = new Map(insights.lessons.map((l) => [l.id, l.pct]));
  const sectionIds = new Set(product.sections.map((s) => s.id));
  const groups = [
    { id: null as string | null, title: "Lessons", items: product.items.filter((i) => !i.sectionId || !sectionIds.has(i.sectionId)) },
    ...product.sections.map((s) => ({ id: s.id as string | null, title: s.title, items: product.items.filter((i) => i.sectionId === s.id) })),
  ];
  const sectionOptions = product.sections.map((s) => ({ id: s.id, title: s.title }));
  const published = product.status === "published";
  const publicPath = `/c/${creator.handle}/${product.slug}`;

  return (
    <>
      <PageHeader
        title={product.title}
        sub={published ? "Live on your storefront." : "Draft. Not visible to buyers."}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={product.status} />
            <Link href={publicPath} className="btn btn-secondary btn-sm" target="_blank">{published ? "View page ↗" : "Preview ↗"}</Link>
            <form action={published ? unpublishProduct.bind(null, id) : publishProduct.bind(null, id)}>
              <button className={`btn btn-sm ${published ? "btn-secondary" : "btn-primary"}`} type="submit">{published ? "Unpublish" : "Publish"}</button>
            </form>
          </div>
        }
      />
      {typeof sp.error === "string" && (
        <p role="alert" className="mb-5 rounded-xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">{sp.error.slice(0, 300)}</p>
      )}

      <section aria-label="Learner progress" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Learners" value={insights.enrolled} />
        <Stat label="Completed" value={insights.completed} sub={`${insights.completionPct}% of learners`} />
        <Stat label="Certificates" value={insights.certificates} sub={product.certificateEnabled ? "Auto-issued on completion" : "Turned off"} />
        <Stat label="Lessons" value={product.items.length} sub={`${product.sections.length} ${product.sections.length === 1 ? "section" : "sections"}`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="card h-fit p-6">
          <h2 className="mb-4 font-semibold">Details</h2>
          <ProductForm
            action={updateProduct.bind(null, id)}
            submitLabel="Save changes"
            defaults={{
              title: product.title, tagline: product.tagline, description: product.description, type: product.type,
              price: (product.pricePaise / 100).toFixed(product.pricePaise % 100 ? 2 : 0), gstRatePct: product.gstRatePct, billing: product.billing,
            }}
          />
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-sm font-semibold">Completion certificate</h3>
            <p className="mt-1 text-sm text-muted">Learners get a verifiable certificate the moment every required lesson is done.</p>
            <form action={setCertificates.bind(null, id, !product.certificateEnabled)} className="mt-3">
              <button className={`btn btn-sm ${product.certificateEnabled ? "btn-secondary" : "btn-primary"}`} type="submit">
                {product.certificateEnabled ? "Turn off certificates" : "Turn on certificates"}
              </button>
            </form>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold">Curriculum</h2>
              <p className="text-sm text-muted">What buyers get, in order. Drip and quizzes are set per lesson.</p>
            </div>
          </div>

          <div className="space-y-5">
            {groups.map((g) => {
              if (g.id === null && g.items.length === 0 && product.sections.length > 0) return null;
              const section = g.id ? product.sections.find((s) => s.id === g.id)! : null;
              const si = section ? product.sections.findIndex((s) => s.id === section.id) : -1;
              return (
                <div key={g.id ?? "loose"} className="card overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2/60 px-4 py-3">
                    {section ? (
                      <details className="min-w-0 flex-1">
                        <summary className="cursor-pointer truncate font-semibold">{section.title} <span className="text-xs font-normal text-muted">· rename</span></summary>
                        <div className="mt-2">
                          <ActionForm action={renameSection.bind(null, section.id)} className="flex items-end gap-2">
                            <Field name="title" label="Section title" defaultValue={section.title} className="flex-1" required />
                            <SubmitButton className="btn btn-secondary btn-sm" pendingText="Saving…">Save</SubmitButton>
                          </ActionForm>
                        </div>
                      </details>
                    ) : (
                      <span className="flex-1 font-semibold">{g.title}</span>
                    )}
                    {section && (
                      <div className="flex gap-1.5">
                        <form action={moveSection.bind(null, section.id, "up")}><button className="btn btn-ghost btn-sm" disabled={si === 0} aria-label="Move section up">↑</button></form>
                        <form action={moveSection.bind(null, section.id, "down")}><button className="btn btn-ghost btn-sm" disabled={si === product.sections.length - 1} aria-label="Move section down">↓</button></form>
                        <form action={deleteSection.bind(null, section.id)}><ConfirmButton className="btn btn-danger btn-sm" message="Delete this section? Its lessons are kept and move to “Lessons”.">Delete</ConfirmButton></form>
                      </div>
                    )}
                  </div>

                  {g.items.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-muted">No lessons here yet.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {g.items.map((it, i) => {
                        const pct = pctByItem.get(it.id);
                        return (
                          <li key={it.id}>
                            <details>
                              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                                <span className="w-5 tabular-nums text-muted">{i + 1}</span>
                                <span className="min-w-0 flex-1 truncate font-medium">{it.title}</span>
                                {it.dripType !== "none" && <span className="badge badge-warn">drip</span>}
                                {!it.requiredForCompletion && <span className="badge badge-muted">optional</span>}
                                <span className="badge badge-muted">{it.kind}</span>
                                {insights.enrolled > 0 && <span className="text-xs tabular-nums text-muted" title="Learners who completed this lesson">{pct ?? 0}% done</span>}
                              </summary>
                              <div className="space-y-4 border-t border-line bg-bg/40 p-4">
                                {it.kind === "quiz" && (
                                  <Link href={`/dashboard/products/${id}/quiz/${it.id}`} className="btn btn-primary btn-sm">Edit questions</Link>
                                )}
                                <LessonForm
                                  action={updateLesson.bind(null, it.id)}
                                  submitLabel="Save lesson"
                                  lesson={{
                                    title: it.title, kind: it.kind, url: it.url, body: it.body, requiredForCompletion: it.requiredForCompletion,
                                    dripType: it.dripType, dripDays: it.dripDays, dripDate: istDate(it.dripAt),
                                  }}
                                />
                                <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
                                  <form action={moveLesson.bind(null, it.id, "up")}><button className="btn btn-secondary btn-sm" disabled={i === 0}>↑ Up</button></form>
                                  <form action={moveLesson.bind(null, it.id, "down")}><button className="btn btn-secondary btn-sm" disabled={i === g.items.length - 1}>↓ Down</button></form>
                                  {product.sections.length > 0 && (
                                    <form action={moveLessonToSection.bind(null, it.id)} className="flex items-center gap-2">
                                      <label className="sr-only" htmlFor={`mv-${it.id}`}>Move to section</label>
                                      <select id={`mv-${it.id}`} name="sectionId" defaultValue={it.sectionId ?? ""} className="input !w-auto !py-1.5 text-xs">
                                        <option value="">Lessons (no section)</option>
                                        {sectionOptions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                                      </select>
                                      <button className="btn btn-secondary btn-sm">Move</button>
                                    </form>
                                  )}
                                  <form action={deleteLesson.bind(null, it.id)} className="ml-auto"><ConfirmButton className="btn btn-danger btn-sm" message="Delete this lesson? Learner progress on it is removed.">Delete</ConfirmButton></form>
                                </div>
                              </div>
                            </details>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4">
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold">Add a section</h3>
              <ActionForm action={addSection.bind(null, id)} className="space-y-3">
                <Field name="title" label="Title" placeholder="Module 1: Foundations" required />
                <FormError />
                <SubmitButton className="btn btn-secondary btn-sm" pendingText="Adding…">Add section</SubmitButton>
              </ActionForm>
            </div>
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold">Add a lesson</h3>
              <LessonForm action={addLesson.bind(null, id)} submitLabel="Add lesson" sections={sectionOptions} />
            </div>
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
          <ConfirmButton className="btn btn-danger btn-sm" message={product._count.orders > 0 ? "Unpublish this product? Existing buyers keep access." : "Delete this product and its lessons permanently?"}>
            {product._count.orders > 0 ? "Unpublish & archive" : "Delete product"}
          </ConfirmButton>
        </form>
      </section>
    </>
  );
}
