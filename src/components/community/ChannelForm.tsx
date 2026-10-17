"use client";

import { useEffect, useRef, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { ActionForm, Field, FormError, SavedNote, SubmitButton, useFormValues } from "@/components/form";

type Channel = { name: string; description: string; kind: string; access: string; productIds: string[] };
type ProductOption = { id: string; title: string };

function Fields({ channel, products }: { channel?: Channel; products: ProductOption[] }) {
  const submitted = useFormValues();
  const [picked, setPicked] = useState<string | null>(null);
  const access = picked ?? submitted?.access ?? channel?.access ?? "open";
  const ref = useRef<HTMLDivElement>(null);
  // React 19 resets the form after a successful action; the select snaps back to its default, so drop the stale pick too.
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onReset = () => setPicked(null);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);
  return (
    <div ref={ref} className="space-y-3">
      <Field name="name" label="Channel name" defaultValue={channel?.name} placeholder="Masterclass Q&A" required />
      <Field name="description" label="Description" defaultValue={channel?.description} hint="One line, shown above the feed." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="kind" label="Type" as="select" defaultValue={channel?.kind ?? "discussion"}>
          <option value="discussion">Discussion: everyone can post</option>
          <option value="announcement">Announcements: only you post</option>
        </Field>
        <Field name="access" label="Who can join" as="select" defaultValue={access} onChange={setPicked}>
          <option value="open">All paying customers</option>
          <option value="product_gated">Buyers of selected products</option>
        </Field>
      </div>
      {access === "product_gated" && (
        <fieldset className="rounded-xl border border-line px-4 py-3">
          <legend className="px-1 text-sm font-semibold">Products that unlock this channel</legend>
          {products.length === 0 ? (
            <p className="text-sm text-muted">Create a product first.</p>
          ) : (
            <ul>
              {products.map((p) => (
                <li key={p.id}>
                  <label className="flex min-h-10 items-center gap-2 py-2 text-sm">
                    <input type="checkbox" name="productIds" value={p.id} defaultChecked={channel?.productIds.includes(p.id)} className="size-4 accent-[color:var(--brand-text,#0f172a)]" />
                    {p.title}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="hint mt-2">With none ticked, only you can see this channel.</p>
        </fieldset>
      )}
    </div>
  );
}

export function ChannelForm({ action, channel, products, submitLabel }: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  channel?: Channel;
  products: ProductOption[];
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="space-y-3">
      <Fields channel={channel} products={products} />
      <FormError />
      <div className="flex items-center gap-3">
        <SubmitButton className="btn btn-primary btn-sm min-h-10" pendingText="Saving…">{submitLabel}</SubmitButton>
        <SavedNote />
      </div>
    </ActionForm>
  );
}
