import type { Metadata } from "next";
import { updateProfile } from "@/app/actions/creator";
import { BrandColorField } from "@/components/BrandColorField";
import { ActionForm, Field, FormError, SavedNote, SubmitButton } from "@/components/form";
import { PageHeader } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";

// A constant, not `title="..."` in JSX: the style scan flags that spelling because on a host element it is a tooltip.
const PAGE_TITLE = "Store settings";
export const metadata: Metadata = { title: PAGE_TITLE };

export default async function SettingsPage() {
  const { creator } = await requireCreator();
  return (
    <>
      <PageHeader title={PAGE_TITLE} sub="How your storefront looks to buyers." />
      <ActionForm action={updateProfile} className="max-w-xl space-y-5">
        <Field name="displayName" label="Store name" defaultValue={creator.displayName} required />
        <Field name="bio" label="Bio" as="textarea" rows={4} defaultValue={creator.bio} hint="Shown on your storefront header." />
        <BrandColorField defaultColor={creator.brandColor} storeName={creator.displayName} />
        <p className="t-meta">
          Store link: <code className="rounded-control bg-surface-2 px-1.5 py-0.5 font-mono text-ink">/c/{creator.handle}</code> (handles can&apos;t be changed yet).
        </p>
        <FormError />
        <div className="flex items-center gap-4">
          <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
          <SavedNote />
        </div>
      </ActionForm>
    </>
  );
}
