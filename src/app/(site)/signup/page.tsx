import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/SignupForm";
import { getCurrentUser, safeNext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined, "");
  if (await getCurrentUser()) redirect(next || "/library");
  const role = sp.role === "creator" ? "creator" : next ? "learner" : "learner";
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold">{role === "creator" ? "Open your store" : "Create your account"}</h1>
      <p className="mt-1 text-sm text-muted">Free to start. No card needed.</p>
      <div className="card mt-6 p-6">
        <SignupForm initialRole={role} next={next || undefined} />
      </div>
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account? <Link className="font-semibold text-brand hover:underline" href="/login">Log in</Link>
      </p>
    </div>
  );
}
