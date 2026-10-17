export default function CommunityConsoleLoading() {
  return (
    <div role="status" aria-label="Loading community settings" className="space-y-3">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="card h-16 animate-pulse bg-surface-2/60 motion-reduce:animate-none" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
