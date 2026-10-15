"use client";

import { addCommentAction } from "@/app/actions/community";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/form";

export function CommentForm({ postId }: { postId: string }) {
  return (
    <ActionForm action={addCommentAction.bind(null, postId)} className="space-y-3">
      <Field name="body" label="Add a comment" as="textarea" rows={3} required hint="Plain text, up to 1,000 characters." />
      <FormError />
      <SubmitButton className="btn btn-primary btn-sm" pendingText="Posting…">Comment</SubmitButton>
    </ActionForm>
  );
}
