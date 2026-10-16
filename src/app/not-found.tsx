import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

// Renders in the root layout only, which has no nav, so the page carries its own way back.
export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-md flex-1 px-4 py-20 focus:outline-none">
      <h1 className="text-3xl font-bold">We can&apos;t find that page</h1>
      <p className="mt-2 text-base text-muted">
        The link may be mistyped, or the page may have been moved or removed.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/" className="pointer-coarse:min-h-11 pointer-coarse:min-w-11">Go to the home page</ButtonLink>
        <ButtonLink href="/demo" variant="secondary" className="pointer-coarse:min-h-11 pointer-coarse:min-w-11">Try the demo</ButtonLink>
      </div>
    </main>
  );
}
