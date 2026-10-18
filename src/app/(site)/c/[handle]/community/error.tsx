"use client";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { touchButton } from "@/components/community/styles";

// Next 16 passes `retry`, which re-fetches the server payload; the older callback only re-renders the same failed one,
// so after a server-component failure it would leave the button looking dead (same contract as src/app/error.tsx).
// The message and stack are never shown: they can carry internals. The digest is the one thing that lets a server log
// line be matched (same as src/app/error.tsx).
export default function CommunityError({ error, retry }: { error?: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="border-y border-line py-6">
      <Callout tone="bad">
        <p className="font-semibold">Couldn&apos;t load this page</p>
        <p className="mt-0.5 font-normal">Something went wrong on our side. Try again in a moment.</p>
      </Callout>
      <Button onClick={retry} className={`mt-5 ${touchButton}`}>Try again</Button>
      {error?.digest && (
        <p className="mt-6 text-xs text-muted">
          Error reference: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
