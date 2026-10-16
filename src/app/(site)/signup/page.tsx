import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "@/components/SignupForm";
import { getCurrentUser, safeNext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined, "");
  if (await getCurrentUser()) redirect(next || "/library");
  const role = sp.role === "creator" ? "creator" : "learner";
  return (
    <AuthShell
      title={role === "creator" ? "Open your store" : "Create your account"}
      subtitle="Free to start. No card needed."
      footer={
        <>
          Already have an account? <Link className="font-semibold text-brand hover:underline" href="/login">Log in</Link>
        </>
      }
    >
      <SignupForm initialRole={role} next={next || undefined} />
    </AuthShell>
  );
}
