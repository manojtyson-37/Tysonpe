"use client";

import type { FormState } from "@/app/actions/auth";
import { GST_RATES, PRODUCT_TYPES } from "@/lib/validation";
import { ActionForm, Field, FormError, SavedNote, SubmitButton } from "./form";
import { TYPE_LABEL } from "./ui";

type Defaults = {
  title: string; tagline: string; description: string; type: string;
  price: string; gstRatePct: number; billing: string;
};

export function ProductForm({
  action, defaults, submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  defaults?: Defaults;
  submitLabel: string;
}) {
  const d: Defaults = defaults ?? { title: "", tagline: "", description: "", type: "course", price: "", gstRatePct: 18, billing: "one_time" };
  return (
    <ActionForm action={action} className="space-y-5">
      <Field name="title" label="Title" defaultValue={d.title} placeholder="e.g. Personal Finance Masterclass" required />
      <Field name="tagline" label="One-line pitch" defaultValue={d.tagline} placeholder="Shown under the title" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="type" label="Type" as="select" defaultValue={d.type}>
          {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </Field>
        <Field name="billing" label="Billing" as="select" defaultValue={d.billing} hint="Monthly is a label for now; recurring billing ships later.">
          <option value="one_time">One-time</option>
          <option value="monthly">Monthly</option>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="price" label="Price (₹, GST-inclusive)" prefix="₹" defaultValue={d.price} placeholder="499" hint="Enter 0 for a free product." required />
        <Field name="gstRatePct" label="GST rate" as="select" defaultValue={String(d.gstRatePct)}>
          {GST_RATES.map((g) => <option key={g} value={g}>{g}%</option>)}
        </Field>
      </div>
      <Field name="description" label="Description" as="textarea" rows={7} defaultValue={d.description} hint="Plain text. Line breaks are kept." />
      <FormError />
      <div className="flex items-center gap-4">
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
        <SavedNote />
      </div>
    </ActionForm>
  );
}
