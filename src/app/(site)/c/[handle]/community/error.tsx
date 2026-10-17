"use client";

import { focusRing } from "@/components/community/styles";

export default function CommunityError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="card px-6 py-8">
      <p className="text-lg font-semibold">Couldn&apos;t load this page</p>
      <p className="mt-1 text-sm text-muted">Something went wrong on our side. Try again in a moment.</p>
      <button type="button" onClick={reset} className={`btn btn-primary mt-5 min-h-10 ${focusRing}`}>Try again</button>
    </div>
  );
}
