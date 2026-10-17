import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/SignupForm";
import { getCurrentUser, safeNext } from "@/lib/auth/session";

export async function generateMetadata({ searchParams }: PageProps<"/signup">): Promise<Metadata> {
  const sp = await searchParams;
  const isCreator = sp.role === "creator";
  return {
    title: isCreator ? "Open your store" : "Create your account",
    description: "Creator commerce and fintech infrastructure for India. Launch your storefront with instant UPI checkout, GST compliance, and T+1 bank settlements.",
  };
}

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined, "");
  if (await getCurrentUser()) redirect(next || "/library");
  const role = sp.role === "creator" ? "creator" : "learner";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fbfaf8] py-8 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SignupForm initialRole={role} next={next || undefined} />
      </div>
    </div>
  );
}
