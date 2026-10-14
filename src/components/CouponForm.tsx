"use client";

import { useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { ActionForm, Field, FormError, SavedNote, SubmitButton, useFormValues } from "./form";

type C = { code: string; percentOff: number | null; flatOffPaise: number | null; maxRedemptions: number | null; expiresAt: Date | null };

function CouponFields({ coupon }: { coupon?: C }) {
  const submitted = useFormValues();
  const [picked, setPicked] = useState<string | null>(null);
  const kind = picked ?? submitted?.kind ?? (coupon?.flatOffPaise ? "flat" : "percent");
  const expires = coupon?.expiresAt ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(coupon.expiresAt) : "";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field name="code" label="Code" defaultValue={coupon?.code} placeholder="WELCOME20" required />
        <Field name="kind" label="Discount type" as="select" defaultValue={kind} onChange={setPicked}>
          <option value="percent">Percent off</option>
          <option value="flat">Flat ₹ off</option>
        </Field>
        {kind === "percent"
          ? <Field name="percent" label="Percent" type="number" defaultValue={coupon?.percentOff ?? ""} placeholder="20" />
          : <Field name="flat" label="Amount (₹)" prefix="₹" defaultValue={coupon?.flatOffPaise ? coupon.flatOffPaise / 100 : ""} placeholder="100" />}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="maxRedemptions" label="Max uses" type="number" defaultValue={coupon?.maxRedemptions ?? ""} hint="Leave empty for unlimited." />
        <Field name="expiresAt" label="Valid until" type="date" defaultValue={expires} hint="Leave empty for no expiry." />
      </div>
    </>
  );
}

export function CouponForm({ action, coupon, submitLabel }: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  coupon?: C;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="space-y-3">
      <CouponFields coupon={coupon} />
      <FormError />
      <div className="flex items-center gap-3">
        <SubmitButton className="btn btn-primary btn-sm" pendingText="Saving…">{submitLabel}</SubmitButton>
        <SavedNote />
      </div>
    </ActionForm>
  );
}
