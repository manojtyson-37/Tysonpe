"use client";

import { Button, ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";

// Renders in the root layout only, which has no nav, so the page carries its own way out. The message and stack
// are never shown: they can carry internals. The digest is the one thing that lets a server log line be matched.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-md flex-1 px-4 py-20 focus:outline-none">
      <h1 className="text-3xl font-bold">This page didn&apos;t load</h1>
      <Callout tone="bad" className="mt-4">
        Something went wrong while loading this page. Try again, or go back to the home page.
      </Callout>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={reset} className="pointer-coarse:min-h-11 pointer-coarse:min-w-11">Try again</Button>
        <ButtonLink href="/" variant="secondary" className="pointer-coarse:min-h-11 pointer-coarse:min-w-11">Go to the home page</ButtonLink>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-muted">
          Error reference: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </main>
  );
}
