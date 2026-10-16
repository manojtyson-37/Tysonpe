import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser, safeNext } from "@/lib/auth/session";
import { demoLoginPassword } from "@/lib/demo";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined, "");
  if (await getCurrentUser()) redirect(next || "/library");
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your library or dashboard."
      footer={
        <>
          New here? <Link className="font-semibold text-brand hover:underline" href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link>
        </>
      }
    >
      <LoginForm next={next || undefined} demoPassword={demoLoginPassword() ?? undefined} />
    </AuthShell>
  );
}
