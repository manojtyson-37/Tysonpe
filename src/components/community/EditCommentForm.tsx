"use client";

import { editCommentAction } from "@/app/actions/community";
import { ActionForm, Field, FormError, SavedNote, SubmitButton } from "@/components/form";

export function EditCommentForm({ commentId, body }: { commentId: string; body: string }) {
  return (
    <ActionForm action={editCommentAction.bind(null, commentId)} className="space-y-3">
      <Field name="body" label="Edit comment" as="textarea" rows={3} maxLength={1000} defaultValue={body} required />
      <FormError />
      <div className="flex items-center gap-3">
        <SubmitButton className="btn btn-primary btn-sm min-h-10" pendingText="Saving…">Save changes</SubmitButton>
        <SavedNote />
      </div>
    </ActionForm>
  );
}
