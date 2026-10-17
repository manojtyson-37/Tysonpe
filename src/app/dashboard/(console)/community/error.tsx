"use client";

export default function CommunityConsoleError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="card max-w-xl px-6 py-8">
      <p className="text-lg font-semibold">Couldn&apos;t load community settings</p>
      <p className="mt-1 text-sm text-muted">Something went wrong on our side. Your channels and posts are unchanged.</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-5 min-h-10">Try again</button>
    </div>
  );
}
