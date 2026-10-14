import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { becomeCreator } from "@/app/actions/auth";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/form";
import { SiteNav } from "@/components/SiteNav";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Open your store" };

export default async function Onboarding() {
  const user = await requireUser("/dashboard/onboarding");
  if (user.creator) redirect("/dashboard");
  return (
    <>
      <SiteNav />
      <div className="mx-auto w-full max-w-md px-4 py-14">
        <h1 className="text-3xl font-bold">Open your store</h1>
        <p className="mt-1 text-sm text-muted">Pick the name and link buyers will see.</p>
        <div className="card mt-6 p-6">
          <ActionForm action={becomeCreator} className="space-y-4">
            <Field name="displayName" label="Store name" defaultValue={user.name} required />
            <Field name="handle" label="Store handle" prefix="/c/" placeholder="your-name" hint="Lowercase letters, numbers and hyphens." required />
            <FormError />
            <SubmitButton className="btn btn-primary w-full" pendingText="Creating…">Create store</SubmitButton>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
