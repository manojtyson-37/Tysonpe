import type { Metadata } from "next";
import { updateProfile } from "@/app/actions/creator";
import { ActionForm, Field, FormError, SavedNote, SubmitButton } from "@/components/form";
import { PageHeader } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Store settings" };

export default async function SettingsPage() {
  const { creator } = await requireCreator();
  return (
    <>
      <PageHeader title="Store settings" sub="How your storefront looks to buyers." />
      <div className="card max-w-xl p-6">
        <ActionForm action={updateProfile} className="space-y-5">
          <Field name="displayName" label="Store name" defaultValue={creator.displayName} required />
          <Field name="bio" label="Bio" as="textarea" rows={4} defaultValue={creator.bio} hint="Shown on your storefront header." />
          <div>
            <label htmlFor="brandColor" className="label">Brand colour</label>
            <input id="brandColor" name="brandColor" type="color" defaultValue={creator.brandColor} className="h-11 w-20 cursor-pointer rounded-xl border border-line bg-surface p-1" />
            <p className="hint">Buttons and accents on your storefront use this colour.</p>
          </div>
          <p className="text-sm text-muted">Store link: <code className="rounded bg-surface-2 px-1.5 py-0.5">/c/{creator.handle}</code> (handles can&apos;t be changed yet).</p>
          <FormError />
          <div className="flex items-center gap-4"><SubmitButton pendingText="Saving…">Save settings</SubmitButton><SavedNote /></div>
        </ActionForm>
      </div>
    </>
  );
}
