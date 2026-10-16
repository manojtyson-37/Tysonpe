import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { becomeCreator } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/form";
import { SiteNav } from "@/components/SiteNav";
import { SkipLink } from "@/components/SkipLink";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Open your store" };

// Outside the (console) group on purpose: a creator has no console to frame until this is done, so the page keeps the
// public nav. It is outside (site) too, so it supplies its own skip link and <main>.
export default async function Onboarding() {
  const user = await requireUser("/dashboard/onboarding");
  if (user.creator) redirect("/dashboard");
  return (
    <>
      <SkipLink />
      <SiteNav />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <AuthShell title="Open your store" subtitle="Pick the name and link buyers will see.">
          <ActionForm action={becomeCreator} className="space-y-4">
            <Field name="displayName" label="Store name" defaultValue={user.name} required />
            <Field name="handle" label="Store handle" prefix="/c/" placeholder="your-name" hint="Lowercase letters, numbers and hyphens." required />
            <FormError />
            <SubmitButton className="btn btn-primary w-full" pendingText="Creating…">Create store</SubmitButton>
          </ActionForm>
        </AuthShell>
      </main>
    </>
  );
}
