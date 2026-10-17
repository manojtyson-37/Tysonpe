"use client";

import { useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { GST_RATES, PRODUCT_TYPES } from "@/lib/validation";
import { ActionForm, Field, FormError, InputGroup, SavedNote, SubmitButton, useFormValues } from "./form";
import { TYPE_LABEL } from "./ui";

type Defaults = {
  title: string; tagline: string; description: string; type: string;
  price: string; gstRatePct: number; billing: string;
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

/**
 * The price is an `InputGroup` rather than a `Field` because it needs `inputMode="decimal"` (a number pad on
 * phones), which `Field` does not pass through. It does what `Field` does for the other controls: it shows the
 * last-submitted value after React resets the form, and remounts only when that value changes. Its error comes
 * from the parent, which reads it off the action result.
 */
export function PriceField({ defaultValue, error }: { defaultValue: string; error: string | undefined }) {
  const submitted = useFormValues()?.price;
  return (
    <InputGroup
      key={`price:${submitted ?? ""}`}
      name="price"
      label="Price (₹, GST-inclusive)"
      prefix="₹"
      defaultValue={submitted ?? defaultValue}
      placeholder="499"
      hint="Enter 0 for a free product."
      inputMode="decimal"
      autoComplete="off"
      error={error}
      required
    />
  );
}

export function ProductForm({
  action, defaults, submitLabel,
}: {
  action: Action;
  defaults?: Defaults;
  submitLabel: string;
}) {
  const d: Defaults = defaults ?? { title: "", tagline: "", description: "", type: "course", price: "", gstRatePct: 18, billing: "one_time" };
  const [priceError, setPriceError] = useState<string | undefined>();
  const run: Action = async (prev, fd) => {
    const res = await action(prev, fd);
    setPriceError(res?.fields?.price);
    return res;
  };
  return (
    <ActionForm action={run} className="space-y-5">
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
        <PriceField defaultValue={d.price} error={priceError} />
        <Field name="gstRatePct" label="GST rate" as="select" defaultValue={String(d.gstRatePct)}>
          {GST_RATES.map((g) => <option key={g} value={g}>{g}%</option>)}
        </Field>
      </div>
      <Field name="description" label="Description" as="textarea" rows={7} defaultValue={d.description} hint="Plain text. Line breaks are kept." />
      <FormError />
      <div className="flex items-center gap-4">
        <SubmitButton variant="primary" pendingText="Saving…">{submitLabel}</SubmitButton>
        <SavedNote />
      </div>
    </ActionForm>
  );
}
