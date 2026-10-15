"use client";

import { editPostAction } from "@/app/actions/community";
import { ActionForm, Field, FormError, SavedNote, SubmitButton } from "@/components/form";

export function EditPostForm({ postId, title, body }: { postId: string; title: string; body: string }) {
  return (
    <ActionForm action={editPostAction.bind(null, postId)} className="space-y-3">
      <Field name="title" label="Title (optional)" defaultValue={title} maxLength={120} />
      <Field name="body" label="Post" as="textarea" rows={5} maxLength={2000} defaultValue={body} required />
      <FormError />
      <div className="flex items-center gap-3">
        <SubmitButton className="btn btn-primary btn-sm min-h-10" pendingText="Saving…">Save changes</SubmitButton>
        <SavedNote />
      </div>
    </ActionForm>
  );
}
