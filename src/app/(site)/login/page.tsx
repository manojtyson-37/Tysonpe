import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser, safeNext } from "@/lib/auth/session";
import { demoLoginPassword } from "@/lib/demo";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined, "");
  if (await getCurrentUser()) redirect(next || "/library");
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Log in to your library or dashboard.</p>
      <div className="card mt-6 p-6">
        <LoginForm next={next || undefined} demoPassword={demoLoginPassword() ?? undefined} />
      </div>
      <p className="mt-5 text-center text-sm text-muted">
        New here? <Link className="font-semibold text-brand hover:underline" href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link>
      </p>
    </div>
  );
}
