"use client";

import { useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { CONTENT_KINDS } from "@/lib/validation";
import { ActionForm, Field, FormError, SavedNote, SubmitButton, useFormValues } from "./form";

const KIND_LABEL: Record<string, string> = { video: "Video", pdf: "PDF", text: "Text", link: "Link" };
type Item = { title: string; kind: string; url: string; body: string };

function ItemFields({ item }: { item?: Item }) {
  const submitted = useFormValues();
  const [picked, setPicked] = useState<string | null>(null);
  // Derived, not mirrored: React resets the form DOM after each action, so state must come from values.
  const kind = picked ?? submitted?.kind ?? item?.kind ?? "video";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Field name="title" label="Title" defaultValue={item?.title} placeholder="Lesson 1: Getting started" required />
        <Field name="kind" label="Type" as="select" defaultValue={kind} onChange={setPicked}>
          {CONTENT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </Field>
      </div>
      {kind === "text" ? (
        <Field name="body" label="Text" as="textarea" rows={5} defaultValue={item?.body} />
      ) : (
        <Field name="url" label={kind === "video" ? "Video link" : kind === "pdf" ? "PDF link" : "Link"} type="url" defaultValue={item?.url}
          placeholder="https://" hint={kind === "video" ? "YouTube and Vimeo links play inside Tysonpe; others open in a new tab." : undefined} />
      )}
    </>
  );
}

export function ContentItemForm({
  action, item, submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  item?: Item;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="space-y-3">
      <ItemFields item={item} />
      <FormError />
      <div className="flex items-center gap-3">
        <SubmitButton className="btn btn-secondary btn-sm" pendingText="Saving…">{submitLabel}</SubmitButton>
        <SavedNote />
      </div>
    </ActionForm>
  );
}
