import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteProduct, unpublishProduct, updateProduct } from "@/app/actions/creator";
import {
  addLesson, addSection, deleteLesson, deleteSection, moveLesson, moveLessonToSection, moveSection,
  publishProduct, renameSection, setCertificates, updateLesson,
} from "@/app/actions/curriculum";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ActionForm, Field, FormError, Select, SubmitButton } from "@/components/form";
import { IconArrowDown, IconArrowUp, IconChevronDown, IconExternal } from "@/components/icons";
import { KIND_LABEL, LessonForm } from "@/components/LessonForm";
import { ProductForm } from "@/components/ProductForm";
import { Badge, Button, ButtonLink, Callout, PageHeader, StatStrip, StatusBadge } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { istDate } from "@/lib/format";
import { getCourseInsights } from "@/lib/learning/insights";

export const metadata: Metadata = { title: "Edit product" };

// Dense rows sit close together, so each control carries its own 44px floor on touch screens instead of relying on
// the invisible hit area that `.btn` adds (those would overlap between neighbours).
const COARSE = "pointer-coarse:min-h-11";

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
  const hasOrders = product._count.orders > 0;

  return (
    <>
      <PageHeader
        title={product.title}
        sub={published ? "Live on your storefront." : "Draft. Not visible to buyers."}
        back={{ label: "Products", href: "/dashboard/products" }}
        actions={
          <>
            <StatusBadge status={product.status} />
            <ButtonLink
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              size="sm"
              className={COARSE}
              icon={<IconExternal size={16} />}
            >
              {published ? "View page" : "Preview"}
              <span className="sr-only"> (opens in a new tab)</span>
            </ButtonLink>
            <form action={published ? unpublishProduct.bind(null, id) : publishProduct.bind(null, id)}>
              <Button type="submit" variant={published ? "secondary" : "primary"} size="sm" className={COARSE}>
                {published ? "Unpublish" : "Publish"}
              </Button>
            </form>
          </>
        }
      />
      {typeof sp.error === "string" && <Callout tone="bad" className="mb-5">{sp.error.slice(0, 300)}</Callout>}

      <StatStrip
        className="mb-8"
        items={[
          { label: "Learners", value: insights.enrolled },
          { label: "Completed", value: insights.completed, sub: `${insights.completionPct}% of learners` },
          { label: "Certificates", value: insights.certificates, sub: product.certificateEnabled ? "Auto-issued on completion" : "Turned off" },
          { label: "Lessons", value: product.items.length, sub: `${product.sections.length} ${product.sections.length === 1 ? "section" : "sections"}` },
        ]}
      />

      <div className="grid gap-x-10 gap-y-10 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section aria-labelledby="details-h" className="h-fit">
          <h2 id="details-h" className="mb-4 text-lg font-semibold">Details</h2>
          <ProductForm
            action={updateProduct.bind(null, id)}
            submitLabel="Save changes"
            defaults={{
              title: product.title, tagline: product.tagline, description: product.description, type: product.type,
              price: (product.pricePaise / 100).toFixed(product.pricePaise % 100 ? 2 : 0), gstRatePct: product.gstRatePct, billing: product.billing,
            }}
          />
          <div className="mt-8 border-t border-line pt-5">
            <h3 className="text-sm font-semibold">Completion certificate</h3>
            <p className="mt-1 text-sm text-muted">Learners get a verifiable certificate the moment every required lesson is done.</p>
            <form action={setCertificates.bind(null, id, !product.certificateEnabled)} className="mt-3">
              <Button type="submit" variant="secondary" size="sm" className={COARSE}>
                {product.certificateEnabled ? "Turn off certificates" : "Turn on certificates"}
              </Button>
            </form>
          </div>
        </section>

        <section aria-labelledby="curriculum-h">
          <h2 id="curriculum-h" className="text-lg font-semibold">Curriculum</h2>
          <p className="mb-5 text-sm text-muted">What buyers get, in order. Drip and quizzes are set per lesson.</p>

          <div className="space-y-8">
            {groups.map((g) => {
              if (g.id === null && g.items.length === 0 && product.sections.length > 0) return null;
              const section = g.id ? product.sections.find((s) => s.id === g.id)! : null;
              const si = section ? product.sections.findIndex((s) => s.id === section.id) : -1;
              return (
                <section key={g.id ?? "loose"} aria-label={g.title}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-line-strong pb-2">
                    <h3 className="min-w-0 flex-1 break-words text-base font-semibold">{g.title}</h3>
                    {section && (
                      <div className="flex flex-wrap gap-1.5">
                        <form action={moveSection.bind(null, section.id, "up")}>
                          <Button type="submit" variant="ghost" size="sm" className={COARSE} icon={<IconArrowUp size={16} />} disabled={si === 0} aria-label={`Move section ${section.title} up`}>Up</Button>
                        </form>
                        <form action={moveSection.bind(null, section.id, "down")}>
                          <Button type="submit" variant="ghost" size="sm" className={COARSE} icon={<IconArrowDown size={16} />} disabled={si === product.sections.length - 1} aria-label={`Move section ${section.title} down`}>Down</Button>
                        </form>
                        <form action={deleteSection.bind(null, section.id)}>
                          <ConfirmButton
                            className={COARSE}
                            aria-label={`Delete section ${section.title}`}
                            message="Delete this section? Its lessons are kept and move to “Lessons”."
                            confirmLabel="Delete section"
                          >
                            Delete
                          </ConfirmButton>
                        </form>
                      </div>
                    )}
                  </div>
                  {section && (
                    <details className="group border-b border-line">
                      <summary className="flex cursor-pointer items-center gap-1.5 py-2 text-sm text-muted hover:text-ink pointer-coarse:min-h-11">
                        <IconChevronDown size={14} className="shrink-0 transition-transform duration-(--dur-fast) group-open:rotate-180" />
                        Rename section
                      </summary>
                      <div className="pb-3">
                        <ActionForm action={renameSection.bind(null, section.id)} className="flex flex-wrap items-end gap-2">
                          <Field name="title" label="Section title" defaultValue={section.title} className="min-w-48 flex-1" required />
                          <SubmitButton variant="secondary" size="sm" className={COARSE} pendingText="Saving…">Save</SubmitButton>
                        </ActionForm>
                      </div>
                    </details>
                  )}

                  {g.items.length === 0 ? (
                    <p className="py-4 text-sm text-muted">No lessons here yet.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {g.items.map((it, i) => {
                        const pct = pctByItem.get(it.id);
                        return (
                          <li key={it.id}>
                            <details className="group">
                              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm pointer-coarse:min-h-11">
                                <IconChevronDown size={14} className="shrink-0 text-muted transition-transform duration-(--dur-fast) group-open:rotate-180" />
                                <span className="w-5 shrink-0 tabular-nums text-muted">{i + 1}</span>
                                <span className="min-w-0 flex-1 break-words font-medium">{it.title}</span>
                                {it.dripType !== "none" && <Badge tone="warn">drip</Badge>}
                                {!it.requiredForCompletion && <Badge>optional</Badge>}
                                <Badge>{KIND_LABEL[it.kind] ?? it.kind}</Badge>
                                {insights.enrolled > 0 && <span className="text-xs tabular-nums text-muted">{pct ?? 0}% done</span>}
                              </summary>
                              <div className="space-y-4 border-t border-line bg-surface-2/50 px-4 pb-5 pt-4">
                                {it.kind === "quiz" && (
                                  <ButtonLink href={`/dashboard/products/${id}/quiz/${it.id}`} variant="secondary" size="sm" className={COARSE}>
                                    Edit questions
                                  </ButtonLink>
                                )}
                                <LessonForm
                                  action={updateLesson.bind(null, it.id)}
                                  submitLabel="Save lesson"
                                  lesson={{
                                    title: it.title, kind: it.kind, url: it.url, body: it.body, requiredForCompletion: it.requiredForCompletion,
                                    dripType: it.dripType, dripDays: it.dripDays, dripDate: istDate(it.dripAt),
                                  }}
                                />
                                <div className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
                                  <form action={moveLesson.bind(null, it.id, "up")}>
                                    <Button type="submit" variant="secondary" size="sm" className={COARSE} icon={<IconArrowUp size={16} />} disabled={i === 0} aria-label={`Move ${it.title} up`}>Up</Button>
                                  </form>
                                  <form action={moveLesson.bind(null, it.id, "down")}>
                                    <Button type="submit" variant="secondary" size="sm" className={COARSE} icon={<IconArrowDown size={16} />} disabled={i === g.items.length - 1} aria-label={`Move ${it.title} down`}>Down</Button>
                                  </form>
                                  {product.sections.length > 0 && (
                                    <form action={moveLessonToSection.bind(null, it.id)} className="flex flex-wrap items-end gap-2">
                                      <Select name="sectionId" label="Move to section" defaultValue={it.sectionId ?? ""} className="w-48">
                                        <option value="">Lessons (no section)</option>
                                        {sectionOptions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                                      </Select>
                                      <Button type="submit" variant="secondary" size="sm" className={COARSE}>Move</Button>
                                    </form>
                                  )}
                                  <form action={deleteLesson.bind(null, it.id)} className="ml-auto">
                                    <ConfirmButton
                                      className={COARSE}
                                      aria-label={`Delete lesson ${it.title}`}
                                      message="Delete this lesson? Learner progress on it is removed."
                                      confirmLabel="Delete lesson"
                                    >
                                      Delete
                                    </ConfirmButton>
                                  </form>
                                </div>
                              </div>
                            </details>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          <section aria-labelledby="add-section-h" className="mt-10 border-t border-line pt-5">
            <h3 id="add-section-h" className="mb-3 text-sm font-semibold">Add a section</h3>
            <ActionForm action={addSection.bind(null, id)} className="space-y-3">
              <Field name="title" label="Title" placeholder="Module 1: Foundations" required />
              <FormError />
              <SubmitButton variant="secondary" size="sm" className={COARSE} pendingText="Adding…">Add section</SubmitButton>
            </ActionForm>
          </section>
          <section aria-labelledby="add-lesson-h" className="mt-8 border-t border-line pt-5">
            <h3 id="add-lesson-h" className="mb-3 text-sm font-semibold">Add a lesson</h3>
            <LessonForm action={addLesson.bind(null, id)} submitLabel="Add lesson" sections={sectionOptions} />
          </section>
        </section>
      </div>

      <section aria-labelledby="danger-h" className="mt-12 border-t border-line pt-6">
        <h2 id="danger-h" className="font-semibold">Danger zone</h2>
        <p className="mt-1 text-sm text-muted">
          {hasOrders
            ? "This product has orders, so it can't be deleted. Removing it will unpublish it and keep order history."
            : "Deleting removes the product and its lessons permanently."}
        </p>
        <form action={deleteProduct.bind(null, id)} className="mt-3">
          <ConfirmButton
            className={COARSE}
            message={hasOrders ? "Unpublish this product? Existing buyers keep access." : "Delete this product and its lessons permanently?"}
            confirmLabel={hasOrders ? "Unpublish & archive" : "Delete product"}
          >
            {hasOrders ? "Unpublish & archive" : "Delete product"}
          </ConfirmButton>
        </form>
      </section>
    </>
  );
}
