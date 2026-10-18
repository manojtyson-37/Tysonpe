"use client";

import { Button } from "@/components/ui/button";

export default function CommunityConsoleError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="max-w-xl rounded-card border border-line bg-surface px-6 py-8">
      <p className="text-lg font-semibold">Couldn&apos;t load community settings</p>
      <p className="mt-1 text-sm text-muted">Something went wrong on our side. Your channels and posts are unchanged.</p>
      <Button onClick={reset} className="mt-5">Try again</Button>
    </div>
  );
}
