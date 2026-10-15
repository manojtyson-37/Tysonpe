"use client";

import { createPostAction } from "@/app/actions/community";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/form";

export function PostComposer({ channelId }: { channelId: string }) {
  return (
    <ActionForm action={createPostAction.bind(null, channelId)} className="card space-y-3 px-5 pb-4 pt-5">
      <Field name="title" label="Title (optional)" />
      <Field name="body" label="Start a conversation" as="textarea" rows={4} required hint="Plain text, up to 2,000 characters." />
      <FormError />
      <div className="flex justify-end">
        <SubmitButton pendingText="Posting…">Post</SubmitButton>
      </div>
    </ActionForm>
  );
}
