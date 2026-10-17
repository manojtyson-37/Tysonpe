"use client";

import { createPostAction } from "@/app/actions/community";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/form";

/** Hairline under the form (not a card): the composer sits above the ruled feed and the rule is the divider between them. */
export function PostComposer({ channelId }: { channelId: string }) {
  return (
    <ActionForm action={createPostAction.bind(null, channelId)} className="space-y-3 border-b border-line pb-5">
      <Field name="title" label="Title (optional)" maxLength={120} />
      <Field name="body" label="Start a conversation" as="textarea" rows={4} maxLength={2000} required hint="Plain text, up to 2,000 characters." />
      <FormError />
      <div className="flex justify-end">
        <SubmitButton variant="primary" size="md" pendingText="Posting…">Post</SubmitButton>
      </div>
    </ActionForm>
  );
}
